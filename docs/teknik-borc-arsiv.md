# Teknik Borç Kütüğü — Arşiv (kapanan kalemler)

> Kapanan kayıtlar silinmez; ders ve uyarı taşır. Biçim: standarttaki "Kapanış" bölümü.

---

## Kapanan Kalemler

### TB-007 — Türkçe çekim eki + İngilizce gövde tarayıcıdan kaçıyor
- **Tespit Tarihi:** 2026-09-19 (31 eksik kök eklenirken)
- **Kapanış:** 2026-09-19 — TB-007 ölçüldü ve önerilen çözüm **REDDEDİLDİ**; ölçüm sırasında tarayıcıda iki gerçek kusur bulundu ve düzeltildi.
- **Öncelik (kapanışta):** P3 (Fırsatta)
- **Issue:** #43

#### 🟢 Sade Anlatım
- **Sorun ne?** `manuelDeltalar`, `guncelleKur` gibi adlarda ek Türkçe ama gövde İngilizce. Tarayıcı bunları kaçırıyor. Somut kanıt: `guncel` kelime listesinde vardı, ama `guncelle` yakalanmıyordu.
- **Benzetme:** Kapıdaki görevli yabancı pasaportları tanıyor, ama yerli soyadı alan yabancıları tanımıyor.
- **Çözülmezse ne olur?** Az sayıda ad kaçmaya devam eder. Kaçan her kök elle bulunup listeye eklenebiliyor; bugün 31 kök böyle eklendi.
- **Senden beklenen karar:** Yok.

#### 🔧 Teknik Detay
- **Açıklama:** `quality/code-language-scan.js` içindeki `SUFFIXES` dar tutulmuş (`lari`, `leri`, `lar`, `ler`, `si`, `su`, `i`, `u`, `a`, `e`). Fiil ekleri (`-le`, `-la`) yok.
- **Etki:** Ölçülmedi — kaç adın bu sınıfa girdiği bilinmiyor. Bilinen örnek: 2 ad.
- **Çözüm yönü:** İki yol var ve **ölçmeden seçilmemeli.** (a) `-le`/`-la` eklerini toleransa eklemek: `handle`→`hand`, `table`→`tab`, `module`→`modu` gibi gövdeler üretir; bunlar Türkçe listesinde olmadığı için bugün zararsız görünüyor ama liste büyüdükçe çakışabilir. (b) Ayrı bir kural: "ad Türkçe bir ekle bitiyorsa ve gövde İngilizce sözlükte varsa" — İngilizce sözlük gerektirir, depoda yok. Önce ölçüm: 11 projede bu sınıftan kaç ad var?
- **Neden Şimdi Çözülmüyor:** Etkisi ölçülmedi ve (a) yolunun yanlış alarm riski var. Ölçüm kapısı (`aile-olcumu.yml`) artık kurulduğu için etki güvenle ölçülebilir.
- **Bağlı kalemler:** Yok.

#### 📏 Ölçüm (2026-09-19 · 11 proje · 2.684 dosya)

**Asıl soru:** `-le`/`-la` fiil ekleri sonek toleransına eklenirse ne olur?

| | |
|---|---|
| Aday sonekin ürettiği toplam geçiş | **19** |
| Bunların yorum satırında olanı (düzyazı) | **19** |
| Gerçek tanımlayıcı | **0** |

**Karar: REDDEDİLDİ.** Sıfır gerçek yakalama, 19 yanlış alarm. Kütükteki iki örnek
(`manuelDeltalar`, `guncelleKur`) bugün aile kod tabanında yok — ikisi de bu deponun
TB-001 göçünde İngilizceye taşınmıştı. Kayıt, örneklerin hâlâ var olduğunu varsayıyordu.

#### 🔎 Ölçümün ortaya çıkardığı iki gerçek kusur

**1. CRLF satır sonu yorum soymayı tamamen devre dışı bırakıyordu.**
Yorum soyma kuralları `--.*$` ve `//.*$` biçiminde. JavaScript'te `.` satır sonunu (`` dahil)
eşleştirmez ve `$` dizgenin sonunu ister. Satır `` ile bitince kural **hiç eşleşmiyor**, yorum
soyulmuyor ve içindeki Türkçe düzyazı tanımlayıcı sanılıyordu.

| | |
|---|---|
| Aile geneli bulgu (düzeltme öncesi) | 26.060 |
| Bunların yorumdan geleni | **9.938 (%38,1)** |
| Düzeltmeyle düşen | **10.745** — biri hariç hepsi yorum içinde; o biri de aynı adın yorumdaki ikinci kopyası |
| Yanlışlıkla gizlenen gerçek ad | **0** (eski ve yeni tarayıcı satır satır karşılaştırıldı) |

**CI bunu göremezdi:** GitHub Linux'ta LF ile dosya alır. Kusur yalnız **Windows çalışma
kopyasında** çıkıyordu — yani kapı yeşil, geliştirici ekranı gürültülüydü.

**2. Nesne alanı satırları "ekran yazısı" sanılıp atılıyordu.**
Yazı ölçütü yalnız `=` ve `;` arıyordu; `netSatisKurus: 1295235481,` satırında ikisi de yok.
Bu ad **görünmüyordu**; onu ayakta tutan tek şey yorumdaki `=` işaretiydi — yorum doğru
soyulunca ad da kayboldu. Ölçüt eklendi: ad + iki nokta + değer + sonda virgül.

| | |
|---|---|
| Böylece görünür olan **gerçek** ad | **2.228** |
| JSX/etiket satırında çıkan yanlış alarm | **0 / 2.228** |
| Okunan örnek | 24'ü tek tek (`yil`, `ceyrek`, `tablo`, `kaynak`, `yuzde`, `sinifAdi`, `bostaNakitToday`…) |

**Net etki:** aile genelinde −10.745 yanlış alarm, +2.228 gerçek bulgu.

#### 🧪 Sabitleme
10 gerileme testi (`quality/test/code-language-scan.test.js`), gerçek dosyalardan alınmış
satırlarla. İkisi sabotajla sınandı: CRLF soyma kaldırılınca 3 test, nesne alanı ölçütü
kaldırılınca 3 test kırmızıya döndü.

#### 📌 Ders
Ölçüm sorusu "eklenen sonek ne yakalar?" idi; cevabı **hiçbir şey** çıktı. Ama ölçümü yapmak
için tarayıcıyı gerçek dosyalarda satır satır çalıştırmak gerekti ve asıl kusurlar orada
göründü. **Ölçüm, cevabından daha değerli olabilir.**

---

### TB-004 — Kancaların 272 satırı testsiz
- **Tespit Tarihi:** 2026-09-19 (kancalar depoya alınırken ölçüldü)
- **Kapanış:** 2026-09-19 — TB-004 çözüldü; 272 satırın **272'si** test altında. Kapanış testi yazarken kapının **gerçekten çalışmadığı bir durum** bulundu (aşağıda).
- **Öncelik (kapanışta):** P2 (Planlı)

#### 🟢 Sade Anlatım
- **Sorun ne?** Bekçilerin bir kısmının hiç testi yok. Bunların içinde en kritik dosya da var: `lib/shared.js`. O 45 satır bozulursa hiçbir bekçi ortak depoyu bulamaz ve tüm projelerde oturum açılışı durur.
- **Benzetme:** Binadaki yangın kapılarının çoğu düzenli deneniyor, ama ana elektrik panosu hiç denenmiyor. Pano giderse kapıların hepsi birden çalışmaz.
- **Çözülmezse ne olur?** Sessiz kalabilir. Ama 2026-09-15'te tam bu oldu: ortak depodaki bir fonksiyon adı değişti, `session-start` çöktü ve **tüm projelerde** açılış özeti durdu. O gün test olsaydı değişiklik main'e girmeden yakalanırdı.
- **Senden beklenen karar:** Yok. Sıra önerisi: önce `lib/shared.js`, sonra `session-start.js`.

#### 🔧 Teknik Detay
- **Açıklama:** Testsiz dosyalar ve satır sayıları (2026-09-19 ölçümü): `session-start.js` 109, `stop-gate.js` 78, `lib/shared.js` 45, `guard-code-language.js` 40. Toplam 272. Mevcut `hooks/test/hooks.test.js` yalnız `guard-bash`, `guard-files` ve `stop-debt-push`'ı alt süreç olarak çalıştırıyor.
- **Etki:** Tüm projeler — kancalar `~/.claude/settings.json` üzerinden her oturumda çalışır.
- **Çözüm yönü:** `lib/shared.js` için: `SNN_STANDARTLAR` ortam değişkeni zaten yolu dışarıdan alıyor, bu yüzden geçici klasörle test edilebilir (`refresh()` kirli kopyada dokunmuyor, ağ yokken eski kural çalışmaya devam ediyor, damga 6 saati doldurmadan atlanıyor). `session-start.js` ve `guard-code-language.js` uçtan uca denenebilir: stdin'den JSON ver, stdout'u oku — `hooks.test.js` bu deseni zaten kullanıyor. `stop-gate.js` monolitik; önce `measure`/`decide` ayrımına bölünmeli (`schema-doc.js` deseni).
- **İlerleme (2026-09-19):** 272 satırın **232'si** test altına alındı; 3 test dosyası, 56 test, hepsi CI'da ve makineden de yeşil.
  - `lib/shared.js` (45) — sahte uzak depo + klon ile 23 test: yol çözme, damga, 6 saat kısıtlaması, ileri sarma, **kirli kopyaya dokunulmaz**, **ağ/uzak yokken patlamaz**.
  - `session-start.js` (109) — 16 test; çoğu "çökmez" üzerine.
  - `guard-code-language.js` (40) — 17 test; **asla engellemez**, **asla `allow` demez**.
- **Test yazarken bulunan iki gerileme (ikisi de düzeltildi):**
  1. **Damga adı.** TB-001 yeniden adlandırması `snn-son-guncelleme` → `snn-son-updateResult` değişimini **dizge içinde** de yaptı. Canlı kopyada iki damga yan yana kaldı; o aralıkta 6 saatlik kısıtlama çalışmadı, her oturum tazeleme denedi. Ad artık `snn-last-refresh`; eski adlar yazarken temizlenir.
  2. **Açılış bekçisi çöküyordu.** `session-start.js:4` üst düzey `require('./lib/debt')` canlı kopyaya yönlendiriyor; canlı kopya yoksa bekçi **çıkış kodu 1** ile çöküyordu — hiçbir `try/catch`'e ulaşmadan. Dosyanın başlığı 2026-09-15 olayını anlatıp "açılış özeti çökmez" diyordu, ama o koruma **eksik fonksiyona** karşıydı, **eksik modüle** karşı değil. Artık özet kütüksüz sürer ve sebep yazılır.
- **Kapanış (2026-09-19):** `stop-gate.js` (78) bölündü: karar mantığı `hooks/lib/stop-gate-plan.js` içine saf olarak alındı, IO kancada kaldı. 33 test yazıldı; ikisi sabotajla sınandı (ikinci turda engelleme, silinen dosya süzgeci — ikisi de kırmızıya döndü). Kapı `quality/data/gates.json`'a kaydedildi (15. kapı).
- **Testin bulduğu gerçek kaçak:** uçtan uca denemede kapı **hiç tetiklenmedi**. Sebep: `git status --porcelain` yeni bir klasörü tek satırda bildirir (`?? src/`), içindeki dosyaları göstermez. Yani **yeni bir klasöre yazılan TS dosyaları tip kontrolünden muaftı** — kapı kurulduğundan beri. Kanca artık `-uall` ile okuyor. Bu, `git ls-files` kaçağının (kod dili tarayıcısı, aynı hafta) aynı sınıftan ikinci örneğidir: **git'in varsayılanları izlenmeyen dosyayı gizler.**
- **Sabitlenen iki davranış:** (1) `stop_hook_active` iken ASLA yeniden engellenmez — engellenirse ajan aynı kapıya tekrar çarpar ve oturum ilerleyemez. (2) Zaman aşımı engel değildir; yapılamayan ölçümle iş durdurulmaz (`olcum-standardi.md`).
- **Neden P2 kaldı:** Bugünkü 17 hatanın hiçbirini bu testler yakalamazdı (ölçüldü); dayanıklılık kapısıdır, keşif kapısı değildir. Yine de `lib/shared.js` tek nokta arızası olduğu için P2.
- **Bağlı kalemler:** TB-006 (aynı dosyalar makine kurulumunun parçası).

---

---

### TB-005 — Bu deponun kendi rehber dosyası yok
- **Tespit Tarihi:** 2026-09-19 (uyum ölçeri ilk çalıştığında)
- **Kapanış:** 2026-09-19 — TB-005 çözüldü; `CLAUDE.md` yazıldı.
- **Öncelik (kapanışta):** P3 (Fırsatta)

#### 🟢 Sade Anlatım
- **Neydi?** Aile standardı "her projenin rehberi aile standardına atıf yapsın" diyor; bu depoda öyle bir dosya hiç yoktu. Kuralı koyan depo kendi ölçütünü karşılamıyordu.
- **Ne yapıldı?** `CLAUDE.md` yazıldı. İçerik temenni değil, **o gün gerçekten yaşanan** tuzaklardan derlendi.
- **Sonuç:** Bu deponun uyum eksiği kalmadı; açık issue **kendiliğinden kapandı**.

#### 🔧 Teknik Detay
- **İçerik:** deponun ne olduğu (11 projenin her PR'da çalıştırdığı makine), neden herkese açık kalmak zorunda olduğu (ölçüldü), dört dağıtım yolu ve hangisinde iş düştüğü, çalışma sırası, bilinen tuzaklar, yeni kapı ekleme sırası, yanlış alarm yolu, kırmızı çizgiler.
- **Doğrulama:** rehberde geçen her dosya yolu tek tek denetlendi (biri yolsuz yazılmıştı, düzeltildi); rehber tazeliği kapısı, kapı defteri ve kod dili taraması temiz.

#### 📌 Kapanışta öğrenilenler
- **Kapanma yolunun ilk canlı sınavı buydu.** Birleşmeden önce `close` yolu yalnız birim testle doğrulanmıştı. Rehber birleşti → ölçüm temizlendi → senkron çalıştırıldı → issue #48 kendiliğinden kapandı. Uyum döngüsünün tamamı (aç → tekrarda açma → gider → kapat) artık gerçek veride doğrulanmış durumda.
- **Rehber ölçümle yazılır.** Bir günde yaşanan tuzakların listesi, "iyi uygulamalar" listesinden daha değerli çıktı: her madde bir kez gerçekten canımızı yaktı.

---

### TB-003 — Uyum eksikleri yalnız oturum açılınca görünüyor
- **Tespit Tarihi:** 2026-09-19
- **Kapanış:** 2026-09-19 — TB-003 çözüldü.
- **Öncelik (kapanışta):** P2 (Planlı)

#### 🟢 Sade Anlatım
- **Neydi?** Her proje kendi eksiğini yalnız oturum açılışında görüyordu. O satır oturum kapanınca kayboluyor, "yapıldı mı?" kaydı tutulmuyor ve proje sahibi 11 projenin durumunu tek yerde göremiyordu.
- **Ne yapıldı?** Eksikler artık her projenin **kendi issue listesine** de düşüyor. Panodan hepsi birden görünüyor, yapılana kadar duruyor, giderilince kendiliğinden kapanıyor.
- **Sonuç:** 11 depoda **27 issue** açıldı; ölçümle birebir eşleşti.

#### 🔧 Teknik Detay
- **Çözüm:** `quality/compliance-issues.js` (saf plan + ayrı IO, `debt-sync/lib/sync-plan.js` deseni) + `.github/workflows/uyum-issue.yml` (Pazartesi 08:23 TSİ; elle çalıştırmada varsayılan kuru).
- **Kimlik başlığa gömülü:** `[UYUM:<ölçüt>]` + `aile-uyum` etiketi. Kütüğün `[TB-xxx]` issue'larına karışmaz.
- **Elle kapatmak eksiği gidermez:** ölçüm hâlâ görüyorsa issue yeniden açılır. Kapanış yalnızca ölçümden gelir.
- **Kademeli uygulandı:** önce tek projede (SNN-İhale, 1 eksik) denendi, issue gövdesi okundu, **tekrar çalıştırılıp çift açmadığı doğrulandı** (0 işlem), sonra kalan 10 projeye uygulandı.
- **Kapı defterine kayıtlı:** `quality/data/gates.json` → `uyum-issue`.

#### 📌 Kapanışta öğrenilenler
- **Göndermeden önce iki hata yakalandı.** (1) Zamanlanmış koşuda `inputs.uygula` tanımsız olduğu için haftalık rutin **sonsuza kadar kuru çalışacaktı** — kapı kurulup çalışmamış olacaktı. (2) `--filter=blob:none` kısmi klon ölçeri yavaşlatıp kırılganlaştıracaktı.
- **Gerekçe ölçümle düzeltildi.** İlk gerekçe "aylarca açılmayan proje eksiğini görmez" idi; ölçüldü ve zayıf çıktı (en eski projenin ana dalı 3 gün önce hareket etmişti). Gerçek gerekçe **görünürlük ve kalıcılık** olarak yazıldı.
- **Kademeli uygulama karşılığını verdi:** tek projede idempotentlik doğrulanmadan 27 issue açılsaydı, bir hata 27 kez temizlik demekti.

---

