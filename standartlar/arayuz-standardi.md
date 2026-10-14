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

**Neden:** AI her oturumda bileşeni sıfırdan uydurunca ekranlar "AI yapımı" görünüyor ve iki proje iki ayrı uygulama gibi duruyor (sahip, 2026-10-14). Plan ve ölçüm: `docs/arayuz-standardi-plani.md`.

<!-- kullanici-talimati:basla -->
# Arayüz tercihleri

Bu kural SNN aile standardıdır (`SNN-Standartlar/standartlar/arayuz-standardi.md`).

1. Amber (sarı-turuncu) uyarı rengi kullanılmaz. Uyarı ve bilgi için mavi-gri, mavi ya da menekşe; gerçek hata için kırmızı.
2. Projenin kendi renk kararı varsa o projenin kuralı önce gelir.
3. Arayüz parçası yazmadan önce SNN-UI kataloğuna bak (`npx shadcn@latest add @snn-ui/<ad>`; liste: SNN-UI `AI/katalog.md`). Varsa oradan kur, yoksa yaz ve SNN-UI'ye aday bildir.
4. Yeni projede SNN-UI baştan kurulur. Devam eden projede yalnız yeni parça katalogdan gelir; çalışan ekrana sırf geçiş için dokunulmaz.
5. Arc'ın MCP sunucusu kullanılmaz. Arc Pro kaynağı SNN-UI'ye ve herkese açık depoya konmaz.
<!-- kullanici-talimati:bitir -->

## Kontrol listesi maddesi

`standartlar/kod-inceleme-kontrol-listesi.md` içinde:

> Yeni uyarı, rozet ya da durum rengi eklendi mi? Amber/turuncu var mı?
