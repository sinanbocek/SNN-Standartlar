# Teknik Borç Kütüğü

Fark edilen ama şimdi çözülmeyen sorunlar. **Açık borçlar için tek kaynak burasıdır.**
Kapanan kayıtlar: `docs/teknik-borc-arsiv.md`

> **Teknik borç nedir?** Bir işi hızlı bitirmek için kestirme yol kullanmak, sonradan
> ödenecek bir borç almak gibidir. Borç ödenmedikçe faizi (bakım zorluğu, hata riski) büyür.

> **Standart:** `~/.claude/standartlar-canli/standartlar/teknik-borc-standardi.md` (tek kaynak: SNN-Standartlar)

## Sözlük
| Terim | Türkçe karşılığı |
|---|---|
| Kütük | Bu dosya: açık teknik borçların tek listesi |

---

### TB-008 — Aynı dalda eş zamanlı oturumlar dosya işaretlemeden çalışıyor
- **Tespit Tarihi:** 2026-09-29 (OLC-001 ölçümü vadesinde kapatılırken) · **Yeniden ölçüm:** 2026-10-09
- **Öncelik:** P3 (Fırsatta)

#### 🟢 Sade Anlatım
- **Sorun ne?** Aynı projede iki oturum aynı anda ve aynı dalda çalışıyor. Hangisinin hangi dosyayı düzenlediği hiçbir yerde işaretli değil; ikinci oturum birincinin commit'lenmemiş işini görmeden üstüne yazabilir.
- **Benzetme:** İki usta aynı odada çalışıyor ama duvara "bu duvarı ben boyuyorum" yazan yok.
- **Ne ölçüldü (2026-10-09)?** Altı haftalık gerçek kayıtta iki ustanın aynı duvara fırça attığı **2** an bulundu. Kilit kurulsaydı 109 kez "dur" diyecekti; 104'ü yanlış olurdu (aynı ustanın yeniden açılmış defteri "ikinci usta" sanılıyor).
- **Çözülmezse ne olur?** Altı haftada iki kez aynı belgeye iki oturum yazdı; kayıp olup olmadığı ölçülmedi. Risk var ama seyrek.
- **Senden beklenen karar:** Yok. Ölçüm kararı verdi: kilit şimdi kurulmaz; ölçüm aracı kaldı, risk büyürse yeniden ölçülür.

#### 🔧 Teknik Detay
- **İlk gerekçe (2026-09-29):** `meeting-report.js --gun 7`: 115 buluşma, 98'i aynı dalda. Karar kuralı "aynı dalda buluşma varsa dosya iddiası eklenir" idi.
- **Yeniden ölçüm (2026-10-09, bu makine, oturum kayıtları 2026-09-01'den; yalnız yol ve zaman):** `node quality/file-overlap.js` — 6.457 yazma çağrısı, 79 oturum. 2 saatlik dosya iddiası **109** çağrıyı engellerdi: **103 kopya** (masaüstü çatal/yeniden açma; iki kayıt dosyası 540 ve 2.603 ortak mesaj kimliği taşıyor — tek usta), **2 sıralı** (önceki oturum bitmişti), **2 farklı dal**, **2 gerçek** (GHS-Panel 2026-09-25, aynı karar belgesine 21 ve 35 dk arayla; iş kaybı ölçülmedi).
- **İlk gerekçenin kusuru:** oturum defteri çatalları ayrı oturum sayıyor (2026-09-23 Portföy: 7 saniyede 5 kayıt). Son 7 günde 26 buluşmanın 7'si bir dakika içinde tekrar. "Aynı dalda buluşma" dosyaya birlikte dokunmayı ölçmüyor.
- **Yapılan (2026-10-09):** (1) `meeting-report.js` klasör yoksa "okunamadı" der (eski sürüm CI'da "buluşma yok" diyordu; olcum-standardi.md Kural 3). (2) Aynı projede 60 sn içinde gelen kayıtlar tek buluşma sayılır; ham sayı raporda kalır. (3) `quality/file-overlap.js` eklendi: kilit kararını veren asıl ölçüm.
- **Yapılmayan ve neden:** Dosya iddiası bekçisi kurulmadı. 2 gerçek vakaya 104 yanlış alarm; yanlış kapı kapısızlıktan tehlikelidir (olcum-standardi.md Kural 2). Kurulacaksa önce çatal tespiti (ortak mesaj kimliği) bekçiye taşınmalı.
- **Yeniden açma koşulu:** `file-overlap.js` gerçek vaka sayısı bir ayda 5'i geçerse ya da bir vakada iş kaybı doğrulanırsa P2'ye çıkar.
- **Bağlı kalemler:** TB-002 (arşiv), OLC-001 (arşiv).