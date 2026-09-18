# Kod Dili Standardı (tüm projeler)

**Tanımlayıcılar İngilizce, insana yazılan her şey Türkçe.**

Bu kural aile geneli bağlayıcıdır. Bir projenin kendi `AI-RULES.md` / `CLAUDE.md` dosyası bu kuralla çelişen bir hüküm yazamaz.

## Neden (gerçek olay, 2026-09-17)

SNN-Piyasa-Core'da tüm tanımlayıcılar Türkçe yazıldı: dosya adları (`gun-sonu.ts`, `kaynak-zinciri.ts`), veritabanı tabloları (`gozlem`, `gun_sonu`, `cekim_gunlugu`), sütunlar (`cekilme_zamani`, `azami_sapma`), değişkenler, fonksiyonlar ve API alan adları (`deger`, `zaman`, `durum`, `yas_sn`).

Oysa aile standardı zaten yazılıydı: `SNN-Abacus-Core/AI-RULES.md` ve `ABACUS-SPEC.md` — *"Kod dili: İngilizce"*.

**Hata nasıl oluştu:** Piyasa-Core'un kendi `AI-RULES.md` dosyasına *"Kod dili: TypeScript (tanımlayıcılar Türkçe, ASCII)"* diye, aile standardıyla **çelişen** bir kural yazıldı ve bu çelişki proje sahibine sorulmadı. Hata 52 dosya, ~3.650 satır ve 10 tabloya yayıldıktan sonra, sahibi Supabase ekranında tablo adlarını görünce fark edildi.

**Asıl sorun kuralın yokluğu değil, yerinin yanlış olmasıydı.** Kural yalnız Abacus Core'un kendi dosyasında yazdığı için "aile kuralı" değil "tek proje kuralı" olarak duruyordu; diğer projeler onu miras almıyordu.

> **Benzetme:** Apartmanın kuralı yalnız 3. dairenin kapısına asılmışsa, o kural apartmanın değil, 3. dairenin kuralıdır. Kural apartman girişine asılır — bu dosya girişin kendisidir.

## Kural

### İngilizce yazılır (tanımlayıcılar)

| Alan | Örnek |
|---|---|
| Dosya ve klasör adları | `day-end.ts`, `src/chain/source-chain.ts` |
| Değişken, sabit, fonksiyon | `dayEnd`, `MAX_DEVIATION_BPS`, `resolveSymbols()` |
| Tip, arayüz, sınıf, enum | `SourceChain`, `ObservationRow` |
| Veritabanı: şema, tablo, sütun, kısıt, indeks, tetikleyici, fonksiyon | `market.observations`, `observed_at`, `observations_pkey` |
| API yolları ve sorgu parametreleri | `/v1/observations?symbol=XAU` |
| JSON alan adları (istek ve yanıt gövdeleri) | `{ "value": 1, "observedAt": "…" }` |
| Ortam değişkeni adları, iş/akış adları, kuyruk ve konu adları | `MARKET_API_KEY` |

### Türkçe kalır (insana yazılanlar)

| Alan | Not |
|---|---|
| Belgeler (`README`, `SPEC`, `docs/`) | Tamamı Türkçe |
| Kod yorumları | Tamamı Türkçe; kod adları yorumda olduğu gibi yazılır |
| Commit mesajları, PR başlık ve açıklamaları | Türkçe |
| Teknik borç kayıtları, karar kayıtları | Türkçe (bkz. `teknik-borc-standardi.md`) |
| Hata ve uyarı **metinleri** | `throw new Error('Gün sonu değeri bulunamadı')` — **metin** Türkçe, **alan adı** İngilizce |
| Kullanıcı arayüzü yazıları, e-posta ve bildirim gövdeleri | Türkçe |

**Ayrım tek cümlede:** Makinenin okuduğu ad İngilizce, insanın okuduğu cümle Türkçe.

### Gerekçe

1. **Aile tek dil konuşur.** Projeler arasında kod taşınıyor (ABACUS çekirdeği 10 projeye dağıtılıyor). İki dilli bir aile, her taşımada çeviri işi üretir.
2. **Araçların dili İngilizce.** Kütüphane işleri, veritabanı anahtar sözcükleri ve hata iletileri İngilizcedir; `select gun_sonu from gozlem` karışık bir cümledir.
3. **Türkçe karakter teknik tuzak taşır.** `ı/İ` dönüşümü ortama göre değişir; dosya adlarında ve veritabanı tanımlayıcılarında sessiz hatalar üretir.
4. **Belgeler Türkçe kalır.** Bu kural dili değil, **adlandırmayı** düzenler; proje sahibi kodu belgelerden okur.

### Sınır durumlar

| Durum | Ne yapılır |
|---|---|
| Türkiye'ye özgü kavramın İngilizce karşılığı **var** | Karşılığı kullanılır: fatura → `invoice`, poliçe → `policy`, teminat → `coverage`, ihale → `tender` |
| Karşılığı **kavramı taşımıyor** (plaka, TCKN, VKN, İKN) | Önce kısaltma denenir (`tckn`, `vkn`); yoksa **İngilizce harf çevirisi** yazılır: `plaka` → `plate`, `ruhsat` → `registration`. Gerçekten karşılığı yoksa Türkçe ad ASCII ile yazılır ve `.snn-kod-dili.json` içine **gerekçesiyle** istisna eklenir. |
| Dış kaynağın alan adı Türkçe | Dış veri **olduğu gibi** okunur (ör. TCMB XML `Tarih_Date`); sınırda İngilizce ada çevrilir. Dış ada dokunulmaz, istisna listesine yazılır. |
| Yasal/resmî bir ad birebir gerekiyor | Belgede Türkçe açıklanır, kodda İngilizce ada eşlenir. |
| Mevcut veritabanında Türkçe sütun var | Aşağıdaki geçiş kuralı uygulanır; uydurma çeviri için tablo yeniden adlandırılmaz. |

### Geçiş kuralı (mevcut projeler)

1. **Yeni kod bu kurala uyar.** Makine kapısı yalnız **eklenen satırları** tarar; bu yüzden eski adlar günlük işi kırmızıya boyamaz.
2. **Mevcut adlar kırıcı sürüm planıyla değişir.** Tablo/sütun ve dışa açık API alan adları için: kütüğe kayıt açılır, kırıcı sürüm (MAJOR) planlanır, tüketiciler PR ile göç ettirilir. Sessiz yeniden adlandırma yapılmaz.
3. **Canlıya uygulanmış migration dosyası düzenlenmez**; yeni migration yazılır.
4. Dokunulan dosyada yakındaki eski adlar fırsat buldukça (aynı kırıcı sürüm planı içinde) düzeltilir.

## Proje AI-RULES dosyaları

Her projenin `AI-RULES.md` / `CLAUDE.md` dosyası bu kurala **atıf yapar**, kuralı yeniden yazmaz:

```markdown
- **Kod dili:** Tanımlayıcılar İngilizce, belgeler ve yorumlar Türkçe.
  Kural: SNN-Standartlar/standartlar/kod-dili-standardi.md (aile standardı).
```

**Çelişki kuralı:** Bir proje kuralı aile standardıyla çelişiyorsa **iş durur ve proje sahibine sorulur.** Yapay zekâ çelişkiyi kendi kararıyla çözmez, çelişkili kuralı yazmaz. 2026-09-17 olayının maliyeti tam olarak bu adımın atlanmasıdır.

## Makine zorlaması

> Bu deponun ilkesi: **zorlanamayan madde kural değil, öneridir.**

| Kapı | Nerede | Ne yapar |
|---|---|---|
| **Tarayıcı** | `quality/code-language-scan.js` | Kaynak dosyalardaki tanımlayıcıları ve `.sql` dosyalarındaki tablo/sütun adlarını tarar. Türkçe harf (`ç ğ ı ö ş ü`) içeren ya da kelime listesinde geçen adları raporlar. Yorumlar, dizgeler ve belgeler **taranmaz**. |
| **GitHub akışı** | `.github/workflows/kod-dili.yml` (görevli) + `ornek/kod-dili.yml` (projeye kopyalanan tek dosya) | Her PR'da ve main gönderiminde **eklenen satırları** tarar; ihlalde kırılır. |

### Kullanım

```bash
# PR kapısı: yalnız eklenen satırlar (akışın çalıştırdığı kip)
node quality/code-language-scan.js --diff <taban-commit> <proje-klasörü>

# Tam denetim: git'teki tüm kaynak ve SQL dosyaları (göç planı çıkarmak için)
node quality/code-language-scan.js --tumu <proje-klasörü>

# Testler
node quality/test/code-language-scan.test.js
```

### Bir projeyi bağlamak

`ornek/kod-dili.yml` dosyasını projede `.github/workflows/kod-dili.yml` olarak kopyala. Başka ayar gerekmez.

**Ama sırası vardır.** Turnike yalnız yeni girenlere bakar, eski kodu kırmızıya boyamaz; yine de bir projede **sürmekte olan bir yeniden adlandırma göçü varsa** turnike o göç bitene kadar takılmaz — aksi hâlde proje kendi düzeltme PR'ını kendisi engeller. Adımlar, önerilen sıra ve her projenin ölçülmüş yükü: **`docs/kod-dili-gecis.md`**.

**Geçmişin temizliği projenin kendi işidir.** Ortak depo kuralı, tarayıcıyı, kayıt şablonunu ve istek metnini verir; projelerin dosyalarına dokunmaz.

### Kelime listesi ve istisnalar

- Kelime listesi veri dosyasındadır: `quality/data/turkish-words.json`. Ekleme ölçütü: kelime İngilizce bir sözcükle çakışmamalı. (`plan`, `not`, `para`, `son` gibi çakışanlar bilerek **listede değildir**.)
- Liste, tanımlayıcının **parçalarıyla** karşılaştırılır (`gunSonuKaydi` → `gun`, `sonu`, `kaydi`); metin içinde arama yapılmaz. Dar bir çekim eki toleransı vardır (`zamani` → `zaman`).
- Proje istisnaları kökteki `.snn-kod-dili.json` dosyasındadır. **Gerekçesiz istisna sayılmaz** ve uyarı üretir:

```json
{
  "exceptions": [
    { "name": "plaka", "reason": "Türkiye tescil plakası; 'plate' kavramı taşımıyor (TB-012)" }
  ],
  "paths": [
    { "path": "supabase/migrations/2026*", "reason": "canlıya uygulanmış migration değişmez (AI-RULES §5.6)" }
  ]
}
```

**İstisnası olmayan proje bu dosyayı oluşturmaz.** Boş iskelet (`{"exceptions": [], "paths": []}`) yazmak da gerekmez: tarayıcı ve iş akışı dosyanın yokluğunda sorunsuz çalışır (dosya okunamazsa boş liste sayılır). Boş dosya, ileride "burada zaten istisna var" izlenimi verir; olmayan şey yazılmaz.

**Yanlış alarm `paths` ile susturulmaz.** Tarayıcı bir ekran yazısını ya da yorumu tanımlayıcı sanıyorsa, o satır **kurala aykırı değildir** — muafiyet yazmak iki zarar üretir: (1) doğru olan bir şeye muafiyet yazmak kaydı kirletir, (2) dosyayı toptan muaf tutmak yarın aynı dosyaya girecek **gerçek** bir Türkçe tanımlayıcıyı da kör eder. Yapılacak olan: durumu SNN-Standartlar'a bildirmek; tarayıcı düzeltilir ve düzeltme tüm projelere aynı anda ulaşır. `paths` yalnız **gerçekten istisna olan gerçek adlar** içindir (canlıya uygulanmış migration, dış kaynağın alan adı gibi).

### Kelime listesi eksik kök bulunca (aile süreci)

Liste sonludur; Türkçe harf taşımayan bir kök (ör. `kasa`, `kur`, `hedef`) listede yoksa tarayıcıdan **sessizce geçer**. Bunu ilk gören genelde o projedir.

1. Proje eksik kökleri **SNN-Standartlar'a bildirir** (kendi listesine ekleme yapmaz; liste tek kaynaktır).
2. SNN-Standartlar kökleri ekler, **10 projede birden ölçer** ve her kök için en az bir gerçek örnek satır gösterir (yanlış alarm denetimi).
3. Ölçüm değiştiği için `docs/kod-dili-gecis.md` tablosu yenilenir; etkilenen projeler kendi kütük kayıtlarındaki sayıyı günceller.

**Neden tek kaynak:** kök listesi projeye göre değişirse aynı ad bir projede geçer, diğerinde kalır; "aile standardı" olmaktan çıkar.

### Bilinen sınırlar (ölçülmüştür, gizlenmez)

- Tarayıcı **ayrıştırıcı (parser) değildir**, satır bazlı çalışır. Yorum, dizge, JSX/HTML yazısı ve düzenli ifade gövdesi satır bazında atılır; blok yorumun `*` ile başlamayan gövde satırları ve çok satırlı şablon dizgelerin ortası taranabilir. Kalibrasyon (2026-09-18, 10 proje): yanlış alarm düzeltmeleriyle Portföy 3.780 → 922, GHS 3.127 → 697 bulguya indi.
- Kelime listesi sonludur: listede olmayan bir Türkçe kelime (ör. `nobet`) Türkçe harf içermiyorsa kaçar. Kaçan kelime listeye eklenerek kapatılır.
- Tarayıcı **niyet okumaz**: `data` gibi İngilizce ama anlamsız adları yakalamaz. Onlar kod incelemesinin işidir.

## Kontrol listesi maddesi

`standartlar/kod-inceleme-kontrol-listesi.md` içinde:

> Yeni tanımlayıcı (dosya, değişken, tip, tablo, sütun, API alanı) İngilizce mi? Proje kuralı aile standardıyla çelişiyor mu?

## Sözlük

| Terim | Türkçe karşılığı |
|---|---|
| Tanımlayıcı (identifier) | Kodda bir şeye verilen ad: dosya, değişken, tablo, sütun |
| Dizge (string) | Tırnak içindeki metin; kullanıcıya gösterilen yazı |
| Migration | Veritabanı yapısını değiştiren, sırayla çalışan dosya |
| Kırıcı sürüm (MAJOR) | Kullananların kodunu değiştirmesini gerektiren sürüm |
