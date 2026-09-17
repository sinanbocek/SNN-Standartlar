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
- Biçim **ABACUS para motorundan** gelir: tam sayı girilen kutularda `money.fmtDecimalGrouped`, ondalık girilebilen kutularda `money.formatGroupedInput`.
- **Yasak:** ham `toLocaleString`, `Intl.NumberFormat`, `toFixed`. Bunlar tarayıcıya ve dil ayarına göre farklı sonuç verir; ABACUS tek ve ölçülmüş bir biçim üretir.
- Aynı yasak **ham `toUpperCase` / `toLowerCase`** için de geçerlidir (bkz. 3. madde). Tek istisna: dizede yalnızca ASCII harf ve rakam kaldığı **ölçülebilir biçimde garanti** edildikten sonra yapılan ASCII büyütme; o zaman Türkçe harf tuzağı zaten kalmamıştır.
- Kayıt anında kutudaki metin, saf bir yardımcı ile sayıya çevrilir (ayraçlar atılır).

### 2. Yıl, adet, hane sayısı belli alanlar

- Yalnız **rakam**, ayrıca **uzunluk sınırı** (`maxLength`): model yılı 4 hane, ay 2 hane gibi.
- Sınır hem yazarken (fazla karakter kutuya hiç girmez) hem kaydederken (aralık denetimi, örneğin yıl 1900 ile içinde bulunulan yıl + 1 arası) uygulanır.

### 3. Kod alanları (şasi, plaka, motor no, ruhsat seri)

Ortak kural: **otomatik büyük harf**, araya giren **boşluklar atılır**, **uzunluk sınırlanır** (şasi numarası 17 karakter gibi).

Büyük harfe çevirmenin **iki ayrı doğrusu** vardır; alanın türüne göre seçilir:

| Alan | Doğru yol | Neden |
|---|---|---|
| Türkçe metin içerebilen alanlar (ad, unvan, açıklama) | `text.upper` | Türkçe harf kurallarını bilir: `ı → I`, `i → İ` |
| **Yalnız ASCII kod alanları** (şasi/VIN, motor no, ruhsat seri) | ASCII büyütme + `[A-Z0-9]` dışını süzme | Şasi numarasında Türkçe harf yoktur; `İ` yazmak kodu bozar |
| Plaka | `text.plate` | Ayraçları atar, Türkçe `ı/İ` tuzağını çözer, geçerliliği söyler |

**Ölçüm (2026-09-17, ABACUS 3.2.0 kaynağından çalıştırıldı):**

```
text.upper('irmaksasi')            => "İRMAKSASİ"   ← şasi alanı için YANLIŞ
'irmaksasi'.toUpperCase()          => "IRMAKSASI"   ← burada doğru, ama Türkçe metinde yanlış
```

Yani **tek bir büyütme işi her alana uymaz**:
- Ham `toUpperCase` Türkçe metinde yanlıştır (`i → I`, oysa `İ` olmalı). Bu yüzden **yasaktır**.
- `text.upper` ise ASCII kod alanında yanlıştır (`i → İ`). Kod alanına uygulanmaz.
- ASCII kodlar için doğru yol: harf ve rakam dışını süz, sonra ASCII büyüt. ABACUS'ta bunun hazır karşılığı **henüz yok** (`text.toAsciiLower` var, büyütme ikizi yok) — çekirdeğe talep edildi: `docs/abacus-talebi-giris-suzme.md`. Gelene kadar proje içindeki saf yardımcı kullanılır.

### 4. Telefon, TCKN, VKN, e-posta

- Değer, **ABACUS'un ilgili motoruyla saklama biçimine** çevrilir: `text.phone`, `text.email`. Her ikisi de saklanacak değeri (`stored`) ve ekranda gösterilecek biçimi (`display`) birlikte döndürür.
- Kaydetmeden önce doğrulama motoru çağrılır: `validate.tckn`, `validate.vkn`, `validate.email`, `validate.iban`.
- Ekranda gizlenmesi gereken yerlerde `mask` motoru kullanılır; `mask` yalnız gösterimi değiştirir, saklanan veriye dokunmaz.

## Uygulama biçimi

1. Kural **saf yardımcı fonksiyona** yazılır. Saf demek: aynı girdiye hep aynı çıktıyı verir, ekrana ya da veritabanına dokunmaz.
2. Her yardımcının **birim testi** olur. Testte en az şunlar bulunur: yasak karakter, uzunluk sınırı, boş girdi, sınır değeri.
3. Giriş bileşeni (input) yalnız bu yardımcıyı çağırır; süzme mantığı bileşenin içine yazılmaz.
4. **Her projede kopya mantık yazılmaz.** Proje içinde tek dosyada toplanır (`src/utils/numberInput.ts` gibi); ortaklaşan işler ABACUS'a taşınır.

**Referans uygulama:** GHS-Panel `src/utils/numberInput.ts` (`digitsOnlyInput`, `groupedAmountInput`, `amountInputToNumber`) ve `src/utils/numberInput.test.ts`.

### Örnek kod

```ts
// src/utils/numberInput.ts — saf yardımcılar
import { money, text } from '@snn/abacus-core';

/** Yıl, adet gibi alanlar: yalnız rakam, en fazla `maxLength` hane. */
export const digitsOnlyInput = (raw: string, maxLength: number): string =>
  (raw ?? '').replace(/\D/g, '').slice(0, maxLength);

/** Para alanı: yalnız rakam; binlik ayracı yazarken kurulur (ABACUS biçimi). */
export const groupedAmountInput = (raw: string): string => {
  const digits = (raw ?? '').replace(/\D/g, '');
  if (digits === '') return '';
  return money.fmtDecimalGrouped(Number(digits), 0);
};

/** Ayraçlı para metnini sayıya çevirir; boş ya da geçersizse null. */
export const amountInputToNumber = (raw: string): number | null => {
  const digits = (raw ?? '').replace(/\D/g, '');
  return digits === '' ? null : Number(digits);
};

/** ASCII kod alanı (şasi, motor no): yalnız harf/rakam, ASCII büyük harf, sınırlı. */
export const codeInput = (raw: string, maxLength: number): string =>
  (raw ?? '').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, maxLength);

/** Türkçe metin alanı (ad, unvan): Türkçe kurallarına göre büyük harf. */
export const upperTextInput = (raw: string, maxLength: number): string =>
  text.upper(raw ?? '').slice(0, maxLength);
```

```tsx
// Giriş bileşeni yalnız yardımcıyı çağırır; süzme mantığı burada yazılmaz
<input
  value={aracDegeri}
  onChange={(e) => setAracDegeri(groupedAmountInput(e.target.value))}
  inputMode="numeric"
/>

<input
  value={sasiNo}
  onChange={(e) => setSasiNo(codeInput(e.target.value, 17))}
/>
```

```ts
// Birim testi: yasak karakter, uzunluk, boş girdi
expect(groupedAmountInput('121212scca')).toBe('121.212');
expect(groupedAmountInput('')).toBe('');
expect(digitsOnlyInput('2o0a7', 4)).toBe('207');
expect(digitsOnlyInput('20267', 4)).toBe('2026');
expect(codeInput('nmt ab 1234', 17)).toBe('NMTAB1234');
expect(codeInput('irmak sasi', 17)).toBe('IRMAKSASI');   // İRMAKSASİ değil
expect(upperTextInput('irmak', 50)).toBe('İRMAK');       // Türkçe metinde doğrusu bu
expect(amountInputToNumber('1.250.000')).toBe(1250000);
expect(amountInputToNumber('')).toBeNull();
```

## Kontrol listesi maddesi

Kod incelemesinde (`standartlar/kod-inceleme-kontrol-listesi.md`) şu madde sorulur:

> Yeni giriş alanı eklendi mi? Yasak karakterler `onChange`'de süzülüyor mu, biçim yazarken kuruluyor mu, saf yardımcının testi var mı?

## Ek değerlendirme: bu yardımcılar ABACUS'a taşınmalı mı?

**Bu, bu deponun kararı değildir.** ABACUS ayrı bir depodur ve kendi kabul kuralları vardır (`GERI-BILDIRIM-KAYDI.md`, `AI-RULES §4.1`). Burada yalnızca **ölçüm ve talep** üretilir; kararı çekirdek ekibi verir.

Hazırlanan talep metni: **`docs/abacus-talebi-giris-suzme.md`**. Çekirdek talebi kabul edene kadar bu standart, **projelerin kendi yardımcı dosyaları için** bağlayıcıdır.

Talebin dayandığı ölçüm (2026-09-17, `src` altında aynı iki satırlık süzme kuralının kopyaları):

| Proje | Geçiş | Dosya |
|---|---|---|
| GHS-Panel | 31 | 12 |
| SNN-Portfoy-Yonetimi | 24 | 10 |
| SNN-Yonetici-Ozeti | 59 | 8 |
| SNN-Proje-ve-Nakit-Akis-Yonetimi | 7 | 3 |
| Gunum-Var | 6 | 6 |
| SNN-Ihale-Maliyet-Teklif-Yonetimi | 2 | 2 |

Aynı kural 41 dosyada yeniden yazılmış ve sürümleri ayrışıyor. Ayrıca ASCII kod alanları için çekirdekte karşılık yok (yukarıdaki 3. madde). Talep bu iki bulguya dayanıyor.

## Sözlük

| Terim | Türkçe karşılığı |
|---|---|
| Giriş süzme (input masking) | Kullanıcı yazarken yasak karakterlerin kutuya hiç girmemesi |
| Saf fonksiyon (pure function) | Aynı girdiye hep aynı çıktıyı veren, dışarıya dokunmayan iş |
| Birim testi (unit test) | Tek bir işi tek başına sınayan küçük test |
| `onChange` | Kutudaki değer her değiştiğinde çalışan olay |
| ABACUS | Ortak hesaplama ve biçimlendirme çekirdeği (`@snn/abacus-core`) |
