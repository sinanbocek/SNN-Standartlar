# Sayı ve Kod Girişleri Standardı (tüm projeler)

Kullanıcının bir kutuya yazdığı her değerin kuralı. Kaynak vaka: GHS-Panel, 2026-09-17.

## Temel ilke: yanlış karakter hiç yazılamaz

**Kullanıcı yanlış veriyi yazabiliyorsa er ya da geç yazar.**

Bu yüzden her giriş alanında iki savunma **birlikte** bulunur:

| Savunma | Ne zaman çalışır | Ne yapar |
|---|---|---|
| **Süzme (yazarken)** | Kullanıcı her tuşa bastığında | Yasak karakter kutuya hiç girmez; biçim yazıldıkça kurulur |
| **Doğrulama (kaydederken)** | Kaydet düğmesine basınca | Kalan hataları yakalar: zorunlu alan boş, değer aralık dışı, algoritma tutmuyor |

**Kaydetme anındaki doğrulama tek başına yeterli değildir.** Tek başına kullanılırsa kullanıcı formu doldurur, kaydete basar ve hatayı ancak o zaman görür; yazdığı emek boşa gider.

> **Benzetme:** Kapıda bekçi olması iyidir, ama asıl doğrusu yanlış anahtarın kilide hiç girmemesidir. Bekçi, anahtar deliğe girdikten sonra değil, elde iken uyarmalıdır.

### Gerçek vaka (GHS-Panel, 2026-09-17)

| Alan | Yazılabilen değer | Olması gereken |
|---|---|---|
| Araç değeri | `121212scca` | `121.212` |
| Model yılı | harf girilebiliyordu | yalnız 4 hane rakam |
| Şasi numarası | 17 karakterden uzun yazılabiliyordu | en fazla 17 karakter, büyük harf |

Üçünde de hata ancak **kaydet** düğmesine basınca çıkıyordu. Araç değeri finansal bir alandır: yanlış yazılan tutar, primi ve teklifi yanlış hesaplatır.

## Alan türlerine göre kurallar

### 1. Para alanları

- Yalnız **rakam** kabul edilir.
- **Binlik ayracı yazıldıkça kurulur**: kullanıcı `1250000` yazarken kutuda `1.250.000` görür.
- Biçim **ABACUS para motorundan** gelir: `money.formatGroupedInput(raw)` kutunun canlı biçimidir, `money.parseNumber(raw)` kaydetmeden önce metni sayıya çevirir (boş ya da geçersizse `null`). Proje içinde bunların kopyası yazılmaz.
- **Yasak:** ham `toLocaleString`, `Intl.*`, `toFixed`, `toUpperCase`, `toLowerCase`. Bunlar tarayıcıya ve dil ayarına göre farklı sonuç verir; ABACUS tek ve ölçülmüş bir biçim üretir. **ABACUS 3.3.0'dan itibaren bu beş çağrı ESLint kuralıyla yakalanır** (`@snn/abacus-core/eslint`, hata seviyesi). Bilinçli kullanım `// eslint-disable-next-line no-restricted-properties -- gerekçe` ile geçer.

### 2. Yıl, adet, hane sayısı belli alanlar

- Yalnız **rakam**, ayrıca **uzunluk sınırı**: `text.digits(raw, maxLength)` (ABACUS 3.3.0). Model yılı 4 hane, ay 2 hane gibi.
- Sınır hem yazarken (fazla karakter kutuya hiç girmez) hem kaydederken (aralık denetimi, örneğin yıl 1900 ile içinde bulunulan yıl + 1 arası) uygulanır.

### 3. Kod alanları (şasi, plaka, motor no, ruhsat seri)

Ortak kural: **otomatik büyük harf**, araya giren **boşluklar atılır**, **uzunluk sınırlanır** (şasi numarası 17 karakter gibi).

Büyük harfe çevirmenin **iki ayrı doğrusu** vardır; alanın türüne göre seçilir:

| Alan | Doğru yol | Neden |
|---|---|---|
| Türkçe metin içerebilen alanlar (ad, unvan, açıklama) | `text.upper` | Türkçe harf kurallarını bilir: `ı → I`, `i → İ` |
| **Yalnız ASCII kod alanları** (şasi/VIN, motor no, ruhsat seri) | `text.toAsciiUpper` + `[A-Z0-9]` dışını süzme | Şasi numarasında Türkçe harf yoktur; `İ` yazmak kodu bozar |
| Plaka | `text.plate` | Ayraçları atar, Türkçe `ı/İ` tuzağını çözer, geçerliliği söyler |

**Ölçüm (2026-09-18, ABACUS 3.3.0 kaynağından çalıştırıldı):**

```
text.upper('irmaksasi')            => "İRMAKSASİ"   ← şasi alanı için YANLIŞ
text.toAsciiUpper('irmaksasi')     => "IRMAKSASI"   ← doğru
'irmaksasi'.toUpperCase()          => "IRMAKSASI"   ← sonucu doğru ama YASAK (bkz. aşağıda)
```

Yani **tek bir büyütme işi her alana uymaz**:
- Ham `toUpperCase` Türkçe metinde yanlıştır (`i → I`, oysa `İ` olmalı). Bu yüzden **yasaktır**; ABACUS 3.3.0'dan itibaren ESLint kuralı da yakalar.
- `text.upper` ise ASCII kod alanında yanlıştır (`i → İ`). Kod alanına uygulanmaz.
- ASCII kodlar için doğru yol: harf ve rakam dışını süz, sonra `text.toAsciiUpper` ile büyüt. Bu iş **ABACUS 3.3.0 ile çekirdeğe girdi** (bu standardın talebi üzerine; bkz. `docs/abacus-talebi-giris-suzme.md`). Proje içinde kopyası yazılmaz.

### 4. Telefon, TCKN, VKN, e-posta

- Değer, **ABACUS'un ilgili motoruyla saklama biçimine** çevrilir: `text.phone`, `text.email`. Her ikisi de saklanacak değeri (`stored`) ve ekranda gösterilecek biçimi (`display`) birlikte döndürür.
- Kaydetmeden önce doğrulama motoru çağrılır: `validate.tckn`, `validate.vkn`, `validate.email`, `validate.iban`.
- Ekranda gizlenmesi gereken yerlerde `mask` motoru kullanılır; `mask` yalnız gösterimi değiştirir, saklanan veriye dokunmaz.

## Uygulama biçimi

1. **Önce ABACUS'a bakılır.** İhtiyacın karşılığı çekirdekte varsa proje içinde yeniden yazılmaz:

   | İhtiyaç | ABACUS işi (3.3.0) |
   |---|---|
   | Yalnız rakam + uzunluk | `text.digits(raw, maxLength?)` |
   | Para kutusunun canlı biçimi | `money.formatGroupedInput(raw)` |
   | Kutudaki metni sayıya çevirme | `money.parseNumber(raw)` |
   | ASCII kod alanında büyük harf | `text.toAsciiUpper(raw)` |
   | Türkçe metinde büyük/küçük harf | `text.upper` · `text.lower` |
   | Plaka, telefon, e-posta | `text.plate` · `text.phone` · `text.email` |

2. Çekirdekte karşılığı olmayan kalan iş (ör. ASCII kod alanında harf/rakam dışını süzüp kesmek) **saf yardımcı fonksiyona** yazılır. Saf demek: aynı girdiye hep aynı çıktıyı verir, ekrana ya da veritabanına dokunmaz.
3. Her yardımcının **birim testi** olur. Testte en az şunlar bulunur: yasak karakter, uzunluk sınırı, boş girdi, sınır değeri.
4. Giriş bileşeni (input) yalnız bu yardımcıyı ya da ABACUS işini çağırır; süzme mantığı bileşenin içine yazılmaz.
5. **Her projede kopya mantık yazılmaz.** Proje içinde kalanlar tek dosyada toplanır (`src/utils/numberInput.ts` gibi).

**Referans uygulama:** GHS-Panel `src/utils/numberInput.ts` + `src/utils/numberInput.test.ts`. (Bu dosya ABACUS 3.3.0'dan önce yazıldı; `digitsOnlyInput` ve `groupedAmountInput` artık çekirdekteki karşılıklarına devredilebilir — kütüğe kayıt konusu.)

### Örnek kod

```ts
// src/utils/numberInput.ts — çekirdekte karşılığı olmayan tek iş
import { text } from '@snn/abacus-core';

/** ASCII kod alanı (şasi, motor no): yalnız harf/rakam, ASCII büyük harf, uzunluk sınırlı. */
export const codeInput = (raw: string, maxLength: number): string =>
  text.toAsciiUpper((raw ?? '').replace(/[^A-Za-z0-9]/g, '')).slice(0, maxLength);
```

```tsx
// Giriş bileşeni yalnız ABACUS işini ya da saf yardımcıyı çağırır
import { money, text } from '@snn/abacus-core';

<input
  value={aracDegeri}
  onChange={(e) => setAracDegeri(money.formatGroupedInput(e.target.value))}
  inputMode="numeric"
/>

<input
  value={modelYili}
  onChange={(e) => setModelYili(text.digits(e.target.value, 4))}
  inputMode="numeric"
/>

<input
  value={sasiNo}
  onChange={(e) => setSasiNo(codeInput(e.target.value, 17))}
/>
```

```ts
// Ölçülmüş çıktılar (ABACUS 3.3.0, 2026-09-18)
money.formatGroupedInput('121212scca')  // '121.212'
money.formatGroupedInput('1250000')     // '1.250.000'
money.parseNumber('1.250.000')          // 1250000
money.parseNumber('abc')                // null
text.digits('2o0a7')                    // '207'
text.digits('20267', 4)                 // '2026'
text.toAsciiUpper('irmaksasi')          // 'IRMAKSASI'
text.upper('irmaksasi')                 // 'İRMAKSASİ'  (Türkçe metin için doğru olan)

// Projedeki saf yardımcının kendi testi
expect(codeInput('nmt ab 1234', 17)).toBe('NMTAB1234');
expect(codeInput('irmak sasi', 17)).toBe('IRMAKSASI');   // İRMAKSASİ değil
expect(codeInput('', 17)).toBe('');
```

## Kontrol listesi maddesi

Kod incelemesinde (`standartlar/kod-inceleme-kontrol-listesi.md`) şu madde sorulur:

> Yeni giriş alanı eklendi mi? Yasak karakterler `onChange`'de süzülüyor mu, biçim yazarken kuruluyor mu, saf yardımcının testi var mı?

## ABACUS'a taşıma — sonuçlandı (3.3.0, 2026-09-18)

Bu standardın talebi çekirdeğe iletildi (`docs/abacus-talebi-giris-suzme.md`) ve **kabul edildi**: ABACUS 3.3.0, karar kaydı madde 33.

| Talep | Karar | Sonuç |
|---|---|---|
| A · ASCII büyütme | ✅ Kabul | `text.toAsciiUpper` |
| B · yalnız rakam + uzunluk | ✅ Kabul (`input` motoru değil, `text` içinde) | `text.digits(raw, maxLength?)` |
| C · para kutusunun canlı biçimi | ❌ Red — zaten vardı | `money.formatGroupedInput` |
| D · metni sayıya çevirme | ❌ Red — zaten vardı | `money.parseNumber` |
| E · ASCII kod süzme (`input.code`) | ❌ Red (ertelendi) — tek ekrandan geldi | Projede tek satır: `text.toAsciiUpper(raw.replace(/[^A-Za-z0-9]/g, ''))` |
| F · ham çağrılar için lint kuralı | ✅ Kabul — **hata** seviyesi | `Intl`, `toLocaleString`, `toFixed`, `toUpperCase`, `toLowerCase` |

**Tüketici projeleri ilgilendiren yan etki:** F maddesi yüzünden ABACUS'un ESLint kuralını kullanan projelerde 3.3.0'a geçildiğinde **yeni hatalar çıkabilir**. Kod davranışı değişmedi, yalnız denetim sertleşti. Ölçülen mevcut kullanım (2026-09-17): Portföy 164 `toLocaleString`/`Intl` + 289 `toFixed` + 245 `toUpperCase`, GHS 79 + 56 + 17, Gunum-Var 18 + 5 + 18. Bu yüzden sürüm yükseltmesi her projede **ayrı bir iş** olarak planlanır; kütüğe kayıt açılır, toplu `eslint-disable` ile geçiştirilmez.

**Bu standart için sonuç:** yukarıdaki kurallar artık çoğunlukla çekirdekten karşılanıyor; projede kalan tek iş ASCII kod alanının süzülmesidir.

## Sözlük

| Terim | Türkçe karşılığı |
|---|---|
| Giriş süzme (input masking) | Kullanıcı yazarken yasak karakterlerin kutuya hiç girmemesi |
| Saf fonksiyon (pure function) | Aynı girdiye hep aynı çıktıyı veren, dışarıya dokunmayan iş |
| Birim testi (unit test) | Tek bir işi tek başına sınayan küçük test |
| `onChange` | Kutudaki değer her değiştiğinde çalışan olay |
| ABACUS | Ortak hesaplama ve biçimlendirme çekirdeği (`@snn/abacus-core`) |
