# Kod İnceleme Kontrol Listesi (tüm projeler)

Bir değişiklik birleştirilmeden önce sorulan sorular. Her madde **evet/hayır** ile cevaplanır; hayır ise ya düzeltilir ya da kütüğe (`docs/teknik-borc.md`) kayıt açılır.

> Liste kısa tutulur: yalnız gerçek bir vakada yanmış konular buraya girer. Her maddenin yanında geldiği standart yazar.

## Girdi ve veri

- [ ] **Yeni giriş alanı eklendi mi? Yasak karakterler `onChange`'de süzülüyor mu, biçim yazarken kuruluyor mu, saf yardımcının testi var mı?**
      → `standartlar/giris-alanlari-standardi.md` (vaka: GHS-Panel 2026-09-17, araç değerine `121212scca` yazılabiliyordu)
- [ ] Para, telefon, TCKN, VKN, e-posta, plaka biçimleri ABACUS motorlarından mı geliyor? Ham `toLocaleString`, `Intl`, `toFixed`, `toUpperCase` var mı?
      → `standartlar/giris-alanlari-standardi.md`

## Adlandırma

- [ ] **Yeni tanımlayıcı (dosya, klasör, değişken, tip, tablo, sütun, API alanı) İngilizce mi? Proje kuralı aile standardıyla çelişiyor mu?**
      → `standartlar/kod-dili-standardi.md` (vaka: SNN-Piyasa-Core 2026-09-17, 52 dosya ve 10 tablo Türkçe adlandırıldı)

## Kayıt ve izlenebilirlik

- [ ] Çözülmeyip ertelenen bir sorun fark edildiyse kütüğe kaydı açıldı mı (standart biçimde, Sade Anlatım + Teknik Detay)?
      → `standartlar/teknik-borc-standardi.md`
- [ ] Kayıt hassas mı (anahtar, parola, yetki kuralı, kişisel veri)? Öyleyse `Hassas: Evet` ve `Genel Başlık` satırları var mı?
      → `standartlar/teknik-borc-standardi.md`

## Güvenlik

- [ ] Değişiklikte gizli anahtar, parola ya da erişim belirteci var mı? (Ortak anahtar taraması her PR'da çalışır; kırmızıysa birleştirilmez.)
      → `quality/secret-scan.js`

## Doğrulama

- [ ] İddialar ölçüldü mü? Ölçülmemiş sebep açıklaması "hipotez" diye mi yazıldı?
- [ ] Yeni kuralın testi, kuralı bilerek bozunca gerçekten kırmızı veriyor mu (sabotaj denemesi)?
