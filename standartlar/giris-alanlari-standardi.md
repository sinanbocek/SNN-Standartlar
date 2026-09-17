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
- Kayıt anında kutudaki metin, saf bir yardımcı ile sayıya çevrilir (ayraçlar atılır).

### 2. Yıl, adet, hane sayısı belli alanlar

- Yalnız **rakam**, ayrıca **uzunluk sınırı** (`maxLength`): model yılı 4 hane, ay 2 hane gibi.
- Sınır hem yazarken (fazla karakter kutuya hiç girmez) hem kaydederken (aralık denetimi, örneğin yıl 1900 ile içinde bulunulan yıl + 1 arası) uygulanır.

### 3. Kod alanları (şasi, plaka, motor no, ruhsat seri)

- **Otomatik büyük harf**: `text.upper` kullanılır.
- Araya giren **boşluklar atılır**.
- **Uzunluk sınırlanır** (şasi numarası 17 karakter gibi).
- **Yasak:** ham `toUpperCase`. Türkçe harf tuzağı vardır: ham çağrı `i` harfini `I` yapar, oysa Türkçede karşılığı `İ`'dir; noktasız `ı` ise `I` olmalıdır. `text.upper` bunu doğru yapar.
- Plaka için hazır motor vardır: `text.plate` (ayraçları atar, Türkçe `ı/İ` tuzağını çözer, değerin geçerli olup olmadığını söyler).

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

/** Kod alanı: büyük harf (Türkçe güvenli), boşluksuz, uzunluk sınırlı. */
export const codeInput = (raw: string, maxLength: number): string =>
  text.upper((raw ?? '').replace(/\s+/g, '')).slice(0, maxLength);
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
expect(amountInputToNumber('1.250.000')).toBe(1250000);
expect(amountInputToNumber('')).toBeNull();
```

## Kontrol listesi maddesi

Kod incelemesinde (`standartlar/kod-inceleme-kontrol-listesi.md`) şu madde sorulur:

> Yeni giriş alanı eklendi mi? Yasak karakterler `onChange`'de süzülüyor mu, biçim yazarken kuruluyor mu, saf yardımcının testi var mı?

## Ek değerlendirme: bu yardımcılar ABACUS'a taşınmalı mı?

**Öneri: evet, ama önce ölçülerek ve iki adımda.** Karar proje sahibinindir.

**Neden taşınmalı**

- Biçimlendirme zaten ABACUS'ta (`money`, `text`, `validate`, `mask` motorları). Giriş süzme katmanı dışarıda kalırsa her proje kendi kopyasını yazar; kopyalar zamanla birbirinden ayrışır.
- ABACUS'ta "canlı giriş" kavramı **zaten başlamış**: `money.formatGroupedInput` işinin açıklaması "serbest ondalık giriş kutuları için CANLI biçimlendirme".
- ABACUS kendi ESLint yapılandırmasını yayımlıyor (`@snn/abacus-core/eslint`). Ham `toLocaleString` / `Intl` / `toFixed` / `toUpperCase` yasağı aynı yerden kurala bağlanabilir; yasak o zaman yazıya değil, derleme hattına yazılmış olur.
- Çekirdeğin yayılım görevlisi yeni sürümü tüketici projelere PR olarak taşır; tek kaynak kendiliğinden dağılır.

**Riskler**

- ABACUS saf bir hesaplama ve biçimlendirme çekirdeğidir. Arayüz kavramları (`onChange`, bileşen) oraya sızarsa sınırı bulanıklaşır. Çözüm: taşınan işler **yalnız metin → metin** olur; hiçbir React/DOM kavramı taşınmaz (`maxLength` sayı olarak verilir, bu bir arayüz kavramı değildir).
- Yeni işler API yüzeyini büyütür; ABACUS'ta yüzey ve belge denetimleri var (`api-surface.test.ts`, `docs-claims.test.ts`), her iş belgelenmelidir.
- Ana sürüm gerekmez (yalnız ekleme yapılır), ama tüketici projelerin sürümü yükseltmesi gerekir.

**Önerilen adımlar**

1. **Ölçüm:** 10 projede kaç giriş alanı var, kaçında kopya süzme mantığı yazılmış? Ölçülmeden taşınmaz.
2. **1. adım — küçük çekirdek:** `input.digitsOnly(raw, maxLength)`, `input.groupedAmount(raw)`, `input.amountToNumber(raw)`, `input.code(raw, maxLength)` işleri ABACUS'ta yeni bir `input` motoru olarak yayımlanır (MINOR sürüm). GHS-Panel'deki dosya bunları çağırmaya geçer, kendi testleri yerinde kalır.
3. **2. adım — kural:** ham `toLocaleString` / `Intl` / `toFixed` / `toUpperCase` yasağı ABACUS'un ESLint yapılandırmasına eklenir.
4. Taşıma bitene kadar projeler kendi `numberInput.ts` dosyasını kullanır; **bu standart o dosya için de geçerlidir.**

## Sözlük

| Terim | Türkçe karşılığı |
|---|---|
| Giriş süzme (input masking) | Kullanıcı yazarken yasak karakterlerin kutuya hiç girmemesi |
| Saf fonksiyon (pure function) | Aynı girdiye hep aynı çıktıyı veren, dışarıya dokunmayan iş |
| Birim testi (unit test) | Tek bir işi tek başına sınayan küçük test |
| `onChange` | Kutudaki değer her değiştiğinde çalışan olay |
| ABACUS | Ortak hesaplama ve biçimlendirme çekirdeği (`@snn/abacus-core`) |
