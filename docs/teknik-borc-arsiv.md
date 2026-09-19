# Teknik Borç Kütüğü — Arşiv (kapanan kalemler)

> Kapanan kayıtlar silinmez; ders ve uyarı taşır. Biçim: standarttaki "Kapanış" bölümü.

---

## Kapanan Kalemler

### TB-003 — Uyum eksikleri yalnız oturum açılınca görünüyor
- **Tespit Tarihi:** 2026-09-19
- **Kapanış:** 2026-09-19 — TB-003 çözüldü.
- **Öncelik (kapanışta):** P2 (Planlı)

#### 🟢 Sade Anlatım
- **Neydi?** Her proje kendi eksiğini yalnız oturum açılışında görüyordu. O satır oturum kapanınca kayboluyor, "yapıldı mı?" kaydı tutulmuyor ve proje sahibi 11 projenin durumunu tek yerde göremiyordu.
- **Ne yapıldı?** Eksikler artık her projenin **kendi issue listesine** de düşüyor. Panodan hepsi birden görünüyor, yapılana kadar duruyor, giderilince kendiliğinden kapanıyor.
- **Sonuç:** 11 depoda **27 issue** açıldı; ölçümle birebir eşleşti.

#### 🔧 Teknik Detay
- **Çözüm:** `quality/compliance-issues.js` (saf plan + ayrı IO, `debt-sync/lib/sync-plan.js` deseni) + `.github/workflows/uyum-issue.yml` (Pazartesi 08:23 TSİ; elle çalıştırmada varsayılan kuru).
- **Kimlik başlığa gömülü:** `[UYUM:<ölçüt>]` + `aile-uyum` etiketi. Kütüğün `[TB-xxx]` issue'larına karışmaz.
- **Elle kapatmak eksiği gidermez:** ölçüm hâlâ görüyorsa issue yeniden açılır. Kapanış yalnızca ölçümden gelir.
- **Kademeli uygulandı:** önce tek projede (SNN-İhale, 1 eksik) denendi, issue gövdesi okundu, **tekrar çalıştırılıp çift açmadığı doğrulandı** (0 işlem), sonra kalan 10 projeye uygulandı.
- **Kapı defterine kayıtlı:** `quality/data/gates.json` → `uyum-issue`.

#### 📌 Kapanışta öğrenilenler
- **Göndermeden önce iki hata yakalandı.** (1) Zamanlanmış koşuda `inputs.uygula` tanımsız olduğu için haftalık rutin **sonsuza kadar kuru çalışacaktı** — kapı kurulup çalışmamış olacaktı. (2) `--filter=blob:none` kısmi klon ölçeri yavaşlatıp kırılganlaştıracaktı.
- **Gerekçe ölçümle düzeltildi.** İlk gerekçe "aylarca açılmayan proje eksiğini görmez" idi; ölçüldü ve zayıf çıktı (en eski projenin ana dalı 3 gün önce hareket etmişti). Gerçek gerekçe **görünürlük ve kalıcılık** olarak yazıldı.
- **Kademeli uygulama karşılığını verdi:** tek projede idempotentlik doğrulanmadan 27 issue açılsaydı, bir hata 27 kez temizlik demekti.

---

