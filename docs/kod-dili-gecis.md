# Kod dili — bağlama süreci ve projelerin geçiş kayıtları

Kural: `standartlar/kod-dili-standardi.md`. Bu dosya **nasıl yayılacağını** anlatır.

> **Turnike benzetmesi:** Tarayıcı, apartman girişine takılan turnikedir. Yalnız **yeni girenlere** bakar; içeride oturanların eski kartlarını sökmez. Bu yüzden turnikeyi takmak, eski kodu kırmızıya boyamaz. Ama bir bina kimlik kartlarını yenilemenin tam ortasındaysa, turnike o işi yavaşlatır — oraya en son takılır.
>
> **Geçmişin temizliği her binanın kendi işidir.** Ortak depo turnikeyi ve kuralı verir; daire içine girip dolap düzenlemez.

## 1. Bağlama (turnike takma) süreci

Her proje için sırayla:

| Adım | Ne yapılır | Kim yapar |
|---|---|---|
| 1 | **Ölçüm:** `node kalite/kod-dili-tarama.js --tumu <proje>` çalıştırılır, sayı kaydedilir | Ortak depo (bu dosya) |
| 2 | **Kütük kaydı:** projenin `docs/teknik-borc.md` dosyasına geçiş kaydı açılır (§3 şablonu) | **Projenin kendi oturumu** |
| 3 | **İstisna dosyası:** varsa `.snn-kod-dili.json` yazılır (gerekçesiz istisna sayılmaz) | Projenin kendi oturumu |
| 4 | **Turnike:** `ornek/kod-dili.yml` → projede `.github/workflows/kod-dili.yml` olarak kopyalanır | Projenin kendi oturumu |
| 5 | **Doğrulama:** küçük bir PR açılır, akışın yeşil koştuğu görülür | Projenin kendi oturumu |
| 6 | **AI-RULES atfı:** proje rehberine aile standardına atıf satırı eklenir | Projenin kendi oturumu |

**Ön koşul (2. adımdan önce):** projede hâlihazırda bir yeniden adlandırma göçü sürüyorsa turnike **takılmaz**; göç bitene kadar beklenir. Aksi hâlde proje kendi düzeltme PR'ını kendisi engeller.

**Sıra (önerilen):**

1. **Temiz olanlar önce:** Naturapan (0 bulgu), SNN-İhale (75), Nakit-Akış (86), trade-kasa (290).
2. **Orta yoğunluk:** Abacus Core (110), Portföy (922), GHS (697).
3. **Yoğun olanlar:** Gunum-Var (1.646), Yönetici Özeti (6.740).
4. **En son SNN-Piyasa-Core:** şu anda İngilizceye çeviriliyor; çeviri main'e girmeden turnike takılmaz.
5. **SNN-Standartlar (bu depo):** TB-001 kapanınca kendi turnikesini takar. Kural koyan depo, kuralı en son değil en görünür biçimde uygular.

## 2. Ölçüm (2026-09-18, `--tumu`)

Tarayıcı yalnız tanımlayıcılara bakar; yorum, dizge, JSX yazısı ve düzenli ifade gövdesi taranmaz.

| Proje | Bulgu | Ayrı ad | Nerede | En sık adlar | Önerilen öncelik |
|---|---|---|---|---|---|
| Naturapan-Web-Sitesi | **0** | 0 | — | — | Kayıt gerekmez |
| SNN-Ihale-Maliyet-Teklif-Yonetimi | 75 | 68 | kaynak 75 | `teklif`, `birim`, `fiyat` | P3 |
| SNN-Proje-ve-Nakit-Akis-Yonetimi | 86 | 61 | kaynak 86 | `gün`, `İhale`, `Adı` | P3 |
| SNN-Abacus-Core | 110 | 26 | kaynak 108, yol 2 | `sonuc`, `yeniKayit`, `satir`, `gecerliHane` | P2 (kuralın kaynağı) |
| trade-kasa | 290 | 50 | kaynak 290 | `islem`, `alanaYaz`, `kayit` | P3 |
| SNN-Piyasa-Core | 303 | 94 | **sql 234**, kaynak 60, yol 9 | `sembol`, `kaynak`, `zaman`, `gun_sonu` | P2 (göç sürüyor) |
| GHS-Panel | 697 | 342 | kaynak 506, **sql 134**, yol 57 | `sonuc`, `v_kalan`, `musteri`, `tablo` | P2 |
| SNN-Portfoy-Yonetimi | 922 | 387 | kaynak 787, sql 121, yol 14 | `tarih`, `adet`, `fiyat`, `baslangic_sermaye` | P2 |
| Gunum-Var | 1.646 | 327 | kaynak 1.551, sql 82, yol 13 | `zincirKur`, `sonuc`, `hata`, `davet` | P2 |
| SNN-Yonetici-Ozeti | 6.740 | 425 | kaynak 6.737 | `hesapKodu`, `tablo`, `yil`, `grupKodu` | P2 |
| SNN-Standartlar (bu depo) | 166 | 46 | kaynak 141, yol 25 | `istisna`, `bulgular`, `satirlar` | TB-001 (P2, karar verildi) |

**Okuma notu:** "bulgu" toplam geçiş sayısıdır, "ayrı ad" kaç farklı ad olduğudur. İş yükünü **ayrı ad** sayısı belirler; aynı ad çoğu zaman tek bir yeniden adlandırmayla düzelir.

**Veritabanı sütunları ayrı ele alınır** (Piyasa-Core 234, GHS 134, Portföy 121, Gunum-Var 82): bunlar dışa açık arayüzdür, kırıcı sürüm planı gerektirir. Kod içi adlar ise proje içinde kalır, tek PR'da düzelebilir.

## 3. Projenin kütüğüne açılacak kayıt — şablon

Her proje bu kaydı **kendi oturumunda** açar. `<PROJE>`, `<BULGU>`, `<AYRI_AD>`, `<SQL>` alanları yukarıdaki tablodan doldurulur; `TB-xxx` numarası o projedeki en büyük numaranın bir fazlasıdır.

```markdown
### TB-xxx — Kod dili: Türkçe tanımlayıcılar İngilizceye taşınacak
- **Tespit Tarihi:** 2026-09-18 (SNN-Standartlar kod dili standardı yayımlandı)
- **Öncelik:** P2 (Planlı)

#### 🟢 Sade Anlatım
- **Sorun ne?** Kodun içindeki adlar (dosya adları, değişkenler, veritabanı tabloları ve sütunları) Türkçe yazılmış. Aile standardı bunların İngilizce olmasını istiyor; belgeler, yorumlar ve ekrandaki yazılar Türkçe kalmaya devam edecek.
- **Benzetme:** Apartmanın bütün daireleri aynı marka kilidi kullanıyor, bu daire farklı marka takmış. Kapı çalışıyor ama ortak anahtar sistemi bu daireye uymuyor.
- **Çözülmezse ne olur?** Bugün bir arıza çıkarmaz. Ama projeler arasında kod taşındığında her seferinde çeviri işi doğar; veritabanı sütun adları Türkçe kaldıkça, ileride değiştirmek kırıcı sürüm gerektirir ve maliyet büyür.
- **Senden beklenen karar:** Veritabanı sütun/tablo adları değişecekse ne zaman? (Kod içi adlar karar gerektirmez, sıradan temizliktir.)

#### 🔧 Teknik Detay
- **Açıklama:** `node <standartlar>/kalite/kod-dili-tarama.js --tumu .` ölçümü (2026-09-18): **<BULGU> bulgu, <AYRI_AD> ayrı ad** (<SQL> tanesi `.sql` dosyalarında).
- **Etki:** Çalışan üründe davranış etkisi yok; bakım ve taşınabilirlik etkisi var.
- **Çözüm yönü:** (1) Kod içi adlar: dosya/klasör adları ve dışa açık işler önce, iç değişkenler sonra; her adım ayrı PR, testler yeşil kalmalı. (2) Veritabanı adları: ayrı ve kırıcı sürüm planıyla; canlıya uygulanmış migration düzenlenmez, yeni migration yazılır. (3) Türkiye'ye özgü, karşılığı olmayan adlar `.snn-kod-dili.json` içine gerekçesiyle istisna yazılır.
- **Neden Şimdi Çözülmüyor:** Mekanik ve geniş bir iştir; sıradaki işlerin önüne geçmez. Yeni kod bugünden itibaren kurala uyar.
- **Bağlı kalemler:** Yok.
```

## 4. Projenin oturumuna verilecek istek metni

Aşağıdaki metin, ilgili projenin kendi oturumuna **olduğu gibi** verilir. Ortak depo o projeye dosya yazmaz.

```
SNN-Standartlar deposunda yeni bir aile standardı yayımlandı: standartlar/kod-dili-standardi.md
— tanımlayıcılar (dosya/klasör adı, değişken, fonksiyon, tip, tablo, sütun, kısıt, indeks, API yolu,
sorgu parametresi, JSON alan adı) İngilizce; belgeler, yorumlar, commit mesajları, kütük kayıtları
ve kullanıcıya giden metinler Türkçe.

Bu projede yapılacaklar (sırayla, her adım ayrı PR):

1. Ölçüm: node <SNN-Standartlar yolu>/kalite/kod-dili-tarama.js --tumu .
   Beklenen mertebe (2026-09-18 ölçümü): <BULGU> bulgu / <AYRI_AD> ayrı ad.
2. docs/teknik-borc.md dosyasına geçiş kaydını aç (şablon: SNN-Standartlar/docs/kod-dili-gecis.md §3).
   Numara projedeki en büyük TB numarasının bir fazlası olsun.
3. Türkiye'ye özgü, İngilizce karşılığı kavramı taşımayan adlar varsa kökte .snn-kod-dili.json
   dosyasına gerekçesiyle yaz (gerekçesiz istisna sayılmaz).
4. SNN-Standartlar/ornek/kod-dili.yml dosyasını .github/workflows/kod-dili.yml olarak kopyala.
   Bu akış yalnız PR'da EKLENEN satırları tarar; mevcut kod kırmızı vermez.
   ÖN KOŞUL: projede sürmekte olan bir yeniden adlandırma göçü varsa bu adımı göç bitene kadar erteleyin.
5. Proje rehberine (AI-RULES.md / CLAUDE.md) atıf satırını ekle:
   "- **Kod dili:** Tanımlayıcılar İngilizce, belgeler ve yorumlar Türkçe.
      Kural: SNN-Standartlar/standartlar/kod-dili-standardi.md (aile standardı)."
   Proje kuralı aile standardıyla çelişen bir hüküm YAZMAZ. Çelişki görülürse iş durur, proje
   sahibine sorulur.

Geçmiş kodun temizliği bu projenin kendi işidir; sıralamasını ve zamanını proje sahibiyle
kararlaştırın. Veritabanı tablo/sütun adları kırıcı sürüm planı ister, kod içi adlar istemez.
```

## 5. Tarayıcının bilinen sınırları (ölçüldü)

2026-09-18 kalibrasyonunda yanlış alarmlar üç düzeltmeyle azaltıldı: JSX/HTML metinleri, düzenli ifade gövdeleri ve tek kelimelik yazı satırları artık taranmıyor. Ölçülen etki: Portföy 3.780 → 922, GHS 3.127 → 697, İhale 528 → 75 bulgu.

Kalan sınırlar:

- Çok satırlı şablon dizgelerin (`` ` ``) ortasındaki satırlar kod sanılabilir; bu satırlardaki yazı hâlâ bulgu üretebilir.
- Kelime listesi sonludur; listede olmayan Türkçe kelime, Türkçe harf içermiyorsa kaçar.
- Tarayıcı niyet okumaz: İngilizce ama anlamsız adları (`data`, `temp`) yakalamaz — o, kod incelemesinin işidir.

Yanlış alarm görülürse önce **kelime listesi** (`kalite/veri/turkce-kelimeler.json`) ve **istisna dosyası** kullanılır; kural gevşetilmez.
