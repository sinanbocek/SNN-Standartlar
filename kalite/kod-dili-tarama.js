// Kod dili taraması: TANIMLAYICILAR İngilizce mi? Türkçe tanımlayıcı bulursa kırmızı verir.
// Neden (2026-09-17 olayı): SNN-Piyasa-Core'da dosya adları, tablolar (gozlem, gun_sonu), sütunlar
// (cekilme_zamani, azami_sapma), değişkenler ve API alan adları Türkçe yazıldı. Aile standardı
// (SNN-Abacus-Core/AI-RULES "Kod dili: İngilizce") yalnız o deponun kendi dosyasında yazdığı için
// diğer projeler miras almıyordu; çelişkili bir proje kuralı sahibine sorulmadan yazıldı ve hata
// 52 dosya / ~3.650 satır / 10 tabloya yayıldıktan sonra Supabase ekranında fark edildi.
//
// YALNIZ TANIMLAYICI taranır. Yorumlar, dizge (string) içerikleri ve belgeler Türkçedir; taranmaz.
//
// Kullanım:
//   node kod-dili-tarama.js --diff <taban-commit> [proje-klasörü]   PR kapısı: yalnız EKLENEN satırlar
//   node kod-dili-tarama.js --tumu [proje-klasörü]                  tam denetim: git'teki tüm dosyalar
// Çıkış: 1 = bulgu var.
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const KAYNAK_UZANTI = /\.(ts|tsx|js|jsx|mjs|cjs)$/;
const SQL_UZANTI = /\.sql$/;
// Bu klasörler hiç taranmaz (bizim yazmadığımız ya da üretilen kod)
const ATLANAN_YOL = /(^|\/)(node_modules|dist|build|coverage|\.next|vendor|supabase\/\.temp)(\/|$)/;

const VERI = path.join(__dirname, 'veri', 'turkce-kelimeler.json');

// SAF: Türkçe harfleri ASCII'ye katlar (karşılaştırma için; 'gözlem' → 'gozlem')
function asciiKatla(s) {
  return s
    .replace(/[çÇ]/g, 'c').replace(/[ğĞ]/g, 'g').replace(/[ıI]/g, 'i').replace(/[İi]/g, 'i')
    .replace(/[öÖ]/g, 'o').replace(/[şŞ]/g, 's').replace(/[üÜ]/g, 'u')
    .toLowerCase();
}

const TURKCE_HARF = /[çğıöşüÇĞİÖŞÜ]/;

// SAF: tanımlayıcıyı parçalarına ayırır: camelCase, PascalCase, snake_case, kebab-case, nokta
// 'gunSonuKaydi' → ['gun','sonu','kaydi'] · 'cekilme_zamani' → ['cekilme','zamani']
function parcala(ad) {
  return ad
    .replace(/([a-zçğıöşü0-9])([A-ZÇĞİÖŞÜ])/g, '$1 $2')
    .replace(/([A-ZÇĞİÖŞÜ]+)([A-ZÇĞİÖŞÜ][a-zçğıöşü])/g, '$1 $2')
    .split(/[\s_\-.$]+/)
    .filter(Boolean)
    .map(asciiKatla);
}

// SAF: parça Türkçe kelime listesinde mi? Çekim ekleri için sonek toleransı:
// 'zamani' → 'zaman', 'kaydi' listede yok (kayit var) → sonek denemesi 'kayd' de yok → yakalanmaz.
// Tolerans bilinçli olarak dardır: yanlış alarm, kaçırmaktan pahalıdır (kural insanı yavaşlatır).
const EKLER = ['lari', 'leri', 'lar', 'ler', 'si', 'su', 'si', 'i', 'u', 'a', 'e'];
function turkceKelime(parca, kelimeler) {
  if (kelimeler.has(parca)) return parca;
  for (const ek of EKLER) {
    if (parca.length > ek.length + 2 && parca.endsWith(ek)) {
      const govde = parca.slice(0, -ek.length);
      if (kelimeler.has(govde)) return govde;
    }
  }
  return null;
}

// SAF: bir tanımlayıcı kurala aykırı mı? → { ad, neden } ya da null
function tanimlayiciSorunu(ad, kelimeler) {
  if (TURKCE_HARF.test(ad)) return { ad, neden: 'Türkçe harf' };
  for (const parca of parcala(ad)) {
    const bulunan = turkceKelime(parca, kelimeler);
    if (bulunan) return { ad, neden: `Türkçe kelime: ${bulunan}` };
  }
  return null;
}

// SAF: kod satırından yorum ve dizge içeriklerini ATAR; geriye yalnız tanımlayıcı taşıyan metin kalır.
// Satır bazlıdır (diff kipinde tam dosya elde yok). Bilinen sınır: çok satırlı blok yorumun
// ortasındaki satırlar '*' ile başlamıyorsa taranabilir; bu yüzden '*' ile başlayan satır atılır.
function kodKismi(satir, sql) {
  let s = satir;
  if (/^\s*\*/.test(s)) return ''; // blok yorumun gövde satırı
  s = s.replace(/'(?:[^'\\]|\\.)*'/g, "''");          // tek tırnaklı dizge
  if (sql) {
    s = s.replace(/--.*$/, '');                        // SQL satır yorumu
    s = s.replace(/\/\*[\s\S]*?(\*\/|$)/g, ' ');
    return s;
  }
  s = s.replace(/"(?:[^"\\]|\\.)*"/g, '""');           // çift tırnaklı dizge
  s = s.replace(/`(?:[^`\\]|\\.)*`/g, '``');           // şablon dizge (içindeki ${} de atılır)
  // Düzenli ifade (regex) gövdesi ekran yazısı taşıyabilir (testlerde getByText(/Ürün ekle/));
  // tanımlayıcı değildir. Bölme işaretiyle karışmasın diye yalnız açılış bağlamından sonra aranır.
  s = s.replace(/([(,=:[!&|?]\s*)\/(?:[^/\n]|\.)+\/[gimsuyd]*/g, '$1/re/');
  s = s.replace(/\/\/.*$/, '');                        // satır yorumu
  s = s.replace(/\/\*[\s\S]*?(\*\/|$)/g, ' ');         // blok yorum (satır içi)
  return jsxMetniAt(s);
}

// SAF: JSX/HTML etiketleri ARASINDAKİ yazıyı atar. Bu yazı kullanıcıya görünen Türkçe metindir,
// tanımlayıcı değildir (GHS-Panel ölçümü 2026-09-18: `<label …>Poliçe Durumu</label>` gibi satırlar
// 3.127 bulgunun büyük kısmını üretiyordu — yanlış alarm, kuralı kullanılamaz hale getirir).
// Kod işareti (= ( ) { } ;) taşımayan metin parçaları atılır; taşıyanlar (ör. `{policy.name}`) korunur.
const KOD_ISARETI = /[={};]/;
const duzMetin = (parca) => parca.trim() !== '' && !KOD_ISARETI.test(parca);
function jsxMetniAt(satir) {
  let s = satir;
  // 1) <etiket> ... </etiket> arasındaki düz yazı
  s = s.replace(/>([^<>]*)</g, (tam, ic) => (duzMetin(ic) ? '><' : tam));
  // 2) satırın sonunda, son '>' işaretinden sonra kalan yazı (metin alt satıra sarkıyor)
  const sonKapanis = s.lastIndexOf('>');
  if (sonKapanis >= 0 && duzMetin(s.slice(sonKapanis + 1))) s = s.slice(0, sonKapanis + 1);
  // 3) satırın başında, ilk '<' işaretinden önce kalan yazı (metnin devamı)
  const ilkAcilis = s.indexOf('<');
  if (ilkAcilis > 0 && duzMetin(s.slice(0, ilkAcilis))) s = s.slice(ilkAcilis);
  // 4) tamamen düz yazı olan satır (JSX gövdesinin ortası): kod işareti ve etiket yoksa metindir
  if (!/[<>]/.test(s) && duzMetin(s)) return '';
  return s;
}

const TANIMLAYICI = /[A-Za-z_$çğıöşüÇĞİÖŞÜ][A-Za-z0-9_$çğıöşüÇĞİÖŞÜ]*/g;

// SAF: tek satırdaki kuralı bozan tanımlayıcılar → [{ ad, neden }]
function satirBulgulari(satir, kelimeler, sql = false) {
  const kod = kodKismi(satir, sql);
  const out = [];
  const gorulen = new Set();
  for (const m of kod.matchAll(TANIMLAYICI)) {
    const ad = m[0];
    if (gorulen.has(ad)) continue;
    gorulen.add(ad);
    const sorun = tanimlayiciSorunu(ad, kelimeler);
    if (sorun) out.push(sorun);
  }
  return out;
}

// SAF: dosya/klasör adı kuralı bozuyor mu? → [{ ad, neden }]
function yolBulgulari(yol, kelimeler) {
  const out = [];
  for (const parca of yol.split('/')) {
    const ad = parca.replace(/\.(ts|tsx|js|jsx|mjs|cjs|sql)$/, '').replace(/\.(test|spec|config)$/, '');
    if (!ad) continue;
    const sorun = tanimlayiciSorunu(ad, kelimeler);
    if (sorun) out.push({ ...sorun, tur: 'yol' });
  }
  return out;
}

// ─── İstisna listesi ────────────────────────────────────────────────────────
// Proje kökünde `.snn-kod-dili.json`:
// { "istisnalar": [ { "ad": "plaka", "gerekce": "Türkiye'ye özgü kavram, karşılığı yok (TB-012)" } ],
//   "yollar":     [ { "yol": "supabase/migrations/2026*", "gerekce": "canlıya uygulanmış, değişmez" } ] }
// Gerekçesiz kayıt SAYILMAZ: istisna görünür ve savunulabilir olmalıdır.
function istisnaOku(kok) {
  const bos = { adlar: new Set(), yollar: [], uyarilar: [] };
  let ham;
  try {
    ham = JSON.parse(fs.readFileSync(path.join(kok, '.snn-kod-dili.json'), 'utf8'));
  } catch {
    return bos;
  }
  const uyarilar = [];
  const adlar = new Set();
  for (const g of ham.istisnalar || []) {
    if (!g || !g.ad) continue;
    if (!g.gerekce) { uyarilar.push(`istisna "${g.ad}" gerekçesiz → sayılmadı`); continue; }
    adlar.add(asciiKatla(String(g.ad)));
  }
  const yollar = [];
  for (const g of ham.yollar || []) {
    if (!g || !g.yol) continue;
    if (!g.gerekce) { uyarilar.push(`yol istisnası "${g.yol}" gerekçesiz → sayılmadı`); continue; }
    yollar.push(new RegExp(`^${String(g.yol).split('*').map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`));
  }
  return { adlar, yollar, uyarilar };
}

const istisnaVar = (bulgu, yol, istisna) => istisna.adlar.has(asciiKatla(bulgu.ad)) || istisna.yollar.some((r) => r.test(yol));

// ─── Girdi kaynakları ───────────────────────────────────────────────────────
const gitCik = (kok, args) => execFileSync('git', ['-C', kok, ...args], { encoding: 'utf8', maxBuffer: 1e9 });

// SAF: birleşik diff (git diff -U0) içinde yalnız EKLENEN satırlar → [{ file, line, text }]
function eklenenSatirlar(diff) {
  const out = [];
  let file = null;
  let lineNo = 0;
  for (const raw of diff.split('\n')) {
    if (raw.startsWith('+++ ')) { file = raw.slice(4).replace(/^b\//, ''); continue; }
    const hunk = raw.match(/^@@ -\d+(?:,\d+)? \+(\d+)/);
    if (hunk) { lineNo = Number(hunk[1]); continue; }
    if (raw.startsWith('+') && file && file !== '/dev/null') {
      out.push({ file, line: lineNo, text: raw.slice(1) });
      lineNo += 1;
    } else if (!raw.startsWith('-')) {
      lineNo += raw.startsWith(' ') ? 1 : 0;
    }
  }
  return out;
}

const taranir = (yol) => !ATLANAN_YOL.test(yol) && (KAYNAK_UZANTI.test(yol) || SQL_UZANTI.test(yol));

function kelimeKumesi() {
  return new Set(JSON.parse(fs.readFileSync(VERI, 'utf8')).kelimeler);
}

// Diff kipi: yalnız eklenen satırlar + yeni eklenen dosyaların adları
function taraDiff(kok, taban) {
  const kelimeler = kelimeKumesi();
  const istisna = istisnaOku(kok);
  const bulgular = [];
  const diff = gitCik(kok, ['diff', '-U0', '--no-color', '--no-ext-diff', `${taban}...HEAD`]);
  for (const { file, line, text } of eklenenSatirlar(diff)) {
    if (!taranir(file)) continue;
    for (const b of satirBulgulari(text, kelimeler, SQL_UZANTI.test(file))) {
      if (!istisnaVar(b, file, istisna)) bulgular.push({ file, line, ...b });
    }
  }
  const yeniDosyalar = gitCik(kok, ['diff', '--name-only', '--diff-filter=A', `${taban}...HEAD`]).split('\n').filter(Boolean);
  for (const file of yeniDosyalar) {
    if (!taranir(file)) continue;
    for (const b of yolBulgulari(file, kelimeler)) {
      if (!istisnaVar(b, file, istisna)) bulgular.push({ file, line: 0, ...b });
    }
  }
  return { bulgular, uyarilar: istisna.uyarilar };
}

// Tam denetim: git'teki tüm kaynak ve SQL dosyaları
function taraTumu(kok) {
  const kelimeler = kelimeKumesi();
  const istisna = istisnaOku(kok);
  const bulgular = [];
  const dosyalar = gitCik(kok, ['ls-files']).split('\n').filter(Boolean).filter(taranir);
  for (const file of dosyalar) {
    for (const b of yolBulgulari(file, kelimeler)) {
      if (!istisnaVar(b, file, istisna)) bulgular.push({ file, line: 0, ...b });
    }
    let icerik;
    try { icerik = fs.readFileSync(path.join(kok, file), 'utf8'); } catch { continue; }
    const sql = SQL_UZANTI.test(file);
    icerik.split(/\r?\n/).forEach((satir, i) => {
      for (const b of satirBulgulari(satir, kelimeler, sql)) {
        if (!istisnaVar(b, file, istisna)) bulgular.push({ file, line: i + 1, ...b });
      }
    });
  }
  return { bulgular, uyarilar: istisna.uyarilar, dosyaSayisi: dosyalar.length };
}

// SAF: rapor metni
function rapor({ bulgular, uyarilar = [], dosyaSayisi }, kip) {
  const satirlar = [];
  for (const u of uyarilar) satirlar.push(`  ⚠ ${u}`);
  if (!bulgular.length) {
    satirlar.push(`✓ Türkçe tanımlayıcı bulunmadı${dosyaSayisi ? ` (${dosyaSayisi} dosya tarandı)` : ''}.`);
    return satirlar.join('\n');
  }
  // Aynı ad tekrar tekrar yazılmasın: ada göre topla, ilk 3 yeri göster
  const gruplar = new Map();
  for (const b of bulgular) {
    const k = `${b.ad}|${b.neden}`;
    if (!gruplar.has(k)) gruplar.set(k, { ...b, yerler: [] });
    gruplar.get(k).yerler.push(b.line ? `${b.file}:${b.line}` : b.file);
  }
  const sirali = [...gruplar.values()].sort((a, b) => b.yerler.length - a.yerler.length);
  satirlar.push(`✗ ${bulgular.length} Türkçe tanımlayıcı (${sirali.length} ayrı ad)${kip === 'diff' ? ' — eklenen satırlarda' : ''}:`);
  for (const g of sirali) {
    const yer = g.yerler.slice(0, 3).join(', ') + (g.yerler.length > 3 ? ` … (+${g.yerler.length - 3})` : '');
    satirlar.push(`  ✗ ${g.ad} — ${g.neden} · ${yer}`);
  }
  satirlar.push('');
  satirlar.push('Kural: standartlar/kod-dili-standardi.md — tanımlayıcılar (dosya adı, değişken, fonksiyon,');
  satirlar.push('tip, tablo, sütun, API alanı) İngilizce yazılır. Yorumlar, belgeler ve kullanıcıya giden');
  satirlar.push('metinler Türkçe kalır.');
  satirlar.push('Türkiye\'ye özgü, İngilizce karşılığı olmayan bir kavramsa: projenin .snn-kod-dili.json');
  satirlar.push('dosyasına gerekçesiyle istisna yazılır.');
  return satirlar.join('\n');
}

module.exports = {
  asciiKatla, parcala, jsxMetniAt, turkceKelime, tanimlayiciSorunu, kodKismi, satirBulgulari,
  yolBulgulari, istisnaOku, eklenenSatirlar, rapor, taraDiff, taraTumu,
};

if (require.main === module) {
  const argv = process.argv.slice(2);
  const diffIdx = argv.indexOf('--diff');
  const tumu = argv.includes('--tumu');
  const konumlar = argv.filter((a, i) => !a.startsWith('--') && i !== diffIdx + 1);
  const kok = path.resolve(konumlar[0] || process.cwd());
  if (!tumu && diffIdx < 0) {
    console.error('Kullanım: node kod-dili-tarama.js --diff <taban-commit> [proje] | --tumu [proje]');
    process.exit(2);
  }
  const sonuc = tumu ? taraTumu(kok) : taraDiff(kok, argv[diffIdx + 1]);
  console.log(rapor(sonuc, tumu ? 'tumu' : 'diff'));
  process.exit(sonuc.bulgular.length ? 1 : 0);
}
