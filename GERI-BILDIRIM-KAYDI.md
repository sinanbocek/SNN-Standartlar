# Geri Bildirim Kaydı

> **TALEP GÖNDERMEDEN ÖNCE BU DOSYAYA BAKIN.**
>
> Buradaki her satır, bir tüketici projeden gelmiş bir talebin ve o talebe verilmiş kararın
> kaydıdır. Aradığınız şey **REDDEDİLDİ** olarak burada duruyorsa gerekçesini okuyun: aynı
> talebi yeniden göndermeniz gerekmez. Gerekçeyi değiştiren **yeni bir olgu** varsa (ikinci bir
> proje, ikinci bir ekran, değişmiş bir kısıt) o olguyu göstererek yeniden başvurabilirsiniz.

Bu dosya kararların **tek kaydıdır**. `standartlar/` altındaki belgeler kuralın **ne** olduğunu
anlatır; bu dosya **neden ve kimin isteğiyle** öyle olduğunu anlatır.

- **Kuralın ne olduğunu** öğrenmek için: `standartlar/`
- **Bir şeyin neden alınmadığını** öğrenmek için: **bu dosya**

---

## Talep nasıl gönderilir

Tüketici projedeki ajan `standart-talep` becerisini kullanır: taslağı hazırlar, size gösterir,
**onayınızla** `sinanbocek/SNN-Standartlar` deposunda issue açar.

Değerlendirilebilen taleplerin dört ortak özelliği var:

1. **Gerçek olay** — hangi dosya, hangi satır, ne oldu. Varsayımsal genellik yetmez.
2. **Ölçülmüş çıktı** — iddia değil, çalıştırılmış komutun çıktısı.
3. **Denenmiş alternatif** — neden projede çözülemiyor?
4. **Kaç projeyi etkiliyor** — ölçülmediyse "ölçmedim" yazılır, tahmin yazılmaz.

Bunlar `standartlar/olcum-standardi.md`'nin talep tarafındaki karşılığıdır: **ölçmediğini iddia etme.**

---

## Kararlar

### 2026-09-19 · Kaçışlı bölü yanlış alarmı — **KABUL**

- **Kimden:** GHS-Panel oturumu
- **Tür:** yanlış-alarm
- **Talep:** `src/infrastructure/documentReader/bankReceipt/profiles.ts` için `İŞLEM`, `TUTARI`,
  `Açıklama` uyarısı geliyor. Bunlar Türkçe banka belgesini eşleştiren düzenli ifade metinleri,
  tanımlayıcı değil. Dosyadaki gerçek tanımlayıcıların hepsi İngilizce (`pick`, `amountOf`,
  `partyOf`, `vakifbank`, `PROFILES`).
- **Karar:** **Kabul.** Bildirim doğrulandı, yeniden üretildi, kök neden bulundu.
- **Kök neden:** Tarayıcı düzenli ifade gövdesini soyarken **kaçışlı bölüyü** (`\/`) kapanış
  sanıyordu. Gövde `(?:[^/\n]|\.)+` yazılmıştı; niyet "ters bölü + herhangi karakter" idi ama
  `\.` düz **nokta** demek. Bu yüzden `\/` görünce gövde erken kapanıyor, kalanı kod sayılıyordu.
  Aynı dosyada ikinci bir kusur da çıktı: açılış bağlamı listesinde `>` yoktu, bu yüzden
  `(part) => /[a-zçğıöşü]/i` hiç soyulmuyordu.
- **Ölçüm:** 11 projede 15.347 → 15.318 (−29). Düşen 29 bulgunun **hepsi tek tek okundu**;
  hepsi kaçışlı bölü içeren düzenli ifade gövdesiydi. Gerçek ad gizlenmedi.
- **Sonuç:** 5 gerileme testi eklendi (bildirilen gerçek satır dahil) + *"düzenli ifadeden
  sonraki ad yine taranır"* koruma testi. Düzeltme birleşti ve tüketiciye kendiliğinden ulaştı.
- **Tüketici doğru yaptı:** susturmadı, bildirdi; örnek verdi; dosyadaki gerçek adların kurala
  uygun olduğunu da gösterdi. Bu üçü olmasaydı yeniden üretmek çok daha pahalı olurdu.

### 2026-09-18 · Kelime listesinde eksik kökler — **KABUL**

- **Kimden:** trade-kasa oturumu
- **Tür:** eksik-kok
- **Talep:** `kasa`, `kur`, `yuzde`, `hedef`, `getiri`, `risksiz`, `pozisyon`, `bakiye` kökleri
  listede yok; Türkçe harf de taşımadıkları için tarayıcıdan sessizce geçiyorlar.
  `Settings` alanları (`bistKasaTL`, `usdTryKuru`, `maxRiskYuzdesi`) hiç görünmüyor — üstelik
  bu alanlar kullanıcının dışa aktardığı JSON yedeğinde, yani **dışa açık yüzeyde**.
- **Karar:** **Kabul ve genişletildi.** 8 kök bildirimden geldi; 13 kök daha 8 projede yapılan
  tarama ile bulundu. Her kök için en az bir gerçek örnek satır doğrulandı.
- **Sonuç:** Liste 143 → 164 kök. `docs/kod-dili-gecis.md` tablosu yenilendi.

### 2026-09-18 · `.snn-kod-dili.json` ile yanlış alarmı susturmak — **REDDEDİLDİ**

- **Kimden:** trade-kasa oturumu (soru olarak)
- **Karar:** **Yanlış alarm `paths` ile susturulmaz.** İki zarar üretir:
  (1) doğru olan bir şeye muafiyet yazmak kaydı kirletir,
  (2) dosyayı toptan muaf tutmak, yarın aynı dosyaya girecek **gerçek** bir Türkçe adı da kör eder.
- **Doğrusu:** durumu SNN-Standartlar'a bildirmek. Tarayıcı düzeltilir ve düzeltme **tüm
  projelere aynı anda** ulaşır. 2026-09-19'daki GHS bildirimi bu yolun işlediğini gösterdi.
- **Yeniden başvuru koşulu:** `paths` yalnız **gerçekten istisna olan gerçek adlar** içindir
  (canlıya uygulanmış migration, dış kaynağın alan adı gibi).

### 2026-09-19 · Aile geneli istisna: `kasa`, `kurus`, `beyanname`, `mizan` — **KABUL**

- **Kimden:** Proje sahibi (16.023 bulgu / 136 kök üzerinde yapılan teşhis sonrası)
- **Karar:** Dört kök **aile geneli istisna**. Ölçüt: bir kök ancak İngilizce karşılığı *yoksa*
  ya da karşılığı *yanlış şeyi* anlatıyorsa istisna olur. "Alışık olduğumuz" ya da "daha kısa"
  ölçüt değildir.
- **Reddedilen küme (hacmin %87'si):** İngilizce karşılığı net muhasebe terimleri
  (`bilanco` → `balanceSheet`, `aktif/pasif` → `assets/liabilities`, `ceyrek` → `quarter`) ve
  genel programlama kelimeleri (`satir`, `dosya`, `hata`, `sonuc`, `tablo`, `grup`).
- **Gerekçe:** istisna verilirse kod kalıcı olarak iki dilli kalır ve her yeni ajan hangi
  katmanda hangi dilin geçerli olduğunu ezberlemek zorunda kalır.
