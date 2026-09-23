# SNN-Standartlar — bu depoda çalışma rehberi

**Aile standartları:** bu depo `sinanbocek/SNN-Standartlar`, ailenin kural kaynağıdır. 11 proje buradaki akışları çalıştırır.

Bu dosya **projeye özgü** olanı anlatır. Kuralların kendisi `standartlar/` altındadır; burada tekrar edilmez.

---

## 1. Bu depo ne yapar

Kural metni tutan bir kitaplık değil — **11 projenin her PR'da çalıştırdığı makine**.

```
trade-kasa'da PR açılır
  → kendi teknik-borc.yml'i: "asıl işi SNN-Standartlar yapsın"
  → GitHub buradaki dosyayı okur ve çalıştırır   (@main)
```

Sonuç: **buradaki bir değişiklik, bir sonraki çalışmada 11 projede geçerli olur.** Kimse bir şey kopyalamaz. Bu güç, dikkatin sebebidir.

Depo **herkese açık kalmak zorunda**: GHS-Panel başka bir hesapta (`globalhedef`) ve SNN-Abacus-Core herkese açık; GitHub gizli deponun akışlarını bu ikisine vermez. Ölçüldü, belgeyle doğrulandı (2026-09-19).

| Yol | Ne taşır | Projeye ulaşma | İş düşer mi |
|---|---|---|---|
| `@main` çağrısı | Görevli akışlar | Sonraki çalışmada | Hayır |
| Canlı kopya + bekçiler | Tarayıcı, kelime listesi, kurallar | Anında / sonraki oturumda | Hayır |
| `setup/setup-machine.js` | Kanca kodu | Sen çalıştırınca | **Evet, kasıtlı** |
| `ornek/*.yml` | Turnike şablonları | Projeye kopyalanır | Evet |

Kanca kodunun elle olması bilinçlidir: 2026-09-15'te canlı kopya bozulunca tüm projelerde oturum açılışı durdu. Kancalar da oradan gelseydi geri dönüş yolu da kırılırdı. **Kural akabilir; kuralı çalıştıran şey akmamalı.**

---

## 2. Bu depoda çalışma sırası

1. **Ölç** — iddia etmeden önce sayıyı al
2. **Dal aç** — `git checkout -b <tur>/<kisa-ad>` **ayrı bir komutta**
3. **Yaz + test** — saf mantık ayrı, IO ayrı
4. **Sabotaj** — kuralı bilerek boz, kırmızıya döndüğünü gör
5. **Gerçek veride çalıştır** — 11 projede ölç, yanlış alarmı say
6. **PR aç** — ölçümü gövdeye yaz
7. **Kontroller yeşil** olunca birleştir, **canlı kopyayı tazele**

```bash
node -e "console.log(require('os').homedir())"   # ev klasörü
```

Canlı kopyayı hemen tazelemek (PR birleşince):

```bash
node -e "console.log(require(require('os').homedir()+'/.claude/hooks/lib/shared.js').refresh({force:true}))"
```

---

## 3. Bilinen tuzaklar (hepsi 2026-09-19'da yaşandı)

**Bekçi kendi komutunu da okur.** Komut **metninde** yasak bir komut adı ya da birleştirme ifadesi geçerse engellenir — niyete bakmaz. Çözüm: komutu/yamayı dosyaya yaz, oradan çalıştır.

**Kabuk, ters bölü ve ters tırnağı yutar.** `node -e "..."` içinde `\\b`, `\\.`, `` ` `` kullanma; dosya bozulur. **Write/Edit araçlarını kullan.** Bugün bu yüzden üç dosya bozuldu.

**Dosyalar CRLF.** Çok satırlı çapa eşleşmez. Satır numarasıyla değiştir ya da satır sonunu koru.

**PR'ları üst üste bindirme.** Yeni dalı `origin/main`'den aç. Üstünde açık PR duran bir dal silinince o PR kapanır ve tabanı değiştirilemez (#18, 2026-09-18).

**Git'in varsayılanları izlenmeyen dosyayı gizler.** Bu tuzak bir haftada **iki kez** ısırdı:
`git ls-files` yeni dosyaları hiç listelemedi (kod dili tarayıcısı), `git status --porcelain`
yeni bir klasörü tek satırda bildirdi (`?? src/`) ve içindeki TS dosyaları tip kontrolü
kapısından muaf kaldı. Kural: tarama ya da kapı yazarken **izlenmeyen dosyayı açıkça iste** —
`ls-files --cached --others --exclude-standard`, `status --porcelain -uall`. Kapıyı kurduktan
sonra **yeni bir klasörle uçtan uca dene**; iki kaçak da ancak o denemede görüldü.

**Yerel klasör gerçeği göstermez.** Ölçüm `origin/main`'den yapılır. Yerel kopya geride olabilir ya da başka dalda durabilir; bu yüzden iki kez yanlış rapor üretildi.

**Okunamadı ≠ yok** (2026-09-23). Aile ölçümünü elle döngüyle yapma; `node quality/remote-read.js <yol>` kullan. Elle kurulan döngü aynı gün iki yanlış sonuç verdi: yanlış depo adından gelen 404 "yok" diye okundu, yerel klasördeki üçüncü tarafın deposu aileye sayıldı. gh'nin 404 metni, yanlış depo adında ve olmayan dosyada birebir aynıdır. Kural: `standartlar/olcum-standardi.md` Kural 3.

**Birleştirme kapısı kontrolleri bekler.** `gh pr checks <no> --watch -i 20` ile bekle; beklemesiz döngü istek hakkını bitirir.

---

## 4. Yeni bir kapı eklerken

`standartlar/olcum-standardi.md` zorunlu kılar; `quality/gate-registry.js` denetler ve CI'da kırar:

1. Kapıyı doğuran **gerçek vakayı** yaz — **tarihli**
2. O vakayı yakalayan **testi** yaz, önce kırmızı olduğunu gör
3. Kapıyı yaz, yeşile dönsün
4. **Sabotaj** — bilerek boz, kırmızıya döndüğünü gör
5. `quality/data/gates.json`'a kaydet
6. **Gerçek veride ölç**, yanlış alarmı yaz

6. adım atlanırsa kapı gürültü üretir. 2026-09-19'da aynı gün kurulan üç kapının üçü de yanlış alarm verdi; bir ajan bir kapıya iki kez boşuna takılırsa üçüncüsünde ciddiye almaz.

---

## 5. Yanlış alarm geldiğinde

Bir proje "bu yanlış alarm" diye bildirirse:

1. **Yeniden üret** — bildirimi olduğu gibi kabul etme
2. **Kök nedeni bul** — belirtiyi değil
3. **Düzelt + gerileme testi** — bildirilen gerçek satırı teste koy
4. **11 projede ölç** — düzeltme gerçek bulguları da gizledi mi? Düşen her bulguyu oku
5. Düzeltme birleşince tüketiciye kendiliğinden gider

`.snn-kod-dili.json` ile susturmak **yasaktır**: doğru olana muafiyet yazmak kaydı kirletir ve yarın aynı dosyaya girecek gerçek bir adı da kör eder.

---

## 6. Sık kullanılan komutlar

```bash
node quality/code-language-scan.js --tumu          # bu depo temiz mi
node quality/remote-read.js docs/teknik-borc.md    # dosya aile projelerinde var / yok / okunamadı
node quality/gate-registry.js                      # kapılar vakasını bildiriyor mu
node quality/compliance-issues.js <klasor>         # uyum issue planı (kuru)
node setup/setup-machine.js                        # makine farkı (kuru)
node debt-sync/debt-sync.js .                      # kütük senkronu (kuru)
```

Tüm testler:

```bash
for t in quality/test/*.test.js setup/test/*.test.js hooks/test/*.test.js debt-sync/test/*.test.js core/test/*.test.js; do node "$t" | tail -1; done
```

---

## 7. Nerede ne var

| Klasör | İçerik |
|---|---|
| `standartlar/` | Aile kuralları (6 belge) — kuralın kendisi |
| `quality/` | Tarayıcılar ve kapılar + `data/` (kelime listesi, istisnalar, kapı defteri) |
| `hooks/` | Bekçiler; makineye `setup/setup-machine.js` ile kopyalanır |
| `setup/` | Proje ve makine kurulumu |
| `debt-sync/` | Kütük → GitHub issue/board senkronu |
| `core/` | Çekirdek sürüm yayılımı |
| `ornek/` | Projelere kopyalanan turnike şablonları |
| `docs/` | Ölçümler, geçiş planları, kurulum belgeleri |

Ayrıntı: `docs/makine-kurulumu.md`, `docs/uyum-olcumu.md`, `docs/kod-dili-gecis.md`.

---

## 8. Kırmızı çizgiler

- **Başka projelerin dosyalarına dokunulmaz.** Ölçüm için okunur; değişiklik o projenin kendi ajanına bırakılır.
- **Anahtar değeri okunmaz, yazdırılmaz, sohbete istenmez.** Yalnız varlığı/uzunluğu ölçülür.
- **Bekçi devre dışı bırakılmaz**, kural gevşetilmez. Engellenen komut gerçekten gerekliyse proje sahibi kendisi çalıştırır.
- **Ölçmediğini iddia etme.** Ölçmediysen "ölçmedim" yaz (`standartlar/olcum-standardi.md`).
