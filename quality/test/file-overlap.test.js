// Dosya örtüşme ölçümü testleri. Çalıştır: node quality/test/file-overlap.test.js
// Vakalar 2026-10-09 ölçümünden: Portföy kopyası, Games sıralısı, Piyasa farklı dalı, GHS gerçeği.
'use strict';
const o = require('../file-overlap');

let fail = 0;
const expect = (name, actual, wanted) => {
  const ok = JSON.stringify(actual) === JSON.stringify(wanted);
  if (!ok) fail += 1;
  console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : `\n    gelen: ${JSON.stringify(actual)}\n    beklenen: ${JSON.stringify(wanted)}`}`);
};
const T0 = Date.parse('2026-09-25T12:00:00Z');
const min = (n) => T0 + n * 60000;
const ev = (session, t, file, extra = {}) => ({ project: 'P', session, t, file, branch: 'main', cwd: 'c:/p', ...extra });

console.log('— çakışma üretimi');
// GHS-Panel 2026-09-25: iki oturum aynı karar belgesine 21 ve 35 dk arayla yazdı.
const ghs = [ev('A', min(0), 'docs/karar.md'), ev('B', min(35), 'docs/karar.md'), ev('A', min(56), 'docs/karar.md')];
expect('GHS vakası: iki çakışma', o.overlaps(ghs).map((x) => [x.session, x.by, Math.round(x.gap / 60000)]), [['B', 'A', 35], ['A', 'B', 21]]);
expect('aynı oturumun ardışık yazması çakışma değil', o.overlaps([ev('A', min(0), 'x'), ev('A', min(1), 'x')]), []);
expect('farklı dosya çakışma değil', o.overlaps([ev('A', min(0), 'x'), ev('B', min(1), 'y')]), []);
expect('iddia süresi dolunca çakışma değil', o.overlaps([ev('A', min(0), 'x'), ev('B', min(121), 'x')]), []);
expect('farklı proje aynı yol çakışma değil', o.overlaps([ev('A', min(0), 'x'), { ...ev('B', min(1), 'x'), project: 'Q' }]), []);
expect('dal ve klasör eşitliği işaretlenir', o.overlaps([ev('A', min(0), 'x'), ev('B', min(1), 'x', { branch: 'feat/a', cwd: 'c:/q' })]).map((x) => [x.sameBranch, x.sameCwd]), [[false, false]]);

console.log('— sınıflama');
const base = o.overlaps([ev('A', min(0), 'x'), ev('B', min(5), 'x')])[0];
// Portföy 2026-09-15: iki kayıt dosyası 540 ortak mesaj kimliği taşıyordu — tek usta.
expect('ortak geçmiş → kopya', o.classify(base, { lineage: () => true, lastSeen: () => null }), 'copy');
// SNN-Games 2026-09-30: önceki oturum 11:13'te bitmiş, sonraki 11:14'te başlamıştı.
expect('önceki oturum bitmişse → sıralı', o.classify(base, { lineage: () => false, lastSeen: (s) => (s === 'A' ? min(2) : null) }), 'sequential');
// Piyasa-Core 2026-09-28: aynı klasör, farklı dal.
expect('farklı dal → dal', o.classify({ ...base, sameBranch: false }, { lineage: () => false, lastSeen: () => min(60) }), 'branch');
// GHS-Panel 2026-09-25.
expect('aynı dal, ikisi canlı → gerçek', o.classify(base, { lineage: () => false, lastSeen: () => min(60) }), 'real');
expect('bağlam yoksa gerçek sayılır (iyimser değil, ihtiyatlı)', o.classify(base, {}), 'real');

console.log('— ortak geçmiş sayımı');
expect('ortak kimlik sayılır', o.sharedCount(new Set(['a', 'b', 'c']), new Set(['b', 'c', 'd'])), 2);
expect('boş kümeler çökmez', o.sharedCount(undefined, new Set(['a'])), 0);
expect('eşik 20', o.LINEAGE_MIN, 20);

console.log('— özet ve rapor (2026-10-09 ölçümünün biçimi)');
const list = [
  { ...base, by: 'K1', session: 'K2' }, { ...base, by: 'S1', session: 'S2' }, { ...base, by: 'D1', session: 'D2', sameBranch: false }, { ...base, by: 'G1', session: 'G2' },
];
const ctx = {
  lineage: (a) => a === 'K1',
  lastSeen: (s) => (s === 'S1' ? min(1) : min(60)),
};
const s = o.summarize(list, ctx);
expect('sınıflar sayılır', s.counts, { copy: 1, sequential: 1, branch: 1, real: 1 });
expect('gerçek vakalar listelenir', s.real.map((r) => r.session), ['G2']);
const r = o.report(s, { edits: 6457, sessions: 79, ttlMs: o.DEFAULT_TTL_MS });
expect('rapor kopya sayısını söyler', /kopya .*: 1/.test(r), true);
expect('rapor gerçek vakayı ve elle bakma gereğini söyler', /GERÇEK \(.*\):\s+1\b/.test(r) && /elle bak/.test(r), true);
expect('gerçek yoksa kilit gerekmez der', /kilidi gerekmez/.test(o.report(o.summarize([], ctx), { edits: 0, sessions: 0, ttlMs: 1 })), true);

console.log('— yol normalleştirme');
expect('ters bölü ve büyük harf eşitlenir', o.normalize('C:\\P\\Src\\A.ts'), 'c:/p/src/a.ts');

console.log('— okunamadı ≠ yok');
expect('kayıt klasörü yoksa okunamadı', o.scan({ dir: 'C:/olmayan-klasor-snn' }).state, 'okunamadi');

console.log(fail ? `\n${fail} test başarısız` : '\nTüm testler geçti');
process.exit(fail ? 1 : 0);
