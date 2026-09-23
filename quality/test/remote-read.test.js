// Uzak okuma (var / yok / okunamadı) testleri. Çalıştır: node quality/test/remote-read.test.js
'use strict';
const { classify, readRemote, familyRepos, report } = require('../remote-read');

let fail = 0;
const expect = (name, actual, wanted) => {
  const ok = JSON.stringify(actual) === JSON.stringify(wanted);
  if (!ok) fail += 1;
  console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : `\n    gelen: ${JSON.stringify(actual)}\n    beklenen: ${JSON.stringify(wanted)}`}`);
};

// gh'nin gerçek hata metni (2026-09-23'te ölçüldü): yanlış depo adı da, var olan depoda
// olmayan dosya da BİREBİR aynı satırı verir. Metne bakarak ikisi ayrılamaz.
const NOT_FOUND = 'gh: Not Found (HTTP 404)';
const fakeGh = (table) => (args) => {
  const key = args.find((a) => a.startsWith('repos/'));
  if (key in table) return table[key];
  return { ok: false, err: NOT_FOUND };
};
const encode = (s) => JSON.stringify({ type: 'file', content: Buffer.from(s).toString('base64') });

console.log('— sınıflandırma');
expect('okunan dosya var', classify({ fileOk: true }), 'var');
expect('404 ve depo okunuyor → yok', classify({ fileOk: false, notFound: true, repoOk: true }), 'yok');
expect('404 ve depo okunamıyor → okunamadı', classify({ fileOk: false, notFound: true, repoOk: false }), 'okunamadi');
expect('404 dışı hata → okunamadı', classify({ fileOk: false, notFound: false, repoOk: true }), 'okunamadi');

console.log('— gerçek vakalar');
// 2026-09-23: GHS-Panel yanlış depo adıyla (globalhedef/GHS-Panel) sorgulandı; 404 "adres yok"
// diye okundu. Doğru depo globalhedef/global-hedef-web-platform ve adres oradaydı.
const ghs = readRemote('globalhedef/GHS-Panel', 'docs/teknik-borc.md', fakeGh({}));
expect('yanlış depo adı yok değil okunamadı', ghs.state, 'okunamadi');
expect('okunamama sebebi yazılır', /depo okunamadı/.test(ghs.reason), true);
// 2026-09-23: ihale-mcp yerel klasörde durduğu için aile projesi sayıldı; aile listesinde dışlanmıştı.
const repos = familyRepos();
expect('dışlanan depo listede yok', repos.includes('saidsurucu/ihale-mcp'), false);
expect('GHS gerçek depo adıyla listede', repos.includes('globalhedef/global-hedef-web-platform'), true);

console.log('— okuma');
const table = {
  'repos/a/b/contents/docs/k.md': { ok: true, out: encode('> **Standart:** `x`\n') },
  'repos/a/b': { ok: true, out: '{"full_name":"a/b"}' },
  'repos/a/c': { ok: true, out: '{"full_name":"a/c"}' },
  'repos/a/d/contents/docs/k.md': { ok: false, err: 'gh: Bad credentials (HTTP 401)' },
  'repos/a/d': { ok: true, out: '{"full_name":"a/d"}' },
  'repos/a/e/contents/.github/workflows': { ok: true, out: JSON.stringify([{ name: 'x.yml' }, { name: 'y.yml' }]) },
};
const gh = fakeGh(table);
expect('dosya içeriği okunur', readRemote('a/b', 'docs/k.md', gh).text, '> **Standart:** `x`\n');
expect('olmayan dosya yok', readRemote('a/c', 'docs/k.md', gh).state, 'yok');
expect('yetki hatası okunamadı', readRemote('a/d', 'docs/k.md', gh).state, 'okunamadi');
expect('klasör içeriği listelenir', readRemote('a/e', '.github/workflows', gh).entries, ['x.yml', 'y.yml']);

console.log('— rapor');
const rows = [
  { repo: 'a/b', state: 'var', match: '> **Standart:** `x`' },
  { repo: 'a/c', state: 'yok' },
  { repo: 'a/d', state: 'okunamadi', reason: 'gh: Bad credentials (HTTP 401)' },
];
const text = report('docs/k.md', rows);
expect('üç durum ayrı sayılır', /1 var · 1 yok · 1 okunamadı/.test(text), true);
expect('okunamayan sebebiyle yazılır', /okunamadı\s+a\/d.*HTTP 401/.test(text), true);
expect('eşleşen satır gösterilir', text.includes('> **Standart:** `x`'), true);

console.log(fail ? `\n✗ ${fail} test başarısız` : '\n✓ Tüm testler geçti');
process.exit(fail ? 1 : 0);
