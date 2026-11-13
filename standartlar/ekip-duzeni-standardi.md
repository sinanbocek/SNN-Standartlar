# Ekip Düzeni Standardı — Genel Müdür ve müdürler (çerçeve, tüm projeler)

Bu standart, bir projenin işini "Genel Müdür + müdürler" düzeniyle yürütmek isteyen projeler için ortak iskeleti ve ortak müdür adlarını verir. Genel Müdür: projenin ana oturumu. Müdür: Genel Müdür'ün `Agent` aracıyla iş verdiği, kendi görev kartı olan yardımcı ajan. Pano: işlerin ve durumun tek yerde toplandığı dosya.

> **Bu bir ÇERÇEVEDİR, katı kalıp değildir.**
> Her proje "Genel Müdür + müdürler" düzenini kendi ihtiyacına göre şekillendirir.
> Standart ortak iskeleti ve ortak müdür adlarını verir. Zorunlu departman listesi ya da tek dosya düzeni dayatmaz.
> Hangi müdürün açılacağını proje seçer; açılan müdürün adı her projede aynıdır.

## Neden (vaka, 2026-11-09)

Düzen önce Pulmaca'da kuruldu, Gunum-Var onu örnek aldı. Örnek alınmasına rağmen müdür kümesi aynı kalmadı; proje kendi ihtiyacına göre değiştirdi, iskelet kaldı. Sayılar Genel Müdür'ün 2026-11-09 tarihli GitHub salt okuma ölçümüdür (`ekip/` klasörü ve `.claude/agents` listesi):

| Proje | Tarih | Müdürler | Klasör biçimi |
|---|---|---|---|
| SNN-Games-Pulmaca | 2026-11-05 | belge, pazarlama, rapor, tasarım, yazılım | `ekip/<ad>-muduru/` |
| Gunum-Var | 2026-11-08, PR #245 | belge, pazarlama, veritabanı, yayın, yazılım | `ekip/<ad>-muduru/` |
| SNN-Standartlar | 2026-11-08, PR #180 | yazılım, belge, ölçüm | `ekip/<ad>/` |

İlk ikisi talebin (#181) vakasıdır: farklı departman kümeleriyle aynı iskeleti kurdular. Üçüncüsü bu depodur.

Aynı gün aile listesindeki 16 projenin `.claude/agents` klasörü okundu (`node quality/remote-read.js .claude/agents`): 7 projede müdür kartı var, 9 projede yok, 0 proje okunamadı. Tablodaki üçüne dört proje daha eklenir: SNN-Abacus-Core, SNN-Piyasa-Core, SNN-Portfoy-Yonetimi ve globalhedef/global-hedef-web-platform. Yedi projenin hepsinde kart adı `<alan>-muduru.md` biçimindedir. Bugün çakışan ya da yabancı kart adı yok.

Yedi projede ortak olan yalnız yazılım ve belge müdürleridir. Bu "zorunlu" demek **değildir**. Ortak iki müdürü zorunlu liste sanma: diğer on bir ad yalnız ihtiyacı olan projelerde var, en çok ikisinde.

Kart varlığı iskeletin tamamının kurulduğunu kanıtlamaz; bu ölçülmedi. İskeletin işi hızlandırdığı ya da hata azalttığı da ölçülmedi. Vaka yalnızca şunu gösterir: iskelet üç projede taşındı, müdür kümesi her projede değişti. Bu depodaki kurulumun (PR #180) Pulmaca'dan etkilenip etkilenmediği ölçülmedi.

**Ad kuralının vakası (sahip isteği, 2026-11-09):**

> "x projede Yazılım Müdürü varsa Y projesinde bu kişinin adı Software Manager olmasın ya da Yazılımcı olmasın... tüm ihtiyaç duyulabilecek ajan tipler için bir isim önerisi rehberi de olsun."

Ölçüm bu isteğin gerekçesini şimdilik göstermiyor: yedi projede 13 ad kullanılıyor ve ad yönünden çakışma yok. Görev yönünden bir çakışma görüldü: Veri ve Veritabanı kartları aynı işi (göç, erişim kuralı) yapıyordu. Sahip 2026-11-09'da ikisini Veritabanı Müdürü adında birleştirdi; Veritabanı iki projede, Veri bir projede kullanılıyordu. Ad kuralı, ad çakışması çıkmadan önce kuruldu.

## Ortak iskelet

Düzeni kuran her proje şu dört maddeyi taşır.

1. **Ana oturum Genel Müdür'dür.** İşi dağıtır, denetler, commit ve PR'ı açar, kapanışı kendisi bitirir. Kod yazmaz.
2. **İş `Agent` ile ilgili müdüre verilir.** Model ve düşünme seviyesi her çağrıda açık yazılır (`alt-ajan-standardi.md`).
3. **Genel Müdür işi sonuna kadar götürür.** CI'ı bekler, birleşmeyi görür, yerini alan eski PR'ları kapatır, panoyu günceller. Sahibe yalnız sonuç brifi gider. Birleştirme koşulu `es-zamanli-calisma-standardi.md` §7'dedir; burada tekrar edilmez. "Eski PR'lar" yalnız Genel Müdür'ün kendi işinin yerini alanlardır; başkasının PR'ına dokunulmaz (`es-zamanli-calisma-standardi.md` §1 madde 4).
4. **Durum merkezî panoda tutulur.** Örnek: `ekip/PANO.md` ve `ekip/<departman>/DURUM.md`. Eski devir ve durum dosyaları arşive gider; kök dosyalar yönlendirme satırına döner (bilgi silinmez, taşınır).

## Ortak müdür adları

Bir görev her projede tek adla anılır. Proje hangi müdürü açacağını seçer; açtığı müdürün adını seçmez, aşağıdaki tablodan alır. Ana oturumun adı her projede "Genel Müdür"dür.

- **Görünen ad:** `<Alan> Müdürü`, Türkçe. Örnek: "Yazılım Müdürü".
- **Görev kartı:** `.claude/agents/<alan>-muduru.md`. Alan adı Türkçe harfsiz ve küçük harfle yazılır. Örnek: `yazilim-muduru.md`.
- **Durum sütunu:** bugün kullanılıyorsa "kullanımda (N proje)", yoksa "öneri". Sayı, 2026-11-09 ölçümündeki 7 projeden alınmıştır.
- **İşi sütunu:** tek cümle, görev sınırını gösterir. Kullanımdaki on iki ad için cümleler, projelerdeki kart tanımlarından (`description`) derlendi.

| Görünen ad | Kart adı | İşi | Durum | Bunun yerine kullanılmaz |
|---|---|---|---|---|
| Yazılım Müdürü | `yazilim-muduru` | Uygulama ve araç kodunu yazar, düzeltir ve test eder. | kullanımda (7 proje) | Software Manager, Yazılımcı, Geliştirici, Developer, Mobil Müdürü, Web Müdürü, Frontend Müdürü, Backend Müdürü |
| Belge Müdürü | `belge-muduru` | Rehber, rapor, karar kaydı, teknik borç kütüğü ve panoyu tutar; kod yazmaz. | kullanımda (7 proje) | Dokümantasyon Müdürü, Docs Manager, Yazar |
| Ölçüm Müdürü | `olcum-muduru` | Sistemin ve kuralların etkisini dönemsel olarak sayar; kod ve metin yazmaz. | kullanımda (1 proje) | Metrik Müdürü, Analitik Müdürü, Analyst |
| Tasarım Müdürü | `tasarim-muduru` | Ekran taslağı, görsel, video kurgusu, logo ve simgeyi üretir; çalışan ekranın kodunu yazmaz. | kullanımda (1 proje) | Designer, Tasarımcı, UI/UX Müdürü, Grafik Müdürü |
| Pazarlama Müdürü | `pazarlama-muduru` | Hedef kitle, mesaj, takvim ve kampanya önerisini hazırlar; reklam açmaz, bütçe harcamaz. | kullanımda (2 proje) | Marketing Manager, Pazarlamacı, Reklam Müdürü |
| Rapor Müdürü | `rapor-muduru` | Gelir, indirme, arama ve sosyal medya sayılarını okur, karşılaştırır, kısa rapor ve öneri yazar. | kullanımda (1 proje) | Raporlama Müdürü, Report Manager, Analist |
| Veritabanı Müdürü | `veritabani-muduru` | Şema değişikliği dosyalarını (göç), erişim kurallarını (RLS), SQL testlerini, zamanlanmış veri işlerini ve veri sunucu işlevlerini yazar. | kullanımda (2 proje) | DBA, Database Manager, SQL Müdürü, Veri Müdürü, Data Manager, Data Engineer, Veri Mühendisi |
| Yayın Müdürü | `yayin-muduru` | Sürüm numarasını, değişiklik günlüğü girdisini ve yayın komutlarını hazırlar; komutu çalıştırmaz. | kullanımda (1 proje) | Release Manager, Sürüm Müdürü, Deploy Müdürü |
| Talep Müdürü | `talep-muduru` | Başka projelerden gelen talep ve hata bildirimlerini değerlendirir, karar taslağı yazar. | kullanımda (2 proje) | Request Manager, Talep Yöneticisi |
| İşletme Müdürü | `isletme-muduru` | Canlı servisin nöbetini tutar: duman testi, yedek, kesinti tatbikatı; dağıtmaz. | kullanımda (1 proje) | Operasyon Müdürü, Ops, SRE, Nöbet Müdürü |
| Panel Müdürü | `panel-muduru` | Kontrol panelinin kodunu yazar ve düzeltir; ana kod katmanlarına dokunmaz. | kullanımda (1 proje) | Dashboard Müdürü, Kontrol Paneli Müdürü |
| Otomasyon Müdürü | `otomasyon-muduru` | Otomatik giriş-çıkış motorlarını, tarama ve geriye dönük deneme (backtest) betiklerini yapar. | kullanımda (1 proje) | Automation Manager, Bot Müdürü |
| Kalite Müdürü | `kalite-muduru` | Test planı yazar ve değişikliği gözden geçirir; testi koşturmak ve kodu düzeltmek Yazılım'ındır. | öneri | QA, Test Müdürü, Tester |
| Altyapı Müdürü | `altyapi-muduru` | Sunucu, bulut hesabı ve dağıtım ortamını kurar; sürüm Yayın'ın, canlı nöbet İşletme'nin işidir. | öneri | DevOps, Sistem Müdürü, Infrastructure Manager |
| Ürün Müdürü | `urun-muduru` | Özellik önceliğini ve yol haritasını hazırlar; kod yazmaz. | öneri | Product Manager, Ürün Yöneticisi |
| Araştırma Müdürü | `arastirma-muduru` | Piyasa, rakip ve kaynak taraması yapar, bulguyu kaynağıyla yazar; karar vermez. | öneri | Research Manager, Araştırmacı |
| İçerik Müdürü | `icerik-muduru` | Pazarlama'nın onaylı mesajını metne ve sosyal medya gönderisine döker; görsel Tasarım'ın işidir. | öneri | Content Manager, Copywriter, Metin Yazarı |
| Destek Müdürü | `destek-muduru` | Son kullanıcıdan gelen talep ve geri bildirimleri toplar, sınıflar, yanıt taslağı yazar; projeler arası talep Talep'indir; yayından önce sanal müşteri canlandırmak Destek'in değil, bağımsız birim Müşteri İlişkileri'nin işidir (aşağıda "Bağımsız birimler"). | öneri | Support Manager, Müşteri Müdürü |
| Finans Müdürü | `finans-muduru` | Bütçe, maliyet ve muhasebe kayıtlarını hazırlar; ödeme yapmaz. | öneri | Finance Manager, Muhasebe Müdürü, Bütçe Müdürü |
| Uyum Müdürü | `uyum-muduru` | KVKK (Kişisel Verileri Koruma Kanunu), mağaza ve sözleşme kurallarına uygunluğu denetler ve not yazar. | öneri | Compliance Manager, Hukuk Müdürü |
| Çeviri Müdürü | `ceviri-muduru` | Metni başka dile uyarlar (yerelleştirme); özgün metni değiştirmez. | öneri | Translator, Yerelleştirme Müdürü, Localization Manager |

Tabloda 12 kullanımda, 9 öneri satırı vardır (21 satır). Bugün kullanılan adlardan yalnız Veri tabloda yok: SNN-Portfoy-Yonetimi, Veri kartını `veritabani-muduru` adına kendi oturumunda geçirir. Bunun takvimi yoktur.

### Karışabilecek çiftler

Aşağıdaki ayrımlar projelerdeki kart tanımlarına dayanır.

- **Veritabanı, Ölçüm ve Rapor:** Veritabanı veriyi toplar ve saklar; Ölçüm sistemin ve kuralların etkisini sayar; Rapor iş sayılarını okuyup yorumlar.
- **Yayın ve Altyapı:** Yayın sürümü ve yayın komutunu hazırlar; Altyapı sunucuyu ve ortamı kurar.
- **Pazarlama ve İçerik:** Pazarlama kitleye, mesaja ve takvime karar verir; İçerik onaylı mesajı metne döker.
- **Otomasyon ve Yazılım:** Otomasyon otomatik işlem motorlarını ve tarama betiklerini, Yazılım ekran ve servis kodunu yazar.
- **Destek ve Müşteri İlişkileri:** Destek gerçek son kullanıcıdan gelen sözü toplar; Müşteri İlişkileri yayından önce sanal müşteri canlandırır ve gerçek kişiyle hiç konuşmaz.

### Tabloda olmayan alan

Proje önce tabloya bakar. Gerçekten yoksa aynı biçimde ad koyar (`<Alan> Müdürü`, `<alan>-muduru.md`) ve tabloya eklenmesini `standart-talep` becerisiyle bildirir. `standart-talep`: aile standardına talep gönderen beceri.

### Güvenlik Müdürü açılmaz

Güvenlik incelemesini Genel Müdür yapar; bu yüzden tabloda Güvenlik Müdürü yoktur (`alt-ajan-standardi.md` Kural 8).

## Bağımsız birimler

Bağımsız birim: Genel Müdür'ün iş verdiği, kendi görev kartı olan, ama üretim zincirinin halkası olmayan yardımcı ajan. Müdürler içeriği üretir ya da denetler; birim zincirin dışından bakar. **Şu an tek birim vardır: Müşteri İlişkileri.** Birim kurmak isteğe bağlıdır; kurmayan projeye iş düşmez.

### Neden (vaka, 2026-11-13)

SNN-Destek-Gundemi'nde destek listesi için altı PDF biçimi hazırlandı. Altısı da Genel Müdür'ün "izleyici okuması" listesinden ve Uyum'un doğruluk denetiminden geçti; sahip yine de "hiç beğenmedim" dedi. Hiçbir müdür ve Genel Müdür, okurun "bana hangi destek uyar?" sorusunun cevapsız kaldığını görmemişti. Genel Müdür sanal müşteri panelini denedi: 8 sanal esnaf, her biri ayrı ajan (Sonnet · orta). Sayımın özeti (talep #198, talep sahibinin ölçümü; bu depoda yeniden ölçülmedi):

- "Bana hangi destek uyar, anladım" diyen: 0/8.
- Ortak bulgu: 8 kişi cevap yerine sınıf bulma ödevi gördü; 8 kişi "—*" işaretini "bilmiyoruz" diye okudu; 5 kişi tutar bekledi.
- Bulgular yeni bir biçim doğurdu; sahip yeni biçimi "öncekilere göre çok daha güzel" diye kabul etti.

Yöntem, `Jakeschincariol/founder-skill` deposundaki "consumer panel" fikrinden uyarlandı (MIT lisans; yalnız yöntem alındı, kod alınmadı). Sahip kalıcı birim istedi (proje PR'ları #68 ve #69) ve bunun aile standardı olmasını istedi (2026-11-13).

**Ölçülmeyenler:** Panelin gerçek okurla uyumu; yalnız sahibin tek bir kabulü var. Tam panelin hızlı panele göre daha iyi bulgu verdiği; ikisi karşılaştırılmadı, "varsayılan tam panel" sahip kararıdır, ölçüm değil. Vaka tek projede ve tek içerik türünde (PDF) görüldü. Hangi aile projelerinin kullanıcıya dönük içerik ürettiği sayılmadı. SNN-Destek-Gundemi 2026-11-13'te `quality/data/family-projects.json` listesinde yoktur.

### Ad ve ad kalıbı istisnası

- **Ad:** Müşteri İlişkileri. **Kart:** `.claude/agents/musteri-iliskileri.md`.
- Bu ad, "Ortak müdür adları" kalıbının (`<alan>-muduru`) istisnasıdır. Gerekçe (sahip kararı, 2026-11-13): ad farkı, birimin üretimin dışında durduğunu görünür kılar. İstisna yalnız bu bölümde sayılan birimler içindir. Başka bir bağımsız birim için proje adı kendisi koymaz; `standart-talep` ile bildirir.
- **Karışma riski:** "Müşteri Müdürü" adı tabloda Destek Müdürü'ne yönlendirilir. Destek gerçek kullanıcıdan gelen sözü toplar. Müşteri İlişkileri gerçek kişiyle hiç konuşmaz; yalnız yayından önce sanal müşteri canlandırır. Proje ikisini de açarsa görev tanımları ayrı kalır.
- Kart adında `-muduru` olmadığı için `.claude/agents/` klasörünü kart adına göre tarayan her araç bu kartı yabancı sayabilir. Bu depoda öyle bir araç ya da kapı yoktur (2026-11-13 metin taraması: `quality/`, `hooks/`, `setup/`, `debt-sync/`, `core/`, `.github/`, `ornek/`, `skills/`; `.claude/agents` ya da `-muduru` geçen tek yer `skills/git-temizlik/SKILL.md`, o da kartları ada bakmadan okur). Öteki aile projelerinin araçları ölçülmedi.

### Bağımsızlık

1. Birim işi yalnız Genel Müdür'den alır, raporunu yalnız ona verir. Sahibe yazmaz.
2. Öteki müdürlerden iş almaz, onlara iş vermez. Onların iç notlarını, gerekçelerini ve tartışmalarını okumaz; yalnız müşteriye gidecek içeriğin kendisine bakar.
3. Panel kişilerine içeriğin nasıl hazırlandığı söylenmez.
4. Birim içeriği değiştirmez. Öneri yazar; değişikliği ilgili müdür yapar.

### Panel: ne zaman, nasıl

**Panele gitmek zorunlu değildir; Genel Müdür karar verir.** Her panel birkaç yüz bin parça tutar (aşağıda). Vakadan çıkan ve sayılmamış ölçüt:

- **Gider:** ilk kez seçilen bir biçim ya da şablon; sahibin geri çevirdiği içerik; çok kişiye gidip geri alınamayan içerik.
- **Gitmez:** aynı şablonda yeni veri; yazım ya da olgu düzeltmesi; iç belge.
- Ölçütü proje kendi yöntem dosyasında daraltabilir ya da genişletebilir. İkinci bir vaka görülünce bu liste gözden geçirilir.

**Yeri:** Üretimi yapan müdürlerin işi bittikten sonra; varsa doğruluk ya da uygunluk denetiminden (örn. Uyum Müdürü) önce. Gerekçe mantıklıdır, ölçülmedi: panel bir değişiklik doğurursa değişen içerik son denetimden geçsin. Dikkat: vakada panel Uyum'dan **sonra** koştu; "önce" sırasını vaka göstermedi. Biçim seçimi gibi kararlarda üretimden önce de çalışabilir.

**Tam panel (panel yapılacaksa varsayılan):**
- Her sanal kişi ayrı ajandır; kişiler birbirinden habersiz cevap verir. Kişi ajanı taze açılır, `fork` olmaz: fork Genel Müdür'ün bağlamını taşır, bağımsızlığı bozar.
- Birim yönergeleri yazar ve cevapları sayar; kişi ajanlarını Genel Müdür açar. Proje bunun sebebi olarak alt ajanın alt ajan açamamasını gösterdi; bu depoda doğrulanmadı. Sebep ne olursa olsun düzenin faydası kalır: birim cevabı üretmez, yalnız sayar.
- Kişinin cevabı eksik ya da bozuksa birim kendisi yazmaz. Genel Müdür kişiyi bir kez daha çalıştırır; yine olmazsa raporda "cevap yok" sayılır.
- Model: Sonnet · orta (vakada ölçülen ayar). Kişi başına yaklaşık 100 bin parça okuduğu için Haiku'ya verilmez (`alt-ajan-standardi.md` Kural 9); Sonnet · yüksek ya da Haiku ile deneme yapılmadı. "İçerik kararı" satırı (Sonnet · yüksek) uygulanmaz: kişi hiçbir şeyi silmez ya da değiştirmez.
- Aynı anda en çok 8 ajan çalışır (Kural 10, varsayım). Panel büyüklüğünü proje kendi yöntem dosyasında yazar; vakada 8 kişi. Fazlası dalgalar halinde çalışır.

**Hızlı panel:** birimin kişileri tek başına sırayla canlandırması. Yalnız Genel Müdür açıkça isterse yapılır. Raporda "hızlı panel; kişiler bağımsız değil" yazar.

**Maliyet (vakada ölçülen):** kişi başına 103.924–106.068 parça ve 7 araç çağrısı; kişi başına 27–40 saniye; 8 kişi toplam yaklaşık 840 bin parça. Hızlı panelin maliyeti ölçülmedi. Her panel raporuna kişi sayısı, panel türü ve model·seviye yazılır (Kural 10); Genel Müdür sonucu panelin değerine göre tartar.

### Alt ajan standardıyla ilişki

- Kural 3 ("küçük iş ajansız yapılır") panel için bir engel değildir: panelin amacı bağımsız bakıştır, tek ajanla alınamaz. Ama bu yüzden bedeli ayrıca gerekçelendirilir, yani yukarıdaki "panele gitmek zorunlu değildir".
- Kural 4 (bağlı iş bölünmez) panelde çelişmez: kişi cevapları birbirine bağlı değildir, ayrı olması istenir.
- Kural 8 (güvenlik incelemesi alt ajana verilmez) panelde konu dışıdır.

### Değişmez sınırlar

1. Kişiler kibar olmaz ve içerikte yazmayan bilgiyi uydurmaz. Rakamı yanlış bulurlarsa "bence yanlış" derler; doğruluğa Uyum karar verir.
2. Her raporda şu anlamda bir cümle bulunur: "Bunlar sanal kişiler; neyin anlaşılmadığını gösterir, gerçek okunma ya da başvuru oranını tahmin etmez."
3. Kişi sözü müşteri yorumu diye yayında kullanılmaz.
4. Gerçek kişiye yazılmaz, anket açılmaz, gerçek kişi adı ya da kişisel veri kullanılmaz.
5. Birim ücretli araç ya da kredi harcayan servis kullanmaz; yayın yapmaz.

### Birimin raporu

Birim Genel Müdür'e şunları verir: tek cümlelik sonuç; biçim ya da sahne başına tablo; ortak bulgular (her birinde kaç kişi dediği); anlaşılmayan kelimeler; "olsaydı okurdum" önerileri; sınır cümlesi, panel türü, kişi sayısı, neye bakılmadığı. Kişi havuzu ve kişi yönergesi kalıbı projenin yöntem dosyasındadır (vaka projesinde `ekip/musteri-iliskileri/YONTEM.md`); standart bunları dayatmaz.

### Ortak beceri

Yönerge kalıbını ve sayımı yapan ortak bir beceri düşünülebilir. Bu standart onu yazmaz; ikinci bir proje birim kurarsa ayrı iş olarak açılır (`GERI-BILDIRIM-KAYDI.md`, #198).

## Diğer standartlarla sınır

Bu standart başka kuralları tekrar etmez; bağ verir.

- **"Kod yazmaz" okumayı yasaklamaz.** Küçük okuma ve sayım Genel Müdür'de kalır. Küçük işe müdür açılmaz (`alt-ajan-standardi.md` Kural 3).
- **Güvenlik incelemesi müdüre verilmez.** Genel Müdür kendisi yapar (`alt-ajan-standardi.md` Kural 8).
- **Çelişkide aile standardı önce gelir.** Proje düzeni bir aile standardıyla çelişirse standart geçerlidir.

## Zorunlu değil, projeye bırakılan

Aşağıdakilerin hiçbiri bu standartla dayatılmaz. Her proje kendi ihtiyacına göre seçer.

- **Hangi müdürler açılır.** Kaç müdür olacağı ve hangi alanların açılacağı projenin kararıdır. Ad tablosu bir açılış listesi değildir; açılan müdür yalnız tablodaki adı taşır. "Neden" bölümündeki vaka tablosu ise yalnız ölçümdür.
- **Klasör düzeni ve durum dosyası adları.** `ekip/<ad>/` ya da `ekip/<ad>-muduru/` ya da başka bir düzen serbesttir. Görev kartı adı serbest değildir; "Ortak müdür adları" tablosundan gelir ("Bağımsız birimler" bölümündeki birim adı hariç).
- **Bağımsız birim kurmak.** Müşteri İlişkileri isteğe bağlıdır; kurmayan proje bir şey yapmaz. Kuran proje kart adını ve yukarıdaki sınırları aynen alır, panel büyüklüğünü ve panele gitme ölçütünü kendi yöntem dosyasında yazar.
- **Pano yapısı.** Tek sayfa mı, her müdüre ayrı durum dosyası mı, hangi başlıklar: proje seçer. Önemli olan durumun tek yerde bulunmasıdır.
- **Genel Müdür'ün açılışta okuduğu dosyalar.** Hangi dosyaların okunacağını proje kendi rehberine yazar.

Bu standart kapı (otomatik denetim), zorunlu geçiş ya da takvim getirmez. Mevcut projelere iş düşürmez, makineye bir şey kopyalamaz. Tek istisna: SNN-Portfoy-Yonetimi'nin Veri kartı `veritabani-muduru` adına geçer; bunu proje kendi oturumunda yapar. Düzenin kurulup kurulmayacağına ve ne zaman kurulacağına proje karar verir.
