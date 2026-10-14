# Arayüz standardı ve SNN-UI aile kataloğu — plan

**Durum:** onaylandı. Proje sahibi §8'deki beş kararın beşini de kabul etti (2026-10-14). Sıradaki iş: aşama 1 (§9).

**Amaç:** AI'ın ürettiği belli olan arayüzleri bitirmek. Yeni projeler ilk günden aynı, ölçülmüş bir bileşen kataloğundan başlasın.

**Sınır (proje sahibi, 2026-10-14):** Devam eden hiçbir projenin arayüzü kökünden değiştirilmez. Altyapı **yeni projelerde varsayılan** olur. Devam eden projeler **peyderpey** geçer: çalışan ekran bozulmaz, süreklilik korunur.

---

## 1. Sorun: AI arayüzü neden "AI yapımı" görünür

İki ayrı kaynağı var:

| Kaynak | Belirtisi | Çözen |
|---|---|---|
| **Bileşen kalitesi** | Hareketsiz ya da abartılı hareket, klavyeyle kullanılamayan menü, kaba boşluklar | Hazır, iyi yapılmış bileşen (Arc) |
| **Tutarsızlık** | AI her oturumda düğmeyi, renkleri, boşlukları sıfırdan uydurur; iki ekran iki ayrı uygulama gibi durur | Aile kuralı + tek katalog |

Arc yalnız birincisini çözer. İkincisi için standart belge ve AI'ın okuduğu katalog gerekir. Bu plan ikisini birlikte kurar.

---

## 2. Arc nedir, ne veriyor

**Arc:** `kuratlielia/arc-library`, React bileşen kütüphanesi. Site: uiarc.dev. Ölçüm: 2026-10-14, commit `bfdf7e8`.

- **Lisans MIT.** Ticari kullanım ve yeniden dağıtım serbest; tek şart lisans notunu korumak.
- **Ücretsiz kısım:** 112 bileşen, 18 blok klasörü. "Pro" işaretli 121 parça ücretli ve bu plana girmez.
- **Kopyala-yapıştır modeli:** kod projeye kopyalanır, artık projenindir. Çalışma anında Arc'a bağımlılık yok.
- **Teknik şartlar:** React 19, TypeScript, Next.js ya da Vite, `motion` paketi. Tailwind gerekmez; stiller CSS modülüdür ve renk değişkenlerini (token) okur.
- **AI desteği (ücretsiz):** `llms.txt` dosyaları, her bileşenin markdown sayfası, bir AI beceri dosyası (skill) ve bir MCP sunucusu. **MCP sunucusu Arc hesabıyla giriş ister** (§6).

**Riskler:**

- Repo 2026-09-24'te açıldı, tek kişinin projesi. Bırakılabilir. Kod bize kopyalandığı için bu bizi kilitlemez.
- Arc'ın sayı, para ve tarih bileşenleri İngilizce biçimle çalışır (§4).

---

## 3. Aile projelerinin durumu (ölçüldü)

Kaynak: her projenin `origin/main` dalındaki `package.json`, 2026-10-14.

| Grup | Projeler | Arc'a uyum |
|---|---|---|
| React 19 + Vite | Gunum-Var, İhale-Maliyet, Portföy, Proje-Nakit, Yönetici-Özeti, Sipariş | Teknik olarak doğrudan uygun |
| React 18 + Vite | Naturapan, trade-kasa, GHS-Panel | Bileşen için React 19 gerekir; renk değişkenleri React'tan bağımsızdır |
| Arayüzü yok ya da React değil | Abacus-Core, Piyasa-Core, Pulmaca, ihale-özeti, Games-Umi, Standartlar | Kapsam dışı |

- React 19 grubundaki altı projenin altısı da ABACUS'a bağlı (`^4.1.1` – `^4.3.0`). B sınıfı bileşenler ABACUS'a bağlanabilir.
- shadcn (Arc'ın kurulum aracı) yalnız Gunum-Var'da kurulu.

**Bu tablo bir geçiş listesi değildir.** Sınır gereği hiçbir proje toplu geçirilmez (§7).

---

## 4. Bileşen sınıflandırması

Ayrıntı: `docs/arc-siniflandirma.md` (her bileşen tek satır).

| Sınıf | Anlamı | Bileşen | Blok |
|---|---|---|---|
| **A** | Yasak biçim çağrısı yok; Türkçe metinle olduğu gibi alınır | 57 | 11 |
| **B** | `Intl.*`, `toLocaleString`, `toFixed`, `toUpperCase`, `toLowerCase` kullanıyor; ABACUS'a bağlanarak uyarlanır | 55 | 7 |

**B sınıfı neden olduğu gibi alınamaz:** `giris-alanlari-standardi.md` bu çağrıları yasaklar; tarayıcıya göre farklı sonuç verirler. Örnek: Arc'ın para kutusu (`money-input`) varsayılan olarak `en-US` ve USD ile çalışır. Kutuda `1,234.56` görünür; ailede doğrusu `1.234,56`. Telefon kutusu (`phone-input`) varsayılan olarak ABD'yi seçer.

**İngilizce metin:** 52 bileşende ve 18 blokta İngilizce ekran metni bulundu (kaba tarama, alt sınır). Her bileşen kataloğa girerken metni Türkçeye çevrilir. Tanımlayıcılar İngilizce kalır (`kod-dili-standardi.md`).

---

## 5. Standart belgesi: `standartlar/arayuz-standardi.md` genişletilir

> **Düzeltme (2026-10-14, PR #151 birleştikten sonra):** Bu bölüm önce "belge yazılır" diyordu. Belge **zaten var** (2026-10-12, #144): sahibin birden çok projede söylediği arayüz tercihlerini tutar; ilk kuralı "amber uyarı rengi kullanılmaz". Plan yazılırken geride kalmış yerel dal okunmuştu (CLAUDE.md §3, "yerel klasör gerçeği göstermez"). Aşağıdaki kurallar **mevcut belgeye eklenir**, yeni belge açılmaz.

**Mevcut belgeyle ilişki:**

- Mevcut belge "yalnız birden çok projede söylenen tercih girer" der. Katalog kuralları bu ölçüte uyar: sahip 2026-10-14'te tüm yeni projeler için karar verdi (§8).
- Mevcut belgenin işaretli bölümü `~/.claude/CLAUDE.md` dosyasına kopyalanır (ev kâğıdı: her oturumda okunan kişisel kural dosyası). Kural 1 ("önce katalog") oraya da eklenir; böylece her projedeki AI ilk gün görür.
- Mevcut "amber yok" kuralı Arc'la çakışır, bkz. §6.1.

Eklenecek kurallar:

1. **Önce katalog.** Yeni bir arayüz parçası yazılmadan önce SNN-UI kataloğuna bakılır. Yoksa Arc'a bakılır. İkisinde de yoksa yazılır ve kataloğa aday olarak bildirilir.
2. **Yalnız değişken (token).** Renk, boşluk, köşe yuvarlaklığı, gölge ve hareket süresi elle yazılmaz; `snn-foundation.css` değişkenlerinden alınır. Ham renk kodu (`#7747ff`) bileşen dosyasında yasaktır.
3. **Sayı, para, tarih ABACUS'tan.** `giris-alanlari-standardi.md` aynen geçerlidir. B sınıfı Arc bileşeni uyarlanmadan kullanılmaz.
4. **Hareket ölçülü olur.** Her animasyonun "hareketi azalt" ayarında kapanan yolu vardır (Arc'ta hazır). Süreler hareket değişkenlerinden gelir.
5. **Klavye ve ekran okuyucu.** Fareyle yapılan her iş klavyeyle de yapılır. Arc bunu sağlar; uyarlama sırasında bozulmaz.
6. **Ekran metni Türkçe.** Bileşenin varsayılan metinleri de dahil.
7. **AI kokusu listesi.** Kaçınılacak kalıplar yazılır: mor-mavi geçişli arka plan, ikon yerine emoji, her şeyi karta koymak, uydurma istatistik, her şeyi ortalamak. Bu liste başta **yol göstericidir, kapı değildir**. Kapı ancak tarihli gerçek vaka ve yanlış alarm ölçümüyle kurulur (`olcum-standardi.md`, CLAUDE.md §4).

**Kapsam kuralı:** Standart yeni projelerde baştan uygulanır. Devam eden projede yalnız **yeni yazılan** parçaya uygulanır (§7).

---

## 6. SNN-UI aile kataloğu

**Ne:** Arc'tan seçilmiş, Türkçeye ve ABACUS'a uyarlanmış bileşenlerin aile deposu. Benzetme: Arc toptancıdır; SNN-UI bizim raflarımıza göre düzenlenmiş mahalle dükkânıdır.

### 6.1 Yapı

```
sinanbocek/SNN-UI   (herkese açık — §8 karar 1)
  registry/foundation/snn-foundation.css   aile değişkenleri (Arc foundation.css'ten)
  registry/components/<ad>/                uyarlanmış bileşenler
  registry/blocks/<ad>/                    uyarlanmış bloklar
  public/r/<ad>.json                       shadcn kurulum dosyaları (derleme çıktısı)
  KAYNAK.md                                her parçanın Arc commit'i ve yapılan uyarlama
  LICENSE + NOTICE                         MIT, "Arc'tan uyarlanmıştır" notu
  AI/katalog.md                            AI'ın okuduğu tek liste (§6.3)
```

**`snn-foundation.css` Arc'tan şu farklarla ayrılır:**

- **Uyarı rengi amber değildir.** Arc'ın `--warning` değişkeni amber tonundadır (`oklch(58% .18 75)`, koyu temada `oklch(83% .17 80)`). Mevcut standart amber'i yasaklar (GHS-Panel 2026-09-16, SNN-Siparis 2026-09-25). Aile dosyasında `--warning` mavi-gri, mavi ya da menekşe olur; kırmızı yalnız gerçek hatadır.
- **Amber vurgu seçeneği kaldırılır.** Arc'ta `data-accent="amber"` seçeneği var; aile dosyasında bulunmaz.
- Bu iki fark aşama 1'de testle korunur: dosyada amber tonu (oklch açısı yaklaşık 50–95) kalırsa test kırmızı olur.

**Kurulum (yeni projede):** `components.json` içine tek satır eklenir, sonra bileşen adıyla kurulur:

```json
{ "registries": { "@snn": "https://raw.githubusercontent.com/sinanbocek/SNN-UI/main/public/r/{name}.json" } }
```

> **Doğrulanmadı:** shadcn'in kurulum dosyalarını bu adresten okuyabildiği 1. aşamada denenecek. Okuyamazsa GitHub Pages kullanılır.

**Neden herkese açık:** shadcn kurulumu oturum açmadan dosya indirir. GHS-Panel başka bir hesapta (`globalhedef`). Bu depo da aynı sebeple açık (CLAUDE.md §1).

### 6.2 Ailenin akış kuralıyla uyumu

SNN-UI bileşenleri `ornek/*.yml` şablonları gibi davranır: **projeye kopyalanır, kendiliğinden akmaz.** Katalog güncellense bile hiçbir projenin ekranı kendiliğinden değişmez. Proje güncellemeyi kendisi ister (`shadcn add --overwrite`). Bu, "çalışan ekran bozulmaz" sınırını mekanizmayla garanti eder.

### 6.3 AI'ın kataloğu okuması

- Projelerde **Arc'ın MCP sunucusu kullanılmaz** (§8 karar 2). Sebep: AI oradan uyarlanmamış B sınıfı bileşeni kurabilir; para kutusu `en-US` gelir.
- AI, SNN-UI'deki `AI/katalog.md` dosyasını okur: hangi bileşen var, ne işe yarar, kurulum komutu.
- Arc'ın ücretsiz beceri dosyasındaki tasarım ve hareket ilkeleri okunur, işe yarayanlar standarda Türkçe yazılır. Dosya projelere doğrudan kurulmaz.

### 6.4 İlk raf (1. aşama adayları)

Tamamı A sınıfı; yalnız Türkçe metin uyarlaması gerekir:

`button`, `button-group`, `input`, `textarea`, `select`, `checkbox`, `switch`, `radio-group`, `dialog`, `dropdown-menu`, `popover`, `tooltip`, `tabs`, `card`, `toast`, `empty-state`, `skeleton`, `pagination`, `search-field`, `metric-card`

İkinci raf (B sınıfı, ABACUS uyarlaması): `money-input`, `number-field`, `phone-input` (varsayılan TR), `date-picker`, `sortable-data-table`, grafikler.

> **Ölçülmedi:** ABACUS'un tarih biçimlendirme yeteneği. Eksikse `abacus-talep` ile çekirdeğe talep açılır; projede kopya yazılmaz.

---

## 7. Devam eden projelerde peyderpey geçiş

**İlke:** Çalışan ekrana sırf geçiş için dokunulmaz.

| Durum | Ne yapılır |
|---|---|
| Yeni proje | SNN-UI baştan kurulur (aksi belirtilmedikçe varsayılan) |
| Devam eden projede **yeni ekran ya da yeni parça** | Katalogdan alınır |
| Devam eden projede **zaten başka bir sebeple elden geçen** parça | Katalog karşılığına geçirilebilir; zorunlu değil |
| Çalışan, dokunulmayan ekran | Olduğu gibi kalır |

**Görsel kopukluğu önleyen köprü:** Devam eden projede katalogdan gelen yeni parça, projenin **mevcut renklerine** bağlanır. Bunu küçük bir köprü dosyası yapar: `snn-foundation.css` değişkenleri projenin bugünkü renklerine eşlenir. Böylece yeni düğme eski ekranın yanında yabancı durmaz. Proje hazır olunca köprü kaldırılır, aile değişkenlerine geçilir.

**React 18 projeleri** (Naturapan, trade-kasa, GHS-Panel): bileşen alınamaz. React yükseltmesi o projenin kendi kararıdır; bu plan zorlamaz.

**Hiçbir proje bu oturumda değiştirilmez.** Her projenin geçişi kendi oturumunda yapılır (`es-zamanli-calisma-standardi.md` §6).

---

## 8. Proje sahibinin kararları (2026-10-14: hepsi evet)

| # | Karar | Sonuç |
|---|---|---|
| 1 | SNN-UI ayrı ve **herkese açık** bir depo olur | shadcn ile oturumsuz kurulur; GHS-Panel'e de ulaşır |
| 2 | Projelerde **Arc MCP sunucusu kullanılmaz** | AI yalnız uyarlanmış kataloğu görür; Arc hesabı açılmaz |
| 3 | Ana renk **proje başına** seçilir | Boşluk, köşe, hareket ortak kalır; her proje kendi vurgu rengini (`--accent`) seçer |
| 4 | İlk raf **§6.4'teki 20 bileşen** olur | Formlar ve pencereler ilk günden hazır; B sınıfı aşama 3'e kalır |
| 5 | İlk kullanıcı **ilk yeni proje** olur | Deneme mevcut ekranlara dokunmadan yapılır |

---

## 9. Aşamalar

| Aşama | İş | Bitti sayılır |
|---|---|---|
| **0** | Bu plan | ✅ Sahibi §8'i onayladı (2026-10-14) |
| **1** | SNN-UI deposu, `snn-foundation.css`, ilk raf (20 bileşen, Türkçe metin), `AI/katalog.md`, shadcn kurulum denemesi | Boş bir Vite projesine `@snn/button` tek komutla kuruluyor |
| **2** | Mevcut `standartlar/arayuz-standardi.md` belgesine §5 kuralları eklenir; "önce katalog" kuralı işaretli bölüme girer | Ek birleşti; `setup-machine.js` ev kâğıdına kopyaladı |
| **3** | İkinci raf: B sınıfı bileşenler ABACUS ile | Para kutusu `85.340,50` yapıştırınca aynı değeri kaydediyor (`giris-alanlari-standardi.md` testi) |
| **4** | `proje-kur` becerisine "yeni projede SNN-UI kur" adımı | Yeni proje kurulumunda katalog hazır geliyor |
| **5** | Gerçek vaka birikince "AI kokusu" kapısı | `olcum-standardi.md` adımları |

Aşama 1 ve 3, SNN-UI deposunda yapılır; bu depoda yalnız standart belgesi ve kurulum adımı değişir.
