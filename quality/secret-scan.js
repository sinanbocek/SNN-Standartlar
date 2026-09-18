// Sızmış anahtar taraması: PR'da EKLENEN satırlarda gizli anahtar varsa kırmızı verir. Değerler asla yazdırılmaz.
// Neden (2026-09-15 ölçümü): GHS, Portföy ve Nakit-Akış depolarında tam yetkili veritabanı anahtarı, GitHub ve Supabase
// erişim anahtarları depoya girmişti. Bilgisayardaki bekçi yalnız Claude Code'un yazdığı dosyaları görüyor; elle ya da
// başka araçla yapılan değişikliği görmüyor. Bu tarama her PR'da GitHub'da çalışır.
// Yalnız eklenen satırlar taranır: depoda zaten duran (kütükte kayıtlı) eski anahtarlar her PR'ı kırmızıya boyamasın.
// Kullanım: node anahtar-tarama.js --diff <taban-commit>   (çıkış 1 = bulgu var)
'use strict';
const { execFileSync } = require('child_process');

// Tehlikesiz sayılan JWT rolleri: istemciye zaten giden anahtarlar
const SAFE_JWT_ROLES = new Set(['anon']);
const SAFE_JWT_ISSUERS = new Set(['supabase-demo']);

// SAF: base64url JWT yükünü çözer (imza doğrulanmaz; yalnız rol/sağlayıcı sınıflandırması için)
function jwtPayload(token) {
  try {
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

// SAF: yer tutucu mu? (xxxx, 0000, ghp_XXXXXXXX…) — farklı karakter sayısı çok düşükse gerçek anahtar değildir
function looksPlaceholder(value) {
  const body = value.replace(/^[a-z]+_/i, '');
  return new Set(body).size <= 4 || /^(x+|0+|your|example|placeholder|changeme)/i.test(body);
}

const RULES = [
  { type: 'GitHub anahtarı', re: /\bghp_[A-Za-z0-9]{36}\b|\bgithub_pat_[A-Za-z0-9_]{50,}\b|\bgh[ousr]_[A-Za-z0-9]{36}\b/g },
  { type: 'Supabase erişim anahtarı', re: /\bsbp_[a-f0-9]{40}\b/g },
  { type: 'Supabase gizli anahtarı', re: /\bsb_secret_[A-Za-z0-9_-]{20,}/g },
  { type: 'Sentry anahtarı', re: /\bsntrys_[A-Za-z0-9_=+/-]{40,}/g },
  { type: 'Yapay zekâ API anahtarı', re: /\bsk-(ant|proj)-[A-Za-z0-9_-]{20,}/g },
  { type: 'Stripe gizli anahtarı', re: /\b(sk|rk)_live_[A-Za-z0-9]{20,}/g },
  { type: 'AWS erişim anahtarı', re: /\bAKIA[0-9A-Z]{16}\b/g },
  { type: 'Slack anahtarı', re: /\bxox[baprs]-[A-Za-z0-9-]{20,}/g },
];
// Özel anahtar: başlığın ARDINDAN anahtar içeriği gelmeli (PEM dosyasında satır yalnız başlıktır; JSON'da "\n" + base64).
// Kodun başlığı metin olarak araması (ör. pem.includes(BASLIK)) anahtar değildir (GHS send-push, 2026-09-15).
const PRIVATE_KEY_RE = /-{5}BEGIN (?:RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-{5}/g;
function privateKeyHits(line) {
  const out = [];
  for (const m of line.matchAll(PRIVATE_KEY_RE)) {
    const rest = line.slice(m.index + m[0].length);
    const onlyHeader = line.trim() === m[0];
    const inlineBody = /^(?:\\n|\\r|\s)*[A-Za-z0-9+/]{40,}/.test(rest);
    if (onlyHeader || inlineBody) out.push({ type: 'Özel anahtar (private key)' });
  }
  return out;
}
const JWT_RE = /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g;

// SAF: tek satırı tarar → [{ type, reason }]
function scanLine(line) {
  const out = [];
  for (const r of RULES) {
    for (const m of line.matchAll(r.re)) {
      if (looksPlaceholder(m[0])) continue;
      out.push({ type: r.type });
    }
  }
  out.push(...privateKeyHits(line));
  for (const m of line.matchAll(JWT_RE)) {
    const p = jwtPayload(m[0]);
    if (!p) continue;
    if (SAFE_JWT_ROLES.has(p.role) || SAFE_JWT_ISSUERS.has(p.iss)) continue;
    const who = p.role ? `rol=${p.role}` : (p.aud ? `hedef=${p.aud}` : 'rol bilinmiyor');
    out.push({ type: p.role === 'service_role' ? 'Tam yetkili veritabanı anahtarı (service_role)' : 'JWT anahtarı', reason: who });
  }
  return out;
}

// SAF: birleşik diff (git diff -U0) içinde yalnız EKLENEN satırları tarar → [{ file, line, type, reason }]
function scanDiff(diff) {
  const findings = [];
  let file = null;
  let lineNo = 0;
  for (const raw of diff.split('\n')) {
    if (raw.startsWith('+++ ')) { file = raw.slice(4).replace(/^b\//, ''); continue; }
    const hunk = raw.match(/^@@ -\d+(?:,\d+)? \+(\d+)/);
    if (hunk) { lineNo = Number(hunk[1]); continue; }
    if (raw.startsWith('+') && file && file !== '/dev/null') {
      for (const f of scanLine(raw.slice(1))) findings.push({ file, line: lineNo, ...f });
      lineNo += 1;
    } else if (!raw.startsWith('-')) {
      lineNo += raw.startsWith(' ') ? 1 : 0;
    }
  }
  return findings;
}

// SAF: rapor (değer yok)
function report(findings) {
  if (!findings.length) return '✓ Eklenen satırlarda gizli anahtar bulunmadı.';
  const lines = findings.map((f) => `  ✗ ${f.file}:${f.line} — ${f.type}${f.reason ? ` (${f.reason})` : ''}`);
  return [`✗ ${findings.length} gizli anahtar bulundu (değerler gösterilmez):`, ...lines,
    '', 'Ne yapmalı: anahtarı dosyadan çıkar, ortam değişkeninden/gizli kasadan oku. Anahtar GitHub\'a gönderildiyse artık sızmış sayılır: yenilenmesi gerekir (proje sahibi yapar).',
    'Bilinçli yer tutucu ise gerçek anahtara benzemeyen bir değer kullan (ör. "ghp_ORNEK").'].join('\n');
}

module.exports = { scanLine, scanDiff, report, looksPlaceholder, jwtPayload };

if (require.main === module) {
  const i = process.argv.indexOf('--diff');
  const base = i > 0 ? process.argv[i + 1] : null;
  if (!base) { console.error('Kullanım: node anahtar-tarama.js --diff <taban-commit>'); process.exit(2); }
  const diff = execFileSync('git', ['diff', '-U0', '--no-color', '--no-ext-diff', `${base}...HEAD`], { encoding: 'utf8', maxBuffer: 1e9 });
  const findings = scanDiff(diff);
  console.log(report(findings));
  process.exit(findings.length ? 1 : 0);
}
