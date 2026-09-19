// Uyum ölçeri testleri. Çalıştır: node quality/test/compliance.test.js
'use strict';
const c = require('../compliance');

let fail = 0;
const expect = (name, actual, wanted) => {
  const ok = JSON.stringify(actual) === JSON.stringify(wanted);
  if (!ok) fail += 1;
  console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : `\n    gelen: ${JSON.stringify(actual)}\n    beklenen: ${JSON.stringify(wanted)}`}`);
};

// Tam uyumlu bir projenin durumu
const TAM = {
  workflows: ['kod-dili.yml', 'teknik-borc.yml', 'anahtar-tarama.yml'],
  hasLedger: true,
  ledgerText: '## TB-012 · Kod dili geçişi\nP2 · 382 bulgu',
  guideNames: ['AI-RULES.md'],
  guideText: 'Aile standartları: sinanbocek/SNN-Standartlar deposuna bakılır.',
  exemptRaw: null,
};
const ids = (state, ex) => c.evaluate(state, ex).gaps.map((g) => g.id);

console.log('— tam uyum');
expect('eksik yok', ids(TAM), []);
expect('ölçüt sayısı', c.CHECKS.length, 6);

console.log('— tek tek eksikler');
expect('turnike yok', ids({ ...TAM, workflows: ['teknik-borc.yml', 'anahtar-tarama.yml'] }), ['kod-dili-akisi']);
expect('teknik borç akışı yok', ids({ ...TAM, workflows: ['kod-dili.yml', 'anahtar-tarama.yml'] }), ['teknik-borc-akisi']);
expect('anahtar tarama yok', ids({ ...TAM, workflows: ['kod-dili.yml', 'teknik-borc.yml'] }), ['anahtar-tarama']);
expect('kütükte kod dili kaydı yok', ids({ ...TAM, ledgerText: '## TB-001 · başka iş' }), ['kod-dili-kaydi']);
expect('rehber yok', ids({ ...TAM, guideNames: [], guideText: '' }), ['rehber-atfi']);
// Genel "standartlar" kelimesi atıf SAYILMAZ: Gunum-Var'da ölçüldü (2026-09-19), oradaki
// CLAUDE.md yalnız "standartlar" diyor ve aile deposuna işaret etmiyor.
expect('genel kelime atıf sayılmaz', ids({ ...TAM, guideText: 'proje standartlarına uyulur' }), ['rehber-atfi']);
expect('CLAUDE.md de sayılır', ids({ ...TAM, guideNames: ['CLAUDE.md'] }), []);
// Depo adi yazmadan "SNN aile standardi" demek de ATIFTIR: Piyasa-Core 2026-09-19 olcumunde
// boyle yaziyordu ve ilk surum ona YANLIS ALARM verdi. Olcut atfi arar, bicimini degil.
expect('depo adı olmadan aile atfı sayılır', ids({ ...TAM, guideText: 'Kod dili: İngilizce (SNN aile standardı).' }), []);
expect('küçük harfli aile atfı sayılır', ids({ ...TAM, guideText: 'aile standardina uyulur' }), []);

console.log('— kütük yoksa iki ölçüt birden düşer');
expect('kütük + kayıt', ids({ ...TAM, hasLedger: false, ledgerText: '' }), ['kod-dili-kaydi', 'kutuk']);

console.log('— muafiyet');
const muaf = JSON.stringify({ exempt: [{ check: 'kod-dili-akisi', reason: 'dışarıdan tüketilen MCP sunucusu' }] });
expect('gerekçeli muafiyet düşer', ids({ ...TAM, workflows: [] }, c.exemptions(muaf)).includes('kod-dili-akisi'), false);
// Gerekçesiz muafiyet SAYILMAZ — istisna kurallarının aynısı. Sabotaj testi.
const gerekcesiz = JSON.stringify({ exempt: [{ check: 'anahtar-tarama' }] });
const ex2 = c.exemptions(gerekcesiz);
expect('gerekçesiz muafiyet sayılmaz', ex2.ids.size, 0);
expect('gerekçesizlik uyarı üretir', ex2.warnings.length, 1);
expect('bozuk JSON iş durdurmaz', c.exemptions('{bozuk').ids.size, 0);
expect('bozuk JSON uyarır', c.exemptions('{bozuk').warnings.length, 1);
expect('dosya yoksa sessiz', c.exemptions(null).warnings.length, 0);

console.log('— özet metni');
expect('eksik yoksa satır yok', c.summary({ gaps: [], warnings: [] }), []);
const uc = c.evaluate({ ...TAM, workflows: [], hasLedger: false, ledgerText: '', guideNames: [], guideText: '' });
const s = c.summary(uc);
expect('başlıkta sayı var', s[0].includes(`${uc.gaps.length} eksik`), true);
// Açılış özeti rapor değildir: uzun liste kırpılır, ama ilk düzeltme komutu hep görünür.
expect('liste kırpılır', s.some((l) => l.includes('tane daha')), true);
expect('düzeltme yolu gösterilir', s[s.length - 1].includes('→'), true);
expect('satır sayısı sınırlı', s.length <= c.MAX_SHOWN + 3, true);

console.log(fail ? `\n${fail} test başarısız` : '\nTüm testler geçti');
process.exit(fail ? 1 : 0);
