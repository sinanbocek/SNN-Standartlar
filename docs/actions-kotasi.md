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

1. Uyum ölçerinin akış bütçesi eksiklerine bak (aşağıda); iskelet sapmaları önce kapanır.
2. Seyrek gereken `cron`'ları haftalığa çek.
3. Gerçekten gerekliyse harcama sınırını yükselt.

Not: eşik **hesabın sınırı değil, erken uyarı çizgisidir**. Proje sahibi 2026-09-23'te 1.500
dakika olarak belirledi. Hesabın sınırı: plan Pro, gizli depolar için **3.000 dk/ay**
(2026-09-29, proje sahibi 2.000'den yükseltti).

---

## Eylül teşhisi — dakika NEREYE gitti (2026-09-29)

Ölçüm: faturalama API'si + gizli depolardaki 1.761 koşumun **iş (job) süreleri** tek tek çekildi.
Yeniden kurulan toplam 2.853 dk, fatura 2.848 dk — tablo faturayla örtüşüyor.

| Sebep | Dakika | Pay |
|---|---|---|
| Yuvarlama: gerçek süre 1.733 dk, faturalanan 2.853 dk | 1.120 | %39 |
| main'e gönderimde CI + taramaların tekrarı | 1.214 | %43 |
| `anahtar-tarama` + `kod-dili` ayrı akış (her iş ~15 sn → 1 dk) | 769 | %27 |
| Dependabot PR'ları | 179 | %6 |

(Satırlar kesişir: ayrı akıştaki taramanın main koşumu hem 2. hem 3. satırdadır.)

**Sebep test sayısı DEĞİLDİ.** CI içinde en uzun adım testlerdir (işin %50–75'i) ama PR başına
yalnız 1,2 CI koşumu vardı ve başarısız koşumlar ayda 49 dk tuttu. Dakikayı **iskelet** yaktı.

**Ölçmeden alınan önlem:** 20 Eylül'de CI'lara "aynı dalda eski koşumu iptal et" eklendi. Ayda
4 koşum iptal etti; sorun yığılma değildi. 23–24 Eylül yine 686 dk yaktı.

## Aile iskeleti (2026-09-29'dan itibaren)

| Kural | Şablon | Uyum ölçütü |
|---|---|---|
| CI yalnız `pull_request`; main'e gönderimde koşmaz | `ornek/ci-duzeni.yml` | `ci-main-kosumu` |
| Aile kontrolü CI işinin içinde ADIM (`.github/actions/aile-kontrol`) | `ornek/ci-duzeni.yml` · CI yoksa `ornek/aile-kontrol.yml` | `aile-kontrol-adimi` |
| Aynı PR'a art arda gönderimde eski koşum iptal | `ornek/ci-duzeni.yml` | `ci-iptal` |
| Dependabot aylık, güvenlik güncellemeleri tek grupta | `ornek/dependabot.yml` | `dependabot-aylik` |

- Denetim: `quality/workflow-budget.js` → uyum ölçeri (`quality/compliance.js`) → her gün sapma
  olan projeye **issue** (`uyum-issue` akışı). Değişikliği o projenin kendi ajanı yapar.
- **Açık depolar muaf** (`family-projects.json` → `"public": true`): dakikaları ücretsiz.
- **main'deki kodun test edilmiş olması** birleştirme kapısıyla sağlanır: dal main'in gerisindeyse
  birleştirme durur, önce dal güncellenir ve PR testi yeniden koşar. Kapı yalnız bu bilgisayarda
  çalışır; GitHub sitesinden elle birleştirme bu denetimi atlar.
- **Yalnız belge değişen PR:** taramalar çalışır (anahtar bir `.md` dosyasına da sızabilir),
  testler atlanır — ortak adımın `yalniz-belge` çıktısıyla. `paths-ignore` kullanılmaz.

Benzetim (eylül verisi, aynı 383 PR): iskelet + Dependabot ile **~1.260 dk** (bugünkü 2.853 yerine).
PR başına 7,4 dk → 3,3 dk.
