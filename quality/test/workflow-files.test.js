// Akış (workflow) dosyası yazım denetimi. Neden (2026-09-15): bir adım adındaki tırnaksız ": " YAML'ı geçersiz kıldı;
// GitHub "workflow file issue" deyip taramayı 9 projede hiç başlatmadı ve PR'lar yine yeşil göründü.
// Bağımlılık indirmeden, bilinen tuzaklar denetlenir. Çalıştır: node quality/test/workflow-files.test.js
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const files = [
  ...fs.readdirSync(path.join(ROOT, '.github', 'workflows')).map((f) => path.join('.github', 'workflows', f)),
  ...fs.readdirSync(path.join(ROOT, 'ornek')).map((f) => path.join('ornek', f)),
].filter((f) => /\.ya?ml$/.test(f));

// SAF: tırnaksız düz değerde ": " ya da " #" (YAML bunları anahtar/yorum sayar) → sorunlu satırlar
function problems(text) {
  const out = [];
  text.split(/\r?\n/).forEach((line, i) => {
    if (/^\s*#/.test(line)) return;
    const m = line.match(/^\s*(?:-\s+)?[A-Za-z_][\w-]*:\s+(.+)$/);
    if (!m) return;
    const v = m[1].trim();
    if (/^['"|>[{&*!]/.test(v)) return; // tırnaklı, blok, akış ya da çapa değeri
    if (/:\s/.test(v)) out.push(`${i + 1}: tırnaksız değerde ": " → ${v}`);
  });
  return out;
}

let fail = 0;
const expect = (name, actual, wanted) => {
  const ok = JSON.stringify(actual) === JSON.stringify(wanted);
  if (!ok) fail += 1;
  console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : `\n    gelen: ${JSON.stringify(actual)}\n    beklenen: ${JSON.stringify(wanted)}`}`);
};

console.log('— kural');
expect('tırnaksız ": " yakalanır', problems('      - name: Al (tam geçmiş: taban)').length, 1);
expect('tırnaklı değer serbest', problems('      - name: "Al (tam geçmiş: taban)"'), []);
expect('ifade (${{ }}) içindeki iki nokta sayılmaz', problems('        ref: ${{ inputs.standart_surumu }}'), []);
expect('yorum satırı sayılmaz', problems('# Kullanım: şöyle'), []);

console.log('— depodaki akış dosyaları');
for (const f of files) expect(`${f} yazım sorunu yok`, problems(fs.readFileSync(path.join(ROOT, f), 'utf8')), []);

console.log(fail ? `\n✗ ${fail} test başarısız` : '\n✓ tümü geçti');
process.exit(fail ? 1 : 0);
