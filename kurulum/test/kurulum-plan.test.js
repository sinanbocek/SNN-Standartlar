// Proje kurulum planı testleri (saf). Çalıştır: node kurulum/test/kurulum-plan.test.js
'use strict';
const K = require('../lib/kurulum-plan');
const { parseDebts, parseArchiveIds } = require('../../borc-senkron/lib/borc');

let fail = 0;
const expect = (name, actual, wanted) => {
  const ok = JSON.stringify(actual) === JSON.stringify(wanted);
  if (!ok) fail += 1;
  console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : `\n    gelen: ${JSON.stringify(actual)}\n    beklenen: ${JSON.stringify(wanted)}`}`);
};
const base = (over = {}) => ({
  repo: { owner: 'sinanbocek', name: 'Yeni-Proje', full: 'sinanbocek/Yeni-Proje', isPublic: false },
  admin: true, debt: 'yok', archive: false,
  workflows: { 'teknik-borc.yml': false, 'anahtar-tarama.yml': false },
  board: false, secret: false, deleteBranchOnMerge: false, vulnAlerts: false, securityFixes: false, ...over,
});
const ids = (steps, who, status) => steps.filter((s) => (!who || s.who === who) && (!status || s.status === status)).map((s) => s.id);

console.log('— sıfırdan yeni proje');
let s = K.plan(base());
expect('betiğin yapacakları', ids(K.pending(s)), ['kutuk', 'arsiv', 'teknik-borc-akisi', 'anahtar-tarama-akisi', 'board', 'dal-silme', 'guvenlik-uyarilari', 'guvenlik-duzeltme']);
expect('kullanıcıya kalan yalnız anahtar', ids(K.userTasks(s)), ['anahtar']);
expect('anahtar adımı değeri istemez, bağlantı verir', s.find((x) => x.id === 'anahtar').why.includes('settings/secrets/actions') && s.find((x) => x.id === 'anahtar').why.includes('sohbete yazılmaz'), true);

console.log('— tamamen kurulu proje');
s = K.plan(base({ debt: 'standart', archive: true, workflows: { 'teknik-borc.yml': true, 'anahtar-tarama.yml': true }, board: true, secret: true, deleteBranchOnMerge: true, vulnAlerts: true, securityFixes: true }));
expect('yapılacak iş yok', [K.pending(s).length, K.userTasks(s).length], [0, 0]);

console.log('— sınırlar');
s = K.plan(base({ admin: false, repo: { owner: 'globalhedef', name: 'x', full: 'globalhedef/x' } }));
expect('yönetici değilse ayarlar kullanıcıya', ids(K.userTasks(s)), ['anahtar', 'dal-silme', 'guvenlik-uyarilari', 'guvenlik-duzeltme']);
s = K.plan(base({ admin: false, deleteBranchOnMerge: null }));
expect('ölçülemeyen ayar "açtıysan atla" der', s.find((x) => x.id === 'dal-silme').why.includes('açtıysan bu adımı atla'), true);
s = K.plan(base({ debt: 'standart-disi (TECH_DEBT.md)' }));
expect('eski kütük varsa yeni kütük AÇILMAZ, karar kullanıcıda', [ids(K.pending(s)).includes('kutuk'), ids(K.userTasks(s)).includes('kutuk'), ids(s).includes('arsiv')], [false, true, false]);
expect('eski kütük dosya adı söylenir', s.find((x) => x.id === 'kutuk').why.includes('TECH_DEBT.md'), true);
expect('GitHub deposu yoksa tek adım: depo aç', ids(K.plan(base({ repo: null }))), ['github-deposu']);
expect('ölçülemeyen anahtar "olculemedi" olarak kullanıcıya', K.plan(base({ secret: null })).find((x) => x.id === 'anahtar').status, 'olculemedi');

console.log('— şablonlar standart ayrıştırıcıyla uyumlu');
expect('boş kütük: 0 kayıt, hata yok', parseDebts(K.debtFileTemplate()).length, 0);
expect('boş arşiv: 0 kapanış', parseArchiveIds(K.archiveFileTemplate()).length, 0);
expect('board adı', K.BOARD_TITLE('Yeni-Proje'), 'Yeni-Proje · Teknik Borç');

console.log(fail ? `\n✗ ${fail} test başarısız` : '\n✓ tümü geçti');
process.exit(fail ? 1 : 0);
