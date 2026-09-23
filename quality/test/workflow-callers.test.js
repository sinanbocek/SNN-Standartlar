// Köprü ölçeri testleri. Çalıştır: node quality/test/workflow-callers.test.js
//
// NEDEN (TB-001): eski akış adları köprüye dönüştü. Köprü ne zaman silinir sorusunun cevabı
// tahmin değil ölçüm olmalı. Bu ölçer yanlışsa ya erken silinir (10 projenin kapısı kırılır)
// ya da hiç silinmez.
'use strict';
const fs = require('fs');
const path = require('path');
const t = require('../workflow-callers');

let fail = 0;
const expect = (name, actual, wanted) => {
  const ok = JSON.stringify(actual) === JSON.stringify(wanted);
  if (!ok) fail += 1;
  console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : `\n    gelen: ${JSON.stringify(actual)}\n    beklenen: ${JSON.stringify(wanted)}`}`);
};

console.log('— çağrı ayıklama');
const CALLER = `
jobs:
  tara:
    uses: sinanbocek/SNN-Standartlar/.github/workflows/secret-scan.yml@main
  eski:
    uses: sinanbocek/SNN-Standartlar/.github/workflows/anahtar-tarama.yml@v1.2
`;
expect('iki çağrı da bulunur', t.callsIn(CALLER).sort(), ['anahtar-tarama.yml', 'secret-scan.yml']);
// Etiketle ya da dalla çağıran da SAYILIR: köprüyü silersek onun da kapısı kırılır.
expect('etiketli çağrı sayılır', t.callsIn('a/SNN-Standartlar/.github/workflows/kod-dili.yml@v3'), ['kod-dili.yml']);
expect('aynı ad iki kez sayılmaz', t.callsIn(CALLER + CALLER).length, 2);
expect('başka deponun akışı sayılmaz', t.callsIn('baska/Depo/.github/workflows/secret-scan.yml@main'), []);
expect('çağrı yoksa boş', t.callsIn('name: test'), []);

console.log('— köprü tanıma');
expect('köprü başlığı tanınır', t.isBridge('# ESKİ AD — UYUMLULUK KÖPRÜSÜ (2026-09-19)\nname: x'), true);
expect('gerçek akış köprü sayılmaz', t.isBridge('# Ortak görevli: tarama\nname: secret-scan'), false);

console.log('— rapor');
const usage = new Map([['anahtar-tarama.yml', ['a/b', 'c/d']]]);
const r = t.report(['anahtar-tarama.yml', 'kod-dili.yml'], usage);
expect('çağıran sayısı ve kim olduğu yazılır', /anahtar-tarama\.yml\s+2 çağıran: a\/b, c\/d/.test(r.text), true);
expect('çağıranı olan SİLİNEBİLİR demez', /anahtar-tarama\.yml[^\n]*SİLİNEBİLİR/.test(r.text), false);
// EN KRİTİK SATIR: çağıranı olan bir köprü "silinebilir" listesine GİRMEMELİ.
expect('çağıranı olan hazır sayılmaz', r.ready.includes('anahtar-tarama.yml'), false);
expect('çağıranı olmayan hazır sayılır', r.ready, ['kod-dili.yml']);
expect('hepsi kullanılıyorsa hazır boş', t.report(['anahtar-tarama.yml'], usage).ready, []);

console.log('— okunamayan proje "çağırmıyor" sayılmaz (olcum-standardi.md, Kural 3)');
// Okunamayan bir proje köprüyü çağırıyor OLABİLİR. "0 çağıran" o zaman bilinmez, silme önerilmez.
const partial = t.report(['kod-dili.yml'], new Map(), ['globalhedef/global-hedef-web-platform']);
expect('okunamayan proje varken silinebilir denmez', partial.ready, []);
expect('okunamayan proje adıyla yazılır', /okunamadı[\s\S]*globalhedef\/global-hedef-web-platform/.test(partial.text), true);
expect('okunamayan proje varken SİLİNEBİLİR yazmaz', /SİLİNEBİLİR/.test(partial.text), false);

console.log('— gerçek köprüler ana dalda tanımlı');
const dir = path.join(__dirname, '..', '..', '.github', 'workflows');
const files = fs.readdirSync(dir).filter((f) => /\.yml$/.test(f));
const bridges = files.filter((f) => t.isBridge(fs.readFileSync(path.join(dir, f), 'utf8')));
// Her köprü, GERÇEKTEN VAR OLAN bir akışa işaret etmeli; yoksa çağıran proje "workflow not found" alır.
for (const b of bridges) {
  const text = fs.readFileSync(path.join(dir, b), 'utf8');
  const target = t.callsIn(text);
  expect(`${b} → hedefi var`, target.every((h) => files.includes(h)), true);
  expect(`${b} → tek hedefe gider`, target.length, 1);
}
expect('köprü sayısı beklenen', bridges.length, 4);

// Köprüler canlı denetime bağlı mı? `cekirdek-yayilim` bilerek dışarıda (çalıştırmak tüketici
// depolarda PR açmayı denerdi); kalan üçü bridge-check ile GERÇEKTEN çağrılır.
const check = fs.readFileSync(path.join(dir, 'bridge-check.yml'), 'utf8');
const live = t.callsIn(check);
expect('canlı denetim üç köprüyü çağırır', live.sort(), ['anahtar-tarama.yml', 'borc-senkron.yml', 'kod-dili.yml']);
expect('canlı denetim kuru çalıştırır', /uygula: false/.test(check), true);

console.log(fail ? `\n${fail} test başarısız` : '\nTüm testler geçti');
process.exit(fail ? 1 : 0);
