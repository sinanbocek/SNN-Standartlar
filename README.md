# snn-standartlar

SNN projelerinin ortak çalışma standartları ve **teknik borç kütüphanecisi**.

> **Kütüphane benzetmesi:** Her projedeki `docs/teknik-borc.md` asıl kitaptır (bilgisayarda ve GitHub'da).
> GitHub issue'ları ve board, telefondan bakılan **katalog panosudur**. Bu depodaki görevli,
> kitap her değiştiğinde panoyu kendiliğinden günceller — bilgisayar kapalı olsa bile.

## İçerik

| Klasör | Ne işe yarar |
|---|---|
| `standartlar/teknik-borc-standardi.md` | Borç kaydının biçimi (Sade Anlatım + Teknik Detay, P1/P2/P3, hassas kayıt) |
| `borc-senkron/` | Kütüğü okuyup issue ve board'u güncelleyen betik + testleri |
| `.github/workflows/borc-senkron.yml` | GitHub'da çalışan ortak görevli (projeler bunu çağırır) |
| `ornek/teknik-borc.yml` | Her projeye kopyalanacak tek bağlantı dosyası |

## Kurallar (değişmez)

1. **Kütük tek kaynaktır.** Kayıt yalnızca kütükte açılır, değişir, kapanır (arşive taşınır).
2. GitHub'da elle kapatılan issue kütükte hâlâ açıksa görevli onu **yeniden açar** ve nedenini yorum olarak yazar.
3. Görevli kütüğe **hiçbir şey yazmaz**; issue'yu başlıktaki `[TB-xxx]` ile tanır.
4. Hassas kayıtlar issue'da yalnızca genel başlıkla görünür; public depoda hiç açılmaz.

## Bir projeyi bağlamak

1. `ornek/teknik-borc.yml` dosyasını projede `.github/workflows/teknik-borc.yml` olarak kopyala.
2. Board kullanılacaksa depoya `PROJECT_TOKEN` gizli değişkenini ekle (proje sahibi ekler).
3. GitHub → Actions → **teknik-borc** → *Run workflow* (kuru çalıştırma) ile dene.

Board adı `<depo adı> · Teknik Borç`, durum sütunları `Açık / Devam / Kapandı` olmalıdır.

## Yerelde çalıştırma

```bash
node borc-senkron/borc-senkron.js <proje-klasörü>            # kuru çalıştırma
node borc-senkron/borc-senkron.js <proje-klasörü> --uygula   # uygula (issue numarasını kütüğe de yazar)
node borc-senkron/test/senkron.test.js                       # testler
```
