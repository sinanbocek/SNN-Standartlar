# Belge — durum

Son güncelleme: 2026-11-13

## Açık

Talepler `node quality/open-requests.js` çıktısından alındı (2026-11-08).

- Talep #167, #172, #177, #131, #178: karar kaydı 2026-11-10'da yazıldı (sahip vekâleti). Issue'lara yorum ve kapatma Genel Müdür'de. Kayıt: `GERI-BILDIRIM-KAYDI.md` en üst dört giriş.
- Talep #178 kod işi: `quality/local-check.js` Jest çıktısını okuyup iki kapanış hatası ifadesinde kalsın. Yazılım Müdürü'nde.
- Talep #198 (Müşteri İlişkileri): karar taslağı yazıldı (2026-11-13), commit, PR, issue yorumu ve kapatma Genel Müdür'de. Aile listesine SNN-Destek-Gundemi eklenmesi Ölçüm Müdürü'nde (listede yok, 2026-11-13). İsteğe bağlı ortak beceri (yönerge kalıbı ve sayım) ikinci proje birim kurarsa ayrı iş.
- Arayüz planı aşama 4: `proje-kur` becerisine "yeni projede SNN-UI kur" adımı. Kaynak: `docs/arayuz-standardi-plani.md` §9. 2026-11-08'de beceride ve kurulum betiğinde SNN-UI geçmiyor.
- Arayüz planı aşama 5: "AI kokusu" kapısı, gerçek vaka birikince. Kaynak: aynı plan. Şimdilik iş yok.

## Sahip kararı bekleyen

- Talep #198: "panele gitmek zorunlu değil" daraltması (talep her kullanıcıya dönük içerik panele gitsin diyordu; ≈840 bin parça/içerik). Seçenekler Genel Müdür raporunda. Kaynak: `GERI-BILDIRIM-KAYDI.md` en üst giriş.
- Ortak müdür adları tablosunda bir görev çakışması (ayrım kararlaştırılmadı): Pazarlama ile Yayın (Gunum-Var'da ikisinde de mağaza metni ve landing sitesi). Kaynak: `standartlar/ekip-duzeni-standardi.md`, "Karışabilecek çiftler".

## Biten (son 10)

- 2026-11-13 · Talep #198: `standartlar/ekip-duzeni-standardi.md` içine "Bağımsız birimler" bölümü (Müşteri İlişkileri), Destek satırı ve "Karışabilecek çiftler" notu, "Zorunlu değil" maddesi. Karar kaydı: `GERI-BILDIRIM-KAYDI.md` en üst giriş, KISMİ KABUL (panele gitme isteğe bağlı, birim isteğe bağlı, yeri genelleştirildi, ortak beceri yazılmadı). Panel yeniden koşulmadı, öteki projeler ölçülmedi. Commit ve PR Genel Müdür'de; makineye kopyalanmaz.
- 2026-11-10 · Talep #194: `skills/git-temizlik/SKILL.md` altı düzeltme ve küçük notla güncellendi (reviewDecision ifadesi, "öteki dallar" satırı, alt bağımlılık uyarısı, ertelenmiş kayıt, geride kalma, kütük sahibi). Karar kaydı yazıldı: `GERI-BILDIRIM-KAYDI.md` en üst giriş, madde 5 daraltmasıyla. Yeniden koşulmadı, öteki projeler ölçülmedi. Commit, PR ve issue yorumu Genel Müdür'de; makine için canlı kopya tazelenip `node setup/setup-machine.js --uygula`.
- 2026-11-10 · `skills/git-temizlik/SKILL.md` yazıldı (talep #191) ve `docs/makine-kurulumu.md` beceri tablosuna satır eklendi. `skill-paths`, `skill-paths.test`, `code-language-scan --tumu` temiz. PR #192 birleşti (2026-11-10). Karar kaydı yazıldı: `GERI-BILDIRIM-KAYDI.md` en üst giriş, KABUL (sahip talimatı). Commit, PR ve #191 issue yorumu ile kapatma Genel Müdür'de. Makine için canlı kopya tazelenip `node setup/setup-machine.js --uygula`.
- 2026-11-10 · TB-009 ve TB-010 kütükten arşive taşındı (`docs/teknik-borc-arsiv.md`). Kütükte açık kayıt kalmadı. Issue'lar kütük senkronuyla kapanır. Kaynak: arşiv girişleri.
- 2026-11-10 · Ev kâğıdı bloğu sınırın altına indi (1198 kelime): "Canlı veritabanı" tek cümle, "PR birleştirme" giriş cümlesi kısaldı. `setup-machine.test.js` yeşil; sınır yükseltilmedi.
- 2026-11-10 · Sahip vekâletiyle beş talep kararı işlendi (#177, #167 ve #172, #131, #178). Ölçü standardı §3 madde 2 değişti; `es-zamanli-calisma-standardi.md` §8 "Canlı veritabanı işlemi" açıldı (ev kâğıdına tek satır: makine için `node setup/setup-machine.js --uygula`); kontrol listesine "Veritabanı göçü" bölümü eklendi. Pano'daki "#167'ye Gunum-Var bilgisi" sorusu kapandı: bilgi #172'ye ait. Commit ve PR Genel Müdür'de. Kaynak: `GERI-BILDIRIM-KAYDI.md`.
- 2026-11-09 · `proje-kur` becerisine otomatik birleştirme adımı ve "Genel Müdür düzeni kurulsun mu?" sorusu eklendi, eski birleştirme satırı §7'ye bağlandı. Commit ve PR Genel Müdür'de; makine için canlı kopya tazelenip `node setup/setup-machine.js --uygula`. Kaynak: `GERI-BILDIRIM-KAYDI.md`.
- 2026-11-09 · Otomatik birleştirme aile yayılımı §7'ye işlendi: depo ayarı uyarıları, 16 projelik sonuç tablosu (9 açık, 7 kapalı), ölçülmeyen kalem. Commit ve PR Genel Müdür'de. Kaynak: `GERI-BILDIRIM-KAYDI.md`.
- 2026-11-09 · Otomatik birleştirme ortak süreç: PR birleştirme işaretli bloğu (madde 5 ve 6) ve §7 gerekçe, depo ayarı, ölçüm. Commit ve PR Genel Müdür'de; makine için `node setup/setup-machine.js --uygula`. Kaynak: `GERI-BILDIRIM-KAYDI.md`.
- 2026-11-09 · Genel Müdür düzeni çerçeve standardı (#181) ve ortak müdür adları tablosu (sahip eki), PR #183 dalında; commit ve PR Genel Müdür'de. Kaynak: `GERI-BILDIRIM-KAYDI.md`.
