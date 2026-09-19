// PreToolUse (Edit|Write|MultiEdit|NotebookEdit): gizli dosyalara yazmayı ve içeriğe sır gömmeyi engeller.
'use strict';
const fs = require('fs');

const BLOCKED_PATHS = [
  { re: /(^|[\\/])\.env(\.[^\\/]*)?$/i, why: '.env dosyaları sır içerir' },
  { re: /(^|[\\/])\.gemini[\\/]/i, why: '.gemini/ düz metin token içerir' },
  { re: /(^|[\\/])\.credentials\.json$/i, why: 'kimlik bilgisi dosyası' },
  { re: /service[-_]?account[^\\/]*\.json$/i, why: 'servis hesabı anahtarı' },
  { re: /\.(pem|p12|pfx|key)$/i, why: 'özel anahtar dosyası' },
];
const ALLOWED_PATHS = [/\.env\.example$/i, /\.env\.sample$/i];

const SECRET_PATTERNS = [
  { re: /eyJhbGciOi[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/, why: 'JWT (Supabase anahtarı olabilir)' },
  { re: /\bghp_[A-Za-z0-9]{36}\b|\bgithub_pat_[A-Za-z0-9_]{50,}/, why: 'GitHub token' },
  { re: /\bsbp_[a-f0-9]{40}\b/, why: 'Supabase erişim token\'ı' },
  { re: /\bsntrys_[A-Za-z0-9_=+/-]{40,}/, why: 'Sentry token' },
  { re: /\bsk-(ant|proj)-[A-Za-z0-9_-]{20,}/, why: 'API anahtarı' },
  { re: /\bAIza[0-9A-Za-z_-]{35}\b/, why: 'Google API anahtarı' },
  { re: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/, why: 'özel anahtar' },
];

function deny(reason) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason },
  }));
  process.exit(0);
}

let input = {};
try {
  input = JSON.parse(fs.readFileSync(0, 'utf8').replace(/^\uFEFF/, '') || '{}');
} catch {
  process.exit(0);
}
const ti = input.tool_input || {};
const file = ti.file_path || ti.notebook_path || '';

if (file && !ALLOWED_PATHS.some((re) => re.test(file))) {
  const hit = BLOCKED_PATHS.find((b) => b.re.test(file));
  if (hit) deny(`[global kural] ${file} düzenlenemez: ${hit.why}. Gerekiyorsa kullanıcı elle düzenlemeli.`);
}

const edits = Array.isArray(ti.edits) ? ti.edits.map((e) => e.new_string || '') : [];
const text = [ti.content, ti.new_string, ti.new_source, ...edits].filter(Boolean).join('\n');
const secret = SECRET_PATTERNS.find((s) => s.re.test(text));
if (secret) deny(`[global kural] Yazılan içerikte ${secret.why} tespit edildi. Sırlar koda/dokümana gömülmez; ortam değişkeni kullan.`);

process.exit(0);
