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
- **Öncelik:** P2 (Planlı)

#### 🟢 Sade Anlatım
- **Sorun ne?** Yeni yazdığımız kural "kodda adlar İngilizce olsun" diyor, ama bu deponun kendi betikleri Türkçe adlarla yazılmış (`taraDiff`, `bulgular`, `kelimeKumesi` gibi). Kuralı koyan, kurala uymuyor.
- **Benzetme:** Apartman girişine "ayakkabılar kapıda çıkarılır" yazısını asan kapıcının kendi ayakkabıyla dolaşması. Kural geçerli ama inandırıcılığı zayıflıyor.
- **Çözülmezse ne olur?** Somut bir arıza çıkmaz; bu kod yalnız bizim bekçilerimizdir, kimse tüketmez. Ama yeni gelen kişi "demek ki esnetilebilir" diye okur ve kural aşınır.
- **Senden beklenen karar:** Verildi (2026-09-18): **betikler İngilizce adlara taşınacak.** İstisna yolu kapandı; kural koyan depo da kurala uyacak.

#### 🔧 Teknik Detay
- **Açıklama:** `node quality/code-language-scan.js --tumu .` çıktısı: 64 bulgu, 33 ayrı ad (2026-09-17 ölçümü). Aynı tarama SNN-Abacus-Core'da 122 bulgu / 27 ayrı ad veriyor — kuralın kaynağı olan depo da tam uyumlu değil (`yeniKayit`, `gecerliHane`, `satirlar`).
- **Etki:** Yalnız geliştirme araçları; çalışan üründe etkisi yok. PR kapısı yalnız eklenen satırları taradığı için günlük iş kırmızıya dönmez.
- **Çözüm yönü:** Proje sahibi kararı: İngilizceye taşınır. Sıra: (1) dışa açık modül işleri (`module.exports` ile verilen adlar) ve dosya adları, (2) iç değişkenler, (3) test adları. Her adım ayrı PR; her PR'da tüm test takımı yeşil kalmalı ve bekçilerin (`~/.claude/hooks`) çağırdığı adlar aynı commit'te güncellenmeli — canlı kopya bu depodan okuduğu için bir ad yarım kalırsa oturum açılışı tüm projelerde durur (2026-09-15'te bir kez yaşandı). Dosya adı değişiklikleri `git mv` ile yapılır; `ornek/*.yml` içindeki yollar aynı PR'da düzeltilir.
- **İlerleme (2026-09-18):**
  - **1. aşama tamam** — klasör ve dosya adları İngilizce (`borc-senkron→debt-sync`, `kalite→quality`, `cekirdek→core`, `kurulum→setup` ve içlerindeki 24 dosya). Bekçiler için kurulan eski→yeni ad köprüsü, canlı kopya geçtikten ve `~/.claude/hooks` çağrıları güncellendikten sonra **kaldırıldı**.
  - **2. aşama tamam** — iç değişken, sabit ve JSON alan adları İngilizce (`bulgular→findings`, `istisna→exception`, `satirlar→lines`; `.snn-kod-dili.json` alanları artık `exceptions / name / reason / paths / path`).
  - **Ölçüm: 166 → 0 bulgu.** Tarayıcı bu depoda temiz rapor veriyor (27 dosya tarandı).
  - Yan kazanç: göç sırasında tarayıcıda iç içe şablon dizgesi kusuru bulundu ve düzeltildi (`stripTemplates`); kendi kodumuzu tararken çıktı.
- **Kalan:** Yalnız dışa açık akış dosyası adları (`.github/workflows/*.yml`) — 10 projenin kopyaladığı arayüz; kırıcı sürüm planıyla ayrıca ele alınacak. Ayrıca bu depoya kendi `kod-dili.yml` turnikesi takılacak (artık temiz olduğu için güvenli).
- **Neden Şimdi Çözülmüyor:** Kuralın kendisi ve makine kapısı öncelikliydi; adlandırma göçü mekanik bir iştir, aşamalara bölünüp ayrı PR'larla yapılır.
- **Bağlı kalemler:** Yok.

---
