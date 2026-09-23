// Haftalık sağlık raporu SAYILAR bloğu testleri. Çalıştır: node quality/test/health-report.test.js
//
// NEDEN (2026-09-23, proje sahibi): e-posta raporu 7 sütunlu bir tablo basıyordu; iki sütun 10
// projenin 10'unda da "okunamadı" diyordu, maddeler paragraftı, önem derecesi yoktu.
// "Uzun uzun cümleler yerine önem derecesi ve kısa gerekçe · özet hap bilgi."
'use strict';
const t = require('../health-report');

let fail = 0;
const expect = (name, actual, wanted) => {
  const ok = JSON.stringify(actual) === JSON.stringify(wanted);
  if (!ok) fail += 1;
  console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : `\n    gelen: ${JSON.stringify(actual)}\n    beklenen: ${JSON.stringify(wanted)}`}`);
};

const p = (name, over = {}) => ({ name, p1: 0, open: 0, ci: 'green', ciName: null, stalePrs: 0, unreadable: false, ...over });

console.log('— sessiz projeler satır doldurmaz');
// ESKİ TABLODA 10 satırın 7'si "P1:0" diyordu ve hiçbir şey söylemiyordu.
const quiet = t.numbersBlock([p('A'), p('B'), p('C')], null);
expect('P1 yoksa tek cümle', quiet.includes('hiç yok (3 proje)'), true);
expect('sakin projeler tek tek yazılmaz', quiet.includes('A 0'), false);
const some = t.numbersBlock([p('GHS', { p1: 13 }), p('B'), p('C')], null);
expect('P1 olan yazılır', some.includes('GHS 13'), true);
expect('kalanlar sayıya iner', some.includes('diğer 2 proje 0'), true);

console.log('— kota');
expect('eşik aşılınca işaretlenir', t.numbersBlock([p('A')], { billable: 2133, threshold: 1500, top: ['Gunum-Var', 881] }).includes('⚠ aşıldı'), true);
expect('en çok yakan depo yazılır', t.numbersBlock([p('A')], { billable: 2133, threshold: 1500, top: ['Gunum-Var', 881] }).includes("881'i Gunum-Var"), true);
expect('eşiğin altı temiz işaret', t.numbersBlock([p('A')], { billable: 900, threshold: 1500, top: null }).includes('✓'), true);
// Kota okunamazsa "iyi" denmez — ölçemedim denir.
expect('kota yoksa ölçülemedi yazar', t.numbersBlock([p('A')], null).includes('ölçülemedi'), true);

console.log('— CI');
// EN KRİTİK SATIR: "KIRMIZI" tek başına yanıltır. Kota kapısının eşiği aşması ile derlemenin
// bozulması aynı şey değildir; 2026-09-23'te ilk çalıştırmada tam bu karışıklık çıktı.
const red = t.numbersBlock([p('SNN-Standartlar', { ci: 'red', ciName: 'actions-quota' }), p('B')], null);
expect('kırmızı akışın adı yazılır', red.includes('KIRMIZI (actions-quota)'), true);
expect('hepsi yeşilse sayıyla özetlenir', t.numbersBlock([p('A'), p('B')], null).includes('2/2 yeşil'), true);

console.log('— bekleyen PR');
const stale = t.numbersBlock([p('Naturapan', { stalePrs: 6 }), p('Nakit', { stalePrs: 1 }), p('C')], null);
expect('toplam ve kırılım yazılır', stale.includes('7 tanesi 7 günden eski'), true);
expect('en çok bekleyen başta', stale.indexOf('Naturapan 6') < stale.indexOf('Nakit 1'), true);
expect('yoksa tek cümle', t.numbersBlock([p('A')], null).includes('7 günden eski yok'), true);

console.log('— ölçülemeyen TEK yerde toplanır');
// Eski tabloda "okunamadı" her satırda tekrar ediyordu: 10 satır, 10 kez aynı kelime.
const missing = t.numbersBlock([p('A', { unreadable: true }), p('B', { unreadable: true }), p('C')], null);
expect('bir kez yazılır', (missing.match(/ÖLÇEMEDİĞİM/g) || []).length, 1);
expect('hangi projeler olduğu yazılır', missing.includes('A · B'), true);
expect('ölçülemeyen proje P1 sayısına karışmaz', missing.includes('hiç yok (3 proje)'), true);

console.log('— ek satırlar');
expect('açık talep yoksa yok yazar', t.numbersBlock([p('A')], null, { requests: 0 }).includes('Açık talep       yok'), true);
expect('açık talep varsa sayı yazar', t.numbersBlock([p('A')], null, { requests: 3 }).includes('3'), true);
expect('bekleyen ölçüm yazılır', t.numbersBlock([p('A')], null, { pending: 'OLC-001 (vade 2026-09-26)' }).includes('OLC-001'), true);

console.log('— kütük sayımı BAŞLIKTAN değil KAYITTAN');
// Eski rapor kütük başlığındaki özeti kullanıyordu; üç projede dosya içeriğiyle uyuşmuyordu
// (16 ve 23 Eylül raporlarının "Ölçülemeyenler" bölümünde yazılı).
const parseDebts = (text) => [
  { id: 'TB-001', priority: 'P1' },
  { id: 'TB-002', priority: 'P3' },
].filter(() => text.includes('TB-'));
expect('kayıtlar sayılır', t.countDebts('TB-001 ...', parseDebts), { open: 2, p1: 1 });
expect('boş metin sıfır', t.countDebts('', parseDebts), { open: 0, p1: 0 });

console.log(fail ? `\n${fail} test başarısız` : '\nTüm testler geçti');
process.exit(fail ? 1 : 0);
