# Değerlendirilen kalemler — ölçüm ve SWOT

Aile çapında kurulması **düşünülen** ama henüz karar verilmemiş beş kalem. Her biri için
2026-09-15'te 9 projede yalnız-okuma ölçümü yapıldı; sayılar o günün sayılarıdır.

> **Bu belge neden var:** ölçümler daha önce yalnız bir bilgisayardaki tarihli bir devir notunda
> duruyordu (TB-006). Not, kişisel ve üçüncü taraf bilgisi taşıdığı ve eskimiş yollar içerdiği
> için yayımlanmadı; karar değeri taşıyan kısmı buraya taşındı. Ayrıntıdaki bazı sayılar
> (üçüncü taraf hesabın deposuna ait kod kalitesi ölçümleri) bilerek **toplulaştırıldı**.

> **Kural:** buradaki hiçbir kalem kurulmuş değildir. Kurulacaksa
> `standartlar/olcum-standardi.md` geçerlidir: kapı, bilinen bir hatayla sınanmadan kurulmaz.

---

## Toplu tablo

| Kalem | Sorun gerçek mi | Fayda | Maliyet / sürtünme | Önerilen sıra |
|---|---|---|---|---|
| Haftalık sağlık raporu | Evet (bilgi dağınık) | Yüksek | Düşük | **1** |
| Büyük dosya bekçisi | Evet, 3 projede | Orta | Düşük | 2 |
| Sürüm günlüğü kapısı | Kısmen (2 projede) | Orta (çekirdekte yüksek) | Düşük (uyarı olarak) | 3 |
| Uyarı sıkılaştırma | Evet, 3 projede büyük | Yüksek | **Yüksek** | 4 (tek projede deneme) |
| Karar kayıtları (ADR) | Kısmen (dağınık alışkanlık) | Orta | Düşük ama otomasyonu zor | 5 (standart, bekçi değil) |

**Ölçümü yapan oturumun görüşü:** o gün çok şey kuruldu; sıradaki adım yeni kural değil
**görünürlük** olmalı. Haftalık rapor, kurulan sistemin işe yarayıp yaramadığını da gösterir;
diğerlerine raporun gösterdiği ihtiyaca göre karar verilebilir.

---

## 1. Haftalık sağlık raporu

**Ölçüm:** veri var ama dağınık — oturum açılışı (yalnız o proje + diğerlerinde P1), board'lar
(proje başına), `borclar` becerisi (istenince). Tek yerde görünmeyenler: güvenlik uyarıları,
bekleyen PR'lar, eskiyen dallar, anahtar bitiş tarihleri, çekirdek sürüm farkları.

- **Güçlü:** "ne durumdayız?" konuşmasının otomatik hâli; zamanlanmış görevle kurulur, yeni kod
  neredeyse yok.
- **Zayıf:** bilgi verir, düzeltmez; okunmazsa işe yaramaz; uygulama kapalıysa o hafta çalışmaz.
- **Fırsat:** tarihli ve unutulabilir işleri görünür kılar; "hangi projede ne yapacağım"
  sorusuna en doğrudan cevap.
- **Tehdit:** uzun rapor okunmaz → kısa ve önceliklendirilmiş olmalı ("bu hafta 3 şey").

**Değerlendirme:** maliyeti en düşük, asıl soruna en yakın olan kalem.

## 2. Büyük dosya bekçisi

**Ölçüm:** 9 projenin 3'ünde gerçek sorun; kalan 6'sında 1 MB üstü dosya yok.

| Proje | Bulgu |
|---|---|
| SNN-Portfoy-Yonetimi | 35 MB CSV + 3×~3 MB CSV; `.git` paketi 31 MB |
| Gunum-Var | 6,3 MB günlük dosyası, 1,9 MB APK, ekran görüntüleri; 1 MB üstü 13 dosya; `.git` paketi **69 MB** |
| Naturapan-Web-Sitesi | 6,9 MB video, ~3 MB fotoğraf, 2,3 MB belge |

- **Güçlü:** basit, yanlış alarmı düşük; anahtar taramasının "yalnız eklenen dosyalar" altyapısı
  hazır.
- **Zayıf:** var olan dosyaları küçültmez; geçmiş temizliği zorla push ister (yasak).
- **Fırsat:** yanlışlıkla eklenen günlük/APK/yedek/zip engellenir.
- **Tehdit:** gerçekten gerekli görseller engellenebilir → istisna listesi şart.

## 3. Sürüm / değişiklik günlüğü kapısı

**Ölçüm (120 gün):** çoğu proje disiplinli. Sürüm artışı ile günlük kaydının aynı commit'te
gelmesi: Portföy 97/111 · çekirdek 16/17 · Yönetici Özeti 3/3 · İhale 1/1 · Nakit-Akış 2/2 ·
trade-kasa 6/7.

**Açık olan iki yer:** Gunum-Var'ın güncel sürümü günlükte **yok** (son güncelleme 2026-08-22);
Naturapan'da `CHANGELOG` **hiç yok**. Bir projede de sürüm günlükte var ama **ayrı commit'te**
geliyor — yani "aynı commit" kuralı onu haksız engellerdi.

- **Değerlendirme:** doğru kural "aynı commit'te mi" değil, **"güncel sürüm günlükte var mı"**.
  Kapı yerine oturum açılışı uyarısı çoğu proje için yeterli; çekirdek deposunda kapı değerli,
  çünkü sürüm yayılımı günlüğü okuyor.

## 4. Uyarıların kademeli sıkılaştırılması

**Ölçüm — dikkat, bu sayı ÖLÇÜLMEDİ sayılır:** `any` geçen satırlar **metin aramasıyla** sayıldı;
gerçek ESLint uyarı sayısı çalıştırılarak ölçülmedi. Üç projede binlerce satırlık birikim var,
altı projede yok denecek kadar az. Bir projede **125 adet `eslint-disable`** bulundu.

- **Güçlü:** "yeni satırda sıfır, eski kod kütükte" — temizi temiz tutar, kirlide büyümeyi durdurur.
- **Zayıf:** 3 projede uzun iş.
- **Fırsat:** `any` hesap hatalarını gizler; finans projelerinde sessiz para hatası riskini azaltır.
- **Tehdit:** yanlış kurulursa sürekli kırmızı → kuralı kapatmaya kaçış. 125 `eslint-disable`
  bunun **zaten yaşandığını** gösteriyor.

**İlk iş:** gerçek uyarı sayılarını ESLint çalıştırarak ölç. Sonra **tek projede**, yalnız PR'da
eklenen satırlara "yeni `any` ve yeni `eslint-disable` yok" denemesi.

## 5. Karar kayıtları (ADR)

**Ölçüm:** alışkanlık var ama dağınık. İki proje `docs/adr`, iki proje `docs/decisions`
kullanıyor; sayılar 2 ile 30 arasında değişiyor, bazılarının son kaydı aylar önce. Çekirdek
deposu kendi `GERI-BILDIRIM-KAYDI.md` desenini kullanıyor. İki projede hiç yok.

- **Güçlü:** "neden böyle yaptık" kaybolmaz. Her yeni oturum sıfırdan başladığı için yapay zekâyla
  çalışmada özellikle değerli.
- **Zayıf:** otomatik denetlenmesi zor — "önemli karar mıydı?" sorusunu bekçi cevaplayamaz.
- **Fırsat:** kütük ↔ karar bağı ("şu karar yüzünden ertelendi").
- **Tehdit:** zorunlu olursa içi boş şablon birikir; klasör adları standartlaşmazsa karışır.

**Değerlendirme:** bu bir bekçi işi değil, **standart** işi: tek klasör adı, tek şablon, rehbere
tek satır. Aile içinde bu desenin çalışan örneği `GERI-BILDIRIM-KAYDI.md`'dir.
