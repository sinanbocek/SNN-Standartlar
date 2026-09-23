# Actions dakika kotası — ölçüm ve kapı

**Kural:** kotayı hatırlamak değil, ölçmek. `quality/actions-quota.js` · her Pazartesi 08:47 TSİ.

## Neden var

2026-09-19'da `trade-kasa`'da bir iş **"spending limit"** gerekçesiyle hiç başlatılmadı. Sınıra
dayanınca GitHub fatura kesmez — **işi hiç çalıştırmaz**. Kimse kotaya bakmadığı için kimse bilmedi.

Ölçüm (2026-09-23, faturalama API'si):

| Ay | Kotadan yanan dakika |
|---|---|
| Temmuz | 53 |
| Ağustos | 972 |
| Eylül (23 günde) | **2.527** |

Üç ayda **50 kat**.

## Kotayı ne yakar, ne yakmaz

**Yalnız gizli depolar yakar.** Herkese açık depoda standart makine ücretsizdir; faturalama
raporunda tam indirimli görünür. Ölçüldü:

```
açık depo satırı: brüt $0.252 · indirim $0.252 · ödenen $0.000
```

Bu yüzden **zamanlanmış işlerimizin hepsi SNN-Standartlar'da durur** — kendileri kota yakmaz.
20–23 Eylül ölçümü: zamanlayıcılar çalışırken gizli depolarda günde ~22 dk, açık depolarda 22 dk.

**Dakikayı yakan şey PR'lardır.** Bir çekirdek sürümü 8 gizli depoda CI tetikler; beş sürüm arka
arkaya çıkınca 40 koşum olur. En yoğun günler bunlardı: 15 Eylül 574 dk · 19 Eylül 614 dk.

## Kapı ne yapar

- Aylık kullanımı **faturalama API'sinden** okur (`user` yetkisi ister — `GITHUB_TOKEN`'da yoktur,
  `PROJECT_TOKEN` kullanılır).
- Herkese açık depoları düşer; **listesi okunamazsa hepsini sayar** (eşik erken çalar, geç değil).
- Eşik **1.500 dk/ay**. Aşılırsa kırmızı; aşılmadıysa **izdüşüm** uyarır ("bu hızla ay sonu ~N dk").
- **Çıkış 2 = ölçemedim**, çıkış 1 = eşik aşıldı. İkisi ayrı: yetki sorununu kota sorunu gibi
  göstermek okuyanı yanlış yere baktırır.

## Eşik aşılınca ne yapılır

1. En çok yakan depoda `concurrency` (aynı dalda eski koşumu iptal et) + `paths-ignore`.
2. Seyrek gereken `cron`'ları haftalığa çek.
3. Gerçekten gerekliyse harcama sınırını yükselt.

Not: eşik **hesabın sınırı değil, erken uyarı çizgisidir**. Proje sahibi 2026-09-23'te 1.500
dakika olarak belirledi.
