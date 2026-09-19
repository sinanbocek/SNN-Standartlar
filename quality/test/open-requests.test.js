// Açık talep kapısı testleri. Çalıştır: node quality/test/open-requests.test.js
//
// NEDEN (2026-09-19): kütükteki son kayıt kapandı, oturum "iş kalmadı" dedi ve aynı anda DÖRT
// açık talep duruyordu. Proje sahibi: "bu tek başına yetmez, sadece iyi niyet göstergesidir;
// kurala girmeli ve makine zorlaması olmalı." Bu testler o zorlamayı sabitler.
'use strict';
const t = require('../open-requests');

let fail = 0;
const expect = (name, actual, wanted) => {
  const ok = JSON.stringify(actual) === JSON.stringify(wanted);
  if (!ok) fail += 1;
  console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : `\n    gelen: ${JSON.stringify(actual)}\n    beklenen: ${JSON.stringify(wanted)}`}`);
};

const NOW = Date.parse('2026-09-19T12:00:00Z');
const daysAgo = (n) => new Date(NOW - n * 86400000).toISOString();
const issue = (number, over = {}) => ({ number, title: `talep ${number}`, state: 'OPEN', comments: 0, createdAt: daysAgo(0), ...over });

console.log('— yanıtsızlık ölçütü');
expect('yorumsuz açık talep yanıtsızdır', t.isUnanswered(issue(1)), true);
expect('yorum almış talep yanıtlıdır', t.isUnanswered(issue(2, { comments: 1 })), false);
expect('kapalı talep yanıtsız sayılmaz', t.isUnanswered(issue(3, { state: 'CLOSED' })), false);

console.log('— yaş');
expect('bugün açılan 0 gün', t.ageInDays(issue(1), NOW), 0);
expect('8 gün önce açılan 8 gün', t.ageInDays(issue(1, { createdAt: daysAgo(8) }), NOW), 8);

console.log('— sınıflandırma');
const rows = [
  issue(10, { createdAt: daysAgo(9) }),                        // yanıtsız + eski → SESSİZ
  issue(11, { createdAt: daysAgo(2) }),                        // yanıtsız + yeni → bekliyor
  issue(12, { createdAt: daysAgo(30), comments: 2 }),          // yanıt almış
  issue(13, { createdAt: daysAgo(99), state: 'CLOSED' }),      // kapalı → hiç sayılmaz
];
const r = t.classify(rows, NOW, 7);
// EN KRİTİK SATIR: bu boş dönerse kapı hiçbir şey yakalamaz ve "iyi niyet"e geri düşeriz.
expect('eşiği aşmış yanıtsız talep yakalanır', r.silent.map((i) => i.number), [10]);
expect('eşiğin altındaki yanıtsız talep kırmızı yapmaz', r.waiting.map((i) => i.number), [11]);
expect('yanıt almış talep sessiz sayılmaz', r.answered.map((i) => i.number), [12]);
expect('kapalı talep hiç sayılmaz', r.silent.concat(r.waiting, r.answered).some((i) => i.number === 13), false);

// Eşik tam gününde tetiklenir (7. gün dahil): "7 günden uzun" belirsizliği teste bağlandı.
expect('eşik günü dahildir', t.classify([issue(20, { createdAt: daysAgo(7) })], NOW, 7).silent.length, 1);
expect('eşiğin bir gün altı tetiklemez', t.classify([issue(21, { createdAt: daysAgo(6) })], NOW, 7).silent.length, 0);
expect('eşik dışarıdan değiştirilebilir', t.classify([issue(22, { createdAt: daysAgo(9) })], NOW, 14).silent.length, 0);

console.log('— rapor');
expect('talep yoksa temiz rapor', t.report(t.classify([], NOW)), '✓ Açık talep yok.');
const text = t.report(r, 7);
expect('sessiz talep açıkça işaretlenir', /✗ #10 \(9 gün\) HİÇ YANITLANMADI/.test(text), true);
expect('bekleyen talep kırmızı işaretlenmez', /✗ #11/.test(text), false);
// Kapı ne yapılacağını söylemeli; yoksa okuyan kişi "ne bekleniyor?" diye kalır.
expect('rapor ne yapılacağını söyler', text.includes('GERI-BILDIRIM-KAYDI.md'), true);
expect('reddetmenin de cevap olduğu yazılır', text.includes('Reddetmek de bir cevaptır'), true);

console.log('— bugünün gerçek durumu');
// 2026-09-19'da beş talep geldi ve beşi de AYNI GÜN yanıtlandı; kapı o gün kırmızı vermezdi.
// Kapının işi "talep var" demek değil, "talep SESSİZ kaldı" demektir.
const bugun = [10, 11, 12, 13, 14].map((n) => issue(n, { comments: 1 }));
expect('aynı gün yanıtlanan talepler kırmızı yapmaz', t.classify(bugun, NOW, 7).silent, []);

console.log(fail ? `\n${fail} test başarısız` : '\nTüm testler geçti');
process.exit(fail ? 1 : 0);
