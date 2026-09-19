# Teknik Borç Kütüğü

Fark edilen ama şimdi çözülmeyen sorunlar. **Açık borçlar için tek kaynak burasıdır.**
Kapanan kayıtlar: `docs/teknik-borc-arsiv.md`

> **Teknik borç nedir?** Bir işi hızlı bitirmek için kestirme yol kullanmak, sonradan
> ödenecek bir borç almak gibidir. Borç ödenmedikçe faizi (bakım zorluğu, hata riski) büyür.

> **Standart:** `~/.claude/standartlar/teknik-borc-standardi.md` (tek kaynak: SNN-Standartlar)

## Sözlük
| Terim | Türkçe karşılığı |
|---|---|
| Kütük | Bu dosya: açık teknik borçların tek listesi |

---


### TB-002 — Eş zamanlı oturumlarda dosya sahipliği ölçülmüyor
- **Tespit Tarihi:** 2026-09-18 (eş zamanlı çalışma standardı kurulurken)
- **Öncelik:** P3 (Fırsatta)
- **Issue:** #24

#### 🟢 Sade Anlatım
- **Sorun ne?** Artık makine "bu projede başka bir oturum açık" diyor ve tehlikeli toplu komutları engelliyor. Ama "şu dosya üzerinde şu an kim çalışıyor" bilgisini tutmuyor. İki oturum aynı dosyayı aynı anda düzenlerse, ikincisi birincinin yazdığını görmeden üstüne yazabilir.
- **Benzetme:** Kapıda görevli var, tehlikeli aletleri alıyor. Ama odaların kapısında "içeride çalışan var" tabelası yok; iki usta aynı odaya girebiliyor.
- **Çözülmezse ne olur?** Büyük ihtimalle bir şey olmaz: ajanlar farklı konularda çalışıyor ve her biri kendi dalında. Aynı dosyada buluşurlarsa git zaten çakışma verir. Risk, commit'lenmemiş halde üst üste yazmaktır.
- **Senden beklenen karar:** Yok. Gerçek bir çakışma yaşanırsa bu kayıt P2'ye çıkar ve dosya işaretleme eklenir.

#### 🔧 Teknik Detay
- **Açıklama:** `quality/session-registry.js` oturum düzeyinde çalışıyor (kim, hangi dal, ne zaman). Dosya düzeyi yok. Ölçüm yapılmadı: bugüne kadar **bir** gerçek olay yaşandı (`git add -A`), o da artık `quality/wide-effect-git.js` ile engelleniyor.
- **Etki:** Yalnız aynı depoda aynı anda çalışan oturumlar; ayrı worktree kullanıldığında konu kapanır.
- **Çözüm yönü:** Ölçümle başla: kaç kez "aynı proje, aynı anda, **aynı dal**" görüldü? Sık ise `guard-files` bekçisine dosya iddiası (claim) eklenir: oturum yazdığı dosyayı deftere işler, ikinci oturumun aynı dosyaya Write/Edit çağrısı engellenir. Seyrek ise standardın 2. maddesi (ayrı dal / ayrı worktree) yeterlidir.
- **2026-09-19 · ÖLÇÜM ARTIK GERÇEKTEN TOPLANIYOR.** Bu kayıt *"bir hafta defter verisi beklensin"* diyordu. Proje sahibi *"TB-002 neyi bekliyor?"* diye sorunca ölçüldü: defter **yalnız şu anki** oturumları tutuyordu (`session-registry.js`, 2 saatten eski kayıt siliniyor). Yani beklenen veri **hiçbir zaman gelmeyecekti** — bir hafta da beklense elde bir şey olmayacaktı. Bu, *"bakacağım"*ın kontrol sanılmasıyla aynı sınıftan bir kusurdur.
  - `session-registry.announce` artık her buluşmayı `~/.claude/oturumlar/_cakisma-gunlugu.jsonl` dosyasına yazıyor. Günlük **dar**: tarih, proje, kendi dalı, diğer dallar, aynı-dal bayrağı. Dosya adı, komut ya da içerik yazılmaz; dosya 512 KB'ı aşarsa yazma durur.
  - `node quality/meeting-report.js --gun 7` soruyu cevaplar ve iki yolu da gösterir: aynı dalda buluşma varsa P2'ye çıkarma, yoksa kaydı kapatma.
  - Sayı görülmeden karar verilmez — ama artık sayı **birikiyor**.
- **Neden Şimdi Çözülmüyor:** Proje sahibi kararı (2026-09-18): ölçmeden kural konmaz. Kilit yanlış güven verir; önce gerçek çakışma görülsün.
- **Bağlı kalemler:** Yok.

---
