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

console.log('— aile durumu makineden gelir');
// İLK RAPORDA RUTIN BUNU KENDİSİ SAYDI VE YANILDI: "7 proje sakin" yazdı, oysa ailede 11 proje
// var ve 4'ünde acil borç vardı — biri 5 acil borçla "sakin" sayılmıştı. Rutinin hesaplayabileceği
// hiçbir sayı bırakılmaz.
const aile = t.numbersBlock([p('A', { p1: 13 }), p('B', { p1: 5 }), p('C'), p('D')], null);
expect('proje sayısı doğru', aile.includes('4 proje'), true);
expect('acil borçlu proje sayısı doğru', aile.includes('2 projede acil borç'), true);
expect('hepsi yeşilse öyle yazar', aile.includes('CI hepsi yeşil'), true);
expect('kırmızı varsa sayılır', t.numbersBlock([p('A', { ci: 'red', ciName: 'x' }), p('B')], null).includes('1 projede CI kırmızı'), true);

console.log('— CI: akış başına son koşum');
// EN KRİTİK SATIR. Tek "en son koşum"a bakmak yanıltır: hangi zamanlanmış işin en son çalıştığına
// göre sonuç değişir. 2026-09-23'te gerçek veride ölçüldü — kota kapısı kırmızıyken rapor
// "11/11 yeşil" dedi, çünkü araya başka bir akışın başarılı koşumu girmişti.
const run = (name, conclusion) => ({ name, conclusion });
expect('eski kırmızı, yeni yeşil akış → yine kırmızı', t.ciState([
  run('health-report', 'success'),   // en son koşan bu
  run('actions-quota', 'failure'),   // ama bu akışın son koşumu kırmızı
]).state, 'red');
expect('kırmızı akışın adı döner', t.ciState([run('health-report', 'success'), run('actions-quota', 'failure')]).failing, 'actions-quota');
// Aynı akışın ESKİ koşumu sayılmaz: düzeltilen bir akış kırmızı görünmemeli.
expect('aynı akışın eski kırmızısı sayılmaz', t.ciState([run('test', 'success'), run('test', 'failure')]).state, 'green');
expect('hepsi yeşilse yeşil', t.ciState([run('a', 'success'), run('b', 'success')]).state, 'green');
expect('koşum yoksa yok', t.ciState([]).state, 'yok');
expect('boş girdi çökmez', t.ciState(null).state, 'yok');
expect('iki kırmızı akış da yazılır', t.ciState([run('a', 'failure'), run('b', 'failure')]).failing, 'a, b');

console.log('— uzun akış adı satırı taşırmaz');
// Dependabot akış adları paket listesinin tamamını taşıyor (ölçüldü: 100+ karakter).
expect('uzun ad kısalır', t.shortName('npm_and_yarn in /. for @vitest/mocker, csv-parse, qs, stream-json').length <= 32, true);
expect('kısaltma işareti konur', t.shortName('a'.repeat(50)).endsWith('…'), true);
expect('kısa ad dokunulmaz', t.shortName('actions-quota'), 'actions-quota');

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
