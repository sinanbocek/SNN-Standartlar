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

<!-- kullanici-talimati:basla -->
# Arayüz tercihleri

Bu kural SNN aile standardıdır (`SNN-Standartlar/standartlar/arayuz-standardi.md`).

1. Amber (sarı-turuncu) uyarı rengi kullanılmaz. Uyarı ve bilgi için mavi-gri, mavi ya da menekşe; gerçek hata için kırmızı.
2. Projenin kendi renk kararı varsa o projenin kuralı önce gelir.
<!-- kullanici-talimati:bitir -->

## Kontrol listesi maddesi

`standartlar/kod-inceleme-kontrol-listesi.md` içinde:

> Yeni uyarı, rozet ya da durum rengi eklendi mi? Amber/turuncu var mı?
