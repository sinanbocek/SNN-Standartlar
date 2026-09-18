# ABACUS çekirdeğine talep — giriş süzme (input) katmanı

**Kaynak:** SNN-Standartlar · `standartlar/giris-alanlari-standardi.md`
**Tarih:** 2026-09-17 · **Ölçülen çekirdek sürümü:** 3.2.0
**Talep eden ekran vakaları:** GHS-Panel araç formu (2026-09-17), SNN-İhale gün kutusu (2026-09-16)

> Bu metin çekirdeğe iletilmek üzere hazırlanmıştır. `GERI-BILDIRIM-KAYDI.md` → "Talep nasıl gönderilir" bölümündeki dört şart ve `AI-RULES §4.1` sınavı aşağıda yazılı olarak uygulanmıştır. Karar çekirdek ekibinindir; SNN-Standartlar tarafında çekirdeğe hiçbir değişiklik yapılmamıştır.

---

## 1. Şart 1 — Gerçek ekranda karşılaşılmış ihtiyaç

**GHS-Panel, araç formu (2026-09-17):**

| Alan | Kullanıcının yazabildiği | Sonuç |
|---|---|---|
| Araç değeri | `121212scca` | Finansal alan; hata ancak kaydet anında çıkıyordu |
| Model yılı | harf kabul ediyordu | — |
| Şasi numarası | 17 karakterden uzun | — |

Düzeltme `src/utils/numberInput.ts` + `numberInput.test.ts` ile yerelde yapıldı (commit `6626a1f`).

**SNN-İhale, gün kutusu (2026-09-16) — ikinci tüketici, bağımsız olay:**
`src/presentation/app/format.ts:47` içindeki `formatDayInput` işinin başlığı aynen şöyle: *"Gün kutusu: yalnız rakam ve baştaki eksi... Harf ve simgeler kutuya hiç girmez (proje sahibi 2026-09-16: `3asa`)."*

İki proje, iki ayrı gün, aynı ihtiyaç, birbirinden habersiz iki ayrı çözüm. Madde 9'daki "tek tüketici" gerekçesi bu talep için geçerli değildir.

## 2. Şart 2 — `AI-RULES §4.1` yerleştirme sınavı (yazılı)

> **SINAV:** Başka bir şirketin, başka bir alandaki uygulaması bu fonksiyonu aynen kullanabilir miydi?

| Aday iş | Sınav | Karar |
|---|---|---|
| `digitsOnly(raw, maxLength)` | Yalnız **metin** bilir. Sigorta, kargo, muhasebe, herhangi bir alan aynen kullanır. | **Evet → çekirdek** |
| `groupedAmount(raw)` | Yalnız **metin + para biçimi** bilir; biçim zaten çekirdekten geliyor. | **Evet → çekirdek** |
| `amountToNumber(raw)` | Yalnız metin → sayı. | **Evet → çekirdek** |
| `asciiCode(raw, maxLength)` (ASCII büyütme + `[A-Z0-9]` süzme) | Yalnız metin bilir. Şasi, IBAN öneki, ürün kodu, barkod — alan kavramı yok. | **Evet → çekirdek** |

İmzalarda hiçbir alan kavramı (poliçe, araç, teklif, ihale) geçmiyor; hiçbirinde React/DOM kavramı yok — hepsi **metin → metin**. `maxLength` bir arayüz değil, sayı parametresidir.

### Elenen adaylar (talebin elenerek geldiğini göstermek için)

| Aday | Neden elendi |
|---|---|
| `vehicleValueInput` (araç değeri kutusu) | "Araç" alan kavramı. Uygulamada kalır; içeride `groupedAmount` çağırır. |
| `plateInput` | Çekirdekte zaten var: `text.plate`. Yeni iş gerekmez. |
| `phoneInput`, `tcknInput` | Çekirdekte zaten karşılığı var: `text.phone`, `validate.tckn`. Yeni iş gerekmez. |
| React `<NumberField>` bileşeni | Arayüz katmanı. §4.1 gereği çekirdeğe giremez; uygulamada kalır. |
| "Kaydet anında doğrulama" akışı | İş kuralı, hesap değil. Uygulamada kalır. |
| `formatDayInput` (baştaki eksi korunur) | Sınavı geçiyor ama tek ekrandan geliyor; **şimdilik elendi**. İkinci bir ekran çıkarsa ayrıca başvurulur. |

## 3. Şart 3 — Ölçülmüş çıktı

Aşağıdaki satırlar **çalıştırılmış koddan** alınmıştır (çekirdek kaynağı `SNN-Abacus-Core/src/abacus`, sürüm 3.2.0; esbuild ile paketlenip Node üzerinde koşturuldu, 2026-09-17):

```
groupedAmount('121212scca')      => "121.212"
groupedAmount('1250000')         => "1.250.000"
groupedAmount('000')             => "0"
groupedAmount('')                => ""
digitsOnly('2o0a7', 4)           => "207"
digitsOnly('20267', 4)           => "2026"
amountToNumber('1.250.000')      => 1250000
amountToNumber('abc')            => null
```

**Asıl bulgu — ASCII kod alanlarında çekirdekte boşluk var:**

```
text.upper('irmaksasi')          => "İRMAKSASİ"    ← şasi numarası için YANLIŞ
'irmaksasi'.toUpperCase()        => "IRMAKSASI"    ← burada doğru, Türkçe metinde yanlış
```

`text.upper` Türkçe metin için doğrudur (`i → İ`), ama şasi/motor numarası gibi **ASCII kodlarda** kodu bozar. Çekirdekte `text.toAsciiLower` **var**, büyütme ikizi **yok**. Bugün tüketicinin elinde doğru bir seçenek bulunmuyor: Türkçe-doğru iş yanlış sonuç veriyor, doğru sonuç veren çağrı ise (ham `toUpperCase`) çekirdeğin kendi ilkesine aykırı.

## 4. Şart 4 — Değerlendirilmiş alternatif: neden tüketicide kalamıyor?

Kopya mantığın bugünkü ölçümü (`replace(/\D/g` ve `replace(/[^0-9]/g` geçişleri, `src` altında, 2026-09-17):

| Proje | Geçiş | Dosya |
|---|---|---|
| GHS-Panel | 31 | 12 |
| SNN-Portfoy-Yonetimi | 24 | 10 |
| SNN-Yonetici-Ozeti | 59 | 8 |
| SNN-Proje-ve-Nakit-Akis-Yonetimi | 7 | 3 |
| Gunum-Var | 6 | 6 |
| SNN-Ihale-Maliyet-Teklif-Yonetimi | 2 | 2 |

Aynı iki satırlık kural **41 dosyada** yeniden yazılmış durumda ve sürümleri ayrışıyor. İki somut örnek:

- `SNN-Portfoy-Yonetimi/src/NewApp/components/FormattedInput.tsx:19` — giriş kutusunun biçimi `new Intl.NumberFormat('tr-TR', …)` ile kuruluyor, yani çekirdek dışı.
- `SNN-Proje-ve-Nakit-Akis-Yonetimi/.../EditProjectForm.tsx:262` ve `CreateProjectForm.tsx:267` — aynı satır iki dosyada kopyalanmış.

Tüketicide kalırsa: her proje kendi kopyasını taşır, biri düzeltilince diğerleri düzelmez ve para alanlarının biçimi çekirdek dışı yollardan üretilmeye devam eder.

## 5. Talep edilenler

| # | İstenen | Tür | Not |
|---|---|---|---|
| A | `text.toAsciiUpper(raw)` — `toAsciiLower` işinin büyütme ikizi | MINOR, ekleme | Ölçülmüş boşluk (§3). Tek başına bile değerlidir. |
| B | `input.digitsOnly(raw, maxLength)` | MINOR, ekleme | İki tüketicide kanıtlı |
| C | `input.groupedAmount(raw)` — tam sayı para kutusu için canlı biçim | MINOR, ekleme | `money.formatGroupedInput` ile aynı aileden |
| D | `input.amountToNumber(raw)` | MINOR, ekleme | C'nin ters işi |
| E | `input.code(raw, maxLength)` — `[A-Za-z0-9]` süz + ASCII büyüt + kes | MINOR, ekleme | A'nın üzerine kurulur |
| F | Ham `toLocaleString` / `Intl.NumberFormat` / `toFixed` / `toUpperCase` için lint kuralı | ESLint yapılandırması | Madde 5a'nın kurduğu emsalin aynısı: ada bakan kapı |

**Neden ayrı bir `input` motoru?** Çekirdekte bu kavram zaten başlamış durumda: `money.formatGroupedInput` işinin belgesi "serbest ondalık giriş kutuları için CANLI biçimlendirme" diyor. B–E işleri o işin komşularıdır; `money`, `text` ve `validate` arasına dağıtmak yerine tek adla toplanması önerilir. Çekirdek ekibi bunları mevcut motorlara dağıtmayı tercih ederse itirazımız yoktur; talebin özü **işlerin çekirdeğe girmesi**, adı değil.

**Talebin bilinçli sınırı:** Hiçbir React/DOM kavramı, hiçbir bileşen, hiçbir "form" kavramı talep edilmiyor. Kaydet anındaki doğrulama akışı ve alan kavramları tüketicide kalır.

## 6. Kabul edilmezse ne olur?

Tüketici projeler kendi `numberInput.ts` dosyalarını kullanmaya devam eder; SNN-Standartlar'daki `standartlar/giris-alanlari-standardi.md` bu dosyalar için de bağlayıcıdır. O durumda en azından **A maddesinin** (ASCII büyütme) ayrıca değerlendirilmesini isteriz: bugün ASCII kod alanları için çekirdekte doğru bir seçenek yok ve tüketici ya yanlış harf üretmek ya da çekirdeğin ilkesini çiğnemek zorunda kalıyor.

## 7. Yeniden üretme (ölçümü kendiniz çalıştırmak için)

Ölçüm betiği geçici klasörde tutuldu, hiçbir depoya işlenmedi. İçeriği şudur:

```ts
import { money, text } from '@snn/abacus-core';

const digitsOnly = (raw: string, max: number) => (raw ?? '').replace(/\D/g, '').slice(0, max);
const grouped = (raw: string) => {
  const d = (raw ?? '').replace(/\D/g, '');
  return d === '' ? '' : money.fmtDecimalGrouped(Number(d), 0);
};
const toNum = (raw: string) => {
  const d = (raw ?? '').replace(/\D/g, '');
  return d === '' ? null : Number(d);
};

console.log(grouped('121212scca'), digitsOnly('2o0a7', 4), toNum('1.250.000'));
console.log(text.upper('irmaksasi'), 'irmaksasi'.toUpperCase());
```

---

## SONUÇ (2026-09-18) — talep kabul edildi, ABACUS 3.3.0

Çekirdek ekibinin kararı (`GERI-BILDIRIM-KAYDI.md` madde 33, talep #7):

- ✅ **A** → `text.toAsciiUpper(str)` — yalnız `a-z` büyütür, Türkçe harfe dokunmaz.
- ✅ **B** → `text.digits(raw, maxLength?)` — ayrı `input` motoru açılmadı; iş metin işidir, `text` içine girdi.
- ❌ **C, D** → karşılıkları zaten vardı: `money.formatGroupedInput`, `money.parseNumber`. Talebin örnekleri bu ikisiyle çalıştırılmış, çıktılar birebir aynı çıkmış. (Bu maddeler talep gönderilmeden önce daha iyi taranmalıydı; ders: talepten önce çekirdeğin mevcut yüzeyi işlev işlev okunur.)
- ❌ **E** → `input.code` ertelendi: tek ekrandan geldi. `toAsciiUpper` ile tüketicide tek satır.
- ✅ **F** → lint kuralı **hata** seviyesinde eklendi; `toLowerCase` de kapsama girdi.

Doğrulama (3.3.0 kaynağından çalıştırıldı, 2026-09-18):

```
text.toAsciiUpper('irmaksasi')          => "IRMAKSASI"
text.upper('irmaksasi')                 => "İRMAKSASİ"
text.digits('2o0a7')                    => "207"
text.digits('20267', 4)                 => "2026"
money.formatGroupedInput('121212scca')  => "121.212"
money.parseNumber('1.250.000')          => 1250000
money.parseNumber('abc')                => null
```

Standart bu sonuca göre güncellendi: `standartlar/giris-alanlari-standardi.md`.
