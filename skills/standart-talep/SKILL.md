---
name: standart-talep
description: Aile standardına (SNN-Standartlar) talep, yanlış alarm bildirimi ya da eksik kök bildirimi gönderir. "Bu kural bizde yanlış alarm veriyor", "şu ortak depoda olmalı", "standarda şunu ekleyelim", "SNN-Standartlar'a bildir" durumlarında kullan. Talebi hazırlar, kullanıcıya gösterir, ONAYLA gönderir.
---

# Aile standardına talep gönder

Bu beceri, bir tüketici projeden ortak depoya (`sinanbocek/SNN-Standartlar`) **talep iletir**.
Taleple birlikte gelen kanıt değerlendirme maliyetini belirler; kanıtsız talep değerlendirilemez.

> **Kural:** dış etkili iştir (başka bir depoda issue açılır). **Kullanıcı onayı olmadan gönderme.**

---

## 1. Önce karar defterini oku — aynı talep reddedilmiş olabilir

```bash
node -e "console.log(require('os').homedir())"
```

Karar defteri: `<ev>/.claude/standartlar-canli/GERI-BILDIRIM-KAYDI.md`

Aradığın şey orada **REDDEDİLDİ** olarak duruyorsa gerekçesini oku. Aynı talebi yeniden
göndermek gerekmez. Gerekçeyi değiştiren **yeni bir olgu** varsa (ikinci bir proje, ikinci bir
ekran, değişmiş bir kısıt) o olguyu göstererek yeniden başvurulabilir.

Defter okunamıyorsa canlı kopyayı tazele:

```bash
node -e "console.log(require(require('os').homedir()+'/.claude/hooks/lib/shared.js').refresh({force:true}))"
```

---

## 2. Talep türünü seç

| Tür | Ne zaman |
|---|---|
| **yanlış-alarm** | Kapı doğru olan bir şeyi yakalıyor (en sık) |
| **eksik-kok** | Tarayıcı bir Türkçe kökü kaçırıyor |
| **yeni-kural** | Aile çapında yeni bir kural/kapı öneriliyor |
| **kural-degisikligi** | Var olan kural bu projede tutmuyor |
| **belge** | Belgelenen kural yazıldığı gibi çalışmıyor (örnek yanlış, biçim başka) |
| **soru** | Kararın gerekçesi anlaşılmadı |

---

## 3. Dört şartı topla — eksikse talep değerlendirilemez

1. **Gerçek olay.** Hangi dosya, hangi satır, ne oldu? Varsayımsal genellik yetmez.
2. **Ölçülmüş çıktı.** İddia değil, **çalıştırılmış komutun çıktısı**. Örnek:
   ```bash
   node "<ev>/.claude/standartlar-canli/quality/code-language-scan.js" --tumu
   ```
3. **Denenmiş alternatif.** Neden projede çözülemiyor? (Yanlış alarm için: neden
   `.snn-kod-dili.json` ile susturmak **doğru değil**?)
4. **Kaç projeyi etkiliyor?** Yalnız bu projeyi mi, yoksa aynı desen başkalarında da var mı?
   Ölçmediysen **"ölçmedim"** yaz — tahmin yazma.

**Yanlış alarm bildirirken ayrıca:** dosyadaki gerçek tanımlayıcıların **kurala uygun**
olduğunu göster. "Bunlar regex metni, tanımlayıcı değil" demek, "dosyada Türkçe ad yok"
demekle aynı şey değildir.

---

## 4. Taslağı kullanıcıya göster

Göndermeden önce sohbete **olduğu gibi** dök ve onay iste. Eksik şart varsa
söyle: *"3. şart (denenmiş alternatif) boş; böyle gönderirsem değerlendirilemez."*

---

## 5. Onay gelince gönder

```bash
gh issue create -R sinanbocek/SNN-Standartlar \
  --title "[<tür>] <tek cümlelik özet>" \
  --label talep \
  --body-file <taslak-dosyası>
```

Gövde şu başlıkları taşır: **Proje · Tür · Gerçek olay · Ölçülmüş çıktı · Denenen alternatif ·
Kaç projeyi etkiliyor · Beklenen sonuç**.

Etiket yoksa `gh` hata verir; bir kez aç:

```bash
gh label create talep -R sinanbocek/SNN-Standartlar --color 0E8A16 --description "Tüketici projeden gelen talep"
```

---

## 6. Kullanıcıya tek satır bildir

`Talep gönderildi: #<no> — <başlık>` + adres. Sonra **asıl işe dön**; cevabı bekleme.

---

## Cevap nasıl gelir?

- Karar **`GERI-BILDIRIM-KAYDI.md`'ye** yazılır (kabul de ret de, **gerekçesiyle**).
- Kabul edilirse düzeltme ortak depoda birleşir ve **kendiliğinden bu projeye ulaşır** —
  senin bir şey kopyalaman gerekmez.
- Issue'da yanıt verilir ve kapatılır.

## Yapma

- **Kapıyı susturup geçme.** `.snn-kod-dili.json` ile yanlış alarmı susturmak kaydı kirletir
  ve yarın aynı dosyaya girecek **gerçek** bir adı da kör eder.
- **Ortak depoya doğrudan yazma.** Talep issue ile gelir; kodu ortak deponun kendi oturumu yazar.
- **Onaysız gönderme.** Başka bir depoda issue açmak dış etkili iştir.
