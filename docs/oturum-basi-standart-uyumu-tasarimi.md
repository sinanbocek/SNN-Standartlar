# Oturum başı "standart uyumu" satırı — tasarım

**Durum:** tasarım · kod yazılmadı
**Tarih:** 2026-09-18
**Neden kod yok:** Bu belge yazıldığında çalışma klasöründe `refactor/english-names`
dalında 42 dosyalık, commit'lenmemiş bir yeniden adlandırma işi sürüyordu
(`kalite→quality`, `kurulum→setup`, `cekirdek→core`, `borc-senkron→debt-sync`).
Kod o iş birleştikten **sonra**, İngilizce adlarla yazılacak.

---

## 1. Amaç

Bugün oturum açılışında **teknik borç** görünüyor, **standart uyumu** görünmüyor.
Yani "bu projede ne kadar iş var" belli, "bu proje standartta mı" belli değil.

Bu satır o boşluğu kapatır. Tek cümlelik hedef:

> Yapay zekâ bir projede çalışmaya başlarken, o projenin standarttan
> **nerede saptığını** kendi inisiyatifiyle keşfetmek zorunda kalmaz; makine söyler.

## 2. Kapsam dışı (bilinçli)

- **Zamanlanmış (cron) iş yok.** Depodaki hiçbir akış zamanlanmış değil; hepsi
  olaya bağlı (push, PR, `workflow_call`). Bu satır da öyle kalır: bilgiye yalnız
  çalışırken ihtiyaç var.
- **Hiçbir şeyi otomatik düzeltmez.** Ölçer ve gösterir. Düzeltme kararı kullanıcınındır
  (`security-alerts.js` emsali: "kütüğe otomatik yazılmaz, kararı kullanıcı verir").
- **Kütüğe yazmaz.** Kütük tek kaynaktır.

## 3. Nereye takılır

`~/.claude/hooks/session-start.js` içinde, hâlihazırda iki kontrolün takılı olduğu
yere — `guide-freshness` ve `security-alerts`'ın hemen ardına, aynı kalıpla:

```js
try {
  const uyum = require(require('./lib/ortak').ortak('quality/standard-compliance.js')).check(root);
  if (uyum) lines.push(`   ⚠ ${uyum}`);
} catch (e) {
  lines.push(`   ⚠ standart uyumu kontrolü çalışmadı: ${e.message}`);
}
```

**Kritik kısıt:** dosya `~/.claude/standartlar-canli` içinden okunur ve o kopya yalnız
**main**'i izler (`ortak.js`). Yani kod main'e girmeden satır görünmez — ve main'de
hangi klasör adı varsa yol o olmalıdır.

## 4. Modül sözleşmesi

`guide-freshness.js` ile birebir aynı kalıp (öğrenilmiş desen, yenisi icat edilmez):

```
check(root)   → uyum nesnesi  (sapma yoksa null)
summary(r)    → tek satır metin (sapma yoksa '')
```

- Kendi başına da çalışır: `node quality/standard-compliance.js <proje-klasörü>`
- Testi `quality/test/standard-compliance.test.js` altında olur.
- **Çökmez.** Herhangi bir alt kontrol patlarsa o alan `?` olur, satır yine basılır.
  Oturum açılışını durduran bir kontrol, kontrolün kendisinden daha pahalıdır
  (2026-09-15'te bir kez yaşandı: `forgottenWork is not a function`).

## 5. Satır ne gösterir

```
   ⚠ Standart uyumu: kurulum 2 eksik · kod dili 7 bulgu · şema belgesi ⚠
```

Sapma yoksa **hiçbir şey basılmaz.** Temiz projede satır görünmez; gürültü üretmez.

| Alan | Kaynak | Ölçtüğü |
|---|---|---|
| kurulum | `setup/lib/setup-plan.js` → `pending()` + `userTasks()` | Akış dosyaları, board, `PROJECT_TOKEN`, depo güvenlik ayarları |
| kod dili | `quality/code-language-scan.js` → `taraTumu` | `kod-dili-standardi.md` ihlalleri |
| şema belgesi | `quality/schema-doc.js` | Yapısal migration gelmiş, şema belgesi güncellenmemiş |

**Zaten gösterilenler tekrarlanmaz:** teknik borç, rehber tazeliği, güvenlik uyarıları
ve "kütük yok" uyarısı bugün ayrı satırlarda var; bu satır onları kopyalamaz.

## 6. Hız — asıl tasarım kısıtı

Oturum açılışı beklemeye tahammül etmez. İki sınıfa ayrılır:

**A. Yerel ve hızlı (her oturum çalışır):** dosya var mı yok mu, `.github/workflows/`
içeriği, kod dili taraması. Ağ yok.

**B. Ağ gerektiren (önbellekli):** board, `PROJECT_TOKEN`, Dependabot ayarları —
`setup-plan.plan()` bunlar için GitHub'a sorar.
`security-alerts.js`'in **yarım günlük önbellek** deseni aynen kullanılır
(`CACHE_MS = 12 * 60 * 60 * 1000`): önbellek tazeyse ağ yok, bayatsa tek çağrı.

Önbellek okunamazsa alan `?` gösterir; oturum açılışı yavaşlatılmaz.

## 7. Kabul ölçütü

1. Temiz projede **hiç satır basmaz**.
2. Standarda bağlı olmayan projede kurulum eksiğini sayıyla gösterir.
3. Ağ kapalıyken oturum açılışı normal hızda tamamlanır, alan `?` olur.
4. Herhangi bir alt kontrol hata fırlattığında oturum açılışı durmaz.
5. Birim testi: her alan için sapmalı ve sapmasız durum.

## 8. Sonraki adım

Bu satır, daha büyük bir boşluğun **görünür ucudur**: bugün hiçbir standardın kaç
projede tuttuğunu bilmiyoruz. Satır proje başına bakar; bütüne bakan pano
(`tarama/panosu.md`) ayrı bir iştir ve bu satır çalıştıktan sonra ele alınır.

İlkesi şudur ve bu deponun her betiği zaten ona uyuyor, yalnız yazılı değil:

> **Bir kural, ihlalini sayan bir betikle birlikte gelmiyorsa standart değildir.**
