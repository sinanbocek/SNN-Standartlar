// Kod dili taraması testleri. Çalıştır: node kalite/test/kod-dili-tarama.test.js
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const t = require('../kod-dili-tarama');

let fail = 0;
const expect = (name, actual, wanted) => {
  const ok = JSON.stringify(actual) === JSON.stringify(wanted);
  if (!ok) fail += 1;
  console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : `\n    gelen: ${JSON.stringify(actual)}\n    beklenen: ${JSON.stringify(wanted)}`}`);
};
const kelimeler = new Set(JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'veri', 'turkce-kelimeler.json'), 'utf8')).kelimeler);
const adlar = (satir, sql = false) => t.satirBulgulari(satir, kelimeler, sql).map((b) => b.ad);

console.log('— parçalama');
expect('camelCase', t.parcala('gunSonuKaydi'), ['gun', 'sonu', 'kaydi']);
expect('snake_case', t.parcala('cekilme_zamani'), ['cekilme', 'zamani']);
expect('PascalCase + kısaltma', t.parcala('HTTPSunucu'), ['http', 'sunucu']);
expect('Türkçe harf ASCII\'ye katlanır', t.parcala('gözlemSayısı'), ['gozlem', 'sayisi']);

console.log('— tek tanımlayıcı');
expect('Türkçe harf yakalanır', t.tanimlayiciSorunu('sapmaOranı', kelimeler).neden, 'Türkçe harf');
expect('Türkçe kelime yakalanır', t.tanimlayiciSorunu('gun_sonu', kelimeler).neden, 'Türkçe kelime: gun');
expect('çekim eki (zamani → zaman)', t.tanimlayiciSorunu('apiZamani', kelimeler).neden, 'Türkçe kelime: zaman');
expect('ilk Türkçe parça raporlanır', t.tanimlayiciSorunu('cekilmeZamani', kelimeler).neden, 'Türkçe kelime: cekilme');
expect('İngilizce ad geçer', t.tanimlayiciSorunu('dayEndSnapshot', kelimeler), null);
expect('İngilizce ad geçer (snake)', t.tanimlayiciSorunu('observed_at', kelimeler), null);
expect('İngilizce kısaltma geçer', t.tanimlayiciSorunu('maxDeviationBps', kelimeler), null);

console.log('— yalnız tanımlayıcı taranır');
expect('kodda Türkçe ad yakalanır', adlar("const gunSonu = 1;"), ['gunSonu']);
expect('satır yorumundaki Türkçe yakalanmaz', adlar('const x = 1; // gün sonu değeri hesaplanır'), []);
expect('blok yorum gövdesi yakalanmaz', adlar(' * gozlem tablosundaki zaman sütunu'), []);
expect('satır içi blok yorum yakalanmaz', adlar('const x = 1; /* gun_sonu tablosu */'), []);
expect('dizge içeriği yakalanmaz', adlar("throw new Error('Gün sonu değeri bulunamadı');"), []);
expect('çift tırnaklı dizge yakalanmaz', adlar('const msg = "kaynak zinciri boş";'), []);
expect('şablon dizge yakalanmaz', adlar('const msg = `gözlem yok: ${count}`;'), []);
expect('dizgeden sonra gelen ad yine taranır', adlar("const durumKodu = t('mesaj metni');"), ['durumKodu']);
expect('JSON alan adı yakalanır', adlar('const body = { deger: 1, zaman: 2 };'), ['deger', 'zaman']);
expect('SQL satır yorumu yakalanmaz', adlar('create table observations ( -- gözlem tablosu', true), []);
expect('SQL tablo/sütun adı yakalanır', adlar('create table gozlem ( cekilme_zamani timestamptz );', true), ['gozlem', 'cekilme_zamani']);
expect('SQL dizgesi yakalanmaz', adlar("insert into daily_close values ('gün sonu');", true), []);

console.log('— dosya ve klasör adları');
expect('Türkçe dosya adı yakalanır', t.yolBulgulari('src/gun-sonu.ts', kelimeler).map((b) => b.ad), ['gun-sonu']);
expect('Türkçe klasör adı yakalanır', t.yolBulgulari('src/kaynak/reader.ts', kelimeler).map((b) => b.ad), ['kaynak']);
expect('İngilizce yol geçer', t.yolBulgulari('src/chain/source-chain.test.ts', kelimeler), []);

console.log('— istisna listesi');
const kok = fs.mkdtempSync(path.join(os.tmpdir(), 'kod-dili-'));
fs.writeFileSync(path.join(kok, '.snn-kod-dili.json'), JSON.stringify({
  istisnalar: [
    { ad: 'plaka', gerekce: 'Türkiye tescil plakası; İngilizce karşılığı kavramı taşımıyor (TB-012)' },
    { ad: 'gozlem' },
  ],
  yollar: [{ yol: 'supabase/migrations/2026*', gerekce: 'canlıya uygulanmış migration değişmez' }],
}));
const istisna = t.istisnaOku(kok);
expect('gerekçeli ad istisnası okunur', istisna.adlar.has('plaka'), true);
expect('gerekçesiz istisna sayılmaz', istisna.adlar.has('gozlem'), false);
expect('gerekçesiz istisna uyarı üretir', istisna.uyarilar.length, 1);
expect('yol istisnası eşleşir', istisna.yollar[0].test('supabase/migrations/20260917185100_piyasa_temel.sql'), true);
expect('yol istisnası başka yolu tutmaz', istisna.yollar[0].test('src/gun-sonu.ts'), false);
expect('istisna dosyası yoksa boş döner', t.istisnaOku(path.join(kok, 'yok')).adlar.size, 0);
fs.rmSync(kok, { recursive: true, force: true });

console.log('— diff ayrıştırma');
const diff = [
  '+++ b/src/gun-sonu.ts',
  '@@ -0,0 +1,2 @@',
  '+const gunSonu = 1;',
  '+const dayEnd = 2;',
].join('\n');
expect('yalnız eklenen satırlar', t.eklenenSatirlar(diff).map((s) => s.line), [1, 2]);

console.log('— rapor');
expect('bulgu yoksa yeşil', t.rapor({ bulgular: [] }, 'diff').includes('✓'), true);
expect('bulgu varsa kırmızı ve ad görünür', t.rapor({ bulgular: [{ file: 'a.ts', line: 3, ad: 'gunSonu', neden: 'Türkçe kelime: gun' }] }, 'diff').includes('gunSonu'), true);
expect('rapor kural dosyasına yönlendirir', t.rapor({ bulgular: [{ file: 'a.ts', line: 3, ad: 'x', neden: 'y' }] }, 'diff').includes('kod-dili-standardi.md'), true);

console.log(fail ? `\n${fail} test başarısız` : '\nTüm testler geçti');
process.exit(fail ? 1 : 0);
