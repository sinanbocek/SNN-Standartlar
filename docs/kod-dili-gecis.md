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

1. **Temiz olanlar önce:** Naturapan (0 bulgu), Nakit-Akış (23), SNN-İhale (76), Abacus Core (129).
2. **Orta yoğunluk:** trade-kasa (389), GHS (484), Portföy (1.152).
3. **Yoğun olanlar:** Gunum-Var (2.175), Yönetici Özeti (10.600).
4. **En son SNN-Piyasa-Core:** ana dalda 2.534 bulgu var ama çeviri `refactor/ingilizce-tanimlayicilar` dalında sürüyor (o dalda 301). Çeviri main'e girmeden turnike takılmaz.
5. **SNN-Standartlar (bu depo):** TB-001 kapanınca kendi turnikesini takar. Kural koyan depo, kuralı en son değil en görünür biçimde uygular.

## 2. Ölçüm (2026-09-19, ana daldan — `family-measure.yml` akışı üretir)

Tarayıcı yalnız tanımlayıcılara bakar; yorum, dizge, JSX yazısı ve düzenli ifade gövdesi taranmaz.

Sayılar **her projenin ana dalından** gelir ve `.github/workflows/family-measure.yml` tarafından üretilir. Elle ölçüm yapılmaz: yerel klasörler çalışma dallarında olabilir ve yanlış sayı verir (aşağıya bakın).

| Proje | Bulgu | Ayrı ad | SQL | Önerilen öncelik |
|---|---:|---:|---:|---|
| Naturapan-Web-Sitesi | **0** | 0 | — | Kayıt gerekmez |
| SNN-Standartlar (bu depo) | **0** | 0 | — | TB-001 kapandı |
| SNN-Proje-ve-Nakit-Akis-Yonetimi | 23 | 21 | — | P3 |
| SNN-Ihale-Maliyet-Teklif-Yonetimi | 76 | 57 | — | P3 |
| SNN-Abacus-Core | 129 | 34 | — | P2 (kuralın kaynağı) |
| trade-kasa | 389 | 56 | — | P3 |
| GHS-Panel | 484 | 258 | **203** | P2 |
| SNN-Portfoy-Yonetimi | 1.152 | 411 | **131** | P2 |
| Gunum-Var | 2.175 | 340 | 104 | P2 |
| SNN-Piyasa-Core | 2.534 | 238 | **158** | P2 (çeviri dalda sürüyor) |
| SNN-Yonetici-Ozeti | 10.600 | 613 | — | P2 |
| **Toplam** | **17.562** | | | |

**Sayılar 19 Eylül'de neden arttı?** Sistematik tarama, kelime listesinin **31 kök** kaçırdığını gösterdi: `depo`, `manuel`, `nakit`, `sahte`, `bosta`, `otomatik`, `vadesiz`, `acik`, `bos`, `eksik`, `mutabakat`, `pencere`, `cek`, `plaka`, `arac`, `komisyon`, `fazla`, `sifirla`, `stok`, `vade`, `kapali`, `ortak`, `tedarik`, `taksit`, `yenile`, `dolu`, `iade`, `faiz`, `borclu`, `guncelle`, `zorla`. Ayrıca tanımlayıcılar artık **rakamda da bölünüyor** (`satir0`, `kayit2`).

Toplam **16.380 → 17.562** (+1.182). En büyük kalemler: Yönetici-Özeti +447, Gunum-Var +330, Portföy +306.

Bu adların çoğu **üretim kodunda**: `manuelKurus` ve `otomatikKurus` (Yönetici-Özeti `buildBalanceSheet.ts`), `bostaNakitYesterday` ve `calculateVadesizTLKasa` (Portföy), `ORTAK_ALACAK_CODES` ve `alinanCekKurus` (Yönetici-Özeti), `arac_police` ve `komisyon` (GHS-Panel, biri SQL sütunu).

**Yerel klasörden ölçüm yapılmaz (2026-09-19'da ölçüldü).** Aile ölçümü akışı ilk çalıştığında, elle aldığım sayılarla arasında fark çıktı:

| Proje | Yerel klasörün dalı | Yerelde | Ana dalda |
|---|---|---|---|
| SNN-Piyasa-Core | `refactor/ingilizce-tanimlayicilar` | 301 | **2.496** |
| Gunum-Var | main | 1.833 | 1.841 |

Piyasa-Core'un ajanı çeviriyi **bir dalda** yapıyor; yerel klasöre bakan ölçüm o dalın (gelecekteki) durumunu gösteriyordu. Gunum-Var'daki küçük fark ise iki ölçüm arasında o projenin kendi ajanının bir PR birleştirmesinden geliyor.

İkisi de aynı dersin parçası: **elle ölçüm, o anda hangi klasörün hangi dalda durduğuna bağlıdır.** Bu yüzden tablo artık akıştan gelir.

**Aile geneli istisna (18–19 Eylül).** Dört kök proje sahibi kararıyla istisna oldu: `kasa`, `kurus`, `beyanname`, `mizan` (bkz. kod dili standardı, "Aile geneli istisna"). Etki, **aynı** kopyalar üzerinde iki tarayıcı sürümüyle ölçüldü: −1.850.

**Okuma notu:** "bulgu" toplam geçiş sayısıdır, "ayrı ad" kaç farklı ad olduğudur. İş yükünü **ayrı ad** sayısı belirler; aynı ad çoğu zaman tek bir yeniden adlandırmayla düzelir.

**SQL sütunları ayrı ele alınır.** Bunlar dışa açık arayüzdür, kırıcı sürüm planı gerektirir. Kod içi adlar ise proje içinde kalır, tek PR'da düzelebilir.


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
