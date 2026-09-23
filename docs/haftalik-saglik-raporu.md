# Haftalık sağlık raporu — biçim ve rutin metni

**İş bölümü:** makine **sayıyı** üretir (`quality/health-report.js`, Pazartesi 08:09), rutin
**yorumu** yapar (bu hafta hangi üç şey önemli). Sayılar tek kaynaktan gelir.

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
> **1. Sayıları al.** `sinanbocek/SNN-Standartlar` deposunda son `[SAĞLIK]` etiketli issue'yu oku
> (`gh issue list -R sinanbocek/SNN-Standartlar --label saglik -s open --limit 1 --json body`).
> İçindeki SAYILAR bloğunu **olduğu gibi** kullan. Sayıyı kendin hesaplama, kütük başlıklarına
> güvenme — o blok makine ölçümüdür. Issue yoksa `node quality/health-report.js` çalıştır.
>
> **2. En çok üç madde seç.** Ölçütün şu sırayla: (a) veri/para/güvenlik kaybı **sürüyor mu**,
> (b) kullanıcıyı **bugün** etkiliyor mu, (c) tarihli mi (süre doluyor). Hiçbiri yoksa madde yazma
> — "bu hafta acil bir şey yok" demek geçerli bir rapordur.
>
> **3. Her maddeyi üç satırda yaz:**
> ```
> N. <Proje> — <ne oldu, tek cümle>
>    Neden: <ne kaybederiz, tek cümle>
>    Ne yapmalı: <kim ne yapacak, tek cümle>
> ```
> Benzetme yalnız gerçekten açıklıyorsa ve tek cümlede. Paragraf yazma.
>
> **4. Önem derecesi:** 🔴 ACİL (bugün) ve 🟡 BU HAFTA başlıkları altında grupla. Üçüncü seviye yok.
>
> **5. Biçim:**
> ```
> SNN Haftalık Sağlık — <tarih>
> 🔴 <n> acil · 🟡 <n> bekleyen · <n> proje sakin
>
> 🔴 ACİL
> …
> 🟡 BU HAFTA
> …
>
> <SAYILAR bloğu — olduğu gibi>
>
> GEÇEN HAFTA   <geçen haftanın maddelerinden kaçı kapandı, tek satır>
> ```
>
> **6. Gönder:** konu `SNN Haftalık Sağlık — <tarih> — <en önemli maddenin özeti>`,
> alıcı sbocek@gmail.com.
>
> **Yasaklar:** anahtar/parola değeri okuma ya da yazdırma (yalnız VAR/YOK). Ölçemediğin şeyi
> tahmin etme — "ölçemedim" yaz. Rapor 40 satırı geçmesin.

## Neden iki kanal birden

- **Issue** kalıcıdır, aranabilir, geçmişi durur; kütük ve uyum eksikleriyle aynı yerdedir.
- **E-posta** sana gelir, aramana gerek kalmaz.

İkisi de aynı sayıyı gösterir, çünkü sayıyı tek yer üretir.
