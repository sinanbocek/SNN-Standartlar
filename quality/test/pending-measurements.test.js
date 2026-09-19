// Bekleyen ölçüm kapısı testleri. Çalıştır: node quality/test/pending-measurements.test.js
//
// NEDEN (2026-09-19): TB-002 "bir hafta defter verisi beklensin" diyordu; defter geçmiş
// tutmuyordu, beklenen veri HİÇ gelmeyecekti. Proje sahibi: "bu ve benzeri işlemler tamamen
// makine zorlamasıyla kontrol edilerek otomatik tetiklenen bir makine kuralı olmalı; aksi asla
// kabul edilemez." Bu testler o zorlamayı sabitler.
'use strict';
const fs = require('fs');
const path = require('path');
const t = require('../pending-measurements');

let fail = 0;
const expect = (name, actual, wanted) => {
  const ok = JSON.stringify(actual) === JSON.stringify(wanted);
  if (!ok) fail += 1;
  console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : `\n    gelen: ${JSON.stringify(actual)}\n    beklenen: ${JSON.stringify(wanted)}`}`);
};

const TODAY = '2026-09-19';
const existing = (rel) => rel === 'quality/meeting-report.js';
const entry = (over = {}) => ({
  id: 'OLC-001',
  question: 'soru?',
  command: 'node quality/meeting-report.js --gun 7',
  due: '2026-09-26',
  decision: 'şu olursa şunu yap',
  ...over,
});

console.log('— geçerli kayıt');
expect('eksiksiz kayıt kusursuz', t.problems(entry(), existing, TODAY), []);
expect('betik yolu ayıklanır', t.scriptOf('node quality/meeting-report.js --gun 7'), 'quality/meeting-report.js');

console.log('— TB-002 kusuru: olmayan veriyi beklemek');
// EN KRİTİK SATIR. Bu kırmızıya dönmezse, çalıştırılamayan bir ölçüm yine kütükte bekleyebilir.
const yokBetik = t.problems(entry({ command: 'node quality/olmayan.js' }), existing, TODAY);
expect('komutun betiği yoksa kırmızı', yokBetik.length, 1);
expect('kusur TB-002 dersini anar', yokBetik[0].includes('TB-002'), true);

console.log('— zorunlu alanlar');
expect('komut yoksa kırmızı', t.problems(entry({ command: null }), existing, TODAY).some((m) => m.includes('`command` yok')), true);
expect('vade yoksa kırmızı', t.problems(entry({ due: null }), existing, TODAY).some((m) => m.includes('`due` yok')), true);
expect('geçersiz tarih kırmızı', t.problems(entry({ due: 'yakinda' }), existing, TODAY).some((m) => m.includes('geçersiz tarih')), true);
// Karar ÖNCEDEN yazılır: sayı gelince "ne yapacaktık?" diye tartışmak ölçümü değersizleştirir.
expect('karar kuralı yoksa kırmızı', t.problems(entry({ decision: null }), existing, TODAY).some((m) => m.includes('`decision` yok')), true);
expect('soru yoksa kırmızı', t.problems(entry({ question: null }), existing, TODAY).some((m) => m.includes('`question` yok')), true);

console.log('— komut izin listesi');
// Veri dosyasından gelen serbest metin çalıştırılmaz; yoksa bu dosya uzaktan çalıştırma yüzeyi olur.
expect('kabuk komutu reddedilir', t.problems(entry({ command: 'rm -rf /' }), existing, TODAY).some((m) => m.includes('izin listesinde değil')), true);
expect('zincirleme reddedilir', t.problems(entry({ command: 'node quality/meeting-report.js && curl x' }), existing, TODAY).some((m) => m.includes('izin listesinde değil')), true);
expect('depo dışı yol reddedilir', t.problems(entry({ command: 'node ../x.js' }), existing, TODAY).some((m) => m.includes('izin listesinde değil')), true);
expect('izinli komut kabul edilir', t.ALLOWED.test('node quality/meeting-report.js --gun 7'), true);

console.log('— vade');
expect('vadesi gelmemiş kayıt sessiz', t.review([entry()], existing, TODAY).ok.length, 1);
expect('vadesi gelen kayıt bildirilir', t.review([entry({ due: TODAY })], existing, TODAY).due.length, 1);
expect('vadesi geçen kayıt bildirilir', t.review([entry({ due: '2026-09-01' })], existing, TODAY).due.length, 1);
expect('bozuk kayıt vade listesine girmez', t.review([entry({ due: TODAY, command: null })], existing, TODAY).invalid.length, 1);

console.log('— kütükte kaçak bekleme');
// Kayıt "ölçüm bekliyor" diyorsa, bekleyen ölçüm dosyasında karşılığı OLMAK ZORUNDA.
const ledgerText = `### TB-002 — bir şey
- **Neden Şimdi Çözülmüyor:** ölçmeden kural konmaz; bir hafta veri beklenir.

### TB-009 — başka şey
- **Neden Şimdi Çözülmüyor:** kırıcı sürüm planı gerekiyor.
`;
expect('kayıtsız bekleme yakalanır', t.waitingWithoutMeasurement(ledgerText, []).length, 1);
expect('kayıtlı bekleme sessiz', t.waitingWithoutMeasurement(ledgerText, ['TB-002 (arşive taşındı)']), []);
expect('beklemeyen kayıt sayılmaz', t.waitingWithoutMeasurement(ledgerText, ['TB-002']).some((m) => m.includes('TB-009')), false);

console.log('— rapor');
const r = t.review([entry({ due: '2026-09-01' })], existing, TODAY);
expect('vadesi gelen rapora yazılır', t.report(r).includes('VADESİ GELDİ'), true);
expect('boş liste temiz rapor', t.report(t.review([], existing, TODAY)), '✓ Bekleyen ölçüm yok.');

console.log('— gerçek veri dosyası');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'pending-measurements.json'), 'utf8'));
const root = path.join(__dirname, '..', '..');
const live = t.review(data.pending, (rel) => !!rel && fs.existsSync(path.join(root, rel)), TODAY);
// Depodaki gerçek kayıtlar her zaman geçerli olmalı; biri bozuksa CI kırmızı olur.
expect('depodaki kayıtlar geçerli', live.invalid, []);

console.log(fail ? `\n${fail} test başarısız` : '\nTüm testler geçti');
process.exit(fail ? 1 : 0);
