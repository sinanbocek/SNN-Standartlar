// YEREL TEST KAPISI: kod buluta (PR/CI) gitmeden önce bu bilgisayarda lint + tip + test koşmuş mu?
//
// NEDEN (2026-09-29, Actions kotası teşhisi):
//   Bilgisayardaki bekçi yalnız tip kontrolü yapıyordu (hooks/lib/stop-gate-plan.js). Lint ve
//   testler İLK KEZ bulutta, ücretli dakikada koşuyordu; hata yakalamanın tek yeri CI idi.
//   Eylülde başarısız CI koşumları 49 dk tuttu — kota kazancı küçük. Asıl kazanç: kırmızı CI
//   görüp düzeltip yeniden gönderme döngüsü hiç başlamaz; hata PR'a girmeden durur.
//
// Nasıl:
//   node ~/.claude/standartlar-canli/quality/local-check.js [proje-klasörü]
//     → komutları sırayla koşar; hepsi geçerse o commit için DAMGA yazar (.git/snn-yerel-kontrol.json)
//   Bekçi (quality/command-gates.js) `git push` ve `gh pr create` öncesinde damgayı arar.
//
// Komutlar package.json'dan çıkar:
//   - `verify` betiği varsa YALNIZ o koşar (proje kendi tam listesini tanımlar; CI ile aynı olmalı)
//   - yoksa: format:check · lint · typecheck/type-check (yoksa tsconfig varsa tsc --noEmit) · test
//   CI'da projeye özgü adım varsa (Gunum-Var'da Deno kontrolü: 18 Eylül kırmızısı) proje `verify`
//   betiği tanımlamalıdır; varsayılan liste onu bilemez.
// package.json yoksa ya da koşacak komut yoksa kapı uygulanmaz.
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const STAMP = 'snn-yerel-kontrol.json';
const DOCS_ONLY = /^docs\/|\.md$/i;
const NPM_DEFAULT_TEST = /no test specified/;
const SCRIPT_PATH = path.join(require('os').homedir(), '.claude', 'standartlar-canli', 'quality', 'local-check.js');

// SAF: package.json + tsconfig varlığı → koşulacak komutlar [{ name, cmd }]
function planCommands(pkg, hasTsconfig) {
  if (!pkg) return [];
  const s = pkg.scripts || {};
  if (s.verify) return [{ name: 'verify', cmd: 'npm run verify' }];
  const out = [];
  // format:check (2026-09-29 ölçümü): İhale'nin 24 Eylül'deki kırmızı CI'ı yalnız format adımıydı.
  if (s['format:check']) out.push({ name: 'format:check', cmd: 'npm run format:check' });
  if (s.lint) out.push({ name: 'lint', cmd: 'npm run lint' });
  const tc = ['typecheck', 'type-check'].find((k) => s[k]);
  if (tc) out.push({ name: tc, cmd: `npm run ${tc}` });
  else if (hasTsconfig) out.push({ name: 'tsc', cmd: 'npx --no-install tsc --noEmit' });
  if (s.test && !NPM_DEFAULT_TEST.test(s.test)) out.push({ name: 'test', cmd: 'npm test' });
  return out;
}

// SAF: değişen dosyaların hepsi belge mi? Boş liste belge SAYILMAZ.
const docsOnly = (files) => files.length > 0 && files.every((f) => DOCS_ONLY.test(f));

// SAF: karar. Döner: ret gerekçesi ya da null.
//   applies        : proje bu kapıya tabi mi (koşacak komut var mı)
//   head           : şu anki commit
//   stampHead      : damgadaki commit (yoksa null)
//   sinceStamp     : damgadan bu yana değişen dosyalar (damga yoksa null)
//   vsMain         : origin/main'e göre değişen dosyalar (okunamazsa null)
function decide({ applies, head, stampHead, sinceStamp, vsMain }) {
  if (!applies) return null;
  if (stampHead && stampHead === head) return null;
  // main'e göre yeni commit yok → gönderilecek/test edilecek bir şey yok (2026-09-29 gerçek veride:
  // main'de duran 4 proje yanlışlıkla durduruluyordu).
  if (vsMain && (vsMain.length === 0 || docsOnly(vsMain))) return null;
  if (stampHead && sinceStamp && (sinceStamp.length === 0 || docsOnly(sinceStamp))) return null;
  return `Yerel kontrol bu commit için koşmadı (${(head || '?').slice(0, 7)}). Kod buluta gitmeden önce `
    + `lint + tip + test bu bilgisayarda geçmeli; CI dakikası kırmızı koşumlara harcanmasın. `
    + `Önce çalıştır (1-3 dk sürebilir, zaman aşımını uzun ver): node "${SCRIPT_PATH}"`
    + ' — geçince bu komutu yeniden dene.';
}

// ─── IO ─────────────────────────────────────────────────────────────────────
const git = (root, args) => {
  try {
    return execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 8000 }).trim();
  } catch { return null; }
};
const lines = (out) => (out === null ? null : out.split('\n').map((l) => l.trim()).filter(Boolean));

function readPkg(root) {
  try { return JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')); } catch { return null; }
}

function stampFile(root) {
  const p = git(root, ['rev-parse', '--git-path', STAMP]);
  return p ? path.resolve(root, p) : null;
}

function readStamp(root) {
  try { return JSON.parse(fs.readFileSync(stampFile(root), 'utf8')); } catch { return null; }
}

// Kapının ihtiyaç duyduğu durumu okur.
function readState(root) {
  const top = git(root, ['rev-parse', '--show-toplevel']);
  if (!top) return { applies: false };
  const cmds = planCommands(readPkg(top), fs.existsSync(path.join(top, 'tsconfig.json')));
  const head = git(top, ['rev-parse', 'HEAD']);
  const stamp = readStamp(top);
  const stampHead = stamp && stamp.head ? stamp.head : null;
  return {
    applies: cmds.length > 0,
    head,
    stampHead,
    sinceStamp: stampHead ? lines(git(top, ['diff', '--name-only', stampHead, 'HEAD'])) : null,
    vsMain: lines(git(top, ['diff', '--name-only', 'origin/main...HEAD'])),
  };
}

const gate = (root) => decide(readState(root));

// Komutları koşar; hepsi geçerse damga yazar. Çıkış: 0 geçti · 1 kaldı · 2 uygulanmaz
function run(root) {
  const top = git(root, ['rev-parse', '--show-toplevel']);
  if (!top) { console.log('✗ Git deposu değil.'); return 2; }
  const cmds = planCommands(readPkg(top), fs.existsSync(path.join(top, 'tsconfig.json')));
  if (!cmds.length) { console.log('Bu projede koşacak yerel kontrol yok (package.json / betik yok) — kapı uygulanmaz.'); return 2; }
  const dirty = git(top, ['status', '--porcelain', '--untracked-files=no']);
  if (dirty) console.log('⚠ Commit\'lenmemiş değişiklik var; damga yalnız COMMIT\'e yazılır. Önce commit, sonra kontrol.');
  const head = git(top, ['rev-parse', 'HEAD']);
  for (const c of cmds) {
    console.log(`\n▶ ${c.name}: ${c.cmd}`);
    const started = Date.now();
    const r = spawnSync(c.cmd, { cwd: top, shell: true, stdio: 'inherit' });
    const sec = Math.round((Date.now() - started) / 1000);
    if (r.status !== 0) { console.log(`\n✗ ${c.name} kaldı (${sec} sn). Damga yazılmadı.`); return 1; }
    console.log(`✓ ${c.name} (${sec} sn)`);
  }
  if (dirty) { console.log('\n✓ Komutlar geçti ama çalışma alanı kirliydi; damga yazılmadı. Commit edip yeniden koş.'); return 1; }
  fs.writeFileSync(stampFile(top), JSON.stringify({ head, at: new Date().toISOString(), commands: cmds.map((c) => c.name) }));
  console.log(`\n✓ Yerel kontrol geçti; damga: ${head.slice(0, 7)}`);
  return 0;
}

module.exports = { planCommands, docsOnly, decide, readState, gate, run, STAMP, SCRIPT_PATH };

if (require.main === module) process.exit(run(path.resolve(process.argv[2] || process.cwd())));
