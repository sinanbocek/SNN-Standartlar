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
function stripTemplates(line) {
  let out = '';
  let depth = 0;   // kaç şablon dizgesinin içindeyiz
  let brace = 0;   // şablon içindeki ${ } derinliği
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '\\' && depth > 0) { i += 1; continue; }
    if (ch === '`') {
      depth += (depth > 0 && brace === 0) ? -1 : 1;
      if (depth === 0) out += '``';
      continue;
    }
    if (depth > 0) {
      if (ch === '$' && line[i + 1] === '{') { brace += 1; i += 1; continue; }
      if (ch === '}' && brace > 0) { brace -= 1; continue; }
      continue;
    }
    out += ch;
  }
  return out;
}

// SAF: kod satırından yorum ve dizge içeriklerini ATAR; geriye yalnız tanımlayıcı taşıyan metin kalır.
// Satır bazlıdır (diff kipinde tam dosya elde yok). Bilinen sınır: çok satırlı blok yorumun
// ortasındaki satırlar '*' ile başlamıyorsa taranabilir; bu yüzden '*' ile başlayan satır atılır.
function codePart(line, sql) {
  // CRLF SOYULUR — ÖNCE. Yorum soyma kuralları `.*$` ile biter; JavaScript'te `.` satır sonunu
  // (\r dahil) EŞLEŞTİRMEZ ve `$` dizgenin sonunu ister. Satır `\r` ile bitiyorsa `--.*$` ve
  // `//.*$` hiç eşleşmez, yani YORUM HİÇ SOYULMAZ ve içindeki Türkçe düzyazı tanımlayıcı
  // sanılır. Yorumda Türkçe serbesttir; bu doğrudan yanlış alarmdır.
  // Ölçüldü (2026-09-19, 11 proje / 2.684 dosya): 26.060 bulgunun 9.938'i (%38,1) bu kaynaktan.
  // CI Linux'ta (LF) görünmüyordu; yalnız Windows çalışma kopyasında çıkıyordu.
  let s = String(line).replace(/\r+$/, '');
  if (/^\s*\*/.test(s)) return ''; // blok yorumun gövde satırı
  s = s.replace(/'(?:[^'\\]|\\.)*'/g, "''");          // tek tırnaklı dizge
  if (sql) {
    s = s.replace(/--.*$/, '');                        // SQL satır yorumu
    s = s.replace(/\/\*[\s\S]*?(\*\/|$)/g, ' ');
    return s;
  }
  s = s.replace(/"(?:[^"\\]|\\.)*"/g, '""');           // çift tırnaklı dizge
  s = stripTemplates(s);                               // şablon dizge (iç içe olanlar dahil)
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
  return stripJsxText(s);
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
function lineFindings(line, words, sql = false) {
  const code = codePart(line, sql);
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
    paths.push(new RegExp(`^${String(g.path).split('*').map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`));
  }
  return { names, paths, warnings };
}

const isExcepted = (finding, yol, exception) => exception.names.has(asciiFold(finding.name)) || exception.paths.some((r) => r.test(yol));

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

// Diff kipi: yalnız eklenen satırlar + yeni eklenen dosyaların adları
function scanDiff(root, taban) {
  const words = wordSet();
  const exception = readExceptions(root);
  const findings = [];
  const diff = gitOut(root, ['diff', '-U0', '--no-color', '--no-ext-diff', `${taban}...HEAD`]);
  for (const { file, line, text } of addedLines(diff)) {
    if (!isScanned(file)) continue;
    for (const b of lineFindings(text, words, SQL_EXT.test(file))) {
      if (!isExcepted(b, file, exception)) findings.push({ file, line, ...b });
    }
  }
  const newFiles = gitOut(root, ['diff', '--name-only', '--diff-filter=A', `${taban}...HEAD`]).split('\n').filter(Boolean);
  for (const file of newFiles) {
    if (!isScanned(file)) continue;
    for (const b of pathFindings(file, words)) {
      if (!isExcepted(b, file, exception)) findings.push({ file, line: 0, ...b });
    }
  }
  return { findings, warnings: exception.warnings };
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
    icerik.split(/\r?\n/).forEach((line, i) => {
      for (const b of lineFindings(line, words, sql)) {
        if (!isExcepted(b, file, exception)) findings.push({ file, line: i + 1, ...b });
      }
    });
  }
  return { findings, warnings: exception.warnings, fileCount: files.length };
}

// SAF: rapor metni
function report({ findings, warnings = [], fileCount }, mode) {
  const lines = [];
  for (const u of warnings) lines.push(`  ⚠ ${u}`);
  if (!findings.length) {
    lines.push(`✓ Türkçe tanımlayıcı bulunmadı${fileCount ? ` (${fileCount} dosya tarandı)` : ''}.`);
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
  isScanned, isExcepted,
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
