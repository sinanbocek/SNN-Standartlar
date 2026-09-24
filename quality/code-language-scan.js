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

const SOURCE_EXT = /\.(ts|tsx|js|jsx|mjs|cjs)$/;
const SQL_EXT = /\.sql$/;
// Bu klasörler hiç taranmaz (bizim yazmadığımız ya da üretilen kod)
const SKIPPED_PATH = /(^|\/)(node_modules|dist|build|coverage|\.next|vendor|supabase\/\.temp)(\/|$)/;

const DATA_FILE = path.join(__dirname, 'data', 'turkish-words.json');
const FAMILY_FILE = path.join(__dirname, 'data', 'family-exceptions.json');

// SAF: Türkçe harfleri ASCII'ye katlar (karşılaştırma için; 'gözlem' → 'gozlem')
function asciiFold(s) {
  return s
    .replace(/[çÇ]/g, 'c').replace(/[ğĞ]/g, 'g').replace(/[ıI]/g, 'i').replace(/[İi]/g, 'i')
    .replace(/[öÖ]/g, 'o').replace(/[şŞ]/g, 's').replace(/[üÜ]/g, 'u')
    .toLowerCase();
}

const TURKISH_LETTER = /[çğıöşüÇĞİÖŞÜ]/;

// SAF: tanımlayıcıyı parçalarına ayırır: camelCase, PascalCase, snake_case, kebab-case, nokta
// 'gunSonuKaydi' → ['gun','sonu','kaydi'] · 'cekilme_zamani' → ['cekilme','zamani']
function splitWords(name) {
  return name
    .replace(/([a-zçğıöşü0-9])([A-ZÇĞİÖŞÜ])/g, '$1 $2')
    .replace(/([A-ZÇĞİÖŞÜ]+)([A-ZÇĞİÖŞÜ][a-zçğıöşü])/g, '$1 $2')
    // Rakam sınırı da kelime sınırıdır: `satir0`, `kayit2`, `v1kur` gibi adlar aksi hâlde
    // tek parça sayılıp kelime listesine hiç takılmıyordu (2026-09-19'da ölçüldü).
    // `utf8` → utf + 8, `sha256` → sha + 256: parçalar Türkçe olmadığı için etkisiz.
    .replace(/([A-Za-zÇĞİÖŞÜçğıöşü])([0-9])/g, '$1 $2')
    .replace(/([0-9])([A-Za-zÇĞİÖŞÜçğıöşü])/g, '$1 $2')
    .split(/[\s_\-.$]+/)
    .filter(Boolean)
    .map(asciiFold);
}

// SAF: parça Türkçe kelime listesinde mi? Çekim ekleri için sonek toleransı:
// 'zamani' → 'zaman', 'kaydi' listede yok (kayit var) → sonek denemesi 'kayd' de yok → yakalanmaz.
// Tolerans bilinçli olarak dardır: yanlış alarm, kaçırmaktan pahalıdır (kural insanı yavaşlatır).
const SUFFIXES = ['lari', 'leri', 'lar', 'ler', 'si', 'su', 'si', 'i', 'u', 'a', 'e'];
function turkishWord(part, words) {
  if (words.has(part)) return part;
  for (const suffix of SUFFIXES) {
    if (part.length > suffix.length + 2 && part.endsWith(suffix)) {
      const stem = part.slice(0, -suffix.length);
      if (words.has(stem)) return stem;
    }
  }
  return null;
}

// SAF: bir tanımlayıcı kurala aykırı mı? → { ad, neden } ya da null
function identifierProblem(name, words) {
  if (TURKISH_LETTER.test(name)) return { name, reason: 'Türkçe harf' };
  for (const part of splitWords(name)) {
    const bulunan = turkishWord(part, words);
    if (bulunan) return { name, reason: `Türkçe kelime: ${bulunan}` };
  }
  return null;
}

// SAF: şablon dizgelerini (` işaretiyle yazılan) içerikleriyle birlikte atar; İÇ İÇE olanları da
// doğru atar. Neden (ölçüm 2026-09-18): basit bir düzenli ifade, şablonun içinde ikinci bir şablon
// açıldığında içteki yazıyı dışarıda bırakıyordu; core/propagate.js:149 satırındaki "yalnız" kelimesi
// tanımlayıcı sanılıyordu — yanlış alarm.
// Şablon durumu SATIRLAR ARASINDA taşınır: `stack` her şablon seviyesi için o seviyedeki
// açık `${` sayısını tutar. Boş dizi = şablonun dışındayız.
//
// İKİ KUSUR BİRDEN (SNN-Ihale bildirimi #76, 2026-09-19):
//   1. ÇOK SATIRLI şablonun ORTA satırlarında ters tırnak yoktur; eski sürüm o satırı sıradan
//      kod sanıyor ve içindeki Türkçe EKRAN METNİ tanımlayıcı olarak yakalanıyordu.
//      Bildirilen satır: `… iki haneli birim fiyat artığı ${amount(run.residual)}` → 3 yanlış alarm.
//   2. `${...}` içindeki KOD hiç taranmıyordu: eski sürüm şablonun içinde her şeyi atıyordu.
//      `` `deger: ${toplamTutar}` `` satırındaki gerçek Türkçe ad SESSİZCE KAÇIYORDU.
// Doğrusu bildirimde yazdığı gibi: gövde atılır, `${...}` içi taranır.
function stripTemplates(line, stack = []) {
  const level = [...stack];
  let out = '';
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (!level.length) {
      if (ch === '`') { level.push(0); continue; }
      out += ch;
      continue;
    }
    const top = level.length - 1;
    if (level[top] === 0) {                                  // şablonun METİN kısmı
      if (ch === '\\') { i += 1; continue; }                 // kaçışlı karakter (ör. \`)
      if (ch === '`') { level.pop(); if (!level.length) out += '``'; continue; }
      // AYIRICI ŞART: `${a}/${b}` satırında aradaki metin atılınca iki ad birbirine yapışıp
      // olmayan bir tanımlayıcı üretiyordu (`${ceyrekStr}/${t.yil}` → "ceyrekStrt"). Ölçümde
      // görüldü (2026-09-19).
      if (ch === '$' && line[i + 1] === '{') { level[top] = 1; i += 1; out += ' '; continue; }
      continue;                                              // ekran metni: atılır
    }
    // `${ … }` içi: KOD. Taranması gerekir.
    if (ch === "'" || ch === '"') {
      // KODUN İÇİNDEKİ DİZGE yine atılır (SNN-Ihale bildirimi #87, 2026-09-23). Satır şablonun
      // ORTASINDA başlayınca yorum kesici hiç çalışmıyor; dizgeyi soyan tek yer burası.
      // Bildirilen satır: `<td>${d.finding === null ? "Açıklanamadı" : …}</td>` → 1 yanlış alarm.
      let j = i + 1;
      while (j < line.length && line[j] !== ch) j += (line[j] === '\\' ? 2 : 1);
      // Kapanmamış tırnak dizge değildir; yorum kesicideki kuralla aynı.
      if (j < line.length) { out += ch + ch; i = j; continue; }
      out += ch;
      continue;
    }
    if (ch === '`') { level.push(0); continue; }             // iç içe şablon
    if (ch === '{') { level[top] += 1; out += ch; continue; }
    if (ch === '}') { level[top] -= 1; if (level[top] > 0) out += ch; continue; }
    out += ch;
  }
  return { code: out, stack: level };
}

// SAF: satır yorumunu keser — ama ŞABLONUN İÇİNDEKİ `//` kesilmez.
//
// NEDEN AYRI (2026-09-19): şablon soyma yorumdan ÖNCE çalışıyordu. Bir yorumun içinde ters tırnak
// geçerse (bu dosyanın kendi açıklamaları gibi) şablon durumu yanlış açılıyor ve SONRAKİ SATIRLARA
// taşıyordu. Kendi kapımız yakaladı: bu dosya 14 yanlış alarm verdi.
// Tersi de yanlıştır: `` `http://x` `` satırında yorum önce kesilirse şablon bozulur. Bu yüzden
// karakter karakter yürünür ve `//` yalnız ŞABLON DIŞINDAYKEN kesilir.
//
// SATIR ARASI BAĞLAM (SNN-Ihale bildirimi #102, 2026-09-24): Prettier uzun bir düzenli ifadeyi
// `=` sonrasında alt satıra kırar. Satır başındaki `/` önünde işaret göremeyince bölme sanılıyor,
// gövdedeki Türkçe arama metni tanımlayıcı oluyordu. Bildirilen satır:
//   const ALL_ITEMS =
//     /(kalemlerin tamamına teklif vermek zorunda|…)/;          → tamamına, teklif, bütün
// Çözüm: önceki satırın son kod parçası (`carry`) bir sonraki satıra taşınır. Tanımlayıcı ya da
// `)` ile biten satırdan sonra `/` hâlâ bölmedir (`total\n  / count`).
// `;` ve `{` deyim başıdır; `return` gibi anahtar kelimelerden sonra da düzenli ifade gelir.
const REGEX_OPENERS = /[(,=:[!&|?>;{]/;
const REGEX_KEYWORD = /(?:^|[^\w$])(?:return|typeof|case|do|else|in|of|void|yield|await|throw|delete|instanceof)\s*$/;

function cutLineComment(line, stack = [], carry = '') {
  const level = [...stack];
  let out = '';
  let prev = String(carry).trimEnd().slice(-1);
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (level.length) {                                  // şablonun içi: olduğu gibi aktarılır
      const top = level.length - 1;
      if (level[top] === 0) {
        if (ch === '\\') { out += line.slice(i, i + 2); i += 1; continue; }
        if (ch === '`') level.pop();
        else if (ch === '$' && line[i + 1] === '{') { level[top] = 1; out += '${'; i += 1; continue; }
      } else if (ch === "'" || ch === '"') {
        // `${ x ? 'Türkçe metin' : '' }` — interpolasyon KOD bağlamıdır, dizgesi de soyulur.
        // Aksi hâlde şablon içindeki dizge metni tanımlayıcı sanılır (2026-09-19 ölçümü: 28 bulgu).
        let j = i + 1;
        while (j < line.length && line[j] !== ch) j += (line[j] === '\\' ? 2 : 1);
        // KAPANMAMIŞ tırnak dizge DEĞİLDİR — Türkçe kesme işaretidir ("%{pct}'si"). Satırın
        // kalanını atmak gerçek adları da düşürür: ölçümde `eskiCariStr` böyle kayboldu.
        if (j >= line.length) { out += ch; continue; }
        out += ch + ch;
        i = j;
        continue;
      } else if (ch === '`') level.push(0);
      else if (ch === '{') level[top] += 1;
      else if (ch === '}') level[top] -= 1;
      out += ch;
      continue;
    }
    if (ch === '`') { level.push(0); out += ch; continue; }
    if (ch === "'" || ch === '"') {
      // DİZGE de bu yürüyüşte soyulur. Eskiden en başta düz bir değiştirmeyle soyuluyordu ve
      // ŞABLONUN İÇİNDEKİ kesme işaretini de dizge sanıyordu: `${n}'inin VADESİ` yazan bir iç
      // şablonda tırnak, iç şablonun ters tırnağını yutuyor ve durum bozuluyordu. Kendi
      // kapımız yakaladı (`pending-measurements.js:94`, 2026-09-19).
      let j = i + 1;
      while (j < line.length && line[j] !== ch) j += (line[j] === '\\' ? 2 : 1);
      if (j < line.length) { out += ch + ch; i = j; prev = ch; continue; }
      // KAPANMAMIŞ tırnak dizge DEĞİLDİR — Türkçe kesme işareti olabilir ("%{pct}'si").
      // Satırın kalanını atmak gerçek adları düşürür (ölçümde `eskiCariStr` böyle kayboldu).
      out += ch;
      continue;
    }
    if (ch === '/' && (line[i + 1] === '/' || line[i + 1] === '*')) return out;   // satır/blok yorumu
    if (ch === '/' && (REGEX_OPENERS.test(prev) || REGEX_KEYWORD.test(out.trim() ? out : carry))) {
      // DÜZENLİ İFADE GÖVDESİ atlanır. `[` … `]` içindeki `/` gövdeyi KAPATMAZ — eski dizge
      // temelli kural bunu bilmiyordu ve `/`([^`\s]+)`/g` gibi bir gövdeyi yarıda kesiyordu.
      let j = i + 1;
      let inClass = false;
      while (j < line.length) {
        const c = line[j];
        if (c === '\\') { j += 2; continue; }
        if (inClass) { if (c === ']') inClass = false; j += 1; continue; }
        if (c === '[') { inClass = true; j += 1; continue; }
        if (c === '/') break;
        j += 1;
      }
      if (j < line.length) {
        out += '/re/';
        i = j;
        while (/[gimsuyd]/.test(line[i + 1] || '')) i += 1;
        prev = '/';
        continue;
      }
    }
    out += ch;
    if (!/\s/.test(ch)) prev = ch;
  }
  return out;
}

// SAF: kod satırından yorum ve dizge içeriklerini ATAR; geriye yalnız tanımlayıcı taşıyan metin kalır.
// Satır bazlıdır (diff kipinde tam dosya elde yok). Bilinen sınır: çok satırlı blok yorumun
// ortasındaki satırlar '*' ile başlamıyorsa taranabilir; bu yüzden '*' ile başlayan satır atılır.
// Eski imza (durumsuz): tek satırı kendi başına tarar.
function codePart(line, sql, stack = [], ctx = {}) {
  return codePartAt(line, sql, stack, ctx).code;
}

// SAF: dosya JSX taşıyabilir mi? Ekran yazısı (etiketler arası Türkçe metin) yalnız bu dosyalarda olur.
//
// NEDEN (2026-09-24, #102 incelemesi): ekran yazısı ayıklayıcısı HER dosyada çalışıyordu. `=` ya da
// sonda `;` taşımayan etiketsiz satırı yazı sayıp atıyordu; noktalı virgülsüz yazılan projelerde
// bu, gerçek kod demekti. `function mikroGorevleriBosalt() {` satırı tamamen siliniyordu.
// Ölçüm (11 proje, JSX olmayan ts/js dosyaları): 2.514 gerçek ad görünmüyordu — Gunum-Var 1.150,
// SNN-Yonetici-Ozeti 1.153. Yeni bir Türkçe TANIM da kapıdan geçebiliyordu.
const isJsxFile = (yol) => /\.(tsx|jsx)$/i.test(String(yol));

// Durumu TAŞIYAN sürüm: { code, stack, carry } döner.
//   stack: çok satırlı şablon durumu (#76)
//   carry: önceki satırın son kod parçası — satır başındaki `/` düzenli ifade mi, bölme mi? (#102)
// ctx.jsx: dosya JSX taşıyabilir mi (isJsxFile). Verilmezse true: dosyası bilinmeyen tek satır
// eskisi gibi değerlendirilir.
function codePartAt(line, sql, stack = [], ctx = {}) {
  const { jsx = true, carry = '' } = ctx;
  const text = (code) => (jsx ? stripJsxText(code) : code);
  // CRLF SOYULUR — ÖNCE. Yorum soyma kuralları `.*$` ile biter; JavaScript'te `.` satır sonunu
  // (\r dahil) EŞLEŞTİRMEZ ve `$` dizgenin sonunu ister. Satır `\r` ile bitiyorsa `--.*$` ve
  // `//.*$` hiç eşleşmez, yani YORUM HİÇ SOYULMAZ ve içindeki Türkçe düzyazı tanımlayıcı
  // sanılır. Yorumda Türkçe serbesttir; bu doğrudan yanlış alarmdır.
  // Ölçüldü (2026-09-19, 11 proje / 2.684 dosya): 26.060 bulgunun 9.938'i (%38,1) bu kaynaktan.
  // CI Linux'ta (LF) görünmüyordu; yalnız Windows çalışma kopyasında çıkıyordu.
  let s = String(line).replace(/\r+$/, '');
  // ŞABLONUN İÇİNDEYSEK yorum ve dizge kuralları geçerli değildir: orada `//` de `--` de
  // ekran metninin parçasıdır, kod değil.
  if (stack.length) {
    const inside = stripTemplates(s, stack);
    return { code: text(inside.code), stack: inside.stack, carry: '' };
  }
  if (/^\s*\*/.test(s)) return { code: '', stack: [], carry }; // blok yorumun gövde satırı
  if (sql) {
    s = s.replace(/'(?:[^'\\]|\\.)*'/g, "''");        // SQL dizgesi (SQL'de şablon yoktur)
    s = s.replace(/--.*$/, '');                        // SQL satır yorumu
    s = s.replace(/\/\*[\s\S]*?(\*\/|$)/g, ' ');
    return { code: s, stack: [], carry: '' };
  }
  // DİZGE, YORUM ve DÜZENLİ İFADE tek yürüyüşte soyulur. Eskiden üçü ayrı ayrı ve sabit sırayla
  // değiştiriliyordu; her sıralama bir diğerini bozuyordu (üçü de 2026-09-19'da ölçüldü):
  //   - tırnak önce soyulunca, şablon içindeki kesme işareti iç şablonu yutuyordu,
  //   - şablon önce soyulunca, yorumdaki ters tırnak durumu açıyordu,
  //   - düzenli ifade dizgeyle soyulunca, `[^/]` içindeki bölü gövdeyi erken kapatıyordu.
  // Tek yürüyüş, hangi bağlamda olduğumuzu bildiği için sıralama sorusunu ortadan kaldırır.
  s = cutLineComment(s, stack, carry);
  // Boş ya da yalnız yorum taşıyan satır bağlamı KESMEZ: `=` ile düzenli ifade arasına yorum girebilir.
  const nextCarry = s.trim() ? s.trimEnd().slice(-40) : carry;
  const tpl = stripTemplates(s, stack);                // şablon dizge (satırlar arası durum taşınır)
  s = tpl.code;
  // Düzenli ifade (regex) gövdesi ekran yazısı taşıyabilir (testlerde getByText(/Ürün ekle/));
  // tanımlayıcı değildir. Bölme işaretiyle karışmasın diye yalnız açılış bağlamından sonra aranır.
  // KAÇIŞLI BÖLÜ gövdeyi kapatmaz. İlk sürüm gövdeyi `(?:[^/\n]|\.)+` diye yazmıştı; niyet
  // "ters bölü + herhangi karakter" idi ama `\.` düz NOKTA demektir. Bu yüzden `\/` görünce
  // gövde erken kapanıyor ve kalanı KOD sayılıyordu. 2026-09-19'da GHS-Panel oturumu bildirdi:
  // profiles.ts:32 `/GONDEREN AD SOYAD\/UNVAN…İŞLEM TUTARI…/` → İŞLEM, TUTARI, Açıklama
  // yanlış alarm verdi. (Tüketici susturmadı, bildirdi — kuralın istediği davranış.)
  //
  // Açılış bağlamına `>` eklendi: ok fonksiyonu gövdesi `(part) => /[a-zçğıöşü]/i` hiç
  // soyulmuyordu, çünkü `>` açılış listesinde yoktu (aynı dosya, satır 65).
  s = s.replace(/([(,=:[!&|?>]\s*)\/(?:[^/\n\\]|\\.)+\/[gimsuyd]*/g, '$1/re/');
  s = s.replace(/\/\/.*$/, '');                        // satır yorumu
  s = s.replace(/\/\*[\s\S]*?(\*\/|$)/g, ' ');         // blok yorum (satır içi)
  return { code: text(s), stack: tpl.stack, carry: nextCarry };
}

// SAF: JSX/HTML etiketleri ARASINDAKİ yazıyı atar. Bu yazı kullanıcıya görünen Türkçe metindir,
// tanımlayıcı değildir (GHS-Panel ölçümü 2026-09-18: <label …>Poliçe Durumu</label> gibi satırlar
// 3.127 bulgunun büyük kısmını üretiyordu). Metin ile ifade AYNI satırda karışabilir:
//   {metrics.count} adet ödemenin kur bilgisi girilmediği için TL
// Bu durumda YAZI atılır, yalnız süslü parantez içindeki KOD taranır (2026-09-18 ikinci
// kalibrasyon: İhale ve Nakit-Akış ölçümlerinde kalan bulguların çoğu bu biçimdeydi).
// SAF: HTML varlıkları (`&quot;` `&nbsp;` `&#39;`) atılır. İçlerindeki NOKTALI VİRGÜL, ekran
// yazısını kod sanmaya yetiyordu: aynı cümle `&quot;` ile 6 bulgu veriyor, `&quot;` olmadan
// temiz geçiyordu (SNN-Proje-ve-Nakit-Akis bildirimi #28, 2026-09-19).
const stripEntities = (part) => String(part).replace(/&[a-zA-Z]+;|&#\d+;/g, ' ');

// SAF: noktalı virgül KOD işareti mi, yoksa cümle noktalaması mı?
// Kodda deyimi bitirir: satır sonunda ya da `}` / `)` önünde durur. Düzyazıda ise ortada durur
// ve ardından bir kelime gelir: "…sessizce yazılmaz; gönderene WhatsApp'tan sorulur."
// Eski ölçüt her `;` işaretini kod sayıyordu; bu yüzden ÇOK SATIRLI JSX metninin `;` taşıyan
// satırı yakalanıyor, aynı cümlenin alt satırı temiz geçiyordu (GHS-Panel bildirimi #64).
const CODE_SEMICOLON = /;\s*$|;\s*[})]/;

// SAF: parça ÇAĞRI ya da ÖZELLİK ERİŞİMİ taşıyor mu? `mockReturnValue(`, `Math.floor`, `sahte.from`
//
// NEDEN VAR: ilk düzeltme denemesinde "parantez koddur" katılığı tamamen kaldırılmıştı. 11 projede
// ölçünce 1.272 bulgunun düştüğü, ÇOĞUNUN GERÇEK AD olduğu görüldü (`liste`, `zincirKur`,
// `konsolBulgulari`, `vadesizTLKasa`). Parantezin kendisi ölçüt değil; ayırt eden şey, parantezin
// bir ADIN HEMEN ARDINDAN gelmesi. Ekran yazısında araya boşluk girer: "İhaleler ({n})".
const CALL_OR_ACCESS = /[A-Za-z0-9_$]\(|[A-Za-z0-9_$]\.[A-Za-z_$]/;

// SAF: düzyazıda bulunmayan kod işaretleri — mantık işleçleri ve JavaScript anahtar kelimeleri.
// `if (!baslik) return { error: '' }` satırı bunlar olmadan "ekran yazısı" sanılıyordu: içinde
// ne `=` var, ne çağrı (parantezden önce boşluk), ne de deyim sonu noktalı virgülü.
//
// `var` BİLEREK LİSTEDE YOK: "Zaten hesabınız var mı?" cümlesindeki Türkçe "var", JavaScript
// anahtar kelimesiyle aynı yazılıyor. Listeye konduğunda ekran yazısı kod sanıldı (ölçümde
// görüldü). Aynı sebeple `new`, `class`, `case` de yok — Türkçe metinde geçebilirler.
const CODE_TOKEN = /\(!|&&|\|\||\?\?|\?\.|\b(?:return|if|else|for|while|const|let|function|await|async|typeof|throw|export|import|switch|try|catch)\b/;

// İKİ AYRI ÖLÇÜT. Aynı ölçütü iki bağlama birden uygulamak ölçümde yanlış çıktı (2026-09-19).
//
// ETİKET ARASI yazıda kod, süslü parantezin İÇİNDEDİR: `Aktif: {user.active_groups || 0}`.
// Buradaki `||` ve `user.active_groups` satırı kod yapmaz — yazı yazıdır, ifade ayrıca taranır.
// Bu ölçüte çağrı/işleç işaretleri eklenince 201 ekran yazısı yanlış alarm verdi.
const isCodeInText = (part) => /=/.test(part) || CODE_SEMICOLON.test(part);

// SARKAN parçada ise süslü parantezler zaten ayıklanmış olur; geriye kalan metin çağrı ya da
// anahtar kelime taşıyorsa koddur.
const isCodeInDangling = (part) => isCodeInText(part) || CALL_OR_ACCESS.test(part) || CODE_TOKEN.test(part);

// SAF: parça bir NESNE ALANI satırı mı? `netSatisKurus: 1295235481,` gibi.
// NEDEN: yazı ölçütü yalnız `=` ve `;` arıyordu; nesne alanı satırında ikisi de yoktur, bu yüzden
// satır "ekran yazısı" sanılıp atılıyor ve içindeki Türkçe ad KAÇIYORDU. CRLF düzeltmesi bunu
// görünür kıldı: `netSatisKurus: 1295235481, // Yıllıklandırılmış = …` satırında adı ayakta tutan
// şey YORUMDAKİ `=` işaretiydi; yorum doğru şekilde soyulunca ad da kayboldu (2026-09-19).
// Ölçüt dar: ad + iki nokta + değer + sonda virgül. Ekran yazısındaki "Durum: aktif" bu kalıba
// uymaz (sonunda virgül yoktur).
const PROPERTY_LINE = /^\s*[A-Za-z_$][A-Za-z0-9_$]*\s*:\s*\S.*,\s*$/;
const BRACE_EXPR = /{[^{}]*}/g;

// SAF: JSX gövdesinden yalnız süslü parantezli ifadeleri bırakır (yazıyı atar)
const keepExpressions = (part) => (part.match(BRACE_EXPR) || []).join(' ');

// SAF: parça yazı mı? Atama ya da satır sonu işareti taşıyan parça koddur, dokunulmaz.
const isPlainText = (part) => part.trim() !== '' && !isCodeInText(stripEntities(part)) && !PROPERTY_LINE.test(part);

// Etiket dışında kalan (sarkan) yazı. Ölçüt önce SÜSLÜ PARANTEZLİ İFADELERİ ayıklar, sonra
// KALAN metne bakar.
//
// Neden böyle (SNN-Proje-ve-Nakit-Akis bildirimi #28, 2026-09-19): ölçüt "parantez varsa koddur"
// diyordu. Türkçe arayüz yazısında parantez çok sık — `Kuruma Ait İhaleler ({projects.length})`
// gibi — ve bu tek başına 16 yanlış alarm üretiyordu.
//
// Parantez katılığı bilerek konmuştu ve gerçek bir şeyi koruyordu: `onChange={(e) => setX(e)}`
// satırında `=>` sonrası yazı sanılıp gerçek adlar kaçıyordu (2026-09-18). Koruma duruyor, ama
// artık parantezin kendisiyle değil: süslü ifadeler ayıklanınca o satırda `=` kalır, bu yazının
// yazı olmadığını yeterince söyler. Bildiren kişi bu korumayı testiyle birlikte gösterdi.
const isDanglingText = (part) => {
  if (part.trim() === '' || PROPERTY_LINE.test(part)) return false;
  const rest = stripEntities(String(part).replace(BRACE_EXPR, ' '));
  return !isCodeInDangling(rest);
};

function stripJsxText(line) {
  let s = line;
  // 1) <etiket> … </etiket> arasındaki gövde: yazı atılır, ifade korunur
  s = s.replace(/>([^<>]*)</g, (whole, inner) => (isPlainText(inner) ? `>${keepExpressions(inner)}<` : whole));
  // 2) satırın sonunda, son '>' işaretinden sonra kalan gövde (metin alt satıra sarkıyor)
  const lastClose = s.lastIndexOf('>');
  if (lastClose >= 0 && isDanglingText(s.slice(lastClose + 1))) s = `${s.slice(0, lastClose + 1)}${keepExpressions(s.slice(lastClose + 1))}`;
  // 3) satırın başında, ilk '<' işaretinden önce kalan gövde (metnin devamı)
  const firstOpen = s.indexOf('<');
  if (firstOpen > 0 && isDanglingText(s.slice(0, firstOpen))) s = `${keepExpressions(s.slice(0, firstOpen))}${s.slice(firstOpen)}`;
  // 4) tamamen gövde olan satır (JSX ortası): etiket yoksa yazı atılır, ifade kalır
  // 4) etiketsiz satır: süslü parantez ÖNCESİ ve SONRASI yazı atılır, ifadeler kalır
  //    ("Kurum Adı {sortField === …}" satırında "Adı" tanımlayıcı değildir)
  if (!/[<>]/.test(s)) {
    const firstBrace = s.indexOf('{');
    const lastBrace = s.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      const before = s.slice(0, firstBrace);
      const after = s.slice(lastBrace + 1);
      // SATIRIN BAŞI KODSA SONU DA KODDUR. İki yan bağımsız değerlendirilince
      // `for (const { yol, icerik } of geriYuklemeKuyrugu) {` satırında baş "kod" sayılıyor ama
      // son (` of geriYuklemeKuyrugu) {`) tek başına yazıya benziyor ve GERÇEK AD atılıyordu
      // (2026-09-19 ölçümünde yakalandı). Yazı satırında iki yan da yazıdır.
      const textBefore = before.trim() === '' || isDanglingText(before);
      const textAfter = after.trim() === '' || isDanglingText(after);
      if (textBefore && textAfter && (before.trim() !== '' || after.trim() !== '')) {
        s = s.slice(firstBrace, lastBrace + 1);
      }
    } else if (isPlainText(s)) return keepExpressions(s);
  }
  return s;
}

const IDENTIFIER = /[A-Za-z_$çğıöşüÇĞİÖŞÜ][A-Za-z0-9_$çğıöşüÇĞİÖŞÜ]*/g;

// SAF: tek satırdaki kuralı bozan tanımlayıcılar → [{ ad, neden }]
function lineFindings(line, words, sql = false, stack = [], ctx = {}) {
  const code = codePart(line, sql, stack, ctx);
  const out = [];
  const seen = new Set();
  for (const m of code.matchAll(IDENTIFIER)) {
    const name = m[0];
    if (seen.has(name)) continue;
    seen.add(name);
    const sorun = identifierProblem(name, words);
    if (sorun) out.push(sorun);
  }
  return out;
}

// SAF: bir DOSYANIN tüm satırları — şablon durumu satırdan satıra taşınır.
// Çok satırlı şablonun orta satırları ancak böyle doğru değerlendirilir (#76).
// Önceki satırın son kod parçası da taşınır: satır başındaki düzenli ifade (#102).
function fileFindings(lines, words, sql = false, jsx = true) {
  let stack = [];
  let carry = '';
  const out = [];
  lines.forEach((line, i) => {
    const { code, stack: next, carry: nextCarry } = codePartAt(line, sql, stack, { jsx, carry });
    carry = nextCarry;
    const seen = new Set();
    for (const m of code.matchAll(IDENTIFIER)) {
      const name = m[0];
      if (seen.has(name)) continue;
      seen.add(name);
      const problem = identifierProblem(name, words);
      if (problem) out.push({ line: i + 1, ...problem });
    }
    stack = next;
  });
  return out;
}

// SAF: dosyanın ilk `upto` satırından sonra şablon durumu ne? (diff kipinde bağlam kurar)
function stackBefore(lines, upto, sql = false) {
  return stateBefore(lines, upto, sql).stack;
}

// SAF: dosyanın ilk `upto` satırından sonraki bağlam → { stack, carry } (diff kipi, #102)
function stateBefore(lines, upto, sql = false, jsx = true) {
  let state = { stack: [], carry: '' };
  for (let i = 0; i < upto && i < lines.length; i += 1) {
    const r = codePartAt(lines[i], sql, state.stack, { jsx, carry: state.carry });
    state = { stack: r.stack, carry: r.carry };
  }
  return state;
}

// SAF: dosya/klasör adı kuralı bozuyor mu? → [{ ad, neden }]
function pathFindings(yol, words) {
  const out = [];
  for (const part of yol.split('/')) {
    const name = part.replace(/\.(ts|tsx|js|jsx|mjs|cjs|sql)$/, '').replace(/\.(test|spec|config)$/, '');
    if (!name) continue;
    const sorun = identifierProblem(name, words);
    if (sorun) out.push({ ...sorun, kind: 'yol' });
  }
  return out;
}

// ─── İstisna listesi ────────────────────────────────────────────────────────
// Proje kökünde `.snn-kod-dili.json`:
// { "exceptions": [ { "name": "plaka", "reason": "Türkiye'ye özgü kavram, karşılığı yok (TB-012)" } ],
//   "paths":     [ { "path": "supabase/migrations/2026*", "reason": "canlıya uygulanmış, değişmez" } ] }
// Gerekçesiz kayıt SAYILMAZ: istisna görünür ve savunulabilir olmalıdır.
function readExceptions(root) {
  const empty = { names: new Set(), paths: [], warnings: [] };
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(path.join(root, '.snn-kod-dili.json'), 'utf8'));
  } catch {
    return empty;
  }
  const warnings = [];
  const names = new Set();
  for (const g of raw.exceptions || []) {
    if (!g || !g.name) continue;
    if (!g.reason) { warnings.push(`istisna "${g.name}" gerekçesiz → sayılmadı`); continue; }
    names.add(asciiFold(String(g.name)));
  }
  const paths = [];
  for (const g of raw.paths || []) {
    if (!g || !g.path) continue;
    if (!g.reason) { warnings.push(`yol istisnası "${g.path}" gerekçesiz → sayılmadı`); continue; }
    paths.push({ glob: String(g.path), re: new RegExp(`^${String(g.path).split('*').map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`) });
  }
  // `used`: hangi istisna GERÇEKTEN bir bulguyu susturdu? Eşleşmeyen istisna, yazarın
  // "yazdım sandığı ama yazamadığı" istisnadır (SNN-Abacus-Core bildirimi #62, 2026-09-19).
  return { names, paths, warnings, used: new Set() };
}

const isExcepted = (finding, yol, exception) => {
  const name = asciiFold(finding.name);
  if (exception.names.has(name)) {
    if (exception.used) exception.used.add(`ad:${name}`);
    return true;
  }
  // `p.re || p`: yol istisnası 2026-09-19'da `{glob, re}` biçimine geçti. Eski biçim (düz düzenli
  // ifade) gelirse ÇÖKMEZ — bu işlev uyarı kipinden de çağrılıyor ve o her Edit'te çalışıyor.
  const hit = exception.paths.find((p) => (p.re || p).test(yol));
  if (!hit) return false;
  if (exception.used) exception.used.add(`yol:${hit.glob || String(hit)}`);
  return true;
};

// SAF: hiçbir bulguyla eşleşmemiş istisnalar → uyarı satırları.
//
// NEDEN (SNN-Abacus-Core bildirimi #62, 2026-09-19): proje istisnası TAM TANIMLAYICI adı bekler
// (`PLAKA_HARFLERI`), ama standarttaki örnek KÖK gibi görünen bir kelime gösteriyordu (`plaka`).
// Bildiren kişi örneği birebir izledi; dosya geçerli JSON, gerekçe dolu, tarayıcı sessiz —
// ve istisna hiçbir şey yapmadı. Yanlış yazan kişi, önce/sonra sayıyı karşılaştırmadıkça
// hatasını göremiyordu. Artık görüyor.
function unusedExceptions(exception) {
  const out = [];
  for (const name of exception.names) {
    if (exception.used.has(`ad:${name}`)) continue;
    out.push(`istisna "${name}" hiçbir bulguyla eşleşmedi → TAM tanımlayıcı adı bekleniyor (ör. PLAKA_HARFLERI), kök (plaka) değil; ya da bu istisna artık gerekmiyor`);
  }
  for (const { glob } of exception.paths) {
    if (exception.used.has(`yol:${glob}`)) continue;
    out.push(`yol istisnası "${glob}" hiçbir bulguyla eşleşmedi → yol yanlış olabilir ya da artık gerekmiyor`);
  }
  return out;
}

// ─── Girdi kaynakları ───────────────────────────────────────────────────────
const gitOut = (root, args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', maxBuffer: 1e9 });

// SAF: birleşik diff (git diff -U0) içinde yalnız EKLENEN satırlar → [{ file, line, text }]
function addedLines(diff) {
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

const isScanned = (yol) => !SKIPPED_PATH.test(yol) && (SOURCE_EXT.test(yol) || SQL_EXT.test(yol));

// Aile geneli kok istisnalari: bu kokler HICBIR projede bulgu sayilmaz. Proje istisnasindan farki:
// karar ailenindir, tek dosyada durur ve 10 projeye ayni anda uygulanir.
// Gerekcesiz kayit SAYILMAZ; istisna gorunur ve savunulabilir olmalidir.
// Kural: standartlar/kod-dili-standardi.md · Karar: 2026-09-19 teshisi (16.023 bulgu / 136 kok).
// SAF: ayristirma. Gerekcesiz kayit SAYILMAZ; istisna gorunur ve savunulabilir olmalidir.
function familyRoots(raw) {
  const roots = new Set();
  const warnings = [];
  for (const g of (raw && raw.roots) || []) {
    if (!g || !g.root) continue;
    if (!g.reason) { warnings.push(`aile istisnasi "${g.root}" gerekcesiz -> sayilmadi`); continue; }
    roots.add(asciiFold(String(g.root)));
  }
  return { roots, warnings };
}

function familyExceptions() {
  try {
    return familyRoots(JSON.parse(fs.readFileSync(FAMILY_FILE, 'utf8')));
  } catch {
    return { roots: new Set(), warnings: [] };
  }
}

// Kelime listesi eksi aile istisnalari. Cikarma tek yerde yapilir ki scanAll, scanDiff ve uyari
// kipi ayni karari gorsun; ayri ayri uygulanirsa kapilar zamanla birbirinden ayrisir.
function wordSet(family = familyExceptions()) {
  const words = new Set(JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')).words);
  for (const r of family.roots) words.delete(r);
  return words;
}

// SAF: tabandan başa SAYISI ARTAN adlar → Set. Sayı, adın geçtiği satır sayısıdır.
// "Tabanda var mı" yerine "sayısı arttı mı" (#88): var olan Türkçe bir adın YENİ kullanımı da
// Türkçe adı yaygınlaştırır ve yakalanmalıdır; yalnız yeniden adlandırmada sayı değişmez.
function grownNames(baseFindings, headFindings) {
  const count = (list) => {
    const m = new Map();
    for (const { name } of list) m.set(name, (m.get(name) || 0) + 1);
    return m;
  };
  const before = count(baseFindings);
  const out = new Set();
  for (const [name, n] of count(headFindings)) if (n > (before.get(name) || 0)) out.add(name);
  return out;
}

// SAF: bu satırda ad TANIM konumunda mı? Tanım dört biçimde gelir:
//   bildirim   : const/let/var/function/class/interface/type/enum ardından
//   yapı bozma : const { a, b: c } = … · const [a, b] = …
//   parametre  : function f(a, b) · (a: T) => · a => · metot(a) { · catch (a)
// İçe aktarma satırı tanım değildir: `import { type X } from …` var olan bir adı kullanır.
// Parametre ve yapı bozma ilk sürümde yoktu; aile ölçümünde (2026-09-24) uyarıya kaçan gerçek yeni
// tanımlar bunlardı (Piyasa-Core `saglikliDurum(piyasaZamani = …)`, `const [yil, ay, gn] = …`).
// Satır tabanlı bir sezgidir, ayrıştırıcı değildir: yapı bozmadaki anahtar (`{ hesapKodu: code }`)
// da tanım sayılır. Belirsizlikte KATI tarafa, yani kırmızıya düşer.
const IMPORT_LINE = /^\s*(import|export)\b[^;]*\bfrom\b/;
const IDENT = '[\\p{L}_$][\\p{L}\\p{N}_$]*';
function paramLists(text) {
  const out = [];
  for (const m of text.matchAll(/\bfunction\b[^(]*\(([^)]*)\)/g)) out.push(m[1]);
  for (const m of text.matchAll(/\bcatch\s*\(([^)]*)\)/g)) out.push(m[1]);
  for (const m of text.matchAll(/\(([^()]*)\)\s*(?::\s*[^=()]+)?\s*=>/g)) out.push(m[1]);
  for (const m of text.matchAll(new RegExp(`(?:^|[^\\p{L}\\p{N}_$.)])(${IDENT})\\s*=>`, 'gu'))) out.push(m[1]);
  const method = text.match(new RegExp(`^\\s*(?:(?:async|static|public|private|protected|readonly|get|set)\\s+)*${IDENT}\\s*\\(([^)]*)\\)\\s*(?::\\s*[^{]+)?\\{\\s*$`, 'u'));
  if (method && !/^\s*(if|for|while|switch|catch|return|else)\b/.test(text)) out.push(method[1]);
  return out;
}
function isDefinition(text, name) {
  if (IMPORT_LINE.test(text)) return false;
  const n = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const whole = new RegExp(`(?<![\\p{L}\\p{N}_$])${n}(?![\\p{L}\\p{N}_$])`, 'u');
  if (new RegExp(`(?<![\\p{L}\\p{N}_$])(?:const|let|var|function|class|interface|type|enum)\\s+${n}(?![\\p{L}\\p{N}_$])`, 'u').test(text)) return true;
  const destructure = text.match(/\b(?:const|let|var)\s*([{[][^=]*[}\]])\s*(?::[^=]*)?=/);
  if (destructure && whole.test(destructure[1])) return true;
  const param = new RegExp(`(?:^|[,{[(])\\s*(?:\\.\\.\\.)?${n}\\s*(?=[?:=,)}\\]]|$)`, 'u');
  return paramLists(text).some((p) => param.test(p));
}

// Git çağrısı, hata metni günlüğe sızmadan. "fatal: path … exists on disk, but not in <taban>"
// satırı her yeni dosyada CI günlüğüne düşüyordu (tüketici bildirimi #100 yan gözlemi, 2026-09-24).
const quietGit = (root, args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', maxBuffer: 1e9, stdio: ['ignore', 'pipe', 'ignore'] });
const SCANNED_GLOBS = ['*.ts', '*.tsx', '*.js', '*.jsx', '*.mjs', '*.cjs'];

// Diff kipi: yalnız eklenen satırlar + yeni eklenen dosyaların adları
//
// ÜÇ SINIF (tüketici bildirimi #100, proje sahibi kararı 2026-09-24):
//   bulgu (kırmızı) : tabanda depoda HİÇ olmayan Türkçe ad, ya da var olan adın YENİ TANIMI
//   kullanım (uyarı): tabanda depoda zaten TANIMLAYICI olarak duran bir adın kullanımı — görünür, engellemez
// Gerekçe: var olan bir adı İngilizceye çevirmek, kaç yerde kullanıldığından bağımsız tek bir yeniden
// adlandırmadır. Türkçe tipli projelerde (Yönetici-Özeti) bu tipleri kullanan her PR kırmızı yanıyordu;
// ölçüm (son 137 birleştirme): bulguların %61'i bu türdü, 16 kırmızı birleştirmenin 4'ü yalnız bundan.
// SQL dosyalarında sınıflama yapılmaz, eski davranış (her büyüyen ad kırmızı) sürer.
function scanDiff(root, taban) {
  const words = wordSet();
  const exception = readExceptions(root);
  const findings = [];
  const diff = gitOut(root, ['diff', '-U0', '-M', '--no-color', '--no-ext-diff', `${taban}...HEAD`]);
  // ŞABLON BAĞLAMI: eklenen satır, çok satırlı bir şablonun ORTASINDA olabilir. Tek başına
  // bakıldığında ekran metni kod sanılır (#76). Dosyanın o satıra kadarki hâli okunarak bağlam
  // kurulur. Dosya okunamazsa eski davranışa düşülür — kapı yine çalışır, yalnız bağlamsız.
  const fileLines = new Map();
  const linesOf = (file) => {
    if (!fileLines.has(file)) {
      try { fileLines.set(file, fs.readFileSync(path.join(root, file), 'utf8').split(/\r?\n/)); } catch { fileLines.set(file, null); }
    }
    return fileLines.get(file);
  };
  // YENİ Mİ, ESKİ Mİ? Eklenen satır ad eklendiği anlamına gelmez (trade-kasa bildirimi #88,
  // 2026-09-23): bir adı çeviren PR, aynı satırda duran eski Türkçe adı da "eklemiş" görünüyordu.
  // Adın dosyadaki sayısı tabana göre ARTMADIYSA bulgu sayılmaz. Taban, `taban...HEAD` ile aynı
  // noktadır (ortak ata). Dosya taşındıysa tabandaki ESKİ yolu okunur.
  const mergeBase = (() => { try { return gitOut(root, ['merge-base', taban, 'HEAD']).trim(); } catch { return taban; } })();
  const renamedFrom = new Map();
  for (const row of gitOut(root, ['diff', '--name-status', '-M', '--diff-filter=R', `${taban}...HEAD`]).split('\n')) {
    const [, from, to] = row.split('\t');
    if (from && to) renamedFrom.set(to, from);
  }
  const grownIn = new Map();
  const grownOf = (file, sql) => {
    if (!grownIn.has(file)) {
      const head = linesOf(file);
      let base = [];
      try { base = quietGit(root, ['show', `${mergeBase}:${renamedFrom.get(file) || file}`]).split(/\r?\n/); } catch { /* dosya tabanda yok: her ad yenidir */ }
      // Baş okunamazsa karşılaştırma yapılamaz: eski davranış (her bulgu sayılır) korunur.
      const jsx = isJsxFile(file);
      grownIn.set(file, head ? grownNames(fileFindings(base, words, sql, jsx), fileFindings(head, words, sql, jsx)) : null);
    }
    return grownIn.get(file);
  };
  // Ad tabanda depoda TANIMLAYICI olarak var mı? Yalnız metinde geçmesi yetmez: yorumda ya da dizgede
  // duran kelime tanımlayıcı sayılmaz. Aday dosyalar git grep ile bulunur, sonra tarayıcının kendi
  // ayıklamasıyla okunur. git grep 1 ile çıkarsa ad yoktur; başka bir hata "bilinmiyor"dur ve katı
  // tarafa düşülür: ad yok sayılır, bulgu kırmızı kalır (olcum-standardi.md Kural 3, bilinçli temkin).
  const baseIdentifiers = new Map();
  const existsCache = new Map();
  const existsAtBase = (name) => {
    if (existsCache.has(name)) return existsCache.get(name);
    let candidates = [];
    try {
      candidates = quietGit(root, ['grep', '-l', '-w', '-F', name, mergeBase, '--', ...SCANNED_GLOBS])
        .split('\n').filter(Boolean).map((l) => l.slice(l.indexOf(':') + 1));
    } catch { /* bulunamadı ya da okunamadı: katı taraf */ }
    let found = false;
    for (const f of candidates) {
      if (!isScanned(f)) continue;
      if (!baseIdentifiers.has(f)) {
        let names = new Set();
        try { names = new Set(fileFindings(quietGit(root, ['show', `${mergeBase}:${f}`]).split(/\r?\n/), words, false, isJsxFile(f)).map((x) => x.name)); } catch { /* okunamadı: katı taraf */ }
        baseIdentifiers.set(f, names);
      }
      if (baseIdentifiers.get(f).has(name)) { found = true; break; }
    }
    existsCache.set(name, found);
    return found;
  };
  const usage = [];
  for (const { file, line, text } of addedLines(diff)) {
    if (!isScanned(file)) continue;
    const sql = SQL_EXT.test(file);
    const all = linesOf(file);
    const jsx = isJsxFile(file);
    const { stack, carry } = all ? stateBefore(all, line - 1, sql, jsx) : { stack: [], carry: '' };
    const grown = grownOf(file, sql);
    for (const b of lineFindings(text, words, sql, stack, { jsx, carry })) {
      if (grown && !grown.has(b.name)) continue;
      if (isExcepted(b, file, exception)) continue;
      const isUsage = !sql && grown && !isDefinition(text, b.name) && existsAtBase(b.name);
      (isUsage ? usage : findings).push({ file, line, ...b });
    }
  }
  const newFiles = gitOut(root, ['diff', '--name-only', '--diff-filter=A', `${taban}...HEAD`]).split('\n').filter(Boolean);
  for (const file of newFiles) {
    if (!isScanned(file)) continue;
    for (const b of pathFindings(file, words)) {
      if (!isExcepted(b, file, exception)) findings.push({ file, line: 0, ...b });
    }
  }
  return { findings, usage, warnings: [...exception.warnings, ...unusedExceptions(exception)] };
}

// Tam denetim: git'teki tüm kaynak ve SQL dosyaları
function scanAll(root) {
  const words = wordSet();
  const exception = readExceptions(root);
  const findings = [];
  const files = gitOut(root, ['ls-files', '--cached', '--others', '--exclude-standard']).split('\n').filter(Boolean).filter(isScanned);
  for (const file of files) {
    for (const b of pathFindings(file, words)) {
      if (!isExcepted(b, file, exception)) findings.push({ file, line: 0, ...b });
    }
    let icerik;
    try { icerik = fs.readFileSync(path.join(root, file), 'utf8'); } catch { continue; }
    const sql = SQL_EXT.test(file);
    // Şablon durumu satırdan satıra taşınır: çok satırlı şablonun gövdesi ekran metnidir (#76).
    for (const { line, ...rest } of fileFindings(icerik.split(/\r?\n/), words, sql, isJsxFile(file))) {
      if (!isExcepted(rest, file, exception)) findings.push({ file, line, ...rest });
    }
  }
  return { findings, warnings: [...exception.warnings, ...unusedExceptions(exception)], fileCount: files.length };
}

// SAF: rapor metni
// SAF: var olan adların kullanımı (uyarı) — engellemez, görünür kalır (#100)
function usageLines(usage) {
  if (!usage || !usage.length) return [];
  const byName = new Map();
  for (const b of usage) byName.set(b.name, (byName.get(b.name) || 0) + 1);
  const top = [...byName.entries()].sort((a, b) => b[1] - a[1]);
  return [
    `⚠ ${usage.length} var olan Türkçe adın kullanımı (${top.length} ayrı ad) — engellemez:`,
    `  ${top.slice(0, 12).map(([n, c]) => `${n} ×${c}`).join(', ')}${top.length > 12 ? ` … (+${top.length - 12})` : ''}`,
    '  Bu adlar tabanda zaten tanımlı. Çevirileri projenin kendi teknik borç kaydında yapılır.',
  ];
}

function report({ findings, usage = [], warnings = [], fileCount }, mode) {
  const lines = [];
  for (const u of warnings) lines.push(`  ⚠ ${u}`);
  if (!findings.length) {
    lines.push(`✓ Türkçe tanımlayıcı bulunmadı${fileCount ? ` (${fileCount} dosya tarandı)` : ''}${usage.length ? ' — yeni tanım ya da yeni ad yok' : ''}.`);
    lines.push(...usageLines(usage));
    return lines.join('\n');
  }
  // Aynı ad tekrar tekrar yazılmasın: ada göre topla, ilk 3 yeri göster
  const groups = new Map();
  for (const b of findings) {
    const k = `${b.name}|${b.reason}`;
    if (!groups.has(k)) groups.set(k, { ...b, places: [] });
    groups.get(k).places.push(b.line ? `${b.file}:${b.line}` : b.file);
  }
  const sorted = [...groups.values()].sort((a, b) => b.places.length - a.places.length);
  lines.push(`✗ ${findings.length} Türkçe tanımlayıcı (${sorted.length} ayrı ad)${mode === 'diff' ? ' — eklenen satırlarda' : ''}:`);
  for (const g of sorted) {
    const place = g.places.slice(0, 3).join(', ') + (g.places.length > 3 ? ` … (+${g.places.length - 3})` : '');
    lines.push(`  ✗ ${g.name} — ${g.reason} · ${place}`);
  }
  const usageSection = usageLines(usage);
  if (usageSection.length) lines.push('', ...usageSection);
  lines.push('');
  lines.push('Kural: standartlar/kod-dili-standardi.md — tanımlayıcılar (dosya adı, değişken, fonksiyon,');
  lines.push('tip, tablo, sütun, API alanı) İngilizce yazılır. Yorumlar, belgeler ve kullanıcıya giden');
  lines.push('metinler Türkçe kalır.');
  lines.push('Türkiye\'ye özgü, İngilizce karşılığı olmayan bir kavramsa: projenin .snn-kod-dili.json');
  lines.push('dosyasına gerekçesiyle istisna yazılır.');
  return lines.join('\n');
}

module.exports = {
  asciiFold, splitWords, stripJsxText, turkishWord, identifierProblem, codePart, lineFindings,
  pathFindings, readExceptions, addedLines, report, scanDiff, scanAll,
  familyExceptions, familyRoots, wordSet,
  isScanned, isExcepted, unusedExceptions, codePartAt, fileFindings, stackBefore, stateBefore, grownNames,
  isJsxFile,
  isDefinition,
};

if (require.main === module) {
  const argv = process.argv.slice(2);
  const diffIdx = argv.indexOf('--diff');
  const all = argv.includes('--tumu');
  const positions = argv.filter((a, i) => !a.startsWith('--') && i !== diffIdx + 1);
  const root = path.resolve(positions[0] || process.cwd());
  if (!all && diffIdx < 0) {
    console.error('Kullanım: node kod-dili-tarama.js --diff <taban-commit> [proje] | --tumu [proje]');
    process.exit(2);
  }
  const result = all ? scanAll(root) : scanDiff(root, argv[diffIdx + 1]);
  console.log(report(result, all ? 'tumu' : 'diff'));
  process.exit(result.findings.length ? 1 : 0);
}
