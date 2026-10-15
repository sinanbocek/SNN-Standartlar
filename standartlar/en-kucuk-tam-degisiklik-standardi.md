# En Küçük Tam Değişiklik Standardı (tüm projeler)

Bu standart, ajanın kod yazarken, düzeltirken ya da değiştirirken **ne kadar kod yazacağını** düzenler. İlke: işi **eksiksiz** bitiren **en küçük** değişiklik. "Küçük" çözüm içindir; işin kendisi yarım bırakılmaz.

Diğer standartlar kodun nasıl adlandırılacağını (`kod-dili-standardi.md`), eksiklerin nereye yazılacağını (`teknik-borc-standardi.md`) ve iddiaların nasıl ölçüleceğini (`olcum-standardi.md`) söyler. Bu standart, yazılacak kodun **miktarını** söyler; bu konuda daha önce aile kuralı yoktu.

## Neden (sahip kararı, 2026-10-15 — #160)

Bu standart **gerçek bir vakadan doğmadı.** Dış bir deponun incelemesinden doğdu. Talep, dört şartın ikisini (gerçek olay, ölçülmüş çıktı) bilerek boş bıraktı.

Proje sahibi talebi dört şart kuralına **bilinçli istisna** olarak kabul etti: "bu benim kararım, ölçüye gerek yok." Bu, `GERI-BILDIRIM-KAYDI.md`'ye de yazıldı. İstisna yalnız bu standart içindir; başka talepler için emsal değildir.

Bu yüzden aşağıdaki kurallar yalnız **talimat** olarak girer. Makine kapısına çevrilmez; kapı, `olcum-standardi.md` gereği tarihli bir vaka ister (bkz. "Makineye bağlanabilecekler").

## Kaynak (okundu, 2026-10-15)

Ponytail: `github.com/DietrichGebert/ponytail`, MIT lisanslı, v5.2.0 (2026-10-13). Okunan dosyalar: `README.md` ve kuralların kısa hâli `AGENTS.md`.

Eklenti **kurulmadı**. Fikir Türkçe yazıldı ve aile kurallarına uyduruldu; metin kopyalanmadı.

Yazarın kendi ölçümü (Claude Code, Opus 5.5, 39 görev, 5'er koşu; kuralsız hâle göre oran): kod %47, çıktı parçası %55, maliyet %74, süre %59. Riskli mantığa test yazma oranı %68 → %98. **Bağımsız doğrulanmadı;** bizim projelerimizde ölçülmedi.

## Kurallar

Aşağıdaki işaretli bölüm, `setup/setup-machine.js` tarafından her makinede `~/.claude/CLAUDE.md` dosyasına kopyalanır. Claude Code bu dosyayı her projede, her oturumda okur. Bölümü değiştirirsen makinede `node setup/setup-machine.js --uygula` çalıştır.

<!-- kullanici-talimati:basla -->
# Kod yazarken

Bu kurallar SNN aile standardıdır (`SNN-Standartlar/standartlar/en-kucuk-tam-degisiklik-standardi.md`). Kod yazan, düzelten ya da değiştiren her iş için geçerlidir. İlke: işi eksiksiz bitiren en küçük değişiklik.

1. **Önce oku.** Değişikliğin dokunduğu kodu, çağıranları, testleri ve ayarları bul. Hata düzeltirken fonksiyonun bütün çağıranlarını ara; kökü ortak kodda bir kez düzelt.
2. **Merdiven.** Tutan ilk basamakta dur:
   1. Gerçekten gerekli mi? İstenmeyen özelliği, ayarı, "ileride lazım olur" kodunu yapma; tek satırla adını an.
   2. Kod tabanında zaten var mı? Arayüzde SNN-UI kataloğu, ortak işlerde SNN-Abacus-Core, piyasa verisinde (döviz, maden, BIST, TÜFE) SNN-Piyasa-Core.
   3. Dilin kendi kütüphanesi ya da platform yapıyor mu?
   4. Kurulu bir paket yapıyor mu? Birkaç satır için yeni paket ekleme.
   5. Bir bakışta okunan tek satır olur mu?
   6. Olmuyorsa çalışan en az kod.
3. **Tembellik çözümde olur, işte olmaz.** Değişikliğin kırdığı çağıranlar, testler ve örnek veriler de düzeltilir. Taşınan kod hata yakalamasını ve doğrulamasını korur.
4. **Asla kısılmaz:** dış girdi doğrulaması, veri kaybını önleyen hata yakalama, güvenlik, erişilebilirlik, kullanıcının istediği her şey.
5. **Mantık içeren yeni kod** (dal, döngü, ayrıştırıcı, para, güvenlik) bir küçük test bırakır. Projede test altyapısı yoksa mantık saf bir fonksiyona ayrılır ve "test altyapısı yok" diye TB kaydı açılır.
6. **Bilinen sınırı olan kısayol** dilin yorum işaretiyle şu biçimde yazılır: `KISAYOL (TB-012): <sınır>, <ne zaman yükseltilir>`. Kayıt teknik borç kütüğüne `borc-ekle` ile açılır; ayrı defter tutulmaz.
7. **İş cevabı** bir-iki satırla biter: neyi atladım, neyi denetlemedim, bilinmesi gereken risk.
<!-- kullanici-talimati:bitir -->

**Kural 5'in test altyapısı istisnası (sahip, 2026-10-15):** altyapı kurmak bu kuralın işi değildir. Saf fonksiyon, altyapı gelince testin hemen yazılabilmesini sağlar; TB kaydı eksikliği görünür tutar.

**Kural 6'nın sabit sözcüğü:** `KISAYOL` bütün aile projelerinde tek aramayla bulunur ve TB numarası kütükteki kayda bağlar. Ponytail'in İngilizce `shortcut:` yorumu alınmadı (yorumlar Türkçe, `kod-dili-standardi.md`).

**Kural 7 ile ölçüm standardı:** `olcum-standardi.md` "ölçmediysen ölçmedim yaz" der. Kural 7 bunu her iş cevabının sonuna taşır; ikisi çelişmez.

## Ponytail'den alınmayanlar

| Ponytail'de | Neden alınmadı |
|---|---|
| İngilizce `shortcut:` yorumu | Yorumlar Türkçe (`kod-dili-standardi.md`); yerine `KISAYOL (TB-xxx)` |
| Ayrı borç defteri (`/ponytail-debt`) | Tek kaynak teknik borç kütüğüdür (`teknik-borc-standardi.md`) |
| Alt ajanlara kendiliğinden talimat ekleyen kanca | Alt ajan talimatı koordinatörün işidir (`alt-ajan-standardi.md`) |
| `/ponytail-review`, `/ponytail-audit` | Kod inceleme kontrol listesi ve `code-review` becerisi var |
| Yoğunluk kipleri (`lite`, `ultra`), durum çubuğu | Kural tek düzeydedir; açılıp kapanmaz |
| Kendiliğinden güncellenen eklenti kodu | Kuralı çalıştıran şey akmamalı (bu deponun `CLAUDE.md` §1) |

## Makineye bağlanabilecekler

Bu kurallar bugün yalnız talimattır; uyulup uyulmadığını makine denetlemez. Aşağıdaki üç madde makineyle görülebilir. **İlk gerçek vakada** kapıya çevrilir (`olcum-standardi.md`, bu deponun `CLAUDE.md` §4):

| Madde | Makine ne görür | Not |
|---|---|---|
| Birkaç satır için yeni paket (Kural 2.4) | PR'da paket dosyasına yeni bağımlılık eklenmesi | Gerekçeli eklemeye yanlış alarm verir; uyarı kipinde başlar |
| TB numarasız kısayol (Kural 6) | `KISAYOL` yorumunda TB numarası yok ya da numara kütükte yok | En az yanlış alarm beklenen aday |
| Testsiz mantık (Kural 5) | Yeni dal ya da döngü eklendi, hiçbir test dosyası değişmedi | Yanlış alarm riski yüksek; en son |

"Gerekli mi", "zaten var mı" ve "en az kod" yargı işidir; makineye bağlanmaz.

## Nasıl ölçülür

**Ölçülmedi.** Önce/sonra ölçümü bu standartla birlikte yapılmadı (sahip kararı, 2026-10-15). Ölçüm planı bu deponun kütüğünde: `docs/teknik-borc.md` → TB-009.

## Dağıtım

İletişim standardıyla aynı yol: `setup-machine.js` işaretli bölümleri art arda `~/.claude/CLAUDE.md` dosyasına yazar. Bu standart beşinci kaynaktır. Dosya proje sahibinin kendi dosyasıysa dokunulmaz (`iletisim-standardi.md`, Dağıtım tablosu).

Kural yalnız Claude Code oturumlarına ulaşır (masaüstü Code sekmesi dahil). Makinede `--uygula` çalıştırılmadan önce açılmış oturum yeni kuralı görmez.
