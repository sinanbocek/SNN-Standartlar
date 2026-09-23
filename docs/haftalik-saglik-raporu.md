# Haftalık sağlık raporu — biçim ve rutin metni

**İş bölümü:** makine **sayıyı** üretir (`quality/health-report.js`, Pazartesi 08:09), rutin
**yorumu** yapar (bu hafta hangi üç şey önemli). Sayılar tek kaynaktan gelir.

## İlk gerçek koşumda çıkan altı kusur (2026-09-23, düzeltildi)

Biçim tuttu — tablo gitti, üç satırlık maddeler geldi, kota satırı makineyle **birebir aynı**
çıktı (2133/1500), yani rutin sayıyı kendisi hesaplamamıştı. Ama altı kusur çıktı:

| # | Kusur | Nerede düzeltildi |
|---|---|---|
| 1 | **Konuda hassas ayrıntı**: tutar ve açık tarifi (`… 482.879 TL dağıtılmamış komisyon`) | Standarda kural + rutin 5/8. maddesi |
| 2 | **Gövdede daha fazlası**: anahtarın kaç betikte olduğu ve ne kadar geçerli olduğu | Rutin 5. maddesi |
| 3 | **Olgusal hata**: "depo kendini doğrulayamıyor" — oysa `test` yeşildi, yalnız kota kapısı kırmızıydı | Rutin 6. maddesi |
| 4 | **Sıralama**: açıkta duran anahtar, biriken muhasebe işinin altında kaldı | Rutin 2. maddesi |
| 5 | **Üçüncü şahıs**: *"Sinan … yeniler"* | Rutin 4. maddesi (emir kipi) |
| 6 | **Yanlış sayı**: "7 proje sakin" — ailede 11 proje var, 4'ünde acil borç | **Makineye taşındı**: `Aile durumu` satırı |

Ayrıca ölçüm sırasında tarayıcının kendisinde iki kusur bulundu:

- **CI "son koşuma" bakıyordu.** Hangi zamanlanmış işin en son çalıştığına göre sonuç değişiyordu:
  kota kapısı kırmızıyken rapor "CI hepsi yeşil" dedi. Artık **akış başına** son koşum okunuyor.
- **Uzun akış adı satırı taşırıyordu** (Dependabot adları 100+ karakter). Kısaltılıyor.

**Ders:** rutinin hesaplayabileceği hiçbir sayı bırakılmaz. 6. kusur bunun örneğiydi — sayıyı
yorum katmanına bırakınca yanlış çıktı.

## Neden değişti (2026-09-23)

Önceki biçimin dört kusuru vardı, üçü ölçüldü:

| Kusur | Ölçüm |
|---|---|
| `Güvenlik` sütunu hiç dolmuyordu | 10 projenin **10'unda da** "okunamadı" — iki hafta üst üste |
| Sayılar kütük **başlığından** okunuyordu | Üç projede dosya içeriğiyle uyuşmuyordu: Abacus 11↔1, Günüm Var 45↔35, GHS 48↔55 |
| Maddeler paragraftı | Her biri 4-5 satır; benzetme, açıklama ve öneri iç içe |
| Önem derecesi yoktu | "Yönetici anahtarı açıkta" ile "paket güncellemesi" aynı ağırlıkta duruyordu |

Proje sahibi kararı: **"uzun uzun cümleler yerine önem derecesi ve kısa gerekçe · özet hap bilgi."**

## Biçim

```
SNN Haftalık Sağlık — 23.09.2026
🔴 1 acil · 🟡 2 bekleyen · 8 proje sakin

🔴 ACİL
1. <Proje> — <tek cümlelik ne>
   Neden: <tek cümle — ne kaybederiz>
   Ne yapmalı: <tek cümle — kim, ne>

🟡 BU HAFTA
2. …
3. …

<makinenin ürettiği SAYILAR bloğu buraya olduğu gibi>

GEÇEN HAFTA   <kapananlar tek satır>
```

**Kurallar:**

- En çok **üç madde**. Dördüncüsü varsa en zayıfı düşer; liste uzarsa hiçbiri okunmaz.
- Her madde **üç satır**: ne · neden · ne yapmalı. Benzetme yalnız gerçekten açıklıyorsa ve
  **tek cümlede**.
- **Önem derecesi ilk satırda.** 🔴 = bugün bakılmalı (veri/para/güvenlik kaybı sürüyor).
  🟡 = bu hafta. Üçüncü seviye yok; "sonra bakılır" zaten rapora girmez.
- **Sayılar yazılmaz, yapıştırılır.** `node quality/health-report.js` çıktısı olduğu gibi konur.
  Rutin sayıyı kendisi hesaplamaz — eski raporun kütük başlığı hatası buradan geliyordu.
- **Sakin proje satır doldurmaz.** "P1:0" on satırın yedisini dolduruyordu; artık tek sayıya iner.
- **Ölçülemeyen bir kez yazılır**, her satırda değil.

## Rutin metni (claude.ai/code/routines → mevcut rutinin promptu)

> Sen proje sahibi Sinan Bocek'in asistanısın. Teknik İngilizceye hâkim değil: sade Türkçe yaz,
> kısa cümle kur. Bu bir RAPOR görevidir — yalnız OKU ve BİLDİR; hiçbir dosyayı, dalı, PR'ı,
> issue'yu değiştirme, hiçbir şeyi birleştirme.
>
> **1. Sayıları al.** `sinanbocek/SNN-Standartlar` deposunda `saglik` etiketli açık issue'yu oku
> (`gh issue list -R sinanbocek/SNN-Standartlar --label saglik -s open --limit 1 --json body`).
> İçindeki SAYILAR bloğunu **olduğu gibi** kullan. Hiçbir sayıyı kendin hesaplama — proje sayısı,
> acil borç sayısı, CI durumu, kota: hepsi o blokta. Issue yoksa `node quality/health-report.js`
> çalıştır; o da olmazsa "sayılar ölçülemedi" yaz, **uydurma**.
>
> **2. En çok üç madde seç**, sırala: (a) kayıp **şu an sürüyor mu** (açıkta duran anahtar, akan
> veri), (b) kullanıcıyı **bugün** etkiliyor mu, (c) tarihli mi. Biriken bir muhasebe işi,
> açıkta duran bir anahtarın **altındadır**. Hiçbiri yoksa madde yazma — "bu hafta acil bir şey
> yok" geçerli bir rapordur.
>
> **3. SAYILAR'da zaten görünen şeyi madde yapma.** Madde listesi, sayıda görünmeyen ve **karar
> isteyen** şeyler içindir. Kota aşımı sayı bloğunda duruyorsa ayrıca madde olmaz.
>
> **4. Her maddeyi üç satırda yaz:**
> ```
> N. <Proje> — <ne oldu, tek cümle>
>    Neden: <ne kaybederiz, tek cümle>
>    Ne yapmalı: <EMİR KİPİ, tek cümle>
> ```
> "Ne yapmalı" satırı doğrudan ona hitap eder: *"Supabase panelinden anahtarı yenile."*
> Üçüncü şahıs kullanma (*"Sinan ... yeniler"* yanlış). Paragraf yazma; benzetme yalnız
> gerçekten açıklıyorsa ve tek cümlede.
>
> **5. HASSAS AYRINTI YAZMA.** Ne konuda ne madde başlığında: tutar, anahtarın yeri ya da kaç
> yerde olduğu, ne kadar geçerli olduğu, açığın tarifi, müşteri bilgisi. Bunlar kütükte kalır.
> Madde şöyle yazılır: *"Global Hedef — yönetici anahtarı hâlâ yenilenmedi. Ayrıntı: GHS
> kütüğü TB-091."* Kural: `standartlar/teknik-borc-standardi.md` → "Başlık hassas ayrıntı taşımaz".
>
> **6. CI satırını doğru oku.** SAYILAR'daki `main CI` satırı parantez içinde **hangi akışın**
> kırmızı olduğunu söyler. Kırmızı olan yalnız bir kapıysa (ör. `actions-quota`) "depo kendini
> doğrulayamıyor" **deme** — derleme ve testler yeşil olabilir. Ne yazdığını parantezden oku.
>
> **7. Biçim:**
> ```
> SNN Haftalık Sağlık — <tarih>
> 🔴 <n> acil · 🟡 <n> bekleyen
>
> 🔴 ACİL
> …
> 🟡 BU HAFTA
> …
>
> <SAYILAR bloğu — olduğu gibi, Aile durumu satırı dahil>
>
> GEÇEN HAFTA   <geçen haftanın maddelerinden kaçı kapandı, tek satır>
> ```
> Başlık satırında proje sayısı yazma — o, SAYILAR'ın "Aile durumu" satırında zaten var.
>
> **8. Gönder:** konu **`SNN Haftalık Sağlık — <tarih> — <n> acil`**. Konuya başka hiçbir şey
> yazma: tutar yok, proje adı yok, açık tarifi yok. Alıcı sbocek@gmail.com.
>
> **Yasaklar:** anahtar/parola değeri okuma ya da yazdırma (yalnız VAR/YOK). Ölçemediğini tahmin
> etme — "ölçemedim" yaz. Rapor 40 satırı geçmesin.

## Neden iki kanal birden

- **Issue** kalıcıdır, aranabilir, geçmişi durur; kütük ve uyum eksikleriyle aynı yerdedir.
- **E-posta** sana gelir, aramana gerek kalmaz.

İkisi de aynı sayıyı gösterir, çünkü sayıyı tek yer üretir.
