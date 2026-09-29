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
- **Tespit Tarihi:** 2026-09-29 (OLC-001 ölçümü vadesinde kapatılırken)
- **Öncelik:** P2 (Planlı)

#### 🟢 Sade Anlatım
- **Sorun ne?** Aynı projede iki oturum aynı anda ve aynı dalda çalışıyor. Hangisinin hangi dosyayı düzenlediği hiçbir yerde işaretli değil; ikinci oturum birincinin commit'lenmemiş işini görmeden üstüne yazabilir.
- **Benzetme:** İki usta aynı odada çalışıyor ama duvara "bu duvarı ben boyuyorum" yazan yok. İkisi aynı duvara fırça atabilir.
- **Çözülmezse ne olur?** Commit'lenmemiş iş sessizce kaybolabilir. Git bunu yakalamaz, çünkü çakışma commit'ten ÖNCE, aynı çalışma klasöründe olur.
- **Senden beklenen karar:** Yok. Ölçüm kararı verdi (aşağıda); iş planlı sırada yapılır.

#### 🔧 Teknik Detay
- **Açıklama:** OLC-001 sorusu "aynı projede aynı anda, aynı dalda kaç kez çalışıldı?" idi (TB-002'den doğdu, arşivde). Yerel ölçüm 2026-09-29, `node quality/meeting-report.js --gun 7`: **115 buluşma, 98'i aynı dalda** — GHS-Panel 58/49, İhale 19/13, Portföy 14/14, SNN-Standartlar 7/7, Piyasa-Core 6/4, Gunum-Var 5/5. Karar kuralı: aynı dalda buluşma varsa `guard-files` bekçisine dosya iddiası eklenir.
- **Etki:** Eş zamanlı oturum açılan tüm aile projeleri; en çok GHS-Panel.
- **Çözüm yönü:** (1) Oturum Write/Edit yaptığı dosyayı deftere işler (`~/.claude/oturumlar`, `session-registry.js` yanında). (2) Aynı dosyaya başka canlı oturumun Write/Edit çağrısı engellenir, sahibi ve dalı söylenir. (3) Önce kuru kipte gerçek veride ölç: kaç çağrı engellenirdi, kaçı yanlış alarm olurdu (aynı oturumun kendi dosyası, süresi dolmuş iddia). Bekçi kodu değişikliği olduğu için `setup-machine` ile kurulur.
- **Ölçüm kusuru (aynı kayıtta):** `pending-measurements` akışı OLC-001'i CI'da çalıştırdığında "buluşma yok" diyordu. Veri (`~/.claude/oturumlar`) yalnız bu makinede var; CI'da klasör yok ve bu "yok" olarak okunuyordu — okunamadı ≠ yok (`standartlar/olcum-standardi.md` Kural 3). Dosya iddiası yazılırken `meeting-report.js` klasör yoksa "okunamadı" demeli.
- **Neden Şimdi Çözülmüyor:** Ölçüm bugün kapandı; o sırada Actions kota önlemleri (PR #111 ve ardılı) sürüyordu. Dosya iddiası bekçi değişikliği ve yanlış alarm ölçümü ister; aceleyle kurulan kilit yanlış güven verir.
- **Bağlı kalemler:** TB-002 (arşiv).
