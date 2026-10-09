# Bellek derleme — haftalık döngü

Claude her projede kendi bellek notlarını tutar (`~/.claude/projects/<proje>/memory/`). Not projeye özeldir; başka projede okunmaz. Bu döngü, projeler arasında tekrar eden dersleri bulur, tek yere indirir ve kalıcı yerine (standart ya da ev kâğıdı) taşınmasını teklif eder.

## Neden (ölçüm, 2026-10-09)

11 projede 109 not vardı. Aynı ders **sekiz kümede** birden çok projede ayrı ayrı yazılmıştı: PowerShell komutları, İngilizce tanımlayıcı, alt ajan modeli, "Çalıştır" düğmesi, Actions kotası, "yalnız kendi projem", rol değişimi, sade Türkçe. En pahalısı: GHS-Panel 28 Eylül'de "Haiku yalnız mekanik iş, ajan raporuna güvenme" diye not düşmüştü; 9 Ekim'de Pulmaca aynı dersi 20 ajanlık deneyle (yaklaşık bir milyon parça) yeniden buldu.

Dış kanıt aynı yönde: geçmiş deneyimin **özeti** verilince kod ajanının çözüm oranı 26'dan 34'e çıkıyor, **ham kayıt** verilince 27'de kalıyor (SWE-ContextBench, 2026); kötü seçilmiş bellek ise performansı düşürüyor (SWE-Bench-CL, 2025). Yani: kısa, derlenmiş ders işe yarar; yığılmış not yaramaz.

## Üç kademe

| Kademe | Kim | Ne zaman | Ne yapar |
|---|---|---|---|
| 1. Defter | Her oturum | Oturum içinde | Öğrendiğini bellek notuna yazar (zaten var) |
| 2. Derleme | Zamanlanmış görev (`bellek-derleme`) | Pazartesi 09:30 bu bilgisayarda | Envanter çıkarır, tekrarları birleştirir, tarihi geçeni emekliye ayırır, standart adaylarını **talep** olarak açar |
| 3. Karar | Proje sahibi | Talep issue'sunda | Adayı kabul ya da reddeder; kabul edilen standarda tarihli vakayla girer |

**2. kademe kuralı:** görev **bellek notlarını** düzenler (birleştirme, yönlendirme satırı, emekliye ayırma; önce yedek alır). **Standartlara ve ev kâğıdına dokunmaz**; onlara giden her şey `talep` etiketli issue olur ve mevcut talep hattına düşer (7 gün yanıtsız kalırsa `open-requests` kırmızı verir). Tek olaydan kural üretilmez: aday olmak için ders en az iki projede görülmüş olmalı.

Bilgisayar kapalıysa görev bir sonraki açılışta çalışır; iş kaçmaz, gecikir.

## Araç

```bash
node quality/memory-inventory.js --son 7
```

Çıktı: proje başına not sayısı, projeler arası tekrar **adayları**, son 7 günün yeni notları, tarihi geçmiş olabilecek "project" tipli notlar. Hiçbir notu değiştirmez.

**Sınırı bilinir:** kümeleme kelime torbasıyla yapılır (Jaccard). Eşik ölçümü (2026-10-09, 109 not, elle bilinen 8 küme): 0,13'te 6 aday çıktı; 3'ü gerçek küme, 3'ü gevşek akraba; bilinen 8 kümenin 3'ü yakalandı. Bu yüzden aday listesi **kaba elektir**: görev, adayları ve tüm not açıklamalarını (109 satır) kendisi okuyup kümeyi kendisi kurar. Betik sayım ve iz içindir, hüküm için değil.

## Her çalışmanın raporu

`docs/bellek-derleme/<tarih>.md` — bir dal ve PR ile gelir. İçinde: kaç not, kaç yeni, kaç tekrar, ne birleştirildi, ne emekli oldu, hangi talepler açıldı. Dört hafta sonra bakılacak üç sayı: haftada kaç yeni not, kaçı tekrar, kaç aday gerçekten kural oldu. Tekrar sıfıra yakınsa döngü gereksizdir; yüksekse kalır.

## Yapmadığı şeyler

- Standart ya da `~/.claude/CLAUDE.md` yazmaz (talep açar).
- Proje depolarına dokunmaz (yalnız Claude'un bellek klasörleri ve bu depo).
- Not silmez; birleştirilen notun yerine kaynağı gösteren tek satır bırakır, yedeği `~/.claude/bellek-yedek-<tarih>/` altında tutar.
- Ölçmediğini iddia etmez: envanter klasörü okunamazsa "okunamadı" der, "not yok" demez.
