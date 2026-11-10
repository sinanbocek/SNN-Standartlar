# Ölçüm — bağlam

Bu dosya az değişen bilgidir. Değişen durum `ekip/olcum/DURUM.md` dosyasındadır.

Bu departman ölçer ve raporlar; `quality/` altındaki kodu değiştirmez. Araç bozuksa bulguyu "Bekleyen" altına yazar, iş Yazılım'a gider.

## Sahip olunan dosyalar

| Yol | Ne taşır |
|---|---|
| `docs/uyum-olcumu.md` | Uyum ölçümünün yöntemi |
| `docs/haftalik-saglik-raporu.md` | Haftalık sağlık raporu |
| `docs/actions-kotasi.md` | Actions dakika kotası |
| `docs/bellek-derleme/` | Haftalık bellek derleme raporları |
| `quality/data/family-projects.json` | Aile listesi; proje sayısının tek kaynağı |
| `quality/data/pending-measurements.json` | Vadesi gelince makinenin çalıştıracağı ölçümler |

## İşe göre önce okunacaklar

| İş | Oku |
|---|---|
| Her ölçüm | `standartlar/olcum-standardi.md` (özellikle Kural 3: okunamadı, yok demek değildir) |
| Aile genelinde dosya sorma | `CLAUDE.md` §3 "Okunamadı ≠ yok" |
| Uyum | `docs/uyum-olcumu.md` |
| Bellek döngüsü | `docs/bellek-derleme/README.md` |
| Alt ajan çağrı sayımı | `standartlar/alt-ajan-standardi.md` "Nasıl ölçülür" |

Ölçüm `origin/main`'den yapılır; yerel klasör geride ya da başka dalda olabilir. Ölçülemeyen "okunamadı" diye yazılır. Başka projelerin dosyaları yalnız okunur.

## Komutlar

```bash
node quality/remote-read.js <yol>                 # dosya aile projelerinde var / yok / okunamadı
node quality/measure-projects.js <projeler-klasoru>   # tarayıcının aile sayıları
node quality/compliance-issues.js <klasor>        # uyum issue planı (kuru)
node quality/memory-inventory.js --son 7          # projeler arası bellek notları
node quality/open-requests.js                     # açık talepler ve yanıtsız süreleri
node quality/pending-measurements.js --liste      # bekleyen ölçümler
node quality/file-overlap.js                      # iki oturum aynı dosyaya yazdı mı
```

## Kalite kapısı

Bu departman kod yazmaz. Raporda her sayının yanında onu üreten komut ya da kaynak yazılır. `pending-measurements.json` değişirse `node quality/pending-measurements.js --liste` geçmelidir.

## Yayın

Ayrı bir yayın yoktur. Haftalık akışlar GitHub'da kendiliğinden çalışır; bellek derleme bu bilgisayarda zamanlanmış görevle çalışır.
