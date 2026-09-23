# Geri Bildirim Kaydı

> **TALEP GÖNDERMEDEN ÖNCE BU DOSYAYA BAKIN.**
>
> Buradaki her satır, bir tüketici projeden gelmiş bir talebin ve o talebe verilmiş kararın
> kaydıdır. Aradığınız şey **REDDEDİLDİ** olarak burada duruyorsa gerekçesini okuyun: aynı
> talebi yeniden göndermeniz gerekmez. Gerekçeyi değiştiren **yeni bir olgu** varsa (ikinci bir
> proje, ikinci bir ekran, değişmiş bir kısıt) o olguyu göstererek yeniden başvurabilirsiniz.

Bu dosya kararların **tek kaydıdır**. `standartlar/` altındaki belgeler kuralın **ne** olduğunu
anlatır; bu dosya **neden ve kimin isteğiyle** öyle olduğunu anlatır.

- **Kuralın ne olduğunu** öğrenmek için: `standartlar/`
- **Bir şeyin neden alınmadığını** öğrenmek için: **bu dosya**

---

## Talep nasıl gönderilir

Tüketici projedeki ajan `standart-talep` becerisini kullanır: taslağı hazırlar, size gösterir,
**onayınızla** `sinanbocek/SNN-Standartlar` deposunda issue açar.

Değerlendirilebilen taleplerin dört ortak özelliği var:

1. **Gerçek olay** — hangi dosya, hangi satır, ne oldu. Varsayımsal genellik yetmez.
2. **Ölçülmüş çıktı** — iddia değil, çalıştırılmış komutun çıktısı.
3. **Denenmiş alternatif** — neden projede çözülemiyor?
4. **Kaç projeyi etkiliyor** — ölçülmediyse "ölçmedim" yazılır, tahmin yazılmaz.

Bunlar `standartlar/olcum-standardi.md`'nin talep tarafındaki karşılığıdır: **ölçmediğini iddia etme.**

---

## Kararlar

### 2026-09-23 · Yayılım yeni PR açarken eskileri kapatmıyor — **KABUL**

- **Kimden:** SNN-Abacus-Core oturumu (issue #79, 2026-09-19 · ek ölçüm 2026-09-23)
- **Tür:** yeni-kural
- **Talep:** Çekirdek bir günde beş sürüm yayımladı; her yayılım yeni PR açtı, **eskisini
  kapatmadı**. 8 tüketicide **25 açık PR** yığıldı; Gunum-Var'da altısı da aynı tabandan (3.2.0).
- **Zarar görsel değil:** listeden `4.0.0`'ı seçen bir gözden geçiren, `4.1.1`'deki düzeltmeyi
  **almamış** olur. O düzeltme `dotAsDecimal`'daki **1000 kat sapmayı** kapatıyordu ve risk
  hesabına giriyordu.
- **Karar:** **Kabul.** Kural tek cümle: *bir tüketicide aynı anda yalnız bir açık çekirdek
  güncelleme PR'ı bulunur — en güncel olan.*
- **Bana bırakılan iki karar:**
  1. **İnceleme görmüş PR ne olmalı?** Bildiren (a) *"yine kapat"* öneriyordu. **Ortası seçildi:**
     üstüne ikinci commit atılmış ya da inceleme/yorum almış PR **kapatılmaz**, ayrıca bildirilir.
     Ölçüm (bildirimin eki): kapatılan 14 PR'ın 14'ü tek makine commit'iydi, hiçbirinde inceleme
     yoktu — yani koruma nadiren devreye girer, ama girdiğinde birinin işini korur.
  2. **Dal silinsin mi?** **Hayır.** Bildiren silmenin bilgi kaybettirmediğini ölçmüştü ve haklı
     (göç notları yeni PR gövdesinde toplanıyor), ama silme **geri alınamaz** bir iştir ve bu
     aracın işi değildir. Araç kapatır, silmez.
- **İki önek birden aranır** (`core/` ve `cekirdek/`): bildiren elle temizlikte yalnız `core/`
  arayıp bir PR'ı kaçırmıştı (Gunum-Var #176).
- **Uygularken çıkan sessiz kusur:** `commits,reviews` alanlarını 100 PR için birden istemek
  GitHub'ın GraphQL düğüm sınırını aşıyor ve çağrı **komple** başarısız oluyor. İlk sürüm hatayı
  yutup boş liste döndürdü: temizlik *"aşılmış PR yok"* dedi ve **üç açık PR duran bir depoyu
  sessizce atladı**. İki adıma bölündü; okunamayan depo artık bildiriliyor ve çıkış kodu 1 veriyor.
- **Bugünkü yığılma:** bildiren `sinanbocek/*` tüketicilerini elle temizlemişti (14 PR + 7 öksüz
  dal). Kalan tek yer kurum deposu; `--temizle` kipi onu **2 PR** olarak bildiriyor.

### 2026-09-19 · Çok satırlı şablon dizgesinin gövdesi taranıyor — **KABUL**

- **Kimden:** SNN-Ihale-Maliyet-Teklif-Yonetimi oturumu (issue #76)
- **Tür:** yanlış-alarm
- **Talep:** `renderDemoReport.ts:66` — HTML üreten **çok satırlı** şablon dizgesinin ortasındaki
  satır taranıyor; satırda hiç tanımlayıcı yok, yalnız Türkçe ekran metni ve `${...}` var.
  Proje o gün geçişi bitirmişti: 32 bulgu → 3, kalan üçünün **hepsi** bu kusurdan.
- **Kök neden:** tarayıcı satır bazlıydı; çok satırlı şablonun orta satırlarında ters tırnak
  yoktur, o yüzden satır sıradan kod sanılıyordu.
- **İkinci kusur (bildirimde yoktu, düzeltirken çıktı):** `${...}` içindeki **kod hiç
  taranmıyordu**. `` `deger: ${toplamTutar}` `` satırındaki gerçek Türkçe ad **sessizce
  kaçıyordu**. Bildirimin istediği ayrım ikisini birden çözdü: *gövde atılır, `${...}` taranır.*
- **Sonuç:** **−22 yanlış alarm, +208 önceden kaçan gerçek ad** (11 proje).
- **Düzeltirken çıkan üç yapısal kusur — hepsini kendi kapımız yakaladı:**
  1. Yorumdaki ters tırnak şablon durumunu açıyordu (bu deponun kendi dosyası, 13 yanlış alarm).
  2. `` /`([^`\s]+)`/g `` gibi **düzenli ifade** gövdesindeki ters tırnak da öyle.
  3. Şablon içindeki **kesme işareti** (`%{pct}'si`) dizge sanılıp satırın kalanını yutuyordu;
     ölçümde gerçek bir ad (`eskiCariStr`) böyle kayboldu.
  Üçünün ortak sebebi **sabit sıralamaydı**: dizge, yorum ve düzenli ifade ayrı ayrı ve belirli
  bir sırada soyuluyordu; her sıralama bir diğerini bozuyordu. Üçü **tek yürüyüşe** alındı —
  hangi bağlamda olduğunu bilen bir geçiş, sıralama sorusunu ortadan kaldırır.
- **Bir yapay ad:** bitişik interpolasyonlar (`${a}/${b}`) arasındaki metin atılınca adlar
  yapışıp olmayan bir tanımlayıcı üretiyordu (`ceyrekStrt`). Ayırıcı eklendi.
- **Tüketici doğru yaptı:** susturmayı **denemediğini** ve **neden denemediğini** yazdı
  (2026-09-18 kararını okuyup farkını açıkladı), kendi projesindeki gerçek istisnaları ayrı
  gerekçelendirdi, ve kapsamı **abartmadı**: *"ayrıştırarak ölçmedim — sayı vermiyorum."*

### 2026-09-19 · Beceri kaynağı tek klasör — **KABUL**

- **Kimden:** SNN-Abacus-Core oturumu (issue #59)
- **Tür:** yeni-kural
- **Talep:** Çekirdek kendi `abacus-talep` becerisini yazdı, ama `~/.claude/skills` altına
  **yalnız SNN-Standartlar** yazıyor. Beceri kaynağı liste olsun.
- **Eleme gösterilmiş:** beceriyi SNN-Standartlar'a taşımak denendi ve elendi — beceri çekirdeğin
  defterine, `§4.1` ayıracına ve issue şablonuna atıf yapıyor; çekirdek sürüm atladığında beceri
  de değişmeli. İki depoda iki hızda ilerleyen tek bir metin olurdu.
- **Karar:** **Kabul.** Kaynak artık liste (`setup/data/skill-sources.json`).
- **Çakışma kuralı açıkça tanımlandı** (talep bunu özellikle istedi): aynı beceri adı iki kaynakta
  varsa **kurulum durur**, iki kaynağı da bildirir. Sessizce biri seçilmez — yanlış becerinin
  kurulması, hiç kurulmamasından pahalıdır, çünkü yanlış olan sessizce çalışır.
- **Kabul edilen ödün, görünür kılındı:** ek kaynaklar **yerel** çalışma kopyasından okunur
  (canlı kopya yalnız SNN-Standartlar içindir). Betik artık kaynağın **hangi dalda** olduğunu
  yazıyor. İlk çalıştırmada bu hemen işe yaradı: çekirdek `fix/borc-partisi-2` dalındaydı.
- **Tüketici doğru yaptı:** elle kopyalamanın yürürlükte olduğunu **söyledi** ve neden çözüm
  saymadığını yazdı; bedelini bu ailenin kendi ölçümüyle gösterdi (`borclar` ve `proje-kur`
  sürümsüz kaldıkları için sessizce bozulmuştu). Kapsamı abartmadı: *"diğer projelerin ileride
  beceri taşıyıp taşımayacağını ölçmedim — tahmin yazmıyorum."*

### 2026-09-19 · Proje istisnası sessizce ölü kalıyor — **KABUL**

- **Kimden:** SNN-Abacus-Core oturumu (issue #62)
- **Tür:** belge (bu türü de bildiren önerdi; listeye eklendi)
- **Talep:** Standardın belgelediği örnek `{ "name": "plaka" }` biçiminde, yani **kök** gibi
  görünüyor. Tarayıcı ise **tam tanımlayıcı** eşleştiriyor (`PLAKA_HARFLERI`). Bildiren kişi örneği
  birebir izledi; dosya geçerli JSON, gerekçe dolu, tarayıcı sessiz — **ve istisna hiçbir şey yapmadı.**
- **Ölçüm (bildirimden):** istisna dosyası yokken 43 ayrı ad; `{ "name": "plaka" }` yazıldıktan
  sonra **yine 43**. Beş adı tam tanımlayıcı olarak yazınca 38'e düştü.
- **Tuzağın kaynağı:** iki dosya, aynı alan adı, farklı anlam. Aile dosyası **kök** listeler ve
  bunu kendi içinde yazar; proje dosyası **tam ad** ister. Belgelenen örnek kök gibi görünen bir
  kelime taşıyordu.
- **Karar:** **Kabul.** Tam ad kuralı korundu (proje istisnası dar olmalı), ama iki şey düzeltildi:
  1. **Belgedeki örnek** gerçek biçimi gösteriyor ve iki dosyanın farkı açıkça yazıldı.
  2. **Sessizlik bitti:** hiçbir bulguyla eşleşmeyen istisna artık uyarı veriyor ve doğru biçimi
     söylüyor. Bulgu sayısı değişmedi (aile genelinde 0 düşüş / 0 artış) — yalnız uyarı eklendi.
- **Tüketici doğru yaptı:** "sessiz kalması en pahalı kısım" diyerek asıl zararı adlandırdı ve
  bunu ancak **önce/sonra sayıyı karşılaştırdığı için** fark ettiğini yazdı. Susturma talebiyle
  karıştırılmasın diye 2026-09-18'deki reddedilen kaydı okuyup farkını da açıkladı.

### 2026-09-19 · JSX ekran yazısı tanımlayıcı sanılıyor — **KABUL** (iki bildirim)

- **Kimden:** GHS-Panel oturumu (#64) ve SNN-Proje-ve-Nakit-Akis oturumu (#28)
- **Tür:** yanlış-alarm
- **Talep:** Kullanıcıya görünen Türkçe cümleler tanımlayıcı sanılıyor. Nakit-Akış ölçümünde
  **22 bulgunun 22'si** yanlış alarmdı. Üç ayrı boşluk bildirildi:
  1. Cümle ortasındaki **noktalı virgül** satırı kod yapıyordu — aynı cümlenin `;` taşıyan satırı
     yakalanıyor, alt satırı temiz geçiyordu.
  2. **"Parantez varsa koddur"** katılığı: `Kuruma Ait İhaleler ({projects.length})` (16 bulgu).
  3. **HTML varlığındaki `;`**: aynı cümle `&quot;` ile 6 bulgu, `&quot;` olmadan temiz (6 bulgu).
- **Karar:** **Kabul.** Üçü de yeniden üretildi.
- **Kök neden:** ölçüt yalnız *"`=` ya da `;` var mı"* idi. Noktalı virgül kodda deyimi
  **bitirir** (satır sonu ya da `}`/`)` önü); düzyazıda cümlenin ortasında durur. Parantez de
  ölçüt değil: ayırt eden şey parantezin **bir adın hemen ardından** gelmesi.
- **Ölçüm yolu — düzeltme üç kez daraltıldı:**
  | Deneme | Düşen | Yeni | Sorun |
  |---|---|---|---|
  | 1 — parantez katılığı tamamen kaldırıldı | 1.272 | 0 | Düşenlerin çoğu **gerçek ad**dı (`liste`, `zincirKur`, `konsolBulgulari`) |
  | 2 — çağrı/anahtar kelime ölçütü eklendi | 412 | 2.266 | **201 ekran yazısı** yanlış alarm verdi: Türkçe "var" ve üç nokta kod sanıldı |
  | 3 — ölçüt etiket arası / sarkan diye ayrıldı | 416 | 42 | ✓ |
- **Sonuç:** **−416 yanlış alarm, +42 gerçek ad** (önceden gizlenen `DURUM_METNI`, `OdemeTimeline`,
  `zincirler`). Düşenlerin örnekleri tek tek okundu; hepsi ekran cümlesi. 14 gerileme testi;
  bildirenin **koruma örneği** (`setSonucAlani` kaçmamalı) teste kondu. Sabotajda 5 + 1 test kırmızı.
- **Tüketiciler doğru yaptı:** ikisi de susturmadı. Nakit-Akış **çözüm yönü önerdi** ve
  *"kaldırılırsa şu gerçek ad kaçar"* diyerek **kendi önerisinin riskini** de gösterdi; o cümle
  olmasaydı 1. denemedeki aşırı genişlik ölçüm yapılana kadar fark edilmezdi.

### 2026-09-19 · Hassas desen issue açılmasını sessizce engelliyor — **KABUL**

- **Kimden:** SNN-Abacus-Core oturumu (issue #67)
- **Tür:** yanlış-alarm
- **Talep:** Kütük senkronundaki hassas içerik deseni, gövdede geçen masum kelimeleri yakalayıp
  issue açılmasını engelliyor. İki gerçek vaka: bir nesnenin **"ayar anahtarı"**, ve kütüğün
  **kendi öncelik tanımını** (*"veri/para/güvenlik/sessiz hata"*) kaydın içinde anmak.
- **Karar:** **Kabul.** Üç ayrı zarar doğrulandı:
  1. **Sessizdi.** Uyarı yalnız koşum kütüğüne yazılıyordu; koşum yeşil bitiyordu. Bildiren kişi
     ancak *"TB-011'in issue'su neden yok?"* diye özellikle arayınca buldu.
  2. **Etiketi de düşürüyordu.** Atlama, etiket mantığından önceydi: P2'den P1'e yükseltilmiş bir
     kayıt kütükte P1 görünüp panoda P2 kalıyordu.
  3. **Yazarın kararını elinden alıyordu.** Kaydın zaten `- **Hassas:** Evet` beyanı var; desen
     o beyanın üstünde çalışan ikinci ve otomatik bir mekanizmaydı.
- **Sonuç:** Desen artık **engellemiyor, soruyor**. Tek durdurucu ölçüt yazarın beyanı.
  Uyarılar görünür oldu: GitHub uyarı akışına ve iş özetine yazılıyor.
  11 gerileme testi, bildirilen iki gerçek cümleyle birlikte. Sabotajda 5 test kırmızıya döndü.
- **Tüketici doğru yaptı:** kelimeyi değiştirerek geçici olarak aştı ama **çözüm saymadı** ve
  neden saymadığını yazdı: *"bir sonraki masum kullanım yine vuracak; hem de sessizce."*
  Kapsamı da abartmadı — 11 deponun görünürlüğünü tek tek ölçüp "bugün fiilen 2 depo" dedi.

### 2026-09-19 · Kaçışlı bölü yanlış alarmı — **KABUL**

- **Kimden:** GHS-Panel oturumu
- **Tür:** yanlış-alarm
- **Talep:** `src/infrastructure/documentReader/bankReceipt/profiles.ts` için `İŞLEM`, `TUTARI`,
  `Açıklama` uyarısı geliyor. Bunlar Türkçe banka belgesini eşleştiren düzenli ifade metinleri,
  tanımlayıcı değil. Dosyadaki gerçek tanımlayıcıların hepsi İngilizce (`pick`, `amountOf`,
  `partyOf`, `vakifbank`, `PROFILES`).
- **Karar:** **Kabul.** Bildirim doğrulandı, yeniden üretildi, kök neden bulundu.
- **Kök neden:** Tarayıcı düzenli ifade gövdesini soyarken **kaçışlı bölüyü** (`\/`) kapanış
  sanıyordu. Gövde `(?:[^/\n]|\.)+` yazılmıştı; niyet "ters bölü + herhangi karakter" idi ama
  `\.` düz **nokta** demek. Bu yüzden `\/` görünce gövde erken kapanıyor, kalanı kod sayılıyordu.
  Aynı dosyada ikinci bir kusur da çıktı: açılış bağlamı listesinde `>` yoktu, bu yüzden
  `(part) => /[a-zçğıöşü]/i` hiç soyulmuyordu.
- **Ölçüm:** 11 projede 15.347 → 15.318 (−29). Düşen 29 bulgunun **hepsi tek tek okundu**;
  hepsi kaçışlı bölü içeren düzenli ifade gövdesiydi. Gerçek ad gizlenmedi.
- **Sonuç:** 5 gerileme testi eklendi (bildirilen gerçek satır dahil) + *"düzenli ifadeden
  sonraki ad yine taranır"* koruma testi. Düzeltme birleşti ve tüketiciye kendiliğinden ulaştı.
- **Tüketici doğru yaptı:** susturmadı, bildirdi; örnek verdi; dosyadaki gerçek adların kurala
  uygun olduğunu da gösterdi. Bu üçü olmasaydı yeniden üretmek çok daha pahalı olurdu.

### 2026-09-18 · Kelime listesinde eksik kökler — **KABUL**

- **Kimden:** trade-kasa oturumu
- **Tür:** eksik-kok
- **Talep:** `kasa`, `kur`, `yuzde`, `hedef`, `getiri`, `risksiz`, `pozisyon`, `bakiye` kökleri
  listede yok; Türkçe harf de taşımadıkları için tarayıcıdan sessizce geçiyorlar.
  `Settings` alanları (`bistKasaTL`, `usdTryKuru`, `maxRiskYuzdesi`) hiç görünmüyor — üstelik
  bu alanlar kullanıcının dışa aktardığı JSON yedeğinde, yani **dışa açık yüzeyde**.
- **Karar:** **Kabul ve genişletildi.** 8 kök bildirimden geldi; 13 kök daha 8 projede yapılan
  tarama ile bulundu. Her kök için en az bir gerçek örnek satır doğrulandı.
- **Sonuç:** Liste 143 → 164 kök. `docs/kod-dili-gecis.md` tablosu yenilendi.

### 2026-09-18 · `.snn-kod-dili.json` ile yanlış alarmı susturmak — **REDDEDİLDİ**

- **Kimden:** trade-kasa oturumu (soru olarak)
- **Karar:** **Yanlış alarm `paths` ile susturulmaz.** İki zarar üretir:
  (1) doğru olan bir şeye muafiyet yazmak kaydı kirletir,
  (2) dosyayı toptan muaf tutmak, yarın aynı dosyaya girecek **gerçek** bir Türkçe adı da kör eder.
- **Doğrusu:** durumu SNN-Standartlar'a bildirmek. Tarayıcı düzeltilir ve düzeltme **tüm
  projelere aynı anda** ulaşır. 2026-09-19'daki GHS bildirimi bu yolun işlediğini gösterdi.
- **Yeniden başvuru koşulu:** `paths` yalnız **gerçekten istisna olan gerçek adlar** içindir
  (canlıya uygulanmış migration, dış kaynağın alan adı gibi).

### 2026-09-19 · Aile geneli istisna: `kasa`, `kurus`, `beyanname`, `mizan` — **KABUL**

- **Kimden:** Proje sahibi (16.023 bulgu / 136 kök üzerinde yapılan teşhis sonrası)
- **Karar:** Dört kök **aile geneli istisna**. Ölçüt: bir kök ancak İngilizce karşılığı *yoksa*
  ya da karşılığı *yanlış şeyi* anlatıyorsa istisna olur. "Alışık olduğumuz" ya da "daha kısa"
  ölçüt değildir.
- **Reddedilen küme (hacmin %87'si):** İngilizce karşılığı net muhasebe terimleri
  (`bilanco` → `balanceSheet`, `aktif/pasif` → `assets/liabilities`, `ceyrek` → `quarter`) ve
  genel programlama kelimeleri (`satir`, `dosya`, `hata`, `sonuc`, `tablo`, `grup`).
- **Gerekçe:** istisna verilirse kod kalıcı olarak iki dilli kalır ve her yeni ajan hangi
  katmanda hangi dilin geçerli olduğunu ezberlemek zorunda kalır.
