# Makine Kurulumu (kancalar)

Bu belge **makineyi** sisteme bağlar. Projeyi bağlamak ayrı iştir: `setup/setup-project.js`.

## Neden var (ölçüm, 2026-09-19)

Kuralların **içeriği** ortak depoda sürümlüydü, ama o kuralları **çalıştıran mekanizma** hiçbir depoda yoktu: `~/.claude/hooks` altında 13 dosya, 530 kod satırı, yalnız tek bir bilgisayarda. 12 projede bu dosyaların kopyası arandı, **0 sonuç** çıktı.

Bu makine kaybolsaydı **7 kapı birden** susardı:

| Kapı | Kaybolunca |
|---|---|
| `guard-files` | `.env`, özel anahtar, servis hesabı yazımı ve 7 sır deseni serbest kalır |
| `guard-bash` | 8 yıkıcı komut kalıbı ve birleştirme kapısı düşer |
| `guard-code-language` | Kod dili uyarısı susar |
| `session-start` | Açılış özeti ve uyum ölçümü yok — **ve canlı kopya güncellemesi buradan tetiklendiği için kurallar donar** |
| `stop-gate` | Kırmızı tiple "bitti" denebilir |
| `stop-debt-push` | Kütük değişikliği GitHub'a ulaşmadan oturum kapanabilir |
| `stop-schema-doc` | Şema değişip belge güncellenmeden iş biter |

Kayıp ölçümü: 530 kod satırının **~%88'i** gerçekten kaybolurdu; gerisi ortak depoya yönlendiriciydi. En kritik tek dosya `hooks/lib/shared.js` (32 satır) — o giderse kalan her şey ortak depoyu bulamaz.

## Tasarım kararı: kancalar depoda durur, **canlı kopyadan çalıştırılmaz**

Kurallar canlı kopyadan (`~/.claude/standartlar-canli`) okunur ve kendiliğinden güncellenir. Kancaların kendisi **öyle değildir**: depodan `~/.claude/hooks`'a **kopyalanır**.

**Neden ayrım var:** 2026-09-15'te canlı kopya bozulunca (dal değişikliği yüzünden bir fonksiyon kayboldu) tüm projelerde oturum açılışı durdu. Kancaların kendisi de canlıdan gelseydi, geri dönüş yolu da aynı anda kırılırdı. **Kural akabilir; kuralı çalıştıran şey akmamalı.**

**Güvenlik notu (ölçülmüştür, gizlenmez):** kancalar hâlihazırda canlı kopyadan `require()` ile kod çalıştırıyor (12 çağrı) ve canlı kopya oturum başında onaysız güncelleniyor. Yani "ortak depoya yazabilen, bu makinede kod çalıştırır" durumu **bugün de geçerli**. Kopyalama modeli bu yüzeyi büyütmez, küçültme fırsatı verir. Ortak depo `main`'ine yazma yetkisi bir kişiden büyükse bu ayrı bir sertleştirme kalemidir.

## Beceriler de aynı paketle gelir

Kancaların yanında **beceriler** (`skills/`) de ortak depoda durur ve aynı betikle
`~/.claude/skills` altına **kopyalanır**. Gerekçe kancalarla aynıdır: beceri sürümsüz kalırsa
makineyle birlikte kaybolur — ve sessizce **bozulur**.

Ölçülmüş olay (2026-09-19): `borclar` becerisi `hooks/borclar.js`'i, `proje-kur` becerisi
`kurulum/proje-kur.js`'i çağırıyordu. İkisi de yeniden adlandırılmıştı; iki beceri de çalışmıyordu
ve bunu kimse fark etmemişti, çünkü beceriler hiçbir testin, hiçbir kapının kapsamında değildi.

Bugün depoda duran beceriler:

| Beceri | Ne yapar |
|---|---|
| `borclar` | Teknik borç listesini okur |
| `borc-ekle` | Yeni teknik borç kaydı açar |
| `proje-kur` | Yeni projeyi aile standardına bağlar |
| `standart-talep` | Bu projeden ortak depoya **talep/yanlış alarm bildirimi** gönderir |
| `oturum-teshis` | Bir oturumda ne ters gittiğini kayıttan satır kanıtıyla çıkarır (`docs/oturum-teshisi.md`) |

**Silme kuralı (en riskli davranış).** `~/.claude/skills` altında bize ait **olmayan** beceriler de
bulunur (eklenti kısayolları gibi). Bu yüzden silme yalnız **bizim beceri klasörlerimizin içinde**
yapılır; klasörün kendisi dışındakine dokunulmaz. Bu davranışın adı geçen bir testi vardır:
`setup/test/setup-machine.test.js` → *"BAŞKASININ becerisine dokunulmaz"*.

**Beceri kaynağı bir LİSTEDİR** (2026-09-19, SNN-Abacus-Core bildirimi #59). İlk sıra canlı
kopyadır; ek kaynaklar `setup/data/skill-sources.json` dosyasında durur. Gerekçe: bir beceri,
**atıf yaptığı deponun sürümüyle birlikte** değişmelidir. `abacus-talep` çekirdeğin kendi
defterine, `AI-RULES §4.1` ayıracına ve issue şablonuna atıf yapar; burada dursaydı iki depoda
iki hızda ilerleyen tek bir metin olurdu.

| Kaynak | Nereden okunur |
|---|---|
| SNN-Standartlar | Canlı kopya (`~/.claude/standartlar-canli/skills`) |
| Ek kaynaklar | **Yerel çalışma kopyası** — betik hangi dalda olduğunu yazar |

Ek kaynağın yerelden okunması bilinçli bir ödündür ve **görünür kılınır**: kuru çalıştırma
`Ek beceri kaynagi: <ad> (dal: <dal>) — YEREL kopyadan okunur` satırını basar. O proje çalışma
dalındaysa makineye o dalın becerisi gider.

**Aynı ad iki kaynakta olamaz.** Çakışma bulunursa kurulum **durur** ve iki kaynağı da bildirir;
sessizce biri seçilmez. Yanlış becerinin kurulması, hiç kurulmamasından pahalıdır — yanlış olan
sessizce çalışır.

**Yollar taşınabilir yazılır.** Beceri dosyalarında makineye özel mutlak yol bulunmaz; ev klasörü
`<ev>` olarak yazılır ve beceri onu çalışma anında ölçer.

**Beceri adresleri her PR'da denetlenir** (`quality/skill-paths.js`, 2026-09-23). Becerideki her
`<ev>/.claude/...` adresi depodaki dosyaya çevrilir ve dosya yoksa `test.yml` kırmızı olur. Makineye
yalnız üç yer kurulur; eşleme `setup-machine.js` ile aynıdır:

| Becerideki adres | Depodaki dosya |
|---|---|
| `<ev>/.claude/standartlar-canli/X` | `X` |
| `<ev>/.claude/hooks/X` | `hooks/X` |
| `<ev>/.claude/skills/X` | `skills/X` |

Bu üçünün dışındaki bir `<ev>/.claude/...` adresi de kırmızıdır: o yeri hiçbir betik kurmaz, yeni
makinede boş çıkar. İlk çalıştırmada bu yüzden iki bulgu çıktı: `borc-ekle` ve `borclar`,
`<ev>/.claude/standartlar/` altındaki elle yazılmış bir yönlendirme notunu gösteriyordu.
`<proje kökü>`, `<depo>` gibi yer tutucular başka projelerin dosyalarıdır ve atlanır.
Bir betiği taşıdığında ya da adını değiştirdiğinde onu çağıran beceriyi de aynı PR'da güncelle.

## Kurulum

1. Node.js, `git`, `gh` kurulu olmalı; `gh auth login` yapılmış olmalı.

2. Canlı kopya:

   ```bash
   git clone https://github.com/sinanbocek/SNN-Standartlar.git "$HOME/.claude/standartlar-canli"
   ```

3. Kuru çalıştırma — hiçbir şey değişmez, yalnız ne yapılacağı yazılır:

   ```bash
   node setup/setup-machine.js
   ```

4. Uygula:

   ```bash
   node setup/setup-machine.js --uygula
   ```

   Betiğin yaptıkları:
   - eksik ya da içeriği değişmiş dosyaları kopyalar,
   - **kaynakta olmayan dosyaları siler** — yeniden adlandırma artığı kalırsa `settings.json` eski dosyayı çağırmaya devam eder,
   - `settings.json` içindeki eski kanca adlarını günceller (bozuk JSON yazmaktansa durur),
   - uygulamadan önce `~/.claude/hooks-yedek-<zaman>` klasörüne **tam yedek** alır.

5. Doğrula:

   ```bash
   node "$HOME/.claude/hooks/test/hooks.test.js"
   ```

## Kancalar değiştiğinde

Ortak depoda `hooks/` altında bir değişiklik birleştiğinde makine kopyası **kendiliğinden güncellenmez** (tasarım gereği). Kuru çalıştırma farkı gösterir.

## Bilinen eksikler

- **Sürüklenme kendiliğinden ölçülmüyor.** Çalışan kopya ile depo sürümü ayrışabilir; kuru çalıştırma farkı gösterir ama kimse hatırlatmaz. Oturum açılışında uyarı planlanıyor.
- **Beceriler paketin dışında.** `~/.claude/skills` altındaki 4 beceri bu depoda sürümlenmiyor; makine kaybında birlikte giderler.
- **Ayarların geri kalanı paketin dışında.** Betik yalnız `hooks` bölümündeki dosya adlarını düzeltir; eksik bir kanca kaydını **bildirir ama eklemez** (şablon: `ornek/claude-settings-hooks.json`). Sebebi: `settings.json` kişisel ayarlar da içerir, körlemesine birleştirme onları bozabilir.
- **Ayrışma penceresi.** Senkron sırasında eski dosyalar silindiği için o an açık olan oturumların belleğindeki eski yollar geçersiz kalır. Bekçiler o oturum için hata verir (iş durmaz); yeni oturumda düzelir.
