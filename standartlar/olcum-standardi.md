# Ölçüm Standardı — iddia, kanıt ve kapılar (tüm projeler)

Bu standart iki şeyi düzenler: **bir ajanın neyi bilgi diye sunabileceğini**, ve **bir kapının kurulmadan önce neyi kanıtlaması gerektiğini**.

## Neden (ölçüm, 2026-09-19)

Tek bir günde 17 hata yapıldı ve kaydedildi. Hangisini neyin yakaladığı:

| Yakalayan | Sayı |
|---|---:|
| Makine kapıları (CI, tarayıcı, uyarı kipi, aile ölçümü) | 9 |
| Gerçek veriye bakmak (11 projede ölçüm, elle okuma) | 4 |
| Kendi kontrolüm | 2 |
| Birim test | 1 |
| Proje sahibinin şüphesi | 1 |

**Birim testler bir tane yakaladı.** Testler yazanın *düşündüğünü* doğrular; düşünmediğini değil.

Daha önemlisi, hataların baskın kök nedeni acele değildi. **Ölçülmemiş varsayımın bilgi gibi sunulmasıydı:**

| Söylenen | Ölçülünce |
|---|---|
| "Tarama pahalı, oturum açılışında yapılamaz" | En yavaş proje **445 ms** (bütçe 30 sn) |
| "Ölçüt dosyanın varlığına baksa yeter" | Yanlış geçiş üretti (aşağıya bakın) |
| "10 projenin tamamını doğruladım" | İkisine bakılmıştı |
| "Yerel ölçüm gerçeği gösterir" | Piyasa-Core 301 değil **2.496** çıktı |

Dördü de kendinden emin, gerekçeli ve yanlıştı. "Daha dikkatli ol" bunları önlemez; **"ölçmediğini iddia etme"** önler.

---

## Kural 1 — Ölçülmemiş iddia, iddia olarak işaretlenir

Bir ajan; hız, maliyet, kapsam, oran ya da "hepsi/hiçbiri" iddiası ortaya atıyorsa ya **ölçer ve sayıyı yazar**, ya da cümleyi **varsayım olarak işaretler**.

| Yazılmaz | Yazılır |
|---|---|
| "Bu pahalı, açılışta yapılamaz." | "Ölçtüm: en yavaş proje 445 ms." · ya da "**Ölçmedim**, pahalı olabilir." |
| "Hepsini doğruladım." | "8 projenin rehberini elle okudum; 1 yanlış alarm çıktı." |
| "Yanlış alarm yok." | "10 projede tarandı, yanlış alarm görülmedi." · ya da "**Denenmedi.**" |
| "Bu yeterli olur." | "Şu vakayı yakalıyor: … Şunu yakalamıyor: …" |

**Yüzde ve toplam kaynağını taşır.** "Toplam 17.562" değil, "ana daldan, `aile-olcumu.yml` akışının ürettiği ölçüm".

### Bu madde tam zorlanamaz — ve bu açıkça söylenir

Deponun ilkesi: *zorlanamayan madde kural değil, öneridir.* Düzyazıdaki bir iddianın ölçülüp ölçülmediğini makine anlayamaz. Bu yüzden Kural 1'in zorlaması **kısmidir**:

| Zorlayan | Neyi |
|---|---|
| `aile-olcumu.yml` | Tarayıcı değişiminin 11 projedeki etkisi; sayı uydurulamaz, akış üretir |
| `quality/gate-registry.js` | Kapı vakalarının **tarihli** olması; tarihsiz gerekçe kayıt sayılmaz |
| Kod inceleme kontrol listesi | İnsan denetimi |

Geri kalanı yükümlülüktür, kapı değildir. Bunu gizlemek, tam da bu standardın yasakladığı şeydir.

---

## Kural 2 — Kapı, bilinen bir hatayla sınanmadan kurulmaz

Her yeni kapı için üç soru cevaplanır ve **kayda geçer**:

1. **Hangi gerçek vaka bu kapıyı doğurdu?** (tarihli, ölçülmüş)
2. **O vakayı yakaladığını hangi test gösteriyor?**
3. **Kapıyı bilerek bozunca kırmızıya dönüyor mu?** (sabotaj testi)

### Neden: yanlış kapı, kapısızlıktan daha tehlikelidir

2026-09-19'da uyum ölçeri kuruldu. Ölçütlerden biri *"kod dili turnikesi takılı mı?"* idi ve dosyanın **varlığına** bakıyordu. Bu deponun `kod-dili.yml` dosyası vardı — ama `on: workflow_call`, yani başka depolar çağırıyor, **kendi PR'larında hiç çalışmıyordu**.

Sonuç: ölçer, aynı gün bir Türkçe değişken adının (`liste`) ana dala girmesine izin veren boşluğu **"tamam" diye işaretledi**.

Kapı yazılırken *"bu ölçüt sabahki `liste` hatasını yakalar mıydı?"* diye sorulsaydı, yanlış geçiş ilk dakikada görülürdü. Sorulmadı. Kural 2 bu sorunun sorulmasını zorunlu kılar.

### Makine zorlaması

`quality/data/gates.json` — her kapının kaydı. `quality/gate-registry.js` şunları denetler:

| Denetim | Ne olur |
|---|---|
| Kanca bir kural modülü çalıştırıyor ama defterde yok | **Kırılır** |
| Kaydın modülü ya da test dosyası yok | **Kırılır** |
| Kaydın bildirdiği test adı test dosyasında yok | **Kırılır** |
| Vaka tarihsiz | **Kırılır** — "sanırım böyle olmuştu" kayıt değildir |

Test adı **tırnak içinde tam** aranır. İlk sürüm alt dizge arıyordu ve `'baska bir test'` metni `'bir test'` adını içerdiği için sabotaj testi kırmızıya dönmüyordu — bu modülün kendi sabotaj testi yazılırken ölçüldü (2026-09-19).

### Kapıyı kurma sırası

1. Vakayı yaz (tarihli, ölçülmüş)
2. Vakayı yakalayan testi yaz — **önce kırmızı olduğunu gör**
3. Kapıyı yaz, test yeşile dönsün
4. Sabotaj: kuralı bilerek boz, kırmızıya döndüğünü gör
5. `gates.json`'a kaydet
6. **Gerçek veride çalıştır** — yanlış alarm sayısını ölç ve yaz

6. adım atlanırsa kapı gürültü üretir. 2026-09-19'da aynı gün kurulan üç kapının üçü de yanlış alarm verdi; bir ajan bir kapıya iki kez boşuna takılırsa üçüncüsünde ciddiye almaz.

---

## Uymak kolay, atlamak zor

Kapı, doğru davranışı **kolaylaştırmalı**. Engelleyen kapı, yarım kalmış bir işin ortasında açılırsa ajanı çevresinden dolaşmaya iter.

2026-09-19'da kod dili kapısı **uyarı kipinde** açıldı: hiç engellemedi, yalnız not düştü. Dört projede altı ajan çalışıyordu ve hiçbiri tıkanmadı; buna rağmen kapı aynı gün iki kez gerçek ihlal yakaladı. Ölçüm biriktikten sonra engele çevrilir.

## Bilinen sınırlar (ölçülmüştür, gizlenmez)

- **Kural 1 tam zorlanamaz.** Yukarıda açıkça yazıldı.
- **Defter, kaydın doğruluğunu değil varlığını denetler.** Vakayı uyduran bir kayıt tarih taşıdığı sürece geçer. Denetim biçimseldir; içeriği kod incelemesi denetler.
- **Sabotaj testi zorunlu tutulamıyor.** "Bu testi bozunca kırmızıya dönüyor mu?" sorusunun makine karşılığı yok; kontrol listesi maddesidir.

## Kontrol listesi maddeleri

`standartlar/kod-inceleme-kontrol-listesi.md` içinde:

> Bu PR'daki sayı ve oran iddialarının kaynağı belli mi, yoksa tahmin mi?
> Yeni bir kapı eklendiyse: vakası tarihli mi, o vakayı yakalayan testi var mı, sabotajla denendi mi?
