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
// KAÇIŞLI BÖLÜ gövdeyi kapatmaz. 2026-09-19'da GHS-Panel oturumu bildirdi: banka belgesi
// eşleştiren düzenli ifadeler yanlış alarm veriyordu. Gövde `(?:[^/\n]|\.)+` yazılmıştı;
// niyet "ters bölü + herhangi karakter" idi ama `\.` düz NOKTA demek, bu yüzden `\/`
// görünce gövde erken kapanıyor ve kalanı KOD sayılıyordu.
// Bildirilen gerçek satır (GHS-Panel profiles.ts:32): İŞLEM, TUTARI, SORGU yanlış alarm verdi.
expect('kaçışlı bölü gövdeyi kapatmaz', names('pick(source, /GONDEREN AD SOYAD\\/UNVAN\\s*(.+?)(?=\\s*İŞLEM TUTARI|\\s*SORGU)/is)'), []);
expect('iki kaçışlı bölü arasındaki yazı', names('pick(source, /Gönderen\\s*\\/\\s*Açıklama:\\s*(.+)/i)'), []);
expect('adres kalıbı taranmaz', names('expect(url).toMatch(/^https:\\/\\/wa\\.me\\/\\?text=\\*Fiyat Teklifi\\*/);'), []);
// Ok fonksiyonu gövdesindeki düzenli ifade: açılış bağlamında `>` yoktu, hiç soyulmuyordu
// (aynı dosya, satır 65: `rest.find((part) => /[a-zçğıöşü]/i.test(part))`).
expect('ok fonksiyonundan sonra', names('rest.find((part) => /[a-zçğıöşü]/i.test(part));'), []);
// Düzeltme GERÇEK adları gizlememeli: düzenli ifadeden sonrası yine taranır.
expect('düzenli ifadeden sonraki ad yine taranır', names('const sonuc = /a\\/b/.test(x); const gunSonu = 1;'), ['sonuc', 'gunSonu']);

expect('metin + ifade aynı satırda: yazı atılır', names('{metrics.count} adet ödemenin kur bilgisi için TL'), []);
expect('metin + ifade: ifade içindeki kod taranır', names('{gunSonu} adet kayıt bulundu'), ['gunSonu']);
expect('ok işaretli olay bağlayıcısı kaçmaz', names('onChange={(e) => setGunSonu(e.target.value)}'), ['setGunSonu']);
expect('karşılaştırmalı JSX satırında yazı atılır', names('Kurum Adı {sortField === "name" ? 1 : 2}'), []);

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
expect('yol istisnası eşleşir', exception.paths[0].re.test('supabase/migrations/20260917185100_piyasa_temel.sql'), true);
expect('yol istisnası başka yolu tutmaz', exception.paths[0].re.test('src/gun-sonu.ts'), false);
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

console.log('— aile geneli kök istisnası');
{
  const aile = t.familyExceptions();
  expect('karar verilen dört kök istisnada', ['kasa', 'kurus', 'beyanname', 'mizan'].every((r) => aile.roots.has(r)), true);
  expect('gerekçesiz kayıt yok', aile.warnings.length, 0);

  const words = t.wordSet();
  expect('istisna kökü kelime listesinden düşer', words.has('kasa'), false);
  expect('istisna dışı kök listede kalır', words.has('hesap'), true);

  // Kök istisnası TÜREYEN adları da kapsar: karar ad değil kök bazındadır.
  expect('tradeKasa temiz', t.identifierProblem('tradeKasa', words), null);
  expect('bistKasaTL temiz', t.identifierProblem('bistKasaTL', words), null);
  expect('kurusFormat temiz', t.identifierProblem('kurusFormat', words), null);

  // ...ama adın İKİNCİ Türkçe kökü hâlâ yakalanır: istisna adı toptan affetmez.
  expect('bakiyeKurus hâlâ bulgu', (t.identifierProblem('bakiyeKurus', words) || {}).reason, 'Türkçe kelime: bakiye');
  expect('MizanSatiri hâlâ bulgu', (t.identifierProblem('MizanSatiri', words) || {}).reason, 'Türkçe kelime: satir');

  // Sabotaj: gerekçesiz kayıt kök listesine GİRMEMELİ, yoksa istisna sessizce genişler.
  const bozuk = t.familyRoots({ roots: [{ root: 'hesap' }, { root: 'kasa', reason: 'var' }] });
  expect('gerekçesiz kök sayılmaz', bozuk.roots.has('hesap'), false);
  expect('gerekçeli kök sayılır', bozuk.roots.has('kasa'), true);
  expect('gerekçesizlik uyarı üretir', bozuk.warnings.length, 1);
}


console.log('— CRLF satır sonu (2026-09-19 ölçümü)');
// Yorum soyma kuralları `.*$` ile biter; JS'te `.` satır sonunu eşleştirmez ve `$` dizge sonunu
// ister. Satır `\r` ile bitince yorum HİÇ soyulmuyordu ve içindeki Türkçe DÜZYAZI tanımlayıcı
// sanılıyordu. Ölçüm: 11 projede 26.060 bulgunun 9.938'i (%38,1) bu kaynaktandı. CI Linux'ta
// (LF) görünmüyordu — yalnız Windows çalışma kopyasında. Aşağıdaki satırlar gerçek dosyalardan.
expect('CRLF SQL yorumu taranmaz', names('-- Bu migration, uygulamanın ana iş mantığını destekleyen tabloları oluşturur.\r', true), []);
expect('CRLF JS yorumu taranmaz', names('// Bu satır; Türkçe açıklama içerir (örnek).\r'), []);
expect('LF JS yorumu taranmaz', names('// Bu satır; Türkçe açıklama içerir (örnek).'), []);
// Soyma FAZLA olmamalı: CRLF'li gerçek kod satırı yakalanmaya devam etmeli.
expect('CRLF kod satırı yakalanır', names('const kayitZamani = 1;\r'), ['kayitZamani']);
expect('CRLF SQL kodu yakalanır', names('create table kullanici_kaydi (id int);\r', true), ['kullanici_kaydi']);

console.log('— nesne alanı satırı');
// Yazı ölçütü yalnız `=` ve `;` arıyordu; nesne alanı satırında ikisi de yoktur, bu yüzden satır
// "ekran yazısı" sanılıp atılıyor ve içindeki Türkçe ad KAÇIYORDU. CRLF düzeltmesi bunu görünür
// kıldı: adı ayakta tutan şey YORUMDAKİ `=` işaretiydi. Ölçüm: aile genelinde 2.228 gerçek ad
// bu yüzden görünmüyordu; örneklerin hepsi okundu, JSX satırında tek bulgu çıkmadı (0/2.228).
expect('nesne alanı adı yakalanır', names('    netSatisKurus: 1295235481,'), ['netSatisKurus']);
expect('nesne alanı — CRLF ve yorumla', names('    netSatisKurus: 1295235481, // Yıllıklandırılmış = 1295235481 * 4\r'), ['netSatisKurus']);
expect('dizi alanı yakalanır', names('  kaynaklar: [],'), ['kaynaklar']);
// Ekran yazısı bu kalıba UYMAZ (sonunda virgül yoktur); yanlış alarm üretmemeli.
expect('ekran yazısı hâlâ atılır', names('          Durum: aktif'), []);
expect('etiket arası yazı hâlâ atılır', names('<label className="x">Poliçe Durumu</label>'), []);

console.log('— eşleşmeyen istisna (tüketici bildirimi #62, 2026-09-19)');
// Proje istisnası TAM TANIMLAYICI adı bekler; standarttaki örnek KÖK gibi görünüyordu.
// Bildiren kişi örneği birebir izledi: dosya geçerli, gerekçe dolu, tarayıcı SESSİZ, istisna ölü.
{
  const exception = { names: new Set(['plaka']), paths: [{ glob: 'x/*', re: /^x\/.*$/ }], used: new Set() };
  const unused = t.unusedExceptions(exception);
  expect('eşleşmeyen ad uyarı verir', unused.some((u) => u.includes('"plaka"')), true);
  expect('uyarı doğru biçimi söyler', unused.some((u) => u.includes('TAM tanımlayıcı')), true);
  expect('eşleşmeyen yol da uyarı verir', unused.some((u) => u.includes('"x/*"')), true);

  // Eşleşen istisna uyarı VERMEZ — yoksa doğru yazan kişi de gürültüye boğulur.
  const used = { names: new Set(['plaka_harfleri']), paths: [], used: new Set() };
  t.isExcepted({ name: 'PLAKA_HARFLERI' }, 'src/a.ts', used);
  expect('eşleşen istisna sessizdir', t.unusedExceptions(used), []);
  expect('eşleşme kaydedilir', used.used.has('ad:plaka_harfleri'), true);

  // ESKİ BİÇİM ÇÖKMEZ: yol istisnası 2026-09-19'da `{glob, re}` biçimine geçti. `isExcepted`
  // uyarı kipinden de çağrılıyor ve o HER Edit'te çalışıyor; orada çökmek yazmayı durdurur.
  const legacy = { names: new Set(), paths: [/^legacy\/.*$/], used: new Set() };
  expect('eski biçim yol istisnası çalışır', t.isExcepted({ name: 'kayit' }, 'legacy/a.ts', legacy), true);

  // Yol istisnası da kullanıldığında sessiz kalmalı.
  const byPath = { names: new Set(), paths: [{ glob: 'supabase/*', re: /^supabase\/.*$/ }], used: new Set() };
  expect('yol istisnası eşleşir', t.isExcepted({ name: 'kayit' }, 'supabase/x.sql', byPath), true);
  expect('kullanılan yol sessizdir', t.unusedExceptions(byPath), []);
}

console.log('— JSX ekran yazısı (tüketici bildirimleri #28 ve #64, 2026-09-19)');
// #64 · GHS-Panel: ÇOK SATIRLI metnin `;` taşıyan satırı yakalanıyor, alt satırı temiz geçiyordu.
// Noktalı virgül kodda deyimi BİTİRİR (satır sonu ya da `}`/`)` önü); düzyazıda ortada durur.
expect('cümle ortası noktalı virgül yazıdır', names('  Bu sınırların dışına çıkan dekont sessizce yazılmaz; gönderene'), []);
expect('deyim sonu noktalı virgül koddur', names('  const kayitZamani = 1;'), ['kayitZamani']);

// #28-1 · Nakit-Akış: "parantez varsa koddur" katılığı 16 yanlış alarm üretiyordu.
// Ayırt eden şey parantez değil, parantezin bir ADIN HEMEN ARDINDAN gelmesi.
expect('sarkan metinde parantez yazıdır', names('  <Folder size={16} /> Kuruma Ait İhaleler ({projects.length})'), []);
expect('ad+parantez çağrıdır, koddur', names('  sahte.from.mockReturnValue(zincirKur({ data: null }))').sort(), ['sahte', 'zincirKur']);
// Bildiren kişinin KORUMA örneği: bu ad kaçarsa düzeltme fazla geniş demektir.
expect('gerçek ad hâlâ yakalanır', names('  <input onChange={(e) => setSonucAlani(e)} />'), ['setSonucAlani']);

// #28-2 · HTML varlığındaki `;` satırı kod sanıyordu. Aynı cümle, tek fark `&quot;`.
expect('HTML varlığı yazıyı bozmaz', names('  Teklifler ayrı, &quot;teslimli toplam maliyet&quot; üzerinden'), []);

// Ölçüm sırasında bulunan üç GERİLEME — düzeltme fazla geniş olursa bunlar kaçar.
expect('anahtar kelime kod sayılır', names('  if (!baslik) return { error: 1 }'), ['baslik']);
expect('satırın başı kodsa sonu da koddur', names('  for (const { a } of geriYuklemeKuyrugu) {'), ['geriYuklemeKuyrugu']);
expect('tür bildirimi koddur', names('  const zincirler: Record<string, unknown>[] = []'), ['zincirler']);

// Türkçe "var" JavaScript anahtar kelimesiyle aynı yazılıyor; listeye konunca ekran yazısı kod
// sanıldı (ölçümde 201 yanlış alarm). Üç nokta da yayma işleciyle karışıyordu.
expect('Türkçe "var" kod işareti değildir', names('  Zaten hesabınız var mı? <span className="y">Giriş</span>'), []);
expect('üç nokta yayma işleci değildir', names('<p className="x">Bilgiler Yükleniyor...</p>'), []);
expect('gerçek yayma işleci koddur', names('  const yeniKayit = { ...eskiKayit };').sort(), ['eskiKayit', 'yeniKayit']);

// EN KRİTİK: ekran yazısı atılırken AYNI SATIRDAKİ gerçek ad atılmamalı.
expect('yazı atılır, ifadedeki ad kalır', names('  Pozisyon limiti aşıldı (max %{fmtDecimal(maxPozisyonYuzdesi, 0)})'), ['maxPozisyonYuzdesi']);
expect('varlık arasındaki ad kalır', names('  HESAP KODU (veri): &quot;{k.hesapKodu}&quot;'), ['hesapKodu']);

console.log('— çok satırlı şablon (tüketici bildirimi #76, 2026-09-19)');
// Şablon durumu SATIRLAR ARASINDA taşınır. Orta satırlarda ters tırnak yoktur; eski sürüm o
// satırı sıradan kod sanıyor ve ekran metnini tanımlayıcı olarak yakalıyordu.
const fileNames = (lines, sql = false) => t.fileFindings(lines, words, sql).map((b) => `${b.line}:${b.name}`);
const REPORTED = [
  '    return `',
  '      <section>',
  '        <p>Teklif bedeli <b>${amount(run.outputPrice)}</b> ·',
  '          cetvel toplamı ${amount(run.fittedTotal)} · iki haneli birim fiyat artığı ${amount(run.residual)}',
  '          (her satırı ayrı yuvarlasaydık ${amount(run.naiveResidual)})</p>',
  '    `;',
];
expect('bildirilen şablon gövdesi taranmaz', fileNames(REPORTED), []);
// Şablon kapandıktan SONRAKİ satır yine taranmalı — durum yapışıp kalmamalı.
expect('şablon kapanınca tarama sürer', fileNames([...REPORTED, 'const toplamKayit = 1;']), ['7:toplamKayit']);

// ESKİDEN KAÇAN: `${...}` içindeki kod hiç taranmıyordu. Bu kaçak aynı düzeltmeyle kapandı.
expect('interpolasyondaki gerçek ad yakalanır', names('const s = `deger: ${toplamTutar}`;'), ['toplamTutar']);
expect('şablon metni ile ad birlikte', names('const s = `Toplam tutar: ${toplamKurus} TL`;'), ['toplamKurus']);
// `${a}/${b}` — aradaki metin atılınca adlar YAPIŞIP olmayan bir ad üretiyordu ("ceyrekStrt").
expect('bitişik interpolasyonlar yapışmaz', names('const k = `${ceyrekStr}/${t.yil}`;').sort(), ['ceyrekStr', 'yil']);

console.log('— tek yürüyüş: dizge, yorum, düzenli ifade');
// Üçü ayrı ayrı ve sabit sırayla soyulunca her sıralama bir diğerini bozuyordu.
expect('yorumdaki ters tırnak durumu bozmaz', fileNames(['// ornek: `deger: ${yorumdakiAd}` boyle', 'const gercekAd = 1;']), []);
expect('düzenli ifadedeki ters tırnak durumu bozmaz', fileNames(['for (const m of text.matchAll(/`([^`\\s]+)`/g)) {', '  const satirSayisi = 1;', '}']), ['2:satirSayisi']);
expect('şablondaki // yorum sanılmaz', names('const u = `http://ornek/${yolAdi}`;'), ['yolAdi']);
// İnterpolasyon KOD bağlamıdır: içindeki dizge metni tanımlayıcı sanılmamalı.
expect('interpolasyon içindeki dizge soyulur', names("const m = `${ok ? 'Türkçe metin' : ''}`;"), []);
// Kapanmamış tırnak Türkçe kesme işaretidir; satırın kalanı atılırsa GERÇEK ad düşer.
expect('kesme işareti satırı yutmaz', names("  <span>Oran %{pct}'si {eskiCariStr}</span>"), ['eskiCariStr']);

console.log(fail ? `\n${fail} test başarısız` : '\nTüm testler geçti');
process.exit(fail ? 1 : 0);
