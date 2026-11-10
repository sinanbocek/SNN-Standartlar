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
| Destek Müdürü | `destek-muduru` | Son kullanıcıdan gelen talep ve geri bildirimleri toplar, sınıflar, yanıt taslağı yazar; projeler arası talep Talep'indir. | öneri | Support Manager, Müşteri Müdürü |
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

### Tabloda olmayan alan

Proje önce tabloya bakar. Gerçekten yoksa aynı biçimde ad koyar (`<Alan> Müdürü`, `<alan>-muduru.md`) ve tabloya eklenmesini `standart-talep` becerisiyle bildirir. `standart-talep`: aile standardına talep gönderen beceri.

### Güvenlik Müdürü açılmaz

Güvenlik incelemesini Genel Müdür yapar; bu yüzden tabloda Güvenlik Müdürü yoktur (`alt-ajan-standardi.md` Kural 8).

## Diğer standartlarla sınır

Bu standart başka kuralları tekrar etmez; bağ verir.

- **"Kod yazmaz" okumayı yasaklamaz.** Küçük okuma ve sayım Genel Müdür'de kalır. Küçük işe müdür açılmaz (`alt-ajan-standardi.md` Kural 3).
- **Güvenlik incelemesi müdüre verilmez.** Genel Müdür kendisi yapar (`alt-ajan-standardi.md` Kural 8).
- **Çelişkide aile standardı önce gelir.** Proje düzeni bir aile standardıyla çelişirse standart geçerlidir.

## Zorunlu değil, projeye bırakılan

Aşağıdakilerin hiçbiri bu standartla dayatılmaz. Her proje kendi ihtiyacına göre seçer.

- **Hangi müdürler açılır.** Kaç müdür olacağı ve hangi alanların açılacağı projenin kararıdır. Ad tablosu bir açılış listesi değildir; açılan müdür yalnız tablodaki adı taşır. "Neden" bölümündeki vaka tablosu ise yalnız ölçümdür.
- **Klasör düzeni ve durum dosyası adları.** `ekip/<ad>/` ya da `ekip/<ad>-muduru/` ya da başka bir düzen serbesttir. Görev kartı adı serbest değildir; "Ortak müdür adları" tablosundan gelir.
- **Pano yapısı.** Tek sayfa mı, her müdüre ayrı durum dosyası mı, hangi başlıklar: proje seçer. Önemli olan durumun tek yerde bulunmasıdır.
- **Genel Müdür'ün açılışta okuduğu dosyalar.** Hangi dosyaların okunacağını proje kendi rehberine yazar.

Bu standart kapı (otomatik denetim), zorunlu geçiş ya da takvim getirmez. Mevcut projelere iş düşürmez, makineye bir şey kopyalamaz. Tek istisna: SNN-Portfoy-Yonetimi'nin Veri kartı `veritabani-muduru` adına geçer; bunu proje kendi oturumunda yapar. Düzenin kurulup kurulmayacağına ve ne zaman kurulacağına proje karar verir.
