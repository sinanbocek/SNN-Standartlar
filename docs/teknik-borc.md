# Teknik Borç Kütüğü

Fark edilen ama şimdi çözülmeyen sorunlar. **Açık borçlar için tek kaynak burasıdır.**
Kapanan kayıtlar: `docs/teknik-borc-arsiv.md`

> **Teknik borç nedir?** Bir işi hızlı bitirmek için kestirme yol kullanmak, sonradan
> ödenecek bir borç almak gibidir. Borç ödenmedikçe faizi (bakım zorluğu, hata riski) büyür.

> **Standart:** `~/.claude/standartlar/teknik-borc-standardi.md` (tek kaynak: SNN-Standartlar)

## Sözlük
| Terim | Türkçe karşılığı |
|---|---|
| Kütük | Bu dosya: açık teknik borçların tek listesi |

---

### TB-001 — Ortak deponun kendi kodu Türkçe adlandırılmış
- **Tespit Tarihi:** 2026-09-17 (kod dili standardı ve tarayıcısı yazılırken)
- **Öncelik:** P2 (Planlı)

#### 🟢 Sade Anlatım
- **Sorun ne?** Yeni yazdığımız kural "kodda adlar İngilizce olsun" diyor, ama bu deponun kendi betikleri Türkçe adlarla yazılmış (`taraDiff`, `bulgular`, `kelimeKumesi` gibi). Kuralı koyan, kurala uymuyor.
- **Benzetme:** Apartman girişine "ayakkabılar kapıda çıkarılır" yazısını asan kapıcının kendi ayakkabıyla dolaşması. Kural geçerli ama inandırıcılığı zayıflıyor.
- **Çözülmezse ne olur?** Somut bir arıza çıkmaz; bu kod yalnız bizim bekçilerimizdir, kimse tüketmez. Ama yeni gelen kişi "demek ki esnetilebilir" diye okur ve kural aşınır.
- **Senden beklenen karar:** Verildi (2026-09-18): **betikler İngilizce adlara taşınacak.** İstisna yolu kapandı; kural koyan depo da kurala uyacak.

#### 🔧 Teknik Detay
- **Açıklama:** `node quality/code-language-scan.js --tumu .` çıktısı: 64 bulgu, 33 ayrı ad (2026-09-17 ölçümü). Aynı tarama SNN-Abacus-Core'da 122 bulgu / 27 ayrı ad veriyor — kuralın kaynağı olan depo da tam uyumlu değil (`yeniKayit`, `gecerliHane`, `satirlar`).
- **Etki:** Yalnız geliştirme araçları; çalışan üründe etkisi yok. PR kapısı yalnız eklenen satırları taradığı için günlük iş kırmızıya dönmez.
- **Çözüm yönü:** Proje sahibi kararı: İngilizceye taşınır. Sıra: (1) dışa açık modül işleri (`module.exports` ile verilen adlar) ve dosya adları, (2) iç değişkenler, (3) test adları. Her adım ayrı PR; her PR'da tüm test takımı yeşil kalmalı ve bekçilerin (`~/.claude/hooks`) çağırdığı adlar aynı commit'te güncellenmeli — canlı kopya bu depodan okuduğu için bir ad yarım kalırsa oturum açılışı tüm projelerde durur (2026-09-15'te bir kez yaşandı). Dosya adı değişiklikleri `git mv` ile yapılır; `ornek/*.yml` içindeki yollar aynı PR'da düzeltilir.
- **İlerleme (2026-09-18):**
  - **1. aşama tamam** — klasör ve dosya adları İngilizce (`borc-senkron→debt-sync`, `kalite→quality`, `cekirdek→core`, `kurulum→setup` ve içlerindeki 24 dosya). Bekçiler için kurulan eski→yeni ad köprüsü, canlı kopya geçtikten ve `~/.claude/hooks` çağrıları güncellendikten sonra **kaldırıldı**.
  - **2. aşama tamam** — iç değişken, sabit ve JSON alan adları İngilizce (`bulgular→findings`, `istisna→exception`, `satirlar→lines`; `.snn-kod-dili.json` alanları artık `exceptions / name / reason / paths / path`).
  - **Ölçüm: 166 → 0 bulgu.** Tarayıcı bu depoda temiz rapor veriyor (27 dosya tarandı).
  - Yan kazanç: göç sırasında tarayıcıda iç içe şablon dizgesi kusuru bulundu ve düzeltildi (`stripTemplates`); kendi kodumuzu tararken çıktı.
- **Kalan:** Yalnız dışa açık akış dosyası adları (`.github/workflows/*.yml`) — 10 projenin kopyaladığı arayüz; kırıcı sürüm planıyla ayrıca ele alınacak. Bu deponun kendi kod dili kapısı **2026-09-19'da kuruldu** ama farklı biçimde: `kod-dili.yml` yalnız `workflow_call` olduğu için kendi PR'larında çalışmıyordu; tarama adımı `test.yml` içine eklendi (`--diff` kipinde, anahtar taramasının yanına).
- **Neden Şimdi Çözülmüyor:** Kuralın kendisi ve makine kapısı öncelikliydi; adlandırma göçü mekanik bir iştir, aşamalara bölünüp ayrı PR'larla yapılır.
- **Bağlı kalemler:** Yok.

---

### TB-002 — Eş zamanlı oturumlarda dosya sahipliği ölçülmüyor
- **Tespit Tarihi:** 2026-09-18 (eş zamanlı çalışma standardı kurulurken)
- **Öncelik:** P3 (Fırsatta)

#### 🟢 Sade Anlatım
- **Sorun ne?** Artık makine "bu projede başka bir oturum açık" diyor ve tehlikeli toplu komutları engelliyor. Ama "şu dosya üzerinde şu an kim çalışıyor" bilgisini tutmuyor. İki oturum aynı dosyayı aynı anda düzenlerse, ikincisi birincinin yazdığını görmeden üstüne yazabilir.
- **Benzetme:** Kapıda görevli var, tehlikeli aletleri alıyor. Ama odaların kapısında "içeride çalışan var" tabelası yok; iki usta aynı odaya girebiliyor.
- **Çözülmezse ne olur?** Büyük ihtimalle bir şey olmaz: ajanlar farklı konularda çalışıyor ve her biri kendi dalında. Aynı dosyada buluşurlarsa git zaten çakışma verir. Risk, commit'lenmemiş halde üst üste yazmaktır.
- **Senden beklenen karar:** Yok. Gerçek bir çakışma yaşanırsa bu kayıt P2'ye çıkar ve dosya işaretleme eklenir.

#### 🔧 Teknik Detay
- **Açıklama:** `quality/session-registry.js` oturum düzeyinde çalışıyor (kim, hangi dal, ne zaman). Dosya düzeyi yok. Ölçüm yapılmadı: bugüne kadar **bir** gerçek olay yaşandı (`git add -A`), o da artık `quality/wide-effect-git.js` ile engelleniyor.
- **Etki:** Yalnız aynı depoda aynı anda çalışan oturumlar; ayrı worktree kullanıldığında konu kapanır.
- **Çözüm yönü:** Ölçümle başla: bir hafta boyunca defter kayıtlarında kaç kez "aynı proje, aynı anda, aynı dal" görüldü? Sık ise `guard-files` bekçisine dosya iddiası (claim) eklenir: oturum yazdığı dosyayı deftere işler, ikinci oturumun aynı dosyaya Write/Edit çağrısı engellenir. Seyrek ise standardın 2. maddesi (ayrı worktree) yeterlidir.
- **Neden Şimdi Çözülmüyor:** Proje sahibi kararı (2026-09-18): ölçmeden kural konmaz. Kilit yanlış güven verir; önce gerçek çakışma görülsün.
- **Bağlı kalemler:** Yok.

---

### TB-004 — Kancaların 272 satırı testsiz
- **Tespit Tarihi:** 2026-09-19 (kancalar depoya alınırken ölçüldü)
- **Öncelik:** P2 (Planlı)

#### 🟢 Sade Anlatım
- **Sorun ne?** Bekçilerin bir kısmının hiç testi yok. Bunların içinde en kritik dosya da var: `lib/shared.js`. O 45 satır bozulursa hiçbir bekçi ortak depoyu bulamaz ve tüm projelerde oturum açılışı durur.
- **Benzetme:** Binadaki yangın kapılarının çoğu düzenli deneniyor, ama ana elektrik panosu hiç denenmiyor. Pano giderse kapıların hepsi birden çalışmaz.
- **Çözülmezse ne olur?** Sessiz kalabilir. Ama 2026-09-15'te tam bu oldu: ortak depodaki bir fonksiyon adı değişti, `session-start` çöktü ve **tüm projelerde** açılış özeti durdu. O gün test olsaydı değişiklik main'e girmeden yakalanırdı.
- **Senden beklenen karar:** Yok. Sıra önerisi: önce `lib/shared.js`, sonra `session-start.js`.

#### 🔧 Teknik Detay
- **Açıklama:** Testsiz dosyalar ve satır sayıları (2026-09-19 ölçümü): `session-start.js` 109, `stop-gate.js` 78, `lib/shared.js` 45, `guard-code-language.js` 40. Toplam 272. Mevcut `hooks/test/hooks.test.js` yalnız `guard-bash`, `guard-files` ve `stop-debt-push`'ı alt süreç olarak çalıştırıyor.
- **Etki:** Tüm projeler — kancalar `~/.claude/settings.json` üzerinden her oturumda çalışır.
- **Çözüm yönü:** `lib/shared.js` için: `SNN_STANDARTLAR` ortam değişkeni zaten yolu dışarıdan alıyor, bu yüzden geçici klasörle test edilebilir (`refresh()` kirli kopyada dokunmuyor, ağ yokken eski kural çalışmaya devam ediyor, damga 6 saati doldurmadan atlanıyor). `session-start.js` ve `guard-code-language.js` uçtan uca denenebilir: stdin'den JSON ver, stdout'u oku — `hooks.test.js` bu deseni zaten kullanıyor. `stop-gate.js` monolitik; önce `measure`/`decide` ayrımına bölünmeli (`schema-doc.js` deseni).
- **Neden Şimdi Çözülmüyor:** Bugünkü 17 hatanın hiçbirini bu testler yakalamazdı (ölçüldü); dayanıklılık kapısıdır, keşif kapısı değildir. Yine de `lib/shared.js` tek nokta arızası olduğu için P2.
- **Bağlı kalemler:** TB-006 (aynı dosyalar makine kurulumunun parçası).

---

### TB-005 — Bu deponun kendi rehber dosyası yok
- **Tespit Tarihi:** 2026-09-19 (uyum ölçeri ilk çalıştığında)
- **Öncelik:** P3 (Fırsatta)

#### 🟢 Sade Anlatım
- **Sorun ne?** Aile standardı "her projenin rehberi (`CLAUDE.md` ya da `AI-RULES.md`) aile standardına atıf yapsın" diyor. Bu depoda öyle bir dosya hiç yok. Kuralı koyan depo, kendi ölçütünü karşılamıyor.
- **Benzetme:** Yönetmeliği yazan dairenin kapısında yönetmeliğin kendisinin asılı olmaması.
- **Çözülmezse ne olur?** Somut arıza çıkmaz. Ama bu depoda çalışan bir ajan, projeye özgü kuralları (dal adları, PR sırası, bekçi tuzakları) her seferinde yeniden keşfediyor.
- **Senden beklenen karar:** Yok.

#### 🔧 Teknik Detay
- **Açıklama:** `quality/compliance.js` ölçütü `rehber-atfi`; 2026-09-19 ölçümünde bu depo dahil 8 projede eksik. Bu depo için sebep atfın eksikliği değil, dosyanın hiç olmaması.
- **Etki:** Yalnız bu depo.
- **Çözüm yönü:** `CLAUDE.md` yazılır. İçeriği ölçülmüş olmalı, temenni değil: bugün üç kez tekrarlanan bekçi tuzağı (komut metninde yasak komut adı geçince engellenme), PR'ları üst üste bindirmeme kuralı (#18 vakası), commit mesajını dosyadan verme alışkanlığı, `git checkout -b` ile `git commit`'i ayrı komutlarda çalıştırma.
- **Neden Şimdi Çözülmüyor:** Küçük iş ama içeriği bugünkü derslerin oturmasını bekliyor; aceleyle yazılan rehber yanlış alışkanlık kaydeder.
- **Bağlı kalemler:** Yok.

---

### TB-006 — `GOC-NOTU.md` ve beceriler hiçbir depoda sürümlenmiyor
- **Tespit Tarihi:** 2026-09-19 (dayanıklılık araştırması)
- **Öncelik:** P2 (Planlı)

#### 🟢 Sade Anlatım
- **Sorun ne?** Kancalar artık depoda. Ama sistemin nasıl kurulduğunu anlatan tek tam belge (`GOC-NOTU.md`, 39 KB) ve `~/.claude/skills` altındaki 4 beceri hâlâ yalnız bu bilgisayarda. Bilgisayar giderse bunlar da gider.
- **Benzetme:** Binanın tesisat planı tek nüsha ve kapıcının çekmecesinde duruyor.
- **Çözülmezse ne olur?** Sistem çalışmaya devam eder. Ama ikinci bir bilgisayara kurmak ya da bir arızadan sonra toparlamak, tarifi olmayan bir işe dönüşür.
- **Senden beklenen karar:** **Evet, iki soru var.** (1) `GOC-NOTU.md` herkese açık bu depoya mı girsin, yoksa gizli ayrı bir depoya mı? Dosya kişisel ve ortam bilgisi içeriyor; herkese açık depoya girerse git geçmişinden **geri alınamaz**. (2) Beceriler aynı pakete girsin mi?

#### 🔧 Teknik Detay
- **Açıklama:** `GOC-NOTU.md` bilerek git dışı bırakılmış (`.git/info/exclude`). `~/.claude/skills`: 4 beceri (`borc-ekle`, `borclar`, `proje-kur`, `archify`). `~/.claude/standartlar/teknik-borc-standardi.md` yönlendirici dosyası da sürümsüz.
- **Etki:** Makine kaybı ya da ikinci makine kurulumu.
- **Çözüm yönü:** `GOC-NOTU.md`'nin makine kurulumu bölümü zaten `docs/makine-kurulumu.md` olarak ayrıldı. Kalanı için: sır taraması (`node quality/secret-scan.js`) çalıştırılır, kişisel/ortam bilgisi ayıklanır, sonra karar verilen yere konur. Beceriler `setup/setup-machine.js` kapsamına alınabilir (aynı kopyalama deseni).
- **Neden Şimdi Çözülmüyor:** Herkese açık depoya yazmak geri alınamaz; proje sahibinin kararı bekleniyor.
- **Bağlı kalemler:** TB-004 (aynı makine paketi).

---

### TB-007 — Türkçe çekim eki + İngilizce gövde tarayıcıdan kaçıyor
- **Tespit Tarihi:** 2026-09-19 (31 eksik kök eklenirken)
- **Öncelik:** P3 (Fırsatta)

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

---
