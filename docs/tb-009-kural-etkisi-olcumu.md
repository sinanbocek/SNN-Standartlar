# TB-009 — "Kod yazarken" kuralının etkisi (ölçüm, 2026-11-10)

**Sonuç: bu veriyle ayırt edilemiyor.**

- Karşılaştırılan 9 projede PR başına eklenen satır medyanı 148'den 178'e çıktı. Yön, kuralın beklediğinin tersi.
- Yeni paket PR başına 0,45'ten 0,41'e indi. Fark küçük.
- Mantık dosyası değişen PR'larda test dosyasının da değişme oranı %79,3'ten %72,9'a düştü (46/58 → 78/107). Olası zarar işareti; fark istatistiksel olarak ayırt edilebilir değil (Fisher kesin sınama p = 0,45).
- `KISAYOL` yorumu 0'dan 2'ye çıktı; ikisi de TB numaralı ve kütükte açık. Kuralın bu maddesi bir projede (Pulmaca) kullanılmış.
- Nedensellik iddiası yoktur: dönem kısa, proje karışımı değişti (Pulmaca ve UI'nin PR payı %32'den %64'e), aynı sürede başka kurallar ve model de değişti.

## Yöntem

Kaynak GitHub'dır (`origin/main` üstüne birleşen PR'lar), yerel klasör değil. Aile listesi `quality/data/family-projects.json`, `origin/main` (18 proje). Ölçüm betiği depoya girmedi; geçici klasörde durdu.

| Ne | Komut |
|---|---|
| Birleşmiş PR listesi | `gh pr list -R <repo> --state merged --search "merged:2026-10-01..2026-10-14" --limit 1000 --json number,author,baseRefName` (sonrası için `2026-10-15..2026-10-29`) |
| PR başına dosya ve eklenen satır | `gh api --paginate --slurp repos/<repo>/pulls/<no>/files?per_page=100` |
| Dönem sınırı denetimi | `gh pr list ... --search "merged:2026-10-29"` |
| İstek limiti | `gh api rate_limit` (5.000'lik saatlik hakkın 4.352'si ölçüm sonunda kalmıştı; sınıra yaklaşılmadı) |
| `KISAYOL` TB'sinin kütükte açık olması | `gh api -H "Accept: application/vnd.github.raw" repos/<repo>/contents/docs/teknik-borc.md?ref=main` |

Dönemler: öncesi 2026-10-01..10-14 (14 gün), sonrası 2026-10-15..10-29. GitHub aralığı iki ucu da dahil sayar, bu yüzden sonrası 15 gündür; 10-29'da 12 PR birleşti. Bu PR'lar çıkarılınca sonuç değişmedi (aşağıda). Saat dilimi: GitHub'ın UTC tarihi.

Tanımlar:

- **Aile deposu:** listedeki 18 proje; hepsi okunabildi (`okunamadı` yok). Dördünde (Trade-Kasa, Games-Umi, EGO-Gayrimenkul, Games-Bizim-Sube) iki dönemde de birleşmiş PR yok.
- **Otomatik PR:** yazarı Dependabot olanlar. Toplam 349 PR'ın 12'si Dependabot (öncesi 6, sonrası 6); bunlar tablolardan **ayrıldı**. Kalan 337 PR insan ya da ajan işidir.
- **Karşılaştırılan proje:** iki dönemde de en az bir otomatik olmayan PR'ı olan proje: 9 tane. Dependabot sayılsaydı da aynı 9 proje olurdu.
- **Eklenen satır:** PR'ın dosya listesindeki `additions` toplamı. Kilit dosyaları (`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`) çıkarılmış hâli ayrıca verildi.
- **Yeni paket:** değiştirilen her `package.json` yamasında eklenen ve silinmeyen, sürüm biçimli bağımlılık satırı sayısı. Yeni bir klasörün ilk `package.json` dosyasındaki bağımlılıklar da sayılır; yani "yeni paket" bazen bir alt paketin ilk kurulumudur.
- **Mantık dosyası:** test olmayan kod dosyası (`js mjs cjs jsx ts tsx py go cs java kt swift sql sh ps1 vue svelte rs rb php`; `.d.ts` ve `*.config.*` hariç). **Test dosyası:** `test/`, `tests/`, `__tests__/`, `spec/` altındaki ya da `.test.`, `.spec.`, `_test.` adlı kod dosyası. Oran: mantık dosyası değişen PR'lar içinde test dosyası da değişenler.
- **KISAYOL:** kod ve test dosyalarında eklenen satırlarda `KISAYOL` geçen satır; TB bağı `KISAYOL (TB-nnn)` biçimi. Belgelerdeki (`.md`) anışlar sayılmadı. Bulunan 4 satırın dördü de yorum satırı ve dördü de TB numaralı; 4 TB'nin dördü ilgili projenin kütüğünde açık olarak okundu.

## Tablo 1 — Toplam (9 karşılaştırılan proje, otomatik PR'lar hariç)

| Ölçüt | Öncesi (10-01..10-14) | Sonrası (10-15..10-29) |
|---|---:|---:|
| PR sayısı | 91 | 147 |
| Eklenen satır (toplam) | 582.747 | 137.562 |
| Eklenen satır (kilit dosyası hariç) | 552.101 | 129.979 |
| PR başına medyan (toplam) | 148 | 178 |
| PR başına medyan (kilit hariç) | 112 | 178 |
| Yeni paket | 41 | 61 |
| Mantık dosyası değişen PR | 58 | 107 |
| Bunlardan test dosyası da değişen | 46 (%79,3) | 78 (%72,9) |
| `KISAYOL` yorumu | 0 | 2 |
| Bunların TB bağı | 0 | 2 |

Toplamlar birkaç uç PR'dan etkilenir (öncesinde Pulmaca 486.642, GHS-Panel 59.829 satır). Medyan daha sağlamdır. Dönem sonu 10-29 çıkarılırsa (135 PR): medyan 179, yeni paket 61, test oranı 72/101 (%71,3), `KISAYOL` 2. Sonuç aynı.

## Tablo 2 — Proje başına (otomatik PR'lar hariç; öncesi → sonrası)

| Proje | PR | Eklenen satır | Medyan | Yeni paket | Mantık PR, testli | `KISAYOL` (TB'li) |
|---|---|---|---|---|---|---|
| Gunum-Var | 8 → 1 | 4.679 → 13 | 230 → 13 | 0 → 0 | 7/7 → 0/1 | 0 → 0 |
| SNN-Piyasa-Core | 4 → 12 | 16.218 → 6.699 | 3.013 → 66 | 3 → 15 | 1/3 → 7/9 | 0 → 0 |
| SNN-Portfoy-Yonetimi | 8 → 2 | 2.495 → 716 | 101 → 358 | 0 → 0 | 2/5 → 2/2 | 0 → 0 |
| SNN-Standartlar | 24 → 9 | 2.088 → 423 | 46,5 → 31 | 0 → 0 | 11/11 → 2/2 | 0 → 0 |
| GHS-Panel | 15 → 12 | 59.829 → 4.546 | 342 → 21 | 1 → 6 | 11/12 → 5/7 | 0 → 0 |
| SNN-Siparis | 2 → 2 | 983 → 19 | 491,5 → 9,5 | 0 → 0 | 1/2 → 0/0 | 0 → 0 |
| SNN-Games-Pulmaca | 26 → 48 | 486.642 → 33.826 | 720 → 206,5 | 35 → 2 | 12/16 → 26/33 | 0 → 2 (2) |
| SNN-ihale-ozeti | 1 → 15 | 89 → 9.474 | 89 → 118 | 0 → 4 | 0/0 → 12/14 | 0 → 0 |
| SNN-UI | 3 → 46 | 9.724 → 81.846 | 163 → 542,5 | 2 → 34 | 1/2 → 24/39 | 0 → 0 |

Okuma notu: "Mantık PR, testli" sütunu "test de değişen / mantık dosyası değişen" demektir. Medyan sütununda altı projede düşüş, üçünde (Portfoy, ihale-ozeti, UI) artış var. Test oranı dört projede yükseldi, birinde sabit kaldı, ikisinde düştü (GHS-Panel, Gunum-Var; Gunum-Var'da sonrası yalnız 1 PR).

## Tablo 3 — Karşılaştırmaya girmeyen projeler (yalnız bilgi)

Yalnız sonrası dönemde otomatik olmayan PR'ı olanlar: SNN-Proje-ve-Nakit-Akis-Yonetimi 87 PR (medyan 355 satır, yeni paket 18, mantık PR 48 içinde testli 27, `KISAYOL` 2 ve ikisi TB'li), SNN-Abacus-Core 5, SNN-Yonetici-Ozeti 4, SNN-Ihale-Maliyet-Teklif-Yonetimi 2, Naturapan-Web-Sitesi 1. Bu projeler öncesi dönemde PR üretmediği için etki ölçülemez; Nakit-Akış tek başına sonrası dönemin 246 PR'ının üçte birinden fazlasını oluşturur.

## Sınırlar

- Dönem 15 günlük, PR sayıları küçük (öncesi 91, sonrası 147). Proje başına çoğu hücrede 10'dan az PR var.
- Proje karışımı değişti: iki dönemde de PR'ı olan 9 projenin PR'ları sonrasında Pulmaca ve UI'de yığıldı. Toplam oranlar bu iki projenin davranışını taşır.
- Aynı sürede başka kurallar yürürlüğe girdi ve kullanılan model değişti; kuralın payı ayrılamaz.
- İlke olarak yönü beklenenin tersi çıkan ölçüt (medyan satır) kuralın "daha az kod" hedefine karşı bir işaret sayılabilir; ama PR başına satır, işin büyüklüğünden de gelir ve işin büyüklüğü ölçülmedi.
- "Mantık dosyası" ve "test dosyası" yol ve uzantı kurallarıyla belirlendi; gerçek mantık içeriği okunmadı. Yapılandırma ya da şablon dosyaları mantık sayılmış olabilir.
- Yeni paket sayısı yama satırından tahmin edilir; yalnız `package.json` bakıldı. Başka paket yöneticileri okunmadı.
- Ek yama verilmeyen (ikili ya da çok büyük) dosyalar `KISAYOL` ve paket sayısına girmedi: öncesinde 3, sonrasında 0 dosya.
- Test oranı için tek sınama yapıldı (Fisher, p = 0,45). Medyan farkı için sınama yapılmadı.
- Ana dala birleşmeyen iki PR dışında hepsi `main` tabanlı; iki PR farklı bir tabana birleşti ve dahil edildi.

## Ölçülmedi

- Kod kalitesi: kodun gerçekten küçük ya da eksiksiz olup olmadığı, eksik iş ya da atlanan doğrulama.
- PR'sız, doğrudan `main`'e giden değişiklikler.
- Kapatılmış ama birleşmemiş ve açık duran PR'lar.
- Kuralın oturumlarda okunup okunmadığı.
- Silinen ya da kapanan `KISAYOL` yorumları; TB kaydının sonradan kapanıp kapanmadığı (yalnız açık olduğu okundu).
- `package.json` dışındaki bağımlılık dosyaları (örneğin `requirements.txt`).
- Dependabot dışındaki otomatik yazarlar: listede başka otomatik yazar görülmedi, ama bir ajan hesabının PR'ı insan işi gibi sayılmış olabilir.
- Ponytail yazarının kendi sayıları (kod %47, maliyet %74, test %68 → %98) bağımsız doğrulanmadı; bu ölçüm onları sınamaz.

## Öneri (karar sahibinde)

Ölçüm tekrarlanacaksa PR'sı olan projeler ve dönem uzunluğu sabit kalmalı; en az dört haftalık iki dönem ve mümkünse mantık dosyası değişen PR sayısı en az 30 olan projelerle. Aksi hâlde sonuç yine "ayırt edilemiyor" çıkar.
