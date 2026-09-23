// Actions kota kapısı testleri. Çalıştır: node quality/test/actions-quota.test.js
//
// NEDEN (ölçüldü 2026-09-23): Temmuz 53 dk · Ağustos 972 dk · Eylül 2.527 dk — üç ayda 50 kat.
// Sınıra dayanınca iş FATURALANMAZ, HİÇ BAŞLAMAZ; 2026-09-19'da trade-kasa'da tam bu oldu
// ("spending limit" gerekçesiyle başlatılmadı) ve kimse bakmadığı için kimse bilmedi.
'use strict';
const t = require('../actions-quota');

let fail = 0;
const expect = (name, actual, wanted) => {
  const ok = JSON.stringify(actual) === JSON.stringify(wanted);
  if (!ok) fail += 1;
  console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : `\n    gelen: ${JSON.stringify(actual)}\n    beklenen: ${JSON.stringify(wanted)}`}`);
};

// Gerçek faturalama satırının biçimi (API çıktısından alındı).
const row = (repo, minutes, over = {}) => ({
  date: '2026-09-15T00:00:00Z', product: 'actions', sku: 'Actions Linux',
  quantity: minutes, unitType: 'Minutes', repositoryName: repo, ...over,
});

console.log('— yalnız Actions dakikası sayılır');
const mixed = [
  row('A', 100),
  { product: 'actions', sku: 'Actions storage', quantity: 4.2, unitType: 'GigabyteHours', repositoryName: 'A' },
  { product: 'packages', sku: 'x', quantity: 50, unitType: 'Minutes', repositoryName: 'A' },
];
expect('depolama satırı sayılmaz', t.minuteRows(mixed).length, 1);
expect('başka ürün sayılmaz', t.summarize(mixed).billable, 100);

console.log('— herkese açık depo kotadan yanmaz');
// ÖLÇÜLDÜ: açık depo satırı brüt $0.252 · indirim $0.252 · ödenen $0 — kotayı tüketmez.
// Zamanlanmış işlerimiz bu yüzden herkese açık depoda duruyor.
const rows = [row('Gunum-Var', 881), row('SNN-Standartlar', 199), row('SNN-Portfoy-Yonetimi', 276)];
const s = t.summarize(rows, { threshold: 1500, freeRepos: ['SNN-Standartlar'] });
expect('açık depo düşülür', s.billable, 1157);
expect('açık depo ayrıca bildirilir', s.free, 199);
// TEMKİNLİ TARAF: açık depo listesi okunamazsa HEPSİ sayılır — eşik erken çalar, geç değil.
expect('liste yoksa hepsi sayılır', t.summarize(rows, { threshold: 1500 }).billable, 1356);

console.log('— eşik');
expect('eşiğin altı temiz', t.summarize([row('A', 1499)], { threshold: 1500 }).over, false);
// EN KRİTİK SATIR: bu kırmızıya dönmezse kota sessizce dolar ve işler hiç başlamaz.
expect('eşiğe değince kırmızı', t.summarize([row('A', 1500)], { threshold: 1500 }).over, true);
expect('eşiğin üstü kırmızı', t.summarize([row('A', 2527)], { threshold: 1500 }).over, true);

console.log('— izdüşüm');
// Ayın 10'unda 1000 dk → bu hızla 30 günde 3000 dk. Eşik aşılmadan UYARIR.
const proj = t.summarize([row('A', 1000)], { threshold: 1500, day: 10, daysInMonth: 30 });
expect('izdüşüm hesaplanır', proj.projected, 3000);
expect('izdüşüm eşiği aşarsa uyarır', proj.projectedOver, true);
expect('eşik henüz aşılmadı', proj.over, false);
// Gün verilmezse izdüşüm YOKTUR: "ay sonunda şu olur" demek, ölçmeden iddia etmektir.
expect('gün yoksa izdüşüm yok', t.summarize([row('A', 1000)], { threshold: 1500 }).projected, null);

console.log('— depo kırılımı');
const kirilim = t.summarize([row('A', 10), row('B', 300), row('A', 90)], { threshold: 1500 });
expect('aynı depo toplanır ve sıralanır', kirilim.byRepo, [['B', 300], ['A', 100]]);
expect('boş girdi çökmez', t.summarize([], { threshold: 1500 }).billable, 0);
expect('null girdi çökmez', t.summarize(null, { threshold: 1500 }).billable, 0);

console.log('— rapor ne yapılacağını söyler');
const over = t.report(t.summarize([row('Gunum-Var', 2527)], { threshold: 1500 }), '2026-09');
expect('aşıldığı yazılır', over.includes('EŞİK AŞILDI'), true);
// Kapı yalnız "kırmızı" dememeli: sınıra dayanınca işin HİÇ BAŞLAMADIĞI yazılı olmalı.
expect('sessiz arıza anlatılır', over.includes('HİÇ BAŞLAMAZ'), true);
expect('yapılabilecekler yazılır', over.includes('concurrency'), true);
expect('en çok yakan depo görünür', over.includes('Gunum-Var'), true);
expect('temizse temiz yazar', t.report(t.summarize([row('A', 10)], { threshold: 1500 })).includes('Eşiğin altında'), true);

console.log(fail ? `\n${fail} test başarısız` : '\nTüm testler geçti');
process.exit(fail ? 1 : 0);
