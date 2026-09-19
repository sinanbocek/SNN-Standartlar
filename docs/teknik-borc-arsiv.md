# Teknik Borç Kütüğü — Arşiv (kapanan kalemler)

> Kapanan kayıtlar silinmez; ders ve uyarı taşır. Biçim: standarttaki "Kapanış" bölümü.

---

## Kapanan Kalemler

### TB-002 — Eş zamanlı oturumlarda dosya sahipliği ölçülmüyor
- **Tespit Tarihi:** 2026-09-18 (eş zamanlı çalışma standardı kurulurken)
- **Kapanış:** 2026-09-19 — TB-002 kütükten kalktı. Bekleme **ölçüm kaydına** dönüştü: `quality/data/pending-measurements.json` → `OLC-001`, vade **2026-09-26**. Kütükte "sonra ölçeriz" diye bekleyen kayıt durmaz.
- **Öncelik (kapanışta):** P3 (Fırsatta)
- **Issue:** #24

#### 🟢 Sade Anlatım
- **Sorun ne?** Artık makine "bu projede başka bir oturum açık" diyor ve tehlikeli toplu komutları engelliyor. Ama "şu dosya üzerinde şu an kim çalışıyor" bilgisini tutmuyor. İki oturum aynı dosyayı aynı anda düzenlerse, ikincisi birincinin yazdığını görmeden üstüne yazabilir.
- **Benzetme:** Kapıda görevli var, tehlikeli aletleri alıyor. Ama odaların kapısında "içeride çalışan var" tabelası yok; iki usta aynı odaya girebiliyor.
- **Çözülmezse ne olur?** Büyük ihtimalle bir şey olmaz: ajanlar farklı konularda çalışıyor ve her biri kendi dalında. Aynı dosyada buluşurlarsa git zaten çakışma verir. Risk, commit'lenmemiş halde üst üste yazmaktır.
- **Senden beklenen karar:** Yok. Gerçek bir çakışma yaşanırsa bu kayıt P2'ye çıkar ve dosya işaretleme eklenir.

#### 🔧 Teknik Detay
- **Açıklama:** `quality/session-registry.js` oturum düzeyinde çalışıyor (kim, hangi dal, ne zaman). Dosya düzeyi yok. Ölçüm yapılmadı: bugüne kadar **bir** gerçek olay yaşandı (`git add -A`), o da artık `quality/wide-effect-git.js` ile engelleniyor.
- **Etki:** Yalnız aynı depoda aynı anda çalışan oturumlar; ayrı worktree kullanıldığında konu kapanır.
- **Çözüm yönü:** Ölçümle başla: kaç kez "aynı proje, aynı anda, **aynı dal**" görüldü? Sık ise `guard-files` bekçisine dosya iddiası (claim) eklenir: oturum yazdığı dosyayı deftere işler, ikinci oturumun aynı dosyaya Write/Edit çağrısı engellenir. Seyrek ise standardın 2. maddesi (ayrı dal / ayrı worktree) yeterlidir.
- **2026-09-19 · ÖLÇÜM ARTIK GERÇEKTEN TOPLANIYOR.** Bu kayıt *"bir hafta defter verisi beklensin"* diyordu. Proje sahibi *"TB-002 neyi bekliyor?"* diye sorunca ölçüldü: defter **yalnız şu anki** oturumları tutuyordu (`session-registry.js`, 2 saatten eski kayıt siliniyor). Yani beklenen veri **hiçbir zaman gelmeyecekti** — bir hafta da beklense elde bir şey olmayacaktı. Bu, *"bakacağım"*ın kontrol sanılmasıyla aynı sınıftan bir kusurdur.
  - `session-registry.announce` artık her buluşmayı `~/.claude/oturumlar/_cakisma-gunlugu.jsonl` dosyasına yazıyor. Günlük **dar**: tarih, proje, kendi dalı, diğer dallar, aynı-dal bayrağı. Dosya adı, komut ya da içerik yazılmaz; dosya 512 KB'ı aşarsa yazma durur.
  - `node quality/meeting-report.js --gun 7` soruyu cevaplar ve iki yolu da gösterir: aynı dalda buluşma varsa P2'ye çıkarma, yoksa kaydı kapatma.
  - Sayı görülmeden karar verilmez — ama artık sayı **birikiyor**.
- **Neden Şimdi Çözülmüyor:** Proje sahibi kararı (2026-09-18): ölçmeden kural konmaz. Kilit yanlış güven verir; önce gerçek çakışma görülsün.
- **Bağlı kalemler:** Yok.

#### 📏 Neden kütükten kalktı

Bu kayıt bir **borç** değildi; **vadesi gelmemiş bir ölçümdü**. İkisi karışınca iki zarar doğdu:

1. **Beklenen veri hiç toplanmıyordu.** Kayıt *"bir hafta defter verisi beklensin"* diyordu, ama
   defter yalnız şu anki oturumları tutuyordu (`session-registry.js`, 2 saatten eski kayıt
   silinir). Bir hafta da beklense elde bir şey olmayacaktı.
2. **Beklemeyi kimse tetiklemiyordu.** "Bir hafta sonra bakarız" bir kontrol değil, bir niyettir.

Proje sahibi (2026-09-19): *"bu ve benzeri işlemler tamamen makine zorlamasıyla kontrol edilerek
otomatik tetiklenen bir makine kuralı olmalı; aksi asla kabul edilemez."*

#### ✅ Yerine ne kuruldu

| Parça | Ne yapar |
|---|---|
| `session-registry.js` günlüğü | Her buluşmayı `~/.claude/oturumlar/_cakisma-gunlugu.jsonl` dosyasına yazar — veri artık **birikiyor** |
| `quality/meeting-report.js` | Soruyu cevaplar; kararı dayatmaz, iki yolu da gösterir |
| `quality/data/pending-measurements.json` | `OLC-001` — soru, çalıştırılabilir komut, **vade**, ve sayı gelince ne yapılacağı |
| `quality/pending-measurements.js` | Komut çalıştırılabilir mi denetler; **vade gelince komutu çalıştırır** ve karar verilene kadar kırmızı kalır |

Kapı ayrıca kütüğü tarar: bir kayıt *"ölçüm bekliyor"* diyorsa ve kayıtlı bir ölçümü yoksa
**kırmızı verir**. Bu kaydın düştüğü tuzak bir daha kurulamaz.

**Karar kuralı önceden yazıldı** (sayı gelince tartışılmasın diye): aynı dalda buluşma **varsa**
`guard-files` bekçisine dosya iddiası eklenir ve yeni kayıt açılır; **yoksa** eş zamanlı çalışma
standardının 2. maddesi yeterlidir ve ölçüm kapatılır.

---

### TB-001 — Ortak deponun kendi kodu Türkçe adlandırılmış
- **Tespit Tarihi:** 2026-09-17 (kod dili standardı ve tarayıcısı yazılırken)
- **Kapanış:** 2026-09-19 — TB-001 kapandı. Akış dosyası adları ve girdileri İngilizce; eski adlar **uyumluluk köprüsü** olarak duruyor, hiçbir tüketici deposuna dokunulmadı.
- **Öncelik (kapanışta):** P2 (Planlı)

#### 🟢 Sade Anlatım
- **Sorun ne?** Yeni yazdığımız kural "kodda adlar İngilizce olsun" diyor, ama bu deponun kendi betikleri Türkçe adlarla yazılmış (`taraDiff`, `bulgular`, `kelimeKumesi` gibi). Kuralı koyan, kurala uymuyor.
- **Benzetme:** Apartman girişine "ayakkabılar kapıda çıkarılır" yazısını asan kapıcının kendi ayakkabıyla dolaşması. Kural geçerli ama inandırıcılığı zayıflıyor.
- **Çözülmezse ne olur?** Somut bir arıza çıkmaz; bu kod yalnız bizim bekçilerimizdir, kimse tüketmez. Ama yeni gelen kişi "demek ki esnetilebilir" diye okur ve kural aşınır.
- **Senden beklenen karar:** Verildi (2026-09-18): **betikler İngilizce adlara taşınacak.** İstisna yolu kapandı; kural koyan depo da kurala uyacak.

#### 🔧 Teknik Detay
- **Açıklama:** `node quality/code-language-scan.js --tumu .` çıktısı: 64 bulgu, 33 ayrı ad (2026-09-17 ölçümü). Aynı tarama SNN-Abacus-Core'da 122 bulgu / 27 ayrı ad veriyor — kuralın kaynağı olan depo da tam uyumlu değil (`yeniKayit`, `gecerliHane`, `satirlar`).
- **Etki:** Yalnız geliştirme araçları; çalışan üründe etkisi yok. PR kapısı yalnız eklenen satırları taradığı için günlük iş kırmızıya dönmez.
- **Çözüm yönü:** Proje sahibi kararı: İngilizceye taşınır. Sıra: (1) dışa açık modül işleri (`module.exports` ile verilen adlar) ve dosya adları, (2) iç değişkenler, (3) test adları. Her adım ayrı PR; her PR'da tüm test takımı yeşil kalmalı ve bekçilerin (`~/.claude/hooks`) çağırdığı adlar aynı commit'te güncellenmeli — canlı kopya bu depodan okuduğu için bir ad yarım kalırsa oturum açılışı tüm projelerde durur (2026-09-15'te bir kez yaşandı). Dosya adı değişiklikleri `git mv` ile yapılır; `ornek/*.yml` içindeki yollar aynı PR'da düzeltilir.
- **İlerleme (2026-09-18):**
  - **1. aşama tamam** — klasör ve dosya adları İngilizce (`borc-senkron→debt-sync`, `kalite→quality`, `cekirdek→core`, `kurulum→setup` ve içlerindeki 24 dosya). Bekçiler için kurulan eski→yeni ad köprüsü, canlı kopya geçtikten ve `~/.claude/hooks` çağrıları güncellendikten sonra **kaldırıldı**.
  - **2. aşama tamam** — iç değişken, sabit ve JSON alan adları İngilizce (`bulgular→findings`, `istisna→exception`, `satirlar→lines`; `.snn-kod-dili.json` alanları artık `exceptions / name / reason / paths / path`).
  - **Ölçüm: 166 → 0 bulgu.** Tarayıcı bu depoda temiz rapor veriyor (27 dosya tarandı).
  - Yan kazanç: göç sırasında tarayıcıda iç içe şablon dizgesi kusuru bulundu ve düzeltildi (`stripTemplates`); kendi kodumuzu tararken çıktı.
- **3. aşama tamam (2026-09-19):** akış dosyası adları. Ayrıntı aşağıda. Bu deponun kendi kod dili kapısı **2026-09-19'da kuruldu** ama farklı biçimde: `kod-dili.yml` yalnız `workflow_call` olduğu için kendi PR'larında çalışmıyordu; tarama adımı `test.yml` içine eklendi (`--diff` kipinde, anahtar taramasının yanına).
- **Neden aşamalara bölündü:** Kuralın kendisi ve makine kapısı öncelikliydi; adlandırma göçü mekanik bir iştir, aşamalara bölünüp ayrı PR'larla yapılır.
- **Bağlı kalemler:** Yok.

#### 🚧 3. aşama — dışa açık akış adları (2026-09-19)

**Sorun neden diğerlerinden farklıydı:** bu adlar bizim iç kodumuz değil, **10 projenin çağırdığı
arayüz**. Adı doğrudan değiştirmek 10 projenin kapısını aynı anda kırardı — ve düzeltmek için
10 ayrı depoya dokunmak gerekirdi, ki bu kırmızı çizgidir.

**Ölçüm — ana daldan (yerel kopya iki projede YANLIŞ cevap verdi):**

| Akış | Çağıran |
|---|---|
| `anahtar-tarama.yml` | **10 proje (hepsi)** |
| `borc-senkron.yml` | 1 |
| `cekirdek-yayilim.yml` | 1 |
| `kod-dili.yml` | 1 |

**Çözüm — köprü deseni.** Gerçek iş İngilizce adlı dosyaya taşındı; eski ad, çağrıyı oraya ileten
ince bir köprüye dönüştü. Eski girdi adları (`standart_surumu`, `uygula`, `yalniz`, `surum`)
köprüde korunuyor ve İngilizce karşılıklarına (`standards_ref`, `apply`, `only`, `version`)
çevriliyor.

| Eski ad (köprü) | Gerçek iş |
|---|---|
| `anahtar-tarama.yml` | `secret-scan.yml` |
| `borc-senkron.yml` | `debt-sync.yml` |
| `cekirdek-yayilim.yml` | `core-propagate.yml` |
| `kod-dili.yml` | `code-language.yml` |

İç akışlar doğrudan yeniden adlandırıldı (çağıranı yok): `aile-olcumu` → `family-measure`,
`teknik-borc` → `debt`, `uyum-issue` → `compliance-issue`.

**Sonuç: hiçbir tüketici deposunda tek satır değişmedi.** `ornek/` şablonları artık yeni adları
gösteriyor; yeni kurulan projeler doğrudan İngilizce yola bağlanır.

#### 🧪 "Köprü çalışıyor" iddiası nasıl sınandı

İki katman, çünkü yapı testi bir YAML'ın GitHub tarafından gerçekten çözülebildiğini göstermez:

1. **Yapı testi** (`quality/test/workflow-callers.test.js`, 16 test): her köprü var olan tek bir
   hedefe gidiyor mu, canlı denetim doğru köprüleri çağırıyor mu.
2. **Canlı denetim** (`.github/workflows/bridge-check.yml`): tüketicinin yaptığı çağrının
   **aynısını** yapar — tam yolla, `@main` ile, eski girdi adlarıyla. Haftalık da çalışır.
   `cekirdek-yayilim` bilerek dışarıda: çalıştırmak tüketici depolarda PR açmayı denerdi.

#### 📅 Köprü ne zaman silinir

Tahminle değil, ölçümle: `node quality/workflow-callers.js` **ana dallardan** okur ve sıfır
çağıranı kalan köprüyü bildirir. Bugün dördünün de çağıranı var. Tüketiciler kendi tempolarında
yeni adlara geçtikçe köprüler düşer. Bu ölçer `quality/data/gates.json`'da 16. kapı olarak kayıtlı.

**Neden bu bir "yarım iş" değil:** borç *"kural koyan deponun kendi kodu Türkçe adlandırılmış"*
idi. Bugün bu deponun kodu — dosya adları, girdi adları, iş adları — İngilizce. Köprü kod değil,
**geriye dönük uyumluluk sözleşmesidir**; silinme koşulu yazılı ve ölçülebilir.

---

### TB-006 — `GOC-NOTU.md` hiçbir depoda sürümlenmiyor
- **Tespit Tarihi:** 2026-09-19 (dayanıklılık araştırması)
- **Kapanış:** 2026-09-19 — TB-006 kapandı. Karar: **belge yayımlanmadı**; karar değeri taşıyan kısmı ayıklanıp `docs/degerlendirilen-kalemler.md` olarak depoya alındı.
- **Öncelik (kapanışta):** P2 (Planlı)

#### 🟢 Sade Anlatım
- **Sorun ne?** Kancalar ve beceriler artık depoda. Ama sistemin nasıl kurulduğunu anlatan tek tam belge (`GOC-NOTU.md`, 39 KB) hâlâ yalnız bu bilgisayarda. Bilgisayar giderse o belge de gider.
- **Benzetme:** Binanın tesisat planı tek nüsha ve kapıcının çekmecesinde duruyor.
- **Çözülmezse ne olur?** Sistem çalışmaya devam eder. Ama ikinci bir bilgisayara kurmak ya da bir arızadan sonra toparlamak, tarifi olmayan bir işe dönüşür.
- **Senden beklenen karar:** Yok. Proje sahibi kararı devretti (2026-09-19: *"risk ve sorumluluk sende"*); karar ölçümle verildi ve aşağıda gerekçesiyle yazıldı.

#### 🔧 Teknik Detay
- **Açıklama:** `GOC-NOTU.md` bilerek git dışı bırakılmış (`.git/info/exclude`). `~/.claude/standartlar/teknik-borc-standardi.md` yönlendirici dosyası da sürümsüz.
- **2026-09-19 · Beceri kısmı KAPANDI (PR #57).** Dört beceri depoya alındı (`borclar`, `borc-ekle`, `proje-kur`, yeni `standart-talep`) ve `setup/setup-machine.js` kapsamına girdi. `archify` üçüncü tarafındır, kapsam dışı — silme yalnız bizim beceri klasörlerimizin içinde yapılır. Sürümsüzlüğün bedeli ölçüldü: `borclar` ve `proje-kur` **çalışmıyordu**, yeniden adlandırılmış betikleri çağırıyorlardı; kimse fark etmemişti çünkü beceriler hiçbir testin kapsamında değildi.
- **Etki:** Makine kaybı ya da ikinci makine kurulumu.
- **Çözüm yönü:** `GOC-NOTU.md`'nin makine kurulumu bölümü zaten `docs/makine-kurulumu.md` olarak ayrıldı. Kalanı için: sır taraması (`node quality/secret-scan.js`) çalıştırılır, kişisel/ortam bilgisi ayıklanır, sonra depoya konur.
- **Neden yayımlanmadı:** aşağıdaki dört ölçüm.
- **Bağlı kalemler:** TB-004 (aynı makine paketi).

#### 📏 Karar ölçümü (2026-09-19)

Belge tarandı ve dört engel çıktı. İlk üçü ayıklanabilirdi; **dördüncüsü ayıklamayla çözülmez.**

| Bulgu | Adet | Değerlendirme |
|---|---|---|
| Sır (anahtar/parola) | **0** | `secret-scan` temiz |
| Ev klasörü yolu · makine adı | 11 + 3 satır | Ayıklanabilir (`<ev>` deseni becerilerde zaten kullanılıyor) |
| Kişisel e-posta | 2 satır | Ayıklanabilir |
| **Eskimiş yol atfı** | **22 atıf** | `ortak.js`, `kurulum/proje-kur.js`, `borc-senkron`, `kalite/`, `cekirdek/`… hepsi TB-001 göçünde yeniden adlandırıldı |
| **Depoların güvenlik duruşu** | 1 satır | *Hangi üç depoda yazılı erişim anahtarı olduğunu* söylüyor |
| Üçüncü taraf hesabın deposuna ait kod kalitesi ve açık kütüphane bilgisi | birkaç satır | Bizim açıklayacağımız bilgi değil |

**Belirleyici iki gerekçe:**

1. **Güvenlik duruşu yayımlanmaz.** "Şu üç depoda yazılı erişim anahtarı var" cümlesi, herkese
   açık bir depoda saldırgana verilmiş bir yol haritasıdır. Aynı şey üçüncü taraf hesabın
   deposuna ait açık kütüphane bilgisi için de geçerlidir: o bilgi bizim değildir.
2. **Eskimiş belge yayımlamak zararlıdır.** 22 atıf bugün yanlış yolları gösteriyor. Bu maliyet
   varsayım değil, **ölçülmüş**: `borclar` ve `proje-kur` becerileri tam olarak eskimiş yol
   çağırdıkları için sessizce bozulmuştu (TB-006'nın beceri kısmı, PR #57).

#### ✅ Borcun aslı nasıl kapandı

Borç "belge yayımlansın" değil, **"dayanıklı bilgi hiçbir depoda yok"** idi. O bilgi artık depoda:

| Belgenin bölümü | Nereye gitti |
|---|---|
| Makine kurulumu (§3.3, §7) | `docs/makine-kurulumu.md` (PR #47) |
| Bekçi ve beceri kodu | `hooks/`, `skills/` (PR #47, #57) |
| Öğrenilen dersler (§6) | `CLAUDE.md` → "Bilinen tuzaklar" |
| Eksik rehber (§8) | `CLAUDE.md` yazıldı (TB-005) |
| **Değerlendirilecek 5 kalem + ölçümleri (§9)** | **`docs/degerlendirilen-kalemler.md`** ← bu kayıtla |
| Tarihli oturum devri (§4, §5, §10, §11) | Yayımlanmadı — o günün anlık durumu, bugün geçersiz |

`GOC-NOTU.md` makinede kalır: tarihli bir çalışma notudur, kalıcı kaynak değildir.
Kalıcı olması gereken her şey artık sürümlü.

---

### TB-007 — Türkçe çekim eki + İngilizce gövde tarayıcıdan kaçıyor
- **Tespit Tarihi:** 2026-09-19 (31 eksik kök eklenirken)
- **Kapanış:** 2026-09-19 — TB-007 ölçüldü ve önerilen çözüm **REDDEDİLDİ**; ölçüm sırasında tarayıcıda iki gerçek kusur bulundu ve düzeltildi.
- **Öncelik (kapanışta):** P3 (Fırsatta)
- **Issue:** #43

#### 🟢 Sade Anlatım
- **Sorun ne?** `manuelDeltalar`, `guncelleKur` gibi adlarda ek Türkçe ama gövde İngilizce. Tarayıcı bunları kaçırıyor. Somut kanıt: `guncel` kelime listesinde vardı, ama `guncelle` yakalanmıyordu.
- **Benzetme:** Kapıdaki görevli yabancı pasaportları tanıyor, ama yerli soyadı alan yabancıları tanımıyor.
- **Çözülmezse ne olur?** Az sayıda ad kaçmaya devam eder. Kaçan her kök elle bulunup listeye eklenebiliyor; bugün 31 kök böyle eklendi.
- **Senden beklenen karar:** Yok.

#### 🔧 Teknik Detay
- **Açıklama:** `quality/code-language-scan.js` içindeki `SUFFIXES` dar tutulmuş (`lari`, `leri`, `lar`, `ler`, `si`, `su`, `i`, `u`, `a`, `e`). Fiil ekleri (`-le`, `-la`) yok.
- **Etki:** Ölçülmedi — kaç adın bu sınıfa girdiği bilinmiyor. Bilinen örnek: 2 ad.
- **Çözüm yönü:** İki yol var ve **ölçmeden seçilmemeli.** (a) `-le`/`-la` eklerini toleransa eklemek: `handle`→`hand`, `table`→`tab`, `module`→`modu` gibi gövdeler üretir; bunlar Türkçe listesinde olmadığı için bugün zararsız görünüyor ama liste büyüdükçe çakışabilir. (b) Ayrı bir kural: "ad Türkçe bir ekle bitiyorsa ve gövde İngilizce sözlükte varsa" — İngilizce sözlük gerektirir, depoda yok. Önce ölçüm: 11 projede bu sınıftan kaç ad var?
- **Neden Şimdi Çözülmüyor:** Etkisi ölçülmedi ve (a) yolunun yanlış alarm riski var. Ölçüm kapısı (`aile-olcumu.yml`) artık kurulduğu için etki güvenle ölçülebilir.
- **Bağlı kalemler:** Yok.

#### 📏 Ölçüm (2026-09-19 · 11 proje · 2.684 dosya)

**Asıl soru:** `-le`/`-la` fiil ekleri sonek toleransına eklenirse ne olur?

| | |
|---|---|
| Aday sonekin ürettiği toplam geçiş | **19** |
| Bunların yorum satırında olanı (düzyazı) | **19** |
| Gerçek tanımlayıcı | **0** |

**Karar: REDDEDİLDİ.** Sıfır gerçek yakalama, 19 yanlış alarm. Kütükteki iki örnek
(`manuelDeltalar`, `guncelleKur`) bugün aile kod tabanında yok — ikisi de bu deponun
TB-001 göçünde İngilizceye taşınmıştı. Kayıt, örneklerin hâlâ var olduğunu varsayıyordu.

#### 🔎 Ölçümün ortaya çıkardığı iki gerçek kusur

**1. CRLF satır sonu yorum soymayı tamamen devre dışı bırakıyordu.**
Yorum soyma kuralları `--.*$` ve `//.*$` biçiminde. JavaScript'te `.` satır sonunu (`
` dahil)
eşleştirmez ve `$` dizgenin sonunu ister. Satır `
` ile bitince kural **hiç eşleşmiyor**, yorum
soyulmuyor ve içindeki Türkçe düzyazı tanımlayıcı sanılıyordu.

| | |
|---|---|
| Aile geneli bulgu (düzeltme öncesi) | 26.060 |
| Bunların yorumdan geleni | **9.938 (%38,1)** |
| Düzeltmeyle düşen | **10.745** — biri hariç hepsi yorum içinde; o biri de aynı adın yorumdaki ikinci kopyası |
| Yanlışlıkla gizlenen gerçek ad | **0** (eski ve yeni tarayıcı satır satır karşılaştırıldı) |

**CI bunu göremezdi:** GitHub Linux'ta LF ile dosya alır. Kusur yalnız **Windows çalışma
kopyasında** çıkıyordu — yani kapı yeşil, geliştirici ekranı gürültülüydü.

**2. Nesne alanı satırları "ekran yazısı" sanılıp atılıyordu.**
Yazı ölçütü yalnız `=` ve `;` arıyordu; `netSatisKurus: 1295235481,` satırında ikisi de yok.
Bu ad **görünmüyordu**; onu ayakta tutan tek şey yorumdaki `=` işaretiydi — yorum doğru
soyulunca ad da kayboldu. Ölçüt eklendi: ad + iki nokta + değer + sonda virgül.

| | |
|---|---|
| Böylece görünür olan **gerçek** ad | **2.228** |
| JSX/etiket satırında çıkan yanlış alarm | **0 / 2.228** |
| Okunan örnek | 24'ü tek tek (`yil`, `ceyrek`, `tablo`, `kaynak`, `yuzde`, `sinifAdi`, `bostaNakitToday`…) |

**Net etki:** aile genelinde −10.745 yanlış alarm, +2.228 gerçek bulgu.

#### 🧪 Sabitleme
10 gerileme testi (`quality/test/code-language-scan.test.js`), gerçek dosyalardan alınmış
satırlarla. İkisi sabotajla sınandı: CRLF soyma kaldırılınca 3 test, nesne alanı ölçütü
kaldırılınca 3 test kırmızıya döndü.

#### 📌 Ders
Ölçüm sorusu "eklenen sonek ne yakalar?" idi; cevabı **hiçbir şey** çıktı. Ama ölçümü yapmak
için tarayıcıyı gerçek dosyalarda satır satır çalıştırmak gerekti ve asıl kusurlar orada
göründü. **Ölçüm, cevabından daha değerli olabilir.**

---

### TB-004 — Kancaların 272 satırı testsiz
- **Tespit Tarihi:** 2026-09-19 (kancalar depoya alınırken ölçüldü)
- **Kapanış:** 2026-09-19 — TB-004 çözüldü; 272 satırın **272'si** test altında. Kapanış testi yazarken kapının **gerçekten çalışmadığı bir durum** bulundu (aşağıda).
- **Öncelik (kapanışta):** P2 (Planlı)

#### 🟢 Sade Anlatım
- **Sorun ne?** Bekçilerin bir kısmının hiç testi yok. Bunların içinde en kritik dosya da var: `lib/shared.js`. O 45 satır bozulursa hiçbir bekçi ortak depoyu bulamaz ve tüm projelerde oturum açılışı durur.
- **Benzetme:** Binadaki yangın kapılarının çoğu düzenli deneniyor, ama ana elektrik panosu hiç denenmiyor. Pano giderse kapıların hepsi birden çalışmaz.
- **Çözülmezse ne olur?** Sessiz kalabilir. Ama 2026-09-15'te tam bu oldu: ortak depodaki bir fonksiyon adı değişti, `session-start` çöktü ve **tüm projelerde** açılış özeti durdu. O gün test olsaydı değişiklik main'e girmeden yakalanırdı.
- **Senden beklenen karar:** Yok. Sıra önerisi: önce `lib/shared.js`, sonra `session-start.js`.

#### 🔧 Teknik Detay
- **Açıklama:** Testsiz dosyalar ve satır sayıları (2026-09-19 ölçümü): `session-start.js` 109, `stop-gate.js` 78, `lib/shared.js` 45, `guard-code-language.js` 40. Toplam 272. Mevcut `hooks/test/hooks.test.js` yalnız `guard-bash`, `guard-files` ve `stop-debt-push`'ı alt süreç olarak çalıştırıyor.
- **Etki:** Tüm projeler — kancalar `~/.claude/settings.json` üzerinden her oturumda çalışır.
- **Çözüm yönü:** `lib/shared.js` için: `SNN_STANDARTLAR` ortam değişkeni zaten yolu dışarıdan alıyor, bu yüzden geçici klasörle test edilebilir (`refresh()` kirli kopyada dokunmuyor, ağ yokken eski kural çalışmaya devam ediyor, damga 6 saati doldurmadan atlanıyor). `session-start.js` ve `guard-code-language.js` uçtan uca denenebilir: stdin'den JSON ver, stdout'u oku — `hooks.test.js` bu deseni zaten kullanıyor. `stop-gate.js` monolitik; önce `measure`/`decide` ayrımına bölünmeli (`schema-doc.js` deseni).
- **İlerleme (2026-09-19):** 272 satırın **232'si** test altına alındı; 3 test dosyası, 56 test, hepsi CI'da ve makineden de yeşil.
  - `lib/shared.js` (45) — sahte uzak depo + klon ile 23 test: yol çözme, damga, 6 saat kısıtlaması, ileri sarma, **kirli kopyaya dokunulmaz**, **ağ/uzak yokken patlamaz**.
  - `session-start.js` (109) — 16 test; çoğu "çökmez" üzerine.
  - `guard-code-language.js` (40) — 17 test; **asla engellemez**, **asla `allow` demez**.
- **Test yazarken bulunan iki gerileme (ikisi de düzeltildi):**
  1. **Damga adı.** TB-001 yeniden adlandırması `snn-son-guncelleme` → `snn-son-updateResult` değişimini **dizge içinde** de yaptı. Canlı kopyada iki damga yan yana kaldı; o aralıkta 6 saatlik kısıtlama çalışmadı, her oturum tazeleme denedi. Ad artık `snn-last-refresh`; eski adlar yazarken temizlenir.
  2. **Açılış bekçisi çöküyordu.** `session-start.js:4` üst düzey `require('./lib/debt')` canlı kopyaya yönlendiriyor; canlı kopya yoksa bekçi **çıkış kodu 1** ile çöküyordu — hiçbir `try/catch`'e ulaşmadan. Dosyanın başlığı 2026-09-15 olayını anlatıp "açılış özeti çökmez" diyordu, ama o koruma **eksik fonksiyona** karşıydı, **eksik modüle** karşı değil. Artık özet kütüksüz sürer ve sebep yazılır.
- **Kapanış (2026-09-19):** `stop-gate.js` (78) bölündü: karar mantığı `hooks/lib/stop-gate-plan.js` içine saf olarak alındı, IO kancada kaldı. 33 test yazıldı; ikisi sabotajla sınandı (ikinci turda engelleme, silinen dosya süzgeci — ikisi de kırmızıya döndü). Kapı `quality/data/gates.json`'a kaydedildi (15. kapı).
- **Testin bulduğu gerçek kaçak:** uçtan uca denemede kapı **hiç tetiklenmedi**. Sebep: `git status --porcelain` yeni bir klasörü tek satırda bildirir (`?? src/`), içindeki dosyaları göstermez. Yani **yeni bir klasöre yazılan TS dosyaları tip kontrolünden muaftı** — kapı kurulduğundan beri. Kanca artık `-uall` ile okuyor. Bu, `git ls-files` kaçağının (kod dili tarayıcısı, aynı hafta) aynı sınıftan ikinci örneğidir: **git'in varsayılanları izlenmeyen dosyayı gizler.**
- **Sabitlenen iki davranış:** (1) `stop_hook_active` iken ASLA yeniden engellenmez — engellenirse ajan aynı kapıya tekrar çarpar ve oturum ilerleyemez. (2) Zaman aşımı engel değildir; yapılamayan ölçümle iş durdurulmaz (`olcum-standardi.md`).
- **Neden P2 kaldı:** Bugünkü 17 hatanın hiçbirini bu testler yakalamazdı (ölçüldü); dayanıklılık kapısıdır, keşif kapısı değildir. Yine de `lib/shared.js` tek nokta arızası olduğu için P2.
- **Bağlı kalemler:** TB-006 (aynı dosyalar makine kurulumunun parçası).

---

---

### TB-005 — Bu deponun kendi rehber dosyası yok
- **Tespit Tarihi:** 2026-09-19 (uyum ölçeri ilk çalıştığında)
- **Kapanış:** 2026-09-19 — TB-005 çözüldü; `CLAUDE.md` yazıldı.
- **Öncelik (kapanışta):** P3 (Fırsatta)

#### 🟢 Sade Anlatım
- **Neydi?** Aile standardı "her projenin rehberi aile standardına atıf yapsın" diyor; bu depoda öyle bir dosya hiç yoktu. Kuralı koyan depo kendi ölçütünü karşılamıyordu.
- **Ne yapıldı?** `CLAUDE.md` yazıldı. İçerik temenni değil, **o gün gerçekten yaşanan** tuzaklardan derlendi.
- **Sonuç:** Bu deponun uyum eksiği kalmadı; açık issue **kendiliğinden kapandı**.

#### 🔧 Teknik Detay
- **İçerik:** deponun ne olduğu (11 projenin her PR'da çalıştırdığı makine), neden herkese açık kalmak zorunda olduğu (ölçüldü), dört dağıtım yolu ve hangisinde iş düştüğü, çalışma sırası, bilinen tuzaklar, yeni kapı ekleme sırası, yanlış alarm yolu, kırmızı çizgiler.
- **Doğrulama:** rehberde geçen her dosya yolu tek tek denetlendi (biri yolsuz yazılmıştı, düzeltildi); rehber tazeliği kapısı, kapı defteri ve kod dili taraması temiz.

#### 📌 Kapanışta öğrenilenler
- **Kapanma yolunun ilk canlı sınavı buydu.** Birleşmeden önce `close` yolu yalnız birim testle doğrulanmıştı. Rehber birleşti → ölçüm temizlendi → senkron çalıştırıldı → issue #48 kendiliğinden kapandı. Uyum döngüsünün tamamı (aç → tekrarda açma → gider → kapat) artık gerçek veride doğrulanmış durumda.
- **Rehber ölçümle yazılır.** Bir günde yaşanan tuzakların listesi, "iyi uygulamalar" listesinden daha değerli çıktı: her madde bir kez gerçekten canımızı yaktı.

---

### TB-003 — Uyum eksikleri yalnız oturum açılınca görünüyor
- **Tespit Tarihi:** 2026-09-19
- **Kapanış:** 2026-09-19 — TB-003 çözüldü.
- **Öncelik (kapanışta):** P2 (Planlı)

#### 🟢 Sade Anlatım
- **Neydi?** Her proje kendi eksiğini yalnız oturum açılışında görüyordu. O satır oturum kapanınca kayboluyor, "yapıldı mı?" kaydı tutulmuyor ve proje sahibi 11 projenin durumunu tek yerde göremiyordu.
- **Ne yapıldı?** Eksikler artık her projenin **kendi issue listesine** de düşüyor. Panodan hepsi birden görünüyor, yapılana kadar duruyor, giderilince kendiliğinden kapanıyor.
- **Sonuç:** 11 depoda **27 issue** açıldı; ölçümle birebir eşleşti.

#### 🔧 Teknik Detay
- **Çözüm:** `quality/compliance-issues.js` (saf plan + ayrı IO, `debt-sync/lib/sync-plan.js` deseni) + `.github/workflows/uyum-issue.yml` (Pazartesi 08:23 TSİ; elle çalıştırmada varsayılan kuru).
- **Kimlik başlığa gömülü:** `[UYUM:<ölçüt>]` + `aile-uyum` etiketi. Kütüğün `[TB-xxx]` issue'larına karışmaz.
- **Elle kapatmak eksiği gidermez:** ölçüm hâlâ görüyorsa issue yeniden açılır. Kapanış yalnızca ölçümden gelir.
- **Kademeli uygulandı:** önce tek projede (SNN-İhale, 1 eksik) denendi, issue gövdesi okundu, **tekrar çalıştırılıp çift açmadığı doğrulandı** (0 işlem), sonra kalan 10 projeye uygulandı.
- **Kapı defterine kayıtlı:** `quality/data/gates.json` → `uyum-issue`.

#### 📌 Kapanışta öğrenilenler
- **Göndermeden önce iki hata yakalandı.** (1) Zamanlanmış koşuda `inputs.uygula` tanımsız olduğu için haftalık rutin **sonsuza kadar kuru çalışacaktı** — kapı kurulup çalışmamış olacaktı. (2) `--filter=blob:none` kısmi klon ölçeri yavaşlatıp kırılganlaştıracaktı.
- **Gerekçe ölçümle düzeltildi.** İlk gerekçe "aylarca açılmayan proje eksiğini görmez" idi; ölçüldü ve zayıf çıktı (en eski projenin ana dalı 3 gün önce hareket etmişti). Gerçek gerekçe **görünürlük ve kalıcılık** olarak yazıldı.
- **Kademeli uygulama karşılığını verdi:** tek projede idempotentlik doğrulanmadan 27 issue açılsaydı, bir hata 27 kez temizlik demekti.

---

