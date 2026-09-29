// Oturum açılışı ek satırları testleri. Çalıştır: node quality/test/session-lines.test.js
'use strict';
const sl = require('../session-lines');
const q = require('../actions-quota');

let fail = 0;
const expect = (name, actual, wanted) => {
  const ok = JSON.stringify(actual) === JSON.stringify(wanted);
  if (!ok) fail += 1;
  console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : `\n    gelen: ${JSON.stringify(actual)}\n    beklenen: ${JSON.stringify(wanted)}`}`);
};
const row = (repo, minutes) => ({ product: 'actions', unitType: 'Minutes', repositoryName: repo, quantity: minutes });
const quotaLine = (summary) => sl.lines('.', { summary: () => summary, owner: 'sinanbocek' }).find((l) => l.includes('Actions')) || '';

console.log('— Actions kota satırı (2026-09-29)');
// VAKA: 19 Eylül'de gizli depolar 2.045 dk'ya ulaştı; haftalık kota raporu yalnız akış özetinde
// kaldı, kimse görmedi. O gün açılış satırı olsaydı: 2.045/3.000 (%68), gidiş ~3.229 → ⚠.
const line19 = quotaLine(q.summarize([row('Gunum-Var', 2045)], { day: 19, daysInMonth: 30 }));
expect('19 Eylül: gidiş sınırı aşıyor → uyarı', line19.trim().startsWith('⚠ Actions: 2.045/3.000 dk (%68)'), true);
expect('gidiş yazılır', line19.includes('ay sonu gidişi ~3.229'), true);
expect('ay başı sakin gidiş → uyarısız', quotaLine(q.summarize([row('A', 200)], { day: 10, daysInMonth: 30 })).trim().startsWith('Actions: 200/3.000'), true);
expect('%80 dolunca gidiş düşük olsa da uyarır', q.sessionLine({ billable: 2400, projected: null }).startsWith('⚠'), true);
// Okunamadı ≠ iyi (olcum-standardi.md, Kural 3): ölçülemeyen kota sessiz geçilmez.
expect('ölçülemezse bunu söyler', quotaLine(null).includes('ölçülemedi'), true);
console.log('— başka hesaptaki proje (GHS-Panel, 2026-09-29)');
// VAKA: GHS-Panel globalhedef hesabında. Açılış sinanbocek'in "2.848/3.000" sayısını gösteriyordu;
// o gün asıl kilitli olan globalhedef hesabıydı (işler "spending limit" ile başlamıyordu).
const ghs = sl.lines('.', { owner: 'globalhedef', summary: () => q.summarize([row('Gunum-Var', 2848)], { day: 29, daysInMonth: 30 }) }).join('\n');
expect('başka hesapta bu hesabın sayısı gösterilmez', ghs.includes('2.848'), false);
expect('hangi hesap olduğu yazılır', ghs.includes('globalhedef hesabı'), true);
expect('okunamadığı söylenir (sayı uydurulmaz)', ghs.includes('okunamıyor'), true);
expect('sahip okunamazsa bu hesap sayılır', q.ownsQuota(''), true);
expect('büyük harf fark etmez', q.ownsQuota('SinanBocek'), true);

expect('ölçüm çökse de satırlar döner', Array.isArray(sl.lines('.', { summary: () => { throw new Error('x'); } })), true);

console.log(fail ? `\n✗ ${fail} test başarısız` : '\n✓ tümü geçti');
process.exit(fail ? 1 : 0);
