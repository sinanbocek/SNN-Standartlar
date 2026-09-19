// Kod dili uyarı kipi testleri. Çalıştır: node quality/test/code-language-warn.test.js
'use strict';
const w = require('../code-language-warn');
const scan = require('../code-language-scan');

let fail = 0;
const expect = (name, actual, wanted) => {
  const ok = JSON.stringify(actual) === JSON.stringify(wanted);
  if (!ok) fail += 1;
  console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : `\n    gelen: ${JSON.stringify(actual)}\n    beklenen: ${JSON.stringify(wanted)}`}`);
};

const words = scan.wordSet();
const empty = { names: new Set(), paths: [] };
const adlar = (text, file = 'src/a.ts', exc = empty) => w.warnFindings(text, file, words, exc).map((f) => f.name);

console.log('— yazılan metnin çıkarılması');
expect('Write içeriği', w.writtenText({ content: 'a' }), 'a');
expect('Edit yeni metni', w.writtenText({ new_string: 'b' }), 'b');
expect('MultiEdit tüm düzenlemeler', w.writtenText({ edits: [{ new_string: 'a' }, { new_string: 'b' }] }), 'a\nb');
expect('boş girdi', w.writtenText({}), '');
// Eski metin OKUNMAZ: bu kapı yalnız YENİ yazılanı denetler, geçmiş kod projenin kütüğünün işidir.
expect('old_string taranmaz', w.writtenText({ old_string: 'gunSonu', new_string: 'dayEnd' }), 'dayEnd');

console.log('— yol normalleştirme');
const BS = String.fromCharCode(92);
expect('ters bölü ve proje kökü', w.relativePath(`C:${BS}p${BS}src${BS}a.ts`, `C:${BS}p`), 'src/a.ts');
expect('zaten göreli', w.relativePath('src/a.ts', 'C:/p'), 'src/a.ts');
expect('kök dışı yol olduğu gibi', w.relativePath('D:/x/a.ts', 'C:/p'), 'D:/x/a.ts');
expect('boş dosya', w.relativePath('', 'C:/p'), '');

console.log('— bulgu');
expect('Türkçe ad yakalanır', adlar('const gunSonu = 1;'), ['gunSonu']);
expect('İngilizce ad temiz', adlar('const dayEnd = 1;'), []);
expect('aynı ad bir kez', adlar('const satir = 1;\nconst x = satir + satir;'), ['satir']);
expect('taranmayan uzantı', adlar('const gunSonu = 1;', 'README.md'), []);
expect('yorum satırı taranmaz', adlar('// gün sonu hesabı'), []);

console.log('— aile istisnası uyarı kipinde de geçerli');
// Kapılar aynı kaynaktan beslenmezse zamanla ayrışır: burada da wordSet() kullanılır.
expect('tradeKasa uyarı üretmez', adlar('const tradeKasa = 1;'), []);
expect('kurusFormat uyarı üretmez', adlar('const kurusFormat = 1;'), []);
expect('bakiyeKurus hâlâ uyarır', adlar('const bakiyeKurus = 1;'), ['bakiyeKurus']);

console.log('— proje istisnası');
const exc = { names: new Set(['plaka']), paths: [/^legacy\/.*$/] };
expect('ad istisnası susturur', adlar('const plaka = 1;', 'src/a.ts', exc), []);
expect('yol istisnası susturur', adlar('const gunSonu = 1;', 'legacy/a.ts', exc), []);

console.log('— mesaj');
const f = w.warnFindings('const gunSonu = 1;\nconst satirlar = [];', 'src/a.ts', words, empty);
const m = w.warnMessage(f, 'src/a.ts');
expect('bulgu yoksa mesaj yok', w.warnMessage([], 'src/a.ts'), '');
expect('dosya adı görünür', m.includes('src/a.ts'), true);
expect('adlar görünür', m.includes('gunSonu') && m.includes('satirlar'), true);
expect('kural dosyasına yönlendirir', m.includes('kod-dili-standardi.md'), true);
// Uyarı kipinin sözü: engellemediğini ve geçmişi toplu değiştirmemeyi açıkça söylemeli.
expect('engel olmadığını söyler', m.includes('ENGEL degildir'), true);
expect('geçmişi toplu değiştirme uyarısı', m.includes('gecmis temizligi'), true);
expect('yanlış alarm susturulmaz uyarısı', m.includes('susturulmaz'), true);

// NOT: splitWords rakamda bölmez (`satir0` yakalanmaz) — tarayıcının bilinen sınırı,
// bu yüzden test gerçek adlar kullanır. Bkz. kod-dili-standardi.md "Bilinen sınırlar".
const ADLAR = ['gunSonu', 'satirlar', 'hataAdayi', 'sonucListesi', 'kayitTuru', 'dosyaAdi', 'tabloBasligi'];
const cok = ADLAR.map((a) => `const ${a} = 1;`).join('\n');
const mc = w.warnMessage(w.warnFindings(cok, 'src/a.ts', words, empty), 'src/a.ts');
expect('uzun liste kırpılır', mc.includes(`${ADLAR.length - w.MAX_NAME} ad daha`), true);

console.log(fail ? `\n${fail} test başarısız` : '\nTüm testler geçti');
process.exit(fail ? 1 : 0);
