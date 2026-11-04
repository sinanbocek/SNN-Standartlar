// Sosyal medya ölçü dosyası testleri. Çalıştır: node quality/test/social-media-sizes.test.js
'use strict';
const fs = require('fs');
const path = require('path');
const { problems, standardProblems, listing } = require('../social-media-sizes');

let fail = 0;
const expect = (name, actual, wanted) => {
  const ok = JSON.stringify(actual) === JSON.stringify(wanted);
  if (!ok) fail += 1;
  console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : `\n    gelen: ${JSON.stringify(actual)}\n    beklenen: ${JSON.stringify(wanted)}`}`);
};

const sample = (zone = {}) => ({
  sources: { s: 'kaynak' },
  canvases: [{ id: 'c', width: 100, height: 200, zones: [{ id: 'z', kind: 'crop', box: [0, 0, 10, 200], evidence: 'meta', source: 's', date: '2026-11-03', ...zone }] }],
});

console.log('— ölçü dosyası');
expect('sağlam kayıt geçer', problems(sample()), []);
expect('kanıtsız sayı reddedilir', problems(sample({ evidence: undefined })).length, 1);
expect('bilinmeyen kanıt reddedilir', problems(sample({ evidence: 'sanirim' })).length, 1);
expect('tarihsiz sayı reddedilir', problems(sample({ date: 'kasim' })).length, 1);
expect('tanımsız kaynak reddedilir', problems(sample({ source: 'yok' })).length, 1);
expect('tuvali aşan kutu reddedilir', problems(sample({ box: [0, 0, 101, 200] })).length, 1);
expect('boş kutu reddedilir', problems(sample({ box: [10, 0, 10, 200] })).length, 1);

console.log('— standart tablosu');
const row = '| `z` | [0, 0, 10, 200] | `meta` |';
expect('aynı satır geçer', standardProblems(sample(), row), []);
expect('satır yoksa kırılır', standardProblems(sample(), '').length, 1);
expect('kutu farklıysa kırılır', standardProblems(sample({ box: [0, 0, 11, 200] }), row).length, 1);
expect('kanıt farklıysa kırılır', standardProblems(sample({ evidence: 'ikincil' }), row).length, 1);

console.log('— liste');
expect('yaş gün olarak yazılır', listing(sample(), '2026-11-05'), ['z  [0,0,10,200]  meta  2026-11-03 (2 gün önce)']);

console.log('— gerçek dosyalar');
const root = path.join(__dirname, '..', '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'quality', 'data', 'social-media-sizes.json'), 'utf8'));
const standard = fs.readFileSync(path.join(root, 'standartlar', 'sosyal-medya-olcu-standardi.md'), 'utf8');
expect('ölçü dosyası sağlam', problems(data), []);
expect('standart tablosu veriyle aynı', standardProblems(data, standard), []);

const box = (id) => data.canvases.flatMap((c) => c.zones).find((z) => z.id === id).box;
expect('Meta üst %14', box('meta-ad-top')[3], Math.round(1920 * 0.14));
expect('Meta alt %35', 1920 - box('meta-ad-bottom')[1], Math.round(1920 * 0.35));
expect('Meta yan %6', box('meta-ad-left')[2], Math.round(1080 * 0.06));
expect('gönderi ızgarası 3:4 kutudan', box('post-grid-left')[2], Math.round((1080 - (1350 * 3) / 4) / 2));
expect('kapak ızgarası 3:4 kutudan', box('cover-grid-top')[3], (1920 - (1080 * 4) / 3) / 2);

if (fail) {
  console.log(`\n${fail} test başarısız`);
  process.exit(1);
}
console.log('\nTüm testler geçti');
