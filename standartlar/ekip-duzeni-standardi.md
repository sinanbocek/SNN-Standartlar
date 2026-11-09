# Ekip Düzeni Standardı — Genel Müdür ve müdürler (çerçeve, tüm projeler)

Bu standart, bir projenin işini "Genel Müdür + müdürler" düzeniyle yürütmek isteyen projeler için ortak iskeleti verir. Genel Müdür: projenin ana oturumu. Müdür: Genel Müdür'ün `Agent` aracıyla iş verdiği, kendi görev kartı olan yardımcı ajan. Pano: işlerin ve durumun tek yerde toplandığı dosya.

> **Bu bir ÇERÇEVEDİR, katı kalıp değildir.**
> Her proje "Genel Müdür + müdürler" düzenini kendi ihtiyacına göre şekillendirir.
> Standart yalnız ortak iskeleti verir. Zorunlu departman listesi ya da tek dosya düzeni dayatmaz.

## Neden (vaka, 2026-11-09)

Düzen önce Pulmaca'da kuruldu, Gunum-Var onu örnek aldı. Örnek alınmasına rağmen müdür kümesi aynı kalmadı; proje kendi ihtiyacına göre değiştirdi, iskelet kaldı. Sayılar Genel Müdür'ün 2026-11-09 tarihli GitHub salt okuma ölçümüdür (`ekip/` klasörü ve `.claude/agents` listesi):

| Proje | Tarih | Müdürler | Klasör biçimi |
|---|---|---|---|
| SNN-Games-Pulmaca | 2026-11-05 | belge, pazarlama, rapor, tasarım, yazılım | `ekip/<ad>-muduru/` |
| Gunum-Var | 2026-11-08, PR #245 | belge, pazarlama, veritabanı, yayın, yazılım | `ekip/<ad>-muduru/` |
| SNN-Standartlar | 2026-11-08, PR #180 | yazılım, belge, ölçüm | `ekip/<ad>/` |

İlk ikisi talebin (#181) vakasıdır: farklı departman kümeleriyle aynı iskeleti kurdular. Üçüncüsü bu depodur.

Üç projede ortak olan yalnız yazılım ve belge müdürleridir. Bu "zorunlu" demek **değildir**. Ortak iki müdürü zorunlu liste sanma: pazarlama, rapor, tasarım, veritabanı, yayın ve ölçüm müdürleri yalnız ihtiyacı olan projede var.

Bu iskeletin işi hızlandırdığı ya da hata azalttığı ölçülmedi. Vaka yalnızca şunu gösterir: iskelet üç projede taşındı, müdür kümesi her projede değişti. Bu depodaki kurulumun (PR #180) Pulmaca'dan etkilenip etkilenmediği ölçülmedi. Aile listesindeki diğer projelere bakılmadı.

## Ortak iskelet

Düzeni kuran her proje şu dört maddeyi taşır.

1. **Ana oturum Genel Müdür'dür.** İşi dağıtır, denetler, commit ve PR'ı açar, kapanışı kendisi bitirir. Kod yazmaz.
2. **İş `Agent` ile ilgili müdüre verilir.** Model ve düşünme seviyesi her çağrıda açık yazılır (`alt-ajan-standardi.md`).
3. **Genel Müdür işi sonuna kadar götürür.** CI'ı bekler, birleşmeyi görür, yerini alan eski PR'ları kapatır, panoyu günceller. Sahibe yalnız sonuç brifi gider. Birleştirme koşulu `es-zamanli-calisma-standardi.md` §7'dedir; burada tekrar edilmez. "Eski PR'lar" yalnız Genel Müdür'ün kendi işinin yerini alanlardır; başkasının PR'ına dokunulmaz (`es-zamanli-calisma-standardi.md` §1 madde 4).
4. **Durum merkezî panoda tutulur.** Örnek: `ekip/PANO.md` ve `ekip/<departman>/DURUM.md`. Eski devir ve durum dosyaları arşive gider; kök dosyalar yönlendirme satırına döner (bilgi silinmez, taşınır).

## Diğer standartlarla sınır

Bu standart başka kuralları tekrar etmez; bağ verir.

- **"Kod yazmaz" okumayı yasaklamaz.** Küçük okuma ve sayım Genel Müdür'de kalır. Küçük işe müdür açılmaz (`alt-ajan-standardi.md` Kural 3).
- **Güvenlik incelemesi müdüre verilmez.** Genel Müdür kendisi yapar (`alt-ajan-standardi.md` Kural 8).
- **Çelişkide aile standardı önce gelir.** Proje düzeni bir aile standardıyla çelişirse standart geçerlidir.

## Zorunlu değil, projeye bırakılan

Aşağıdakilerin hiçbiri bu standartla dayatılmaz. Her proje kendi ihtiyacına göre seçer.

- **Hangi müdürler açılır.** Kaç müdür olacağı ve hangi departmanlar olduğu projenin kararıdır. Tablodaki adlar örnektir, liste değildir.
- **Dosya adlandırması.** `ekip/<ad>/` ya da `ekip/<ad>-muduru/` ya da başka bir düzen; görev kartı ve durum dosyası adları serbesttir.
- **Pano yapısı.** Tek sayfa mı, her müdüre ayrı durum dosyası mı, hangi başlıklar: proje seçer. Önemli olan durumun tek yerde bulunmasıdır.
- **Genel Müdür'ün açılışta okuduğu dosyalar.** Hangi dosyaların okunacağını proje kendi rehberine yazar.

Bu standart kapı (otomatik denetim), zorunlu geçiş ya da takvim getirmez. Mevcut projelere iş düşürmez, makineye bir şey kopyalamaz. Düzenin kurulup kurulmayacağına ve ne zaman kurulacağına proje karar verir.
