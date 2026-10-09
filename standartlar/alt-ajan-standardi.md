# Alt Ajan Standardı — model ve düşünme seviyesi seçimi (tüm projeler)

Bu standart, bir ajanın yardımcı ajan (Claude Code `Agent` aracıyla açılan alt ajan) açarken **hangi modeli ve hangi düşünme seviyesini** seçeceğini düzenler. Düşünme seviyesi (effort): modelin bir işe ne kadar düşünme harcayacağını belirleyen ayar; düşük, orta, yüksek.

## Neden (vaka, 2026-10-09)

SNN-Games-Pulmaca'nın 6 açık kaydı için teşhis ajanları açıldı. Model seçimi tahmine dayandı, düşünme seviyesi hiç verilmedi. Var olan tek düzen Pulmaca'ya özel bir bellek notuydu (2026-10-08, "kodlama Haiku/Sonnet ajana"); başka projeler bunu miras almıyordu. Proje sahibi kuralı tüm projeler için istedi (SNN-Standartlar #121).

Claude Code'un ajan aracı düşünme seviyesini yalnız kullanıcı ya da CLAUDE.md gibi bir talimat açıkça isterse ayarlar. Bu yüzden kural proje belleğine değil, her oturumda okunan kullanıcı talimatına (`~/.claude/CLAUDE.md`) girer. Dağıtım yolu iletişim standardıyla aynıdır.

## Kaynaklar (okundu, 2026-10-09)

platform.claude.com: model seçimi, model tablosu, fiyatlandırma, maliyet-zekâ dengesi, Haiku 5.5 ve Sonnet 5.5 geçiş rehberleri. Fiyatlar SNN-Standartlar'da 2026-10-09'da resmi model tablosuyla ikinci kez doğrulandı.

| Model | Girdi / çıktı (1M parça) | Varsayılan seviye |
|---|---|---|
| Haiku 5.5 | 0,10 / 0,50 $ · istek 100 bin parçayı aşarsa 0,50 / 2,50 $ | orta |
| Sonnet 5.5 | 2 / 10 $ | yüksek |
| Opus 5.5 | 4 / 20 $ | orta |
| Fable 5.1 | 10 / 50 $ | — |

Belgeden alınan üç bulgu:

- Haiku "alt ajan görevleri" için önerilir.
- Birbirine bağlı işi parçalara bölmek tek modelden pahalıdır; ucuz yürütücü takıldığında yardım istemez (198 soruda 0 çağrı).
- Haiku 5.5 ve Sonnet 5.5 güvenlik sınıflandırıcısıyla isteği reddedebilir; Haiku'da sunucu tarafı yedek model yoktur.

Belgenin uyarısı: basamaklı model düzeni kurmadan önce en güçlü modeli düşük seviyede dene; maliyeti istek başına değil, **tamamlanan iş başına** ölç. Aşağıdaki ölçümde Opus ve Fable düşük seviyede denenmedi; Fable alt ajanda zaten kullanılmaz (Sonnet'in 5 katı fiyat).

## İlk ölçüm (20 ajan, 2026-10-09)

Cevap anahtarı önceden yazıldı; iddialar elle doğrulandı. **Sınır:** ayar başına 1–2 deneme; aynı ayarın iki denemesi arasında 2 puana kadar fark var. Tablo yön gösterir, kesin sıralama değildir. Yeniden ölçüm yapılırsa bu bölüm güncellenir.

**Tur 1 — salt okuma**

| Görev | Ayar | Doğruluk | Parça | Süre |
|---|---|---|---|---|
| Basit (5 soru: say, bul, satır) | Haiku · düşük | 5/5 | 60 bin | 17 sn |
| | Haiku · orta | 5/5 | 70 bin | 20 sn |
| | Sonnet · orta | 5/5 | 56 bin | 23 sn |
| Çok dosyalı teşhis (7 olgu) | Haiku · orta | 7/7 | 111 bin | 109 sn |
| | Haiku · yüksek | 7/7 | 129 bin | 138 sn |
| | Sonnet · orta | 6,5/7 | 68 bin | 45 sn |
| | Sonnet · yüksek | 7/7 | 80 bin | 62 sn |

**Tur 2 — her ayar 2 kez**

| Görev | Ayar | Puanlar | Not |
|---|---|---|---|
| İçerik kararı (25 kelime, 4+ yaş) | Haiku · orta | 22,5 / 23 | İki denemede de gerçek kelimeye "sözcük değil" dedi; anlam uydurdu |
| | Sonnet · orta | 21,5 / 23,5 | Bir denemede anlam uydurup kelimeyi silmek istedi |
| | Sonnet · yüksek | 23,5 / 24 | Ciddi hata yok |
| Kod düzeltme (7 ölçüt) | Haiku · orta | 6 / 7 | Bir deneme dış sözleşme testini zayıflattı |
| | Sonnet · orta | 7 / 7 | Kusursuz |
| | Sonnet · yüksek | 7 / 6 | Bir deneme kapsam dışı dosyayı değiştirdi, satır sonlarını bozdu |

- Her ajanın sabit açılış maliyeti yaklaşık 50 bin parça (tek araç çağrısıyla biten görevler 49–55 bin).
- 20 ajanın hiçbiri test sonucu uydurmadı.
- Haiku teşhis ajanları toplamda 111–129 bin parçaya ulaştı. Alt ajan her araç çağrısında bağlamını yeniden gönderir; bu ajanlar 100 bin parçalık fiyat eşiğini büyük ihtimalle aştı. Kural 9 bu yüzden "tek seferde okuma" değil, "ajanın toplam bağlamı" üzerinden yazıldı.

**Ölçülmeyenler:** aynı anda çalışacak ajan sayısı için bir ölçüm yoktur; Kural 10'daki sınır varsayımdır. Proje sahibinin aboneliği parça başı mı ücretlendiriyor, ölçülmedi; abonelikte fiyat farkı kullanım hakkına dönüşür, yön değişmez.

## Kurallar

Aşağıdaki işaretli bölüm, `setup/setup-machine.js` tarafından her makinede `~/.claude/CLAUDE.md` dosyasına kopyalanır. Claude Code bu dosyayı her projede, her oturumda okur. Bölümü değiştirirsen makinede `node setup/setup-machine.js --uygula` çalıştır.

<!-- kullanici-talimati:basla -->
# Alt ajan açarken

Bu kurallar SNN aile standardıdır (`SNN-Standartlar/standartlar/alt-ajan-standardi.md`). `Agent` aracıyla açılan her yardımcı ajan için geçerlidir. Proje sahibi 2026-10-09'da bu kuralla düşünme seviyesi ayarına kalıcı izin verdi.

| İş | Model · seviye |
|---|---|
| Bul, say, listele, durum kontrolü | Haiku · düşük |
| Salt okuma teşhis, çok dosyalı kod izleme | Haiku · orta |
| Süre önemliyse teşhis | Sonnet · orta |
| Kod yazma, düzeltme, test yazma | Sonnet · orta |
| Dil, içerik, uygunluk kararı (silme ya da değiştirme doğuran) | Sonnet · yüksek |
| Sonnet iki kez başarısız olursa | Opus · orta (seyrek) |

1. Fable ve Haiku · yüksek alt ajanda kullanılmaz.
2. Her ajan çağrısında model ve seviye açıkça yazılır.
3. Küçük iş ajansız yapılır. Her ajanın yaklaşık 50 bin parçalık açılış maliyeti var.
4. Sıralı, birbirine bağlı iş bölünmez. Ajan yalnız bağımsız parçalar içindir.
5. Ajan "takılırsan sor" diye yükseltilmez. Raporu koordinatör değerlendirir, yetersizse bir üst ayarla yeniden yaptırır.
6. Ajan raporundaki kritik iddiayı (satır numarası, test sonucu) koordinatör kendisi doğrular.
7. Kod ajanına dokunabileceği dosyalar açıkça yazılır. Yazan ajanlar ayrı çalışma kopyasında çalışır.
8. Güvenlik incelemesi alt ajana verilmez; güvenlik filtresi işi reddedebilir.
9. Toplam bağlamı 100 bin parçayı geçecek iş Haiku'ya verilmez; fiyat 5 katına çıkar. Alt ajan her araç çağrısında bağlamını yeniden gönderir, okudukça büyür.
10. Aynı anda en fazla 6–8 ajan çalışır (varsayım, ölçülmedi). Raporda her ajanın modeli ve seviyesi yazılır.
<!-- kullanici-talimati:bitir -->

## Nasıl ölçülür

Kural 2 makineyle zorlanabilir: ajan aracı çağrısında model ve seviye alanı var mı, makine görür. Bekçi henüz yazılmadı; `olcum-standardi.md` Kural 2 sırasıyla (vaka, test, sabotaj, kayıt, gerçek veri) ayrı bir PR'da kurulur. O güne kadar bu bölüm yükümlülüktür, kapı değildir.

Tablonun kendisi makineyle zorlanamaz: bir işin "teşhis" mi "kod yazma" mı olduğunu makine bilemez. Etkisi şöyle ölçülür:

| Ölçü | Araç | Hedef |
|---|---|---|
| Model ve seviye verilmeden açılan ajan | `session-digest.js` (alt ajan kayıtları `--dosya` ile) | Sıfıra inmeli |
| Yetersiz raporla yeniden açılan ajan | Oturum kaydı, elle | Azalmalı |

## Dağıtım

İletişim standardıyla aynı yol: `setup-machine.js` iki standardın işaretli bölümünü art arda `~/.claude/CLAUDE.md` dosyasına yazar. Dosya proje sahibinin kendi dosyasıysa dokunulmaz (`iletisim-standardi.md`, Dağıtım tablosu).
