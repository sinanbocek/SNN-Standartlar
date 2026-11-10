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

### TB-009 — "Kod yazarken" kuralının etkisi ölçülmedi
- **Tespit Tarihi:** 2026-10-15 (#160, en küçük tam değişiklik standardı yazılırken)
- **Öncelik:** P3 (Fırsatta)

#### 🟢 Sade Anlatım
- **Sorun ne?** Yeni "Kod yazarken" kuralı ölçülmeden yürürlüğe girdi. Kuralın kodu küçültüp küçültmediğini, testi artırıp artırmadığını bilmiyoruz.
- **Benzetme:** Yeni bir diyete başlayıp hiç tartıya çıkmamak gibi; işe yarıyor mu, zarar mı veriyor, görülmez.
- **Çözülmezse ne olur?** Kural işe yaramıyorsa her oturumda boşuna okunur; zarar veriyorsa (eksik iş, atlanan doğrulama) fark edilmez.
- **Senden beklenen karar:** Yok. Sahip 2026-10-15'te ölçümü sonraya bıraktı.

#### 🔧 Teknik Detay
- **Açıklama:** `standartlar/en-kucuk-tam-degisiklik-standardi.md` ev kâğıdına girdi. Tek sayı Ponytail yazarının kendi ölçümü (kod %47, maliyet %74, riskli mantığa test %68 → %98); bağımsız doğrulanmadı.
- **Etki:** Kod yazılan bütün aile projeleri.
- **Çözüm yönü:** Kural yürürlüğe girdikten iki hafta sonra (2026-10-29 civarı) kural öncesi ve sonrası iki haftalık PR'lar karşılaştırılır: eklenen satır, yeni paket sayısı, yeni mantıkla birlikte değişen test dosyası oranı, `KISAYOL` yorumu ve TB bağı. Yöntem `olcum-standardi.md`'ye göre; ölçülemeyen "okunamadı" diye yazılır.
- **Neden Şimdi Çözülmüyor:** Sahip kararı (#160): kural ölçüsüz, istisna olarak kabul edildi. "Sonrası" verisi henüz yok.
- **Ara sayım (2026-10-17, #162):** 16 aile deposunda birleşmiş PR: öncesi (10-01..10-14) 97, 9 projede; sonrası (10-15..10-17) 50, 41'i iki projede (SNN-UI 21, Nakit-Akış 20). Dönem kısa ve proje karışımı farklı; şimdi karşılaştırmak proje farkını ölçer. Karar (sahip): 2026-10-29'da ölçülür, yalnız iki dönemde de PR'ı olan projeler karşılaştırılır. Hatırlatma görevi kuruldu.
- **Bağlı kalemler:** Yok.

---

### TB-010 — `--auto` koruma okuyucusu ruleset okumuyor
- **Tespit Tarihi:** 2026-11-09 (otomatik birleştirme ortak süreç yapılırken)
- **Öncelik:** P3 (Fırsatta)

#### 🟢 Sade Anlatım
- **Sorun ne?** Otomatik birleştirme kapısı, bir deponun "zorunlu denetim" kuralı olup olmadığına bakar. Yalnız eski usul dal korumasını okur; yeni usul kural setini (ruleset) okumaz.
- **Benzetme:** Kapıdaki görevli yalnız eski kilit defterine bakıyor; yeni kilit defteri varsa onu görmez ve "kilit yok" sanar.
- **Çözülmezse ne olur?** Zorunlu denetimi kural setiyle kuran bir depoda kapı `--auto`yu gereksiz reddeder; PR elle birleştirilir. Yanlış birleştirme doğmaz.
- **Senden beklenen karar:** Yok.

#### 🔧 Teknik Detay
- **Açıklama:** `quality/merge-gate.js` `readProtection` yalnız klasik dal korumasını okur; ruleset okunmaz. 2026-11-09'da okunabilen 15 aile deposunda ruleset sayısı 0 idi.
- **Etki:** Şimdilik yok. Sonuç ret yönündedir (kapı `--auto`yu reddeder); yanlış birleştirme doğurmaz.
- **Çözüm yönü:** Bir depoda zorunlu denetim ruleset ile kurulduğunda okuyucu genişletilir.
- **Neden Şimdi Çözülmüyor:** Ruleset kullanan depo yok (15 depoda 0); kısayol güvenli yönde hata verir.
- **Bağlı kalemler:** Otomatik birleştirme kararı (`GERI-BILDIRIM-KAYDI.md`, 2026-11-09).
