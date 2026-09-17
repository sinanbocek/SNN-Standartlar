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

### TB-001 — Ortak deponun kendi kodu Türkçe adlandırılmış
- **Tespit Tarihi:** 2026-09-17 (kod dili standardı ve tarayıcısı yazılırken)
- **Öncelik:** P3 (Fırsatta)

#### 🟢 Sade Anlatım
- **Sorun ne?** Yeni yazdığımız kural "kodda adlar İngilizce olsun" diyor, ama bu deponun kendi betikleri Türkçe adlarla yazılmış (`taraDiff`, `bulgular`, `kelimeKumesi` gibi). Kuralı koyan, kurala uymuyor.
- **Benzetme:** Apartman girişine "ayakkabılar kapıda çıkarılır" yazısını asan kapıcının kendi ayakkabıyla dolaşması. Kural geçerli ama inandırıcılığı zayıflıyor.
- **Çözülmezse ne olur?** Somut bir arıza çıkmaz; bu kod yalnız bizim bekçilerimizdir, kimse tüketmez. Ama yeni gelen kişi "demek ki esnetilebilir" diye okur ve kural aşınır.
- **Senden beklenen karar:** İki yoldan biri. (a) Bu deponun betikleri zamanla İngilizce adlara taşınır. (b) Ortak depo bilinçli istisna sayılır ve gerekçesi standarda yazılır. Karar verilene kadar kayıt açık kalır.

#### 🔧 Teknik Detay
- **Açıklama:** `node kalite/kod-dili-tarama.js --tumu .` çıktısı: 64 bulgu, 33 ayrı ad (2026-09-17 ölçümü). Aynı tarama SNN-Abacus-Core'da 122 bulgu / 27 ayrı ad veriyor — kuralın kaynağı olan depo da tam uyumlu değil (`yeniKayit`, `gecerliHane`, `satirlar`).
- **Etki:** Yalnız geliştirme araçları; çalışan üründe etkisi yok. PR kapısı yalnız eklenen satırları taradığı için günlük iş kırmızıya dönmez.
- **Çözüm yönü:** Karar (a) ise: dosya adları ve dışa açık fonksiyon adları önce, iç değişkenler sonra; her adım ayrı PR, testler yeşil kalmalı. Karar (b) ise: `standartlar/kod-dili-standardi.md` içine gerekçeli istisna bölümü ve `.snn-kod-dili.json`.
- **Neden Şimdi Çözülmüyor:** Kuralın kendisi ve makine kapısı öncelikliydi; adlandırma göçü ayrı ve mekanik bir iştir. Ayrıca kararı proje sahibi verecek.
- **Bağlı kalemler:** Yok.

---
