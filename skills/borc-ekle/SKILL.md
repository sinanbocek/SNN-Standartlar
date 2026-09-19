---
name: borc-ekle
description: Çalışırken fark edilen ama şimdi çözülmeyecek bir sorunu projenin teknik borç kütüğüne standart biçimde (TB-xxx) kaydeder. Yan bulgu, "sonra bakalım", "borca yaz", "kütüğe ekle" durumlarında kullan; yan bulguyu kovalamak yerine kaydet ve asıl işe dön.
---

# Teknik borç kaydı ekle

> `<ev>` = ev klasörü. Öğrenmek için: `node -e "console.log(require('os').homedir())"`

Önce standardı oku: `<ev>/.claude/standartlar/teknik-borc-standardi.md`

1. **Dosya:** `<proje kökü>/docs/teknik-borc.md`.
   - Yoksa ve projede başka adla bir kütük varsa (`tech-debt.md`, `TECHNICAL_DEBT.md`, `TECH_DEBT.md`): **yeni dosya açma**; kullanıcıya kütüğün önce standarda taşınması gerektiğini söyle ve onay iste.
   - Hiç kütük yoksa standarttaki dosya başlığıyla oluştur.
2. **Numara:** `docs/teknik-borc.md` ve `docs/teknik-borc-arsiv.md` içindeki en büyük `TB-` numarasının bir fazlası. Numara asla yeniden kullanılmaz.
3. **Kayıt:** Standarttaki alanların hepsi; **iki bölüm zorunlu**: 🟢 Sade Anlatım (proje sahibi için; İngilizce terim yok, en az bir gündelik benzetme) ve 🔧 Teknik Detay (yapay zeka için; dosya yolları ve kod adları aynen). Yeni teknik terim geçtiyse dosyanın Sözlük tablosuna ekle. Kurallar:
   - `Açıklama` ölçüme dayanır: dosya:satır, sayılar. Ölçülmemiş iddia "hipotez" diye yazılır.
   - `Öncelik` gerekçeli seçilir (P1 = veri/para/güvenlik/sessiz hata).
   - Emin olunamayan öncelik için kullanıcıya sor.
4. Kaydı dosyadaki son açık kaydın altına, `---` ayırıcıyla ekle.
5. Kullanıcıya tek satır bildir: `TB-091 (P2) eklendi — <başlık>`, ardından asıl işe dön.

Bu skill borcu **çözmez**; yalnızca kaydeder.
