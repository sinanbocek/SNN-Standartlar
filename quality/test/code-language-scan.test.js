// Kod dili taraması testleri. Çalıştır: node quality/test/code-language-scan.test.js
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const t = require('../code-language-scan');

let fail = 0;
const expect = (name, actual, wanted) => {
  const ok = JSON.stringify(actual) === JSON.stringify(wanted);
  if (!ok) fail += 1;
  console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : `\n    gelen: ${JSON.stringify(actual)}\n    beklenen: ${JSON.stringify(wanted)}`}`);
};
const words = new Set(JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'turkish-words.json'), 'utf8')).words);
const names = (line, sql = false) => t.lineFindings(line, words, sql).map((b) => b.name);

console.log('— parçalama');
expect('camelCase', t.splitWords('gunSonuKaydi'), ['gun', 'sonu', 'kaydi']);
expect('snake_case', t.splitWords('cekilme_zamani'), ['cekilme', 'zamani']);
expect('PascalCase + kısaltma', t.splitWords('HTTPSunucu'), ['http', 'sunucu']);
expect('Türkçe harf ASCII\'ye katlanır', t.splitWords('gözlemSayısı'), ['gozlem', 'sayisi']);

console.log('— tek tanımlayıcı');
expect('Türkçe harf yakalanır', t.identifierProblem('sapmaOranı', words).reason, 'Türkçe harf');
expect('Türkçe kelime yakalanır', t.identifierProblem('gun_sonu', words).reason, 'Türkçe kelime: gun');
expect('çekim eki (zamani → zaman)', t.identifierProblem('apiZamani', words).reason, 'Türkçe kelime: zaman');
expect('ilk Türkçe parça raporlanır', t.identifierProblem('cekilmeZamani', words).reason, 'Türkçe kelime: cekilme');
expect('İngilizce ad geçer', t.identifierProblem('dayEndSnapshot', words), null);
expect('İngilizce ad geçer (snake)', t.identifierProblem('observed_at', words), null);
expect('İngilizce kısaltma geçer', t.identifierProblem('maxDeviationBps', words), null);

console.log('— yalnız tanımlayıcı taranır');
expect('kodda Türkçe ad yakalanır', names("const gunSonu = 1;"), ['gunSonu']);
expect('satır yorumundaki Türkçe yakalanmaz', names('const x = 1; // gün sonu değeri hesaplanır'), []);
expect('blok yorum gövdesi yakalanmaz', names(' * gozlem tablosundaki zaman sütunu'), []);
expect('satır içi blok yorum yakalanmaz', names('const x = 1; /* gun_sonu tablosu */'), []);
expect('dizge içeriği yakalanmaz', names("throw new Error('Gün sonu değeri bulunamadı');"), []);
expect('çift tırnaklı dizge yakalanmaz', names('const msg = "kaynak zinciri boş";'), []);
expect('şablon dizge yakalanmaz', names('const msg = `gözlem yok: ${count}`;'), []);
expect('dizgeden sonra gelen ad yine taranır', names("const durumKodu = t('mesaj metni');"), ['durumKodu']);
expect('JSON alan adı yakalanır', names('const body = { deger: 1, zaman: 2 };'), ['deger', 'zaman']);
expect('SQL satır yorumu yakalanmaz', names('create table observations ( -- gözlem tablosu', true), []);
expect('SQL tablo/sütun adı yakalanır', names('create table gozlem ( cekilme_zamani timestamptz );', true), ['gozlem', 'cekilme_zamani']);
expect('SQL dizgesi yakalanmaz', names("insert into daily_close values ('gün sonu');", true), []);

console.log('— JSX/HTML metni taranmaz (kullanıcıya görünen yazı)');
expect('etiketler arası yazı', names('<label className="block text-xs">Poliçe Durumu</label>'), []);
expect('düz metin satırı', names('Dönem ortasında iptal ve prim iadesi için Poliçeler ekranını kullanın.'), []);
expect('satır sonuna sarkan metin', names('<div className="title">Poliçe'), []);
expect('satır başındaki metin devamı', names('Hatırlatıcı</div>'), []);
expect('süslü parantezli ifade korunur', names('<div>{gunSonu}</div>'), ['gunSonu']);
expect('JSX özniteliği taranır', names('<Input value={gunSonu} onChange={(e) => setGunSonu(e.target.value)} />'), ['gunSonu', 'setGunSonu']);
expect('JSX içindeki İngilizce metin de atılır (zararsız)', names('<span>Policy status</span>'), []);

expect('parantezli JSX yazısı', names('<span className="b">Altın (Gram) Değişim</span>'), []);
expect('tek kelimelik JSX satırı', names('İptal'), []);
expect('düzenli ifade gövdesi taranmaz', names('change(/Tedarikçiye ödeme günü/, "-30");'), []);
expect('bölme işareti düzenli ifade sanılmaz', names('const oran = toplam / adet;'), ['oran','toplam','adet']);

console.log('— dosya ve klasör adları');
expect('Türkçe dosya adı yakalanır', t.pathFindings('src/gun-sonu.ts', words).map((b) => b.name), ['gun-sonu']);
expect('Türkçe klasör adı yakalanır', t.pathFindings('src/kaynak/reader.ts', words).map((b) => b.name), ['kaynak']);
expect('İngilizce yol geçer', t.pathFindings('src/chain/source-chain.test.ts', words), []);

console.log('— istisna listesi');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kod-dili-'));
fs.writeFileSync(path.join(root, '.snn-kod-dili.json'), JSON.stringify({
  exceptions: [
    { name: 'plaka', reason: 'Türkiye tescil plakası; İngilizce karşılığı kavramı taşımıyor (TB-012)' },
    { name: 'gozlem' },
  ],
  paths: [{ path: 'supabase/migrations/2026*', reason: 'canlıya uygulanmış migration değişmez' }],
}));
const exception = t.readExceptions(root);
expect('gerekçeli ad istisnası okunur', exception.names.has('plaka'), true);
expect('gerekçesiz istisna sayılmaz', exception.names.has('gozlem'), false);
expect('gerekçesiz istisna uyarı üretir', exception.warnings.length, 1);
expect('yol istisnası eşleşir', exception.paths[0].test('supabase/migrations/20260917185100_piyasa_temel.sql'), true);
expect('yol istisnası başka yolu tutmaz', exception.paths[0].test('src/gun-sonu.ts'), false);
expect('istisna dosyası yoksa boş döner', t.readExceptions(path.join(root, 'yok')).names.size, 0);
fs.rmSync(root, { recursive: true, force: true });

console.log('— diff ayrıştırma');
const diff = [
  '+++ b/src/gun-sonu.ts',
  '@@ -0,0 +1,2 @@',
  '+const gunSonu = 1;',
  '+const dayEnd = 2;',
].join('\n');
expect('yalnız eklenen satırlar', t.addedLines(diff).map((s) => s.line), [1, 2]);

console.log('— rapor');
expect('bulgu yoksa yeşil', t.report({ findings: [] }, 'diff').includes('✓'), true);
expect('bulgu varsa kırmızı ve ad görünür', t.report({ findings: [{ file: 'a.ts', line: 3, name: 'gunSonu', reason: 'Türkçe kelime: gun' }] }, 'diff').includes('gunSonu'), true);
expect('rapor kural dosyasına yönlendirir', t.report({ findings: [{ file: 'a.ts', line: 3, name: 'x', reason: 'y' }] }, 'diff').includes('kod-dili-standardi.md'), true);

console.log(fail ? `\n${fail} test başarısız` : '\nTüm testler geçti');
process.exit(fail ? 1 : 0);
