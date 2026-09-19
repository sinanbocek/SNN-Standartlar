# Kod dili — bağlama süreci ve projelerin geçiş kayıtları

Kural: `standartlar/kod-dili-standardi.md`. Bu dosya **nasıl yayılacağını** anlatır.

> **Turnike benzetmesi:** Tarayıcı, apartman girişine takılan turnikedir. Yalnız **yeni girenlere** bakar; içeride oturanların eski kartlarını sökmez. Bu yüzden turnikeyi takmak, eski kodu kırmızıya boyamaz. Ama bir bina kimlik kartlarını yenilemenin tam ortasındaysa, turnike o işi yavaşlatır — oraya en son takılır.
>
> **Geçmişin temizliği her binanın kendi işidir.** Ortak depo turnikeyi ve kuralı verir; daire içine girip dolap düzenlemez.

## 1. Bağlama (turnike takma) süreci

Her proje için sırayla:

| Adım | Ne yapılır | Kim yapar |
|---|---|---|
| 1 | **Ölçüm:** `node quality/code-language-scan.js --tumu <proje>` çalıştırılır, sayı kaydedilir | Ortak depo (bu dosya) |
| 2 | **Kütük kaydı:** projenin `docs/teknik-borc.md` dosyasına geçiş kaydı açılır (§3 şablonu) | **Projenin kendi oturumu** |
| 3 | **İstisna dosyası:** varsa `.snn-kod-dili.json` yazılır (gerekçesiz istisna sayılmaz) | Projenin kendi oturumu |
| 4 | **Turnike:** `ornek/kod-dili.yml` → projede `.github/workflows/kod-dili.yml` olarak kopyalanır | Projenin kendi oturumu |
| 5 | **Doğrulama:** küçük bir PR açılır, akışın yeşil koştuğu görülür | Projenin kendi oturumu |
| 6 | **AI-RULES atfı:** proje rehberine aile standardına atıf satırı eklenir | Projenin kendi oturumu |

**Ön koşul (2. adımdan önce):** projede hâlihazırda bir yeniden adlandırma göçü sürüyorsa turnike **takılmaz**; göç bitene kadar beklenir. Aksi hâlde proje kendi düzeltme PR'ını kendisi engeller.

**Sıra (önerilen):**

1. **Temiz olanlar önce:** Naturapan (0 bulgu), Nakit-Akış (22), SNN-İhale (65), Abacus Core (116).
2. **Orta yoğunluk:** trade-kasa (382), GHS (455), Portföy (846).
3. **Yoğun olanlar:** Gunum-Var (1.833), Yönetici Özeti (10.153).
4. **En son SNN-Piyasa-Core:** şu anda İngilizceye çeviriliyor; çeviri main'e girmeden turnike takılmaz.
5. **SNN-Standartlar (bu depo):** TB-001 kapanınca kendi turnikesini takar. Kural koyan depo, kuralı en son değil en görünür biçimde uygular.

## 2. Ölçüm (2026-09-19, aile geneli istisna kararından sonra)

Tarayıcı yalnız tanımlayıcılara bakar; yorum, dizge, JSX yazısı ve düzenli ifade gövdesi taranmaz.

| Proje | Bulgu | Ayrı ad | Nerede | En sık adlar | Önerilen öncelik |
|---|---|---|---|---|---|
| Naturapan-Web-Sitesi | **0** | 0 | — | — | Kayıt gerekmez |
| SNN-Standartlar (bu depo) | **0** | 0 | — | TB-001 kapandı | — |
| SNN-Proje-ve-Nakit-Akis-Yonetimi | 22 | 20 | kaynak 22 | `İhaleler`, `Tedarikçi`, `Keşideci` | P3 |
| SNN-Ihale-Maliyet-Teklif-Yonetimi | 65 | 55 | kaynak 65 | `satir`, `Ürün`, `oran` | P3 |
| SNN-Abacus-Core | 116 | 29 | kaynak 116 | `sonuc`, `yeniKayit`, `satir` | P2 (kuralın kaynağı) |
| SNN-Piyasa-Core | 301 | 94 | **sql 243**, kaynak 58 | `sembol`, `kaynak`, `zaman` | P2 (göç sürüyor) |
| trade-kasa | 382 | 53 | kaynak 382 | `islem`, `usdTryKuru`, `kayit` | P3 |
| GHS-Panel | 455 | 242 | **sql 191**, kaynak 264 | `v_kalan`, `tablo`, `sonuc`, `hata` | P2 |
| SNN-Portfoy-Yonetimi | 846 | 347 | kaynak 721, **sql 125** | `tarih`, `Altın`, `pozisyonPct` | P2 |
| Gunum-Var | 1.833 | 310 | kaynak 1.731, sql 102 | `zincirKur`, `sonuc`, `hata`, `satir` | P2 |
| SNN-Yonetici-Ozeti | 10.153 | 567 | kaynak 10.153 | `hesapKodu`, `grup`, `tablo`, `sinif` | P2 |

**Sayılar 19 Eylül'de neden düştü?** Proje sahibi kararıyla dört kök **aile geneli istisna** oldu: `kasa`, `kurus`, `beyanname`, `mizan` (bkz. kod dili standardı, "Aile geneli istisna"). Toplam 16.023 → **14.173** (−1.850).

| Proje | Önce | Sonra |
|---|---|---|
| SNN-Yonetici-Ozeti | 11.172 | 10.153 |
| SNN-Portfoy-Yonetimi | 1.433 | 846 |
| trade-kasa | 496 | 382 |
| SNN-Abacus-Core | 220 | 116 |
| GHS-Panel | 466 | 455 |
| Gunum-Var | 1.841 | 1.833 |
| SNN-Ihale-Maliyet-Teklif-Yonetimi | 72 | 65 |

Düşüş 2.011 değil 1.850: istisna kökünü taşıyan 49 ad, **ikinci** bir Türkçe kök yüzünden hâlâ bulgu (`bakiyeKurus` → `bakiye`, `MizanSatiri` → `satir`). İstisna kökü affeder, adı değil.

**Neye istisna verilmediği** kararın asıl kısmıdır: İngilizce karşılığı net muhasebe terimleri (`bilanco`, `gelirTablosu`, `aktif/pasif`, `ceyrek`, `bakiye`, `hesapKodu` — hacmin %31'i) ve genel programlama kelimeleri (`satir`, `dosya`, `hata`, `sonuc`, `tablo`, `grup` — %56) İngilizceye taşınacak.

**Öncesi (18 Eylül):** kelime listesine 21 kök eklenince sayılar büyümüştü (trade-kasa 272 → 496, Portföy 743 → 1.433, Yönetici Özeti 6.295 → 11.172). Bu kökler Türkçe harf taşımadığı için tarayıcıdan **sessizce geçiyordu**; eksiği **trade-kasa oturumu bildirdi**.

**Okuma notu:** "bulgu" toplam geçiş sayısıdır, "ayrı ad" kaç farklı ad olduğudur. İş yükünü **ayrı ad** sayısı belirler; aynı ad çoğu zaman tek bir yeniden adlandırmayla düzelir.

**Veritabanı sütunları ayrı ele alınır** (Piyasa-Core 243, GHS 191, Portföy 125, Gunum-Var 102): bunlar dışa açık arayüzdür, kırıcı sürüm planı gerektirir. Kod içi adlar ise proje içinde kalır, tek PR'da düzelebilir.


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
- **Açıklama:** `node <standartlar>/quality/code-language-scan.js --tumu .` ölçümü (2026-09-18): **<BULGU> bulgu, <AYRI_AD> ayrı ad** (<SQL> tanesi `.sql` dosyalarında).
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

1. Ölçüm: node <SNN-Standartlar yolu>/quality/code-language-scan.js --tumu .
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

Yanlış alarm görülürse önce **kelime listesi** (`quality/data/turkish-words.json`) ve **istisna dosyası** kullanılır; kural gevşetilmez.
