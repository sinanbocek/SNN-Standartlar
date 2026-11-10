# Sosyal Medya Ölçü Standardı (tüm projeler)

Instagram ve Facebook içeriği üreten her projenin ölçü kuralı. Metnin dili bu belgenin konusu değildir. Bir projeye özel yerleşim (logo nerede, başlık kaç punto) o projenin rehberinde kalır.

**Neden (2026-11-03, #175):** Pulmaca'da 3–10 Kasım içeriği arayüzsüz karelerle denetlendi. Denetim geçti, ama Reels'te logo ve adres okunmuyordu. Şehir videolarında kelime çipleri arayüzün altında kalıyordu. Aynı biçimler Günüm Var'ın Instagram dosyalarında da var (2 tane 1080×1350 görsel, 1 tane 1080×1920 video; ölçüldü 2026-11-04).

## 1. Biçimler

| İçerik | Ölçü | Kanıt |
|---|---|---|
| Reels, Hikâye | 9:16, 1080×1920. Meta 1440×2560 da önerir. Reels en az 30 kare/sn. | `meta` |
| Gönderi | 4:5, 1080×1350. Meta'nın bir sayfası Instagram tek görsel için 1:1 de der. | `meta` |
| Reels kapağı | 420×654 | `meta` |
| Profil ızgarası kutusu | 3:4 | `ikincil` |

## 2. Bölgeler

Sayılar `[sol, üst, sağ, alt]` piksel kutusudur; sağ ve alt kenar dahil değildir. Tek kaynak `quality/data/social-media-sizes.json` dosyasıdır. Bu tablo o dosyaya testle bağlıdır; biri değişip öteki değişmezse CI kırılır.

| Kimlik | Kutu | Kanıt | Ne anlatır |
|---|---|---|---|
| `meta-ad-top` | [0, 0, 1080, 269] | `meta` | Reklamda üst %14 boş kalır |
| `meta-ad-bottom` | [0, 1248, 1080, 1920] | `meta` | Reklamda alt %35 boş kalır |
| `meta-ad-left` | [0, 269, 65, 1248] | `meta` | Reklamda sol %6 boş kalır |
| `meta-ad-right` | [1015, 269, 1080, 1248] | `meta` | Reklamda sağ %6 boş kalır |
| `reels-top` | [0, 0, 1080, 240] | `canli-olcum` | Normal Reels: saat ve geri düğmesi |
| `reels-right-column` | [914, 1000, 1080, 1860] | `canli-olcum` | Normal Reels: sağ düğme sütunu |
| `reels-bottom-left` | [0, 1709, 914, 1920] | `canli-olcum` | Normal Reels: hesap adı ve açıklama |
| `story-name-row` | [0, 0, 1080, 134] | `canli-olcum` | Hikâye: ad satırı ilk %7'yi kaplar, logo buraya konmaz |
| `tall-screen-left` | [0, 0, 48, 1920] | `canli-olcum` | Uzun ekranda video yaklaşık %10 büyür, soldan gider |
| `tall-screen-right` | [1032, 0, 1080, 1920] | `canli-olcum` | Aynı büyüme, sağdan gider |
| `cover-grid-top` | [0, 0, 1080, 240] | `ikincil` | 9:16 kapak ızgarada üstten kırpılır |
| `cover-grid-bottom` | [0, 1680, 1080, 1920] | `ikincil` | 9:16 kapak ızgarada alttan kırpılır |
| `post-grid-left` | [0, 0, 34, 1350] | `ikincil` | 4:5 gönderi ızgarada soldan kırpılır |
| `post-grid-right` | [1046, 0, 1080, 1350] | `ikincil` | 4:5 gönderi ızgarada sağdan kırpılır |

**Kanıt türleri:**

- `meta`: Meta'nın resmi sayfası. Bu sayılar **reklam içindir**; Meta normal paylaşım için ayrı sayı yayımlamıyor.
- `canli-olcum`: canlı ekran görüntüsünden ölçüldü.
- `ikincil`: başka bir siteden aktarım, daha zayıf.
- `turetilmis`: başka bir kuraldan hesaplandı.

## 3. Hangi sınır ne zaman geçerli

Normal Reels'te alttaki gerçek sınır yaklaşık %11, reklamda %35'tir. İki sayı aynı şeyi anlatmaz.

1. **Yazı ve okunması gereken öge** (logo, adres, başlık, soru) reklam bölgesinin dışında kalır: y 269–1248, x 65–1015. İçerik sonradan reklama çevrilebildiği için varsayılan budur.
2. **Yazı olmayan öge** (fotoğraf, okunması gerekmeyen görüntü) reklam bölgesine girebilir. Düğmelerin altına girebilir, ama okunması gereken parçası girmez.
3. **Düğmelerin altına** okunması gereken hiçbir şey girmez. İstisnası yoktur.
4. **İstisna:** yazının reklam bölgesine girmesi gerekiyorsa proje rehberine gerekçesiyle yazılır. Proje rehberinde yazmayan istisna kusurdur.
5. **Gönderide** logo ve adres kenardan en az 34 piksel içeride durur.

**Madde 2'nin gerekçesi (2026-11-04, #177):** Pulmaca şehir videolarında fotoğraf tam karedir. Konya videosunda (`konya-ig.mp4`) fotoğraf bütün `reels-*` bölgelerinin altında kalıyor. Telefon gövdesinin altı 9. saniyede yaklaşık y 1772'ye iner, `reels-bottom-left` y 1709'da başlar. Okunması gereken en alt yazı y 1695'te biter, bölgenin üstünde kalır. Eski metin (fotoğraf düğmelerin altına girmemelidir) tam kare fotoğrafı yasaklıyordu. Fotoğrafı kırpmak ise tam kare 9:16 içeriği olanaksız kılar. Kapsam yalnız Pulmaca'nın Konya videosunun ölçümüne dayanır; başka proje ölçülmedi.

## 4. Bağlantı çıkartması

- Planlı hikâyeye eklenemez, telefondan elle eklenir. Business Suite'te görüldü (`canli-olcum`, 2026-11-03).
- Yüksekliği en az 122 pikseldir (`turetilmis`, 2026-11-03). Bu sayı Instagram'ın değildir. Apple'ın 44 puntoluk parmak hedefinden hesaplanmıştır, Apple'ın sayfası açılamamıştır. 390 puntoluk ekran varsayımıyla 44 × 1080 ÷ 390 = 121,8 eder.

## 5. Göstermeden önce arayüz bindirmesiyle denetim

Arayüzsüz kareye bakmak denetim sayılmaz. Her yeni görsel ve video sahibe gösterilmeden önce işaretlenip bakılır. Araç 9:16 ve 4:5 dosyaları tanır, başka orana uymayan dosyada durur:

```bash
python -I "$HOME\.claude\standartlar-canli\quality\safe_zone.py" cikti.jpg dosya.png video.mp4@1 video.mp4@9
```

- Videoda yazı olan her evreden kare alınır: başlangıç, orta, kapanış. `@9`, 9. saniyedir.
- Mor dolgu reklam bölgesi, kırmızı çerçeve canlı ölçülen arayüz, mavi çerçeve kırpılan kenardır.
- Araç dosyanın Reels mi Hikâye mi olduğunu bilmez, hepsini çizer. Reels'te `reels-*`, Hikâye'de `story-name-row` çerçevesine bakılır.
- Araç Pillow ister (`python -m pip install pillow`), video için ffmpeg ister. Aracın yazıyı kendisi bulma yeteneği yoktur: işaretler, gözle bakılır.

## 6. Her ölçüde tarih ve kanıt türü

1. Yeni ya da değişen sayı önce `quality/data/social-media-sizes.json` dosyasına tarih, kanıt türü ve kaynakla girer. `node quality/social-media-sizes.js` denetler.
2. Kanıtı olmayan sayı girmez.
3. Bu depo herkese açıktır. Sahibin ekran görüntüleri buraya taşınmaz; yalnız sayılar ve kurallar girer.

## 7. Altı ayda bir yenileme

Ölçüler platforma bağlıdır ve haber vermeden değişir. Yenileme vadesi `quality/data/pending-measurements.json` dosyasındaki `OLC-002` kaydındadır. Vade gelince günlük akış kırmızıya döner ve karar verilene kadar kırmızı kalır. Karar: Meta sayfaları yeniden okunur, canlı ekran görüntüsüyle ölçülür, tarihler güncellenir, kayıt altı ay ileri alınır.

## 8. Bilinen sınırlar

Bu boşluklar ölçülmedi. Dolduran proje bu dosyaya yazar.

- Canlı ölçüm tek iPhone'dan gelir. Android ve kısa ekran denetlenmedi.
- Madde 2'nin fotoğraf kapsamı yalnız Pulmaca'nın Konya videosunda ölçüldü (`@1`, `@5`, `@9`, `@14`, `@17` kareleri). Öteki şehir videoları ve başka projeler ölçülmedi.
- Reels'te arkadaş tepki balonları bazen solda y 1440–1670 arasına çıkar. Yatay sınırı ölçülmediği için bölge tablosunda yok.
- Reklam görünümü denetlenmedi. Meta'nın sayısı var, ama gerçek reklam ekranına bakılmadı.
- Facebook Reels için Meta sayısı bulunamadı, sayfası 404 verdi. Hikâye sayıları Facebook'ta da aynıdır, Reels için bu varsayılmaz.
- Bir İngilizce arama özeti hikâye altı için %20 diyor, canlı Türkçe sayfa %35 diyor. %35 esas alındı.
- Reels kapakları ve gerçek profil ızgarası kontrol edilmedi; ızgara kırpması `ikincil` kaynağa dayanır.
- Meta sayıları ve canlı ölçümler 2026-11-03'te Pulmaca oturumunda alındı (`magaza/sosyal/olcu-denetim-raporu.html`). Bu standart yazılırken Meta sayfaları yeniden açılmadı.

<!-- kullanici-talimati:basla -->
# Sosyal medya içeriği

Bu kural SNN aile standardıdır (`SNN-Standartlar/standartlar/sosyal-medya-olcu-standardi.md`). Instagram ya da Facebook görseli veya videosu üretirken önce o standardı oku. Sahibe göstermeden önce içeriği `quality/safe_zone.py` ile arayüz bindirmesiyle işaretle ve bak.
<!-- kullanici-talimati:bitir -->
