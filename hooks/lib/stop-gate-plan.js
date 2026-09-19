// SAF karar mantığı: stop-gate bekçisinin "ne yapılacak" kısmı.
//
// NEDEN AYRI (TB-004): stop-gate tek parça yazılmıştı; tip kontrolünü GERÇEKTEN çalıştırmadan
// hiçbir davranışı sınanamıyordu. Burada dosya yok, süreç yok, saat yok — girdi verilir, karar
// çıkar. IO tarafı `hooks/stop-gate.js` içinde kalır.
'use strict';
const crypto = require('crypto');

const TS_FILE = /\.(ts|tsx|mts|cts)$/;
const MAX_OUTPUT_CHARS = 3000;

// SAF: `git status --porcelain` çıktısından DEĞİŞEN TS dosyalarının satırlarını süzer.
// Silinenler dışarıda kalır: silinen dosya için tip kontrolü istemek anlamsızdır ve
// silme işini bitiren ajanı boşuna durdurur.
function changedTsLines(statusText) {
  return String(statusText || '')
    .split('\n')
    .filter((line) => line && TS_FILE.test(line.trim()) && !line.startsWith(' D') && !line.startsWith('D '));
}

// SAF: hangi komutun çalıştırılacağı. Proje kendi `typecheck` betiğini tanımlamışsa o kazanır;
// yoksa tsconfig varsa tsc. İkisi de yoksa bu proje TS projesi değildir → kapı çalışmaz.
function pickCommand(scripts, hasTsconfig) {
  if (scripts && scripts.typecheck) return 'npm run typecheck --silent';
  if (hasTsconfig) return 'npx --no-install tsc --noEmit';
  return null;
}

// SAF: aynı çalışma ağacı için aynı parmak izi. Değişmemiş ağaçta kontrol ikinci kez çalışmaz.
function fingerprint(root, statusText, diffText) {
  return crypto.createHash('sha1')
    .update(String(root)).update(String(statusText || '')).update(String(diffText || ''))
    .digest('hex');
}

// SAF: kontrol sonucundan kancanın çıktısı.
//
// İKİ DAVRANIŞ SABİTTİR, DEĞİŞTİRİLEMEZ:
//   1. `stopHookActive` iken ASLA yeniden engellenmez. Engellenirse ajan aynı kapıya tekrar
//      tekrar çarpar ve oturum ilerleyemez. İkinci turda yalnız hatırlatma yazılır.
//   2. Zaman aşımı ENGEL DEĞİLDİR. Kontrol yapılamamıştır; yapılamayan ölçümle iş durdurulmaz
//      (`standartlar/olcum-standardi.md`: ölçmediğini iddia etme).
//
// error: null | { timedOut: true } | { text: '<derleyici çıktısı>' }
function decide({ command, error, stopHookActive }) {
  if (!error) return { cache: true, output: null };

  if (error.timedOut) {
    return { cache: false, output: { systemMessage: `stop-gate: "${command}" zaman aşımına uğradı; tip kontrolü yapılamadı.` } };
  }

  if (stopHookActive) {
    return { cache: false, output: { systemMessage: `⚠ Tip kontrolü hâlâ KIRMIZI (${command}). İş bitmiş sayılmaz.` } };
  }

  const tail = String(error.text || '').slice(-MAX_OUTPUT_CHARS);
  return {
    cache: false,
    output: {
      decision: 'block',
      reason: `[global kural] Değişen TS dosyaları var ve "${command}" başarısız. İşi bitirmeden önce düzelt (any/ignore ile susturmak yasak):\n${tail}`,
    },
  };
}

module.exports = { changedTsLines, pickCommand, fingerprint, decide, TS_FILE, MAX_OUTPUT_CHARS };
