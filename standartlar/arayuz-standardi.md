# Arayüz Standardı (tüm projeler)

Proje sahibinin ekranda gördüğü her şeyin aile kuralı. Giriş kutularının kuralı ayrıdır: `giris-alanlari-standardi.md`.

Bu belge kısa tutulur: yalnız sahibin **birden çok projede** söylediği tercihler buraya girer. Tek projede söylenen tercih o projenin rehberinde kalır.

## 1. Amber (sarı-turuncu) uyarı rengi kullanılmaz

Uyarı ve bilgi için mavi-gri (slate), mavi ya da menekşe kullanılır. Kırmızı yalnız gerçek hata içindir.

Projenin kendi renk kararı varsa (marka rengi, sahibin o projeye özel sözü) o projenin kuralı önce gelir.

**Neden (bellek derleme, 2026-10-12 — #140):** sahip aynı tercihi iki projede ayrı ayrı söyledi; iki not birbirinden habersiz yazılmıştı.

| Proje | Tarih | Ne oldu |
|---|---|---|
| GHS-Panel | 2026-09-16 | Teklif Sihirbazı ekran testinde amber beğenilmedi: "bu tarz uygulamalarda tekrar kullanma". Uyarı için slate/mavi, hata için kırmızı. |
| SNN-Siparis | 2026-09-25 | Amber/turuncu hiçbir yerde istenmedi; uyarı için vurgu mavisi ya da menekşe. Arayüz birkaç kez geri çevrildi. |

Bedeli: sahip tercihi ikinci projede yeniden söylemek zorunda kaldı, ekran o arada geri çevrildi. Kural ev kâğıdına (`~/.claude/CLAUDE.md`) kopyalanır; yeni projede tekrar söylenmez.

## 2. Önce katalog: SNN-UI

**SNN-UI:** ailenin arayüz bileşen kataloğu (`sinanbocek/SNN-UI`, herkese açık). Arc'ın (uiarc.dev, MIT) ücretsiz bileşenlerinden Türkçeye ve bu belgeye uyarlanmıştır. shadcn ile kurulur:

```json
{ "registries": { "@snn-ui": "https://raw.githubusercontent.com/sinanbocek/SNN-UI/main/public/r/{name}.json" } }
```

```bash
npx shadcn@latest add @snn-ui/button
```

Katalogdaki bileşenlerin listesi: SNN-UI `AI/katalog.md`.

**Kural:** Yeni bir arayüz parçası (düğme, pencere, menü, sekme, form alanı) yazılmadan önce kataloğa bakılır. Varsa oradan kurulur. Yoksa yazılır ve SNN-UI'ye aday olarak bildirilir.

**Kapsam (sahip, 2026-10-14):**

| Durum | Ne yapılır |
|---|---|
| Yeni proje | SNN-UI baştan kurulur (aksi söylenmedikçe) |
| Devam eden projede yeni ekran ya da yeni parça | Katalogdan alınır; projenin mevcut renklerine bağlanır |
| Devam eden projede çalışan ekran | Olduğu gibi kalır; sırf geçiş için dokunulmaz |

Katalog güncellense de projedeki bileşen kendiliğinden değişmez; proje isterse `shadcn add --overwrite` ile günceller.

**Yasaklar:**

- Arc'ın MCP sunucusu (Arc hesabıyla giriş isteyen AI bağlantısı) projelerde kullanılmaz. AI oradan uyarlanmamış, İngilizce biçimli bileşen kurabilir.
- Para, sayı ve tarih gösteren Arc bileşeni ABACUS'a bağlanmadan alınmaz (`giris-alanlari-standardi.md`; sınıflandırma: `docs/arc-siniflandirma.md`).
- **Arc Pro kaynağı SNN-UI'ye girmez**, satın alınsa bile. Arc lisansı Pro bileşenin shadcn kataloğunda yayınlanmasını açıkça yasaklar (uiarc.dev/license, 2026-10-14 okundu). Pro bileşenin canlı önizlemesinden kod okumak da kod kopyalamaktır.

### 2.1 Pro bileşenlerden esinlenme

Arc Pro satın alınmaz (sahip, 2026-10-14: bütçe yok; site kapanırsa erişim de biter). Pro'daki güzel bileşenlerin **işlevi** bizim kodumuzla yeniden yazılır ve SNN-UI'ye konur. Sınır şudur: **fikir serbest, kod yasak.**

| Serbest | Yasak |
|---|---|
| uiarc.dev'deki canlı önizlemeye **bakmak**: nasıl davranıyor, nasıl hissettiriyor | Pro kaynağını ya da önizlemenin tarayıcıya indirdiği kodu (JS, CSS) okumak, kopyalamak |
| İşlevi **kendi cümlemizle** tarif etmek: "katlanabilen, simgeli, iç içe başlıklı kenar menüsü" | Arc'ın açıklama metinlerini, örnek verilerini, görsellerini, adlarını aynen almak |
| SNN-UI'deki A rafı parçalarından ve kendi değişkenlerimizden kurmak | Pro bileşenin görünümünü piksel piksel taklit etmek |

**Yazım sırası:** (1) İşlev tarifi, bileşeni yazacak oturumdan **önce** ayrı yazılır ve SNN-UI'de `docs/tarifler/<ad>.md` olarak durur. (2) Yazan oturum Pro sayfasını açmaz; yalnız tarifi okur. (3) `KAYNAK.md`'ye "Arc Pro'dan esinlenildi, kod okunmadı" ve tarifin yolu yazılır.

**Neden bu sıra:** Yazan, önizlemenin kodunu gördüyse "esinlenme" kanıtlanamaz. Tarif ile yazımı ayırmak, kodun bizim olduğunu belgeler.

### 2.2 Görsel denetim: test yeşil olması yetmez

Yeni ya da değişen her SNN-UI bileşeni birleşmeden önce **gözle** denetlenir:

1. Galeride 1400 px ve 390 px genişlikte ekran görüntüsü alınır (SNN-UI: `npm run shots -- <ad>`).
2. Katalogdaki iyi örneklerle karşılaştırılır (`usage-pricing`, `bar-chart`): boşluk düzeni, başlık hiyerarşisi, hover ve basma durumları, hareketin akıcılığı, yazı tipi.
3. Resim yuvası olan bileşenin galeri örneğinde gerçek fotoğraf bulunur; boş yer tutucu kutu kabul edilmez. Fotoğraflar ücretsiz lisanslı kaynaktan (Unsplash, Pexels) gelir, kaynağı yazılır; Arc'ın görselleri kullanılmaz.
4. PR gövdesine bileşen başına bir cümlelik görsel değerlendirme yazılır. Koordinatör birleştirmeden önce ekran görüntülerine bakar.

**Vaka (2026-10-15):** Dalga 3'ün 17 bloğu testleri ve yasak çağrı taramasını geçerek birleşti. Sahip galeride 11'ini kalitesiz buldu: resim kutuları boş, düzen ve akış zayıf, yazı tipi bozuk. Ölçüm: galeride yüklenen yazı tipi sayısı 0 (Inter ve Geist hiç gelmiyordu, her şey Arial). Kimse ekran görüntüsüne bakmamıştı; denetim yalnız testlerdi.

**Neden:** AI her oturumda bileşeni sıfırdan uydurunca ekranlar "AI yapımı" görünüyor ve iki proje iki ayrı uygulama gibi duruyor (sahip, 2026-10-14). Plan ve ölçüm: `docs/arayuz-standardi-plani.md`.

<!-- kullanici-talimati:basla -->
# Arayüz tercihleri

Bu kural SNN aile standardıdır (`SNN-Standartlar/standartlar/arayuz-standardi.md`).

1. Amber (sarı-turuncu) uyarı rengi kullanılmaz. Uyarı ve bilgi için mavi-gri, mavi ya da menekşe; gerçek hata için kırmızı.
2. Projenin kendi renk kararı varsa o projenin kuralı önce gelir.
3. Arayüz parçası yazmadan önce SNN-UI kataloğuna bak (`@snn-ui/<ad>`, liste: SNN-UI `AI/katalog.md`). Yoksa yaz, SNN-UI'ye aday bildir.
4. Yeni projede SNN-UI baştan kurulur. Devam eden projede yalnız yeni parça katalogdan gelir; çalışan ekrana dokunulmaz.
5. Arc MCP kullanılmaz. Arc Pro kodu okunmaz, kopyalanmaz; istenen Pro bileşenin işlevi tarif edilip sıfırdan yazılır (§2.1).
<!-- kullanici-talimati:bitir -->

## Kontrol listesi maddesi

`standartlar/kod-inceleme-kontrol-listesi.md` içinde:

> Yeni uyarı, rozet ya da durum rengi eklendi mi? Amber/turuncu var mı?
