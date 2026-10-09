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

## Eş zamanlı çalışma

- [ ] Commit'e yalnız bu işin dosyaları mı girdi? Silinen dalı taban alan açık PR var mıydı?
      → `standartlar/es-zamanli-calisma-standardi.md` (vaka: 2026-09-18, `git add -A` paralel oturumun dosyasını aldı; `--delete-branch` üstünde PR duran dalı silip o PR'ı kapattı)

## Kayıt ve izlenebilirlik

- [ ] Çözülmeyip ertelenen bir sorun fark edildiyse kütüğe kaydı açıldı mı (standart biçimde, Sade Anlatım + Teknik Detay)?
      → `standartlar/teknik-borc-standardi.md`
- [ ] İş sırasında görülen yan bulgu düzeltilmeden kütüğe mi yazıldı, asıl işe dönüldü mü?
      → `standartlar/teknik-borc-standardi.md` "Yan bulgu" (vaka: 3 projede 4 uyarı, 2026-08-29 → 2026-09-26, #127)
- [ ] Kayıt hassas mı (anahtar, parola, yetki kuralı, kişisel veri)? Öyleyse `Hassas: Evet` ve `Genel Başlık` satırları var mı?
      → `standartlar/teknik-borc-standardi.md`

## Güvenlik

- [ ] Değişiklikte gizli anahtar, parola ya da erişim belirteci var mı? (Ortak anahtar taraması her PR'da çalışır; kırmızıysa birleştirilmez.)
      → `quality/secret-scan.js`

## Doğrulama

> Kural: `standartlar/olcum-standardi.md`. Bu iki madde 2026-09-19'dan **önce de** listedeydi ve o gün 17 kez çiğnendi — yazılı olması tutmadı. Artık kısmen makineye bağlı; aşağıdaki sorular makinenin göremediği kısım içindir.

- [ ] İddialar ölçüldü mü? Ölçülmemiş sebep açıklaması "hipotez" diye mi yazıldı?
- [ ] Hız, maliyet, kapsam ve "hepsi/hiçbiri" iddialarının **sayısı ve kaynağı** yazılı mı?
- [ ] Yeni kuralın testi, kuralı bilerek bozunca gerçekten kırmızı veriyor mu (sabotaj denemesi)?
- [ ] Yeni bir kapı eklendiyse: `quality/data/gates.json` kaydı var mı, vakası **tarihli** mi, o vakayı yakalayan test gerçekten kırmızıdan yeşile mi döndü?
- [ ] Kapı **gerçek veride** çalıştırıldı mı, yanlış alarm sayısı ölçülüp yazıldı mı?
- [ ] "Kapı yeşil" iddiası çıkış koduna mı dayanıyor? Çıktı `| tail`, `Out-Null`, `2>/dev/null` ile gizlenmiş mi? (vaka: Abacus-Core PR #42 2026-08-31, Portföy 2026-09-15, #133)
- [ ] Okuma yapan kod "okunamadı"yı "yok"tan ayırıyor mu? Hata, 404 ya da boş yanıt "yok" diye yorumlanıyor mu? Okunamayan veriyle karar veriliyor mu? (Kural 3)
      → `quality/remote-read.js`
