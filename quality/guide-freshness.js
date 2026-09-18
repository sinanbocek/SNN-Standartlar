// Rehber tazelik kontrolü: CLAUDE.md'nin gösterdiği dosyalar gerçekten var mı, yazdığı sürüm package.json ile aynı mı?
// Neden (2026-09-15 ölçümü): Nakit-Akış ve Gunum-Var rehberleri silinmiş borç dosyasını gösteriyordu; Portföy rehberi
// v0.1.54 derken gerçek sürüm 0.3.2'ydi ve "CI'da test yok" diyordu (testler CI'da çalışıyordu). Yapay zekâ yanlış tabelayı izler.
// Kullanım: node rehber-tazelik.js <proje-klasörü>   (çıkış 1 = eskimiş atıf var)
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const REHBER = 'CLAUDE.md';
const EXT = /\.(md|ts|tsx|js|cjs|mjs|json|sql|yml|yaml|toml|sh|html|css)$/;
// Örnek/yer tutucu adlar gerçek dosya değildir (IXxxRepository.ts, YYYYAAGG_aciklama.sql)
const PLACEHOLDER = /Xxx|XXX|YYYY|<|>|\{|\}|\*|\.\.\./;

// SAF: rehber metninden yol biçimli atıfları çıkarır. Tek dosya adları (App.tsx) bağlama göreli olduğu için sayılmaz.
function pathRefs(text) {
  const refs = new Set();
  for (const m of text.matchAll(/`([^`\s]+)`/g)) {
    const p = m[1].replace(/[),.:;]+$/, '').replace(/^\.\//, '');
    if (/^(https?:|~|\$|-|@|\/|\.\.)/.test(p) || PLACEHOLDER.test(p) || /[|=]/.test(p)) continue;
    if (!p.includes('/')) continue;
    if (/^\.[a-z]+\/\.[a-z]+$/i.test(p)) continue; // uzantı listesi (`.ts/.tsx`), yol değil
    if (!EXT.test(p) && !p.endsWith('/')) continue;
    refs.add(p);
  }
  return [...refs];
}

// SAF: "package.json" geçen satırdaki sürüm iddiası (ör. "`package.json` → **v0.1.54**")
function claimedVersion(text) {
  for (const line of text.split(/\r?\n/)) {
    if (!line.includes('package.json')) continue;
    const m = line.match(/\bv?(\d+\.\d+\.\d+)\b/);
    if (m) return m[1];
  }
  return null;
}

// SAF: atıf, bilinen dosya/klasör listesinde tam yol ya da yol sonu olarak var mı
function refExists(ref, known) {
  if (ref.endsWith('/')) return known.dirs.some((d) => d === ref || d.endsWith(`/${ref}`));
  return known.files.some((f) => f === ref || f.endsWith(`/${ref}`));
}

function knownPaths(root) {
  let files = [];
  try {
    files = execFileSync('git', ['-C', root, 'ls-files'], { encoding: 'utf8', maxBuffer: 1e8, stdio: ['ignore', 'pipe', 'ignore'] }).split('\n').filter(Boolean);
  } catch { /* git deposu değil */ }
  const dirs = new Set();
  files.forEach((f) => { const s = f.split('/'); for (let i = 1; i < s.length; i += 1) dirs.add(`${s.slice(0, i).join('/')}/`); });
  return { files, dirs: [...dirs] };
}

// Git dışı bırakılmış ama anılması doğal yollar (.env, dist/, .agent/) diskte varsa ya da yoksayılıyorsa eksik sayılmaz
function ignoredOrOnDisk(root, ref) {
  if (fs.existsSync(path.join(root, ref))) return true;
  // Bağımlılık paketinin içindeki yol (`legacy/build/pdf.mjs` → node_modules/pdfjs-dist/legacy/build/pdf.mjs)
  const nm = path.join(root, 'node_modules');
  try {
    if (fs.readdirSync(nm).some((pkg) => fs.existsSync(path.join(nm, pkg, ref)))) return true;
  } catch { /* node_modules yok */ }
  try {
    execFileSync('git', ['-C', root, 'check-ignore', '-q', '--no-index', ref], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function check(root) {
  const file = path.join(root, REHBER);
  if (!fs.existsSync(file)) return null;
  const text = fs.readFileSync(file, 'utf8');
  const known = knownPaths(root);
  const missing = pathRefs(text).filter((r) => !refExists(r, known) && !ignoredOrOnDisk(root, r));
  let version = null;
  const claimed = claimedVersion(text);
  try {
    const actual = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
    if (claimed && actual && claimed !== actual) version = { claimed, actual };
  } catch { /* package.json yok */ }
  return { missing, version };
}

// SAF: kısa uyarı metni (oturum başı ve bitiş kapısı için)
function summary(result) {
  if (!result || (!result.missing.length && !result.version)) return null;
  const parts = [];
  if (result.version) parts.push(`sürüm ${result.version.claimed} yazıyor, package.json ${result.version.actual}`);
  if (result.missing.length) {
    const shown = result.missing.slice(0, 6).join(', ');
    parts.push(`${result.missing.length} dosya atfı bulunamadı: ${shown}${result.missing.length > 6 ? '…' : ''}`);
  }
  return `CLAUDE.md eskimiş (${parts.join(' · ')}). Rehbere güvenmeden önce kodu doğrula; fırsat bulunca rehberi düzelt.`;
}

module.exports = { pathRefs, claimedVersion, refExists, check, summary };

if (require.main === module) {
  const root = path.resolve(process.argv[2] || process.cwd());
  const r = check(root);
  if (!r) { console.log(`${REHBER} yok`); process.exit(0); }
  console.log(summary(r) || `${REHBER} güncel: tüm yol atıfları mevcut.`);
  process.exit(summary(r) ? 1 : 0);
}
