---
name: borclar
description: Tüm projelerin (SNN-AI-Asus-Z14 altı) sürüm, commit'lenmemiş iş ve teknik borç özetini gösterir. "Hangi projede ne var", "borçlar", "projelerin durumu", "nerede kalmıştık" sorularında kullan.
---

# Proje ve teknik borç özeti

> `<ev>` = ev klasörü. Öğrenmek için: `node -e "console.log(require('os').homedir())"`

1. Çalıştır: `node "<ev>/.claude/hooks/debts.js" --detay`
2. Tabloyu kullanıcıya olduğu gibi göster, altına en fazla 3 maddelik yorum ekle:
   - P1 borcu olan projeler (başlıklarıyla)
   - 3 günden uzun süredir commit'lenmemiş işi olan projeler
   - Kütüğü `standart-disi` veya `yok` olan projeler → standarda taşınmayı bekliyor
3. `P?` sayısı yüksekse kayıtlara öncelik atanmadığını belirt.

Standart: `<ev>/.claude/standartlar/teknik-borc-standardi.md`. Bu skill yalnızca okur; hiçbir dosyayı değiştirmez.
