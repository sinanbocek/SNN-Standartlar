# Eş Zamanlı Çalışma Standardı (tüm projeler)

Aynı depo üzerinde **aynı anda birden çok yapay zekâ oturumu** çalışabilir. Bu kural, iki oturumun birbirinin işini silmesini önler.

## Neden (gerçek olaylar, 2026-09-18)

SNN-Standartlar'da iki oturum aynı çalışma klasöründe, birbirinden habersiz çalıştı. İki kayıp yaşandı:

| Olay | Ne oldu | Sonuç |
|---|---|---|
| `git add -A` | Bir oturum commit'e her şeyi ekledi | Diğer oturumun commit'lenmemiş dosyası sahneye girdi (fark edildi, geri alındı) |
| `gh pr merge --delete-branch` | Üstünde açık PR duran dal silindi | O PR **kapandı**; kapalı PR'ın tabanı değiştirilemediği için yeniden açılamadı, yeni PR açmak gerekti |

İkisi de gürültüsüz kayıptı: kimse "başkası da burada" demedi.

> **Benzetme:** Aynı dairede çalışan iki usta. Biri "ortalığı topladım" deyip diğerinin kestiği parçaları çöpe atarsa, kusur ustada değil **düzendedir**. Düzen üç şeyle kurulur: kural, kapı görevlisi, ayrı kat.

## 1. Kural — her oturum

1. **Kendi dalında çalışır.** `main`'e doğrudan commit yok — bu artık **makine tarafından engellenir**. Dal adı işi anlatır (`feat/…`, `fix/…`, `docs/…`, `refactor/…`).

   > Bu madde 2026-09-18'de yazılıydı ama zorlanmıyordu; aynı gün bir oturum (dal açma komutu başka bir bekçiye takıldığı için) fark etmeden ana dala commit attı. **Yazılı kural, dikkat dağıldığı anda tutmaz.**
2. **Commit'e yalnız kendi dosyalarını ekler.** `git add <yol>` ile açıkça. `git add -A`, `git add .`, `git commit -a` **yasaktır**.
3. **Toplu geri alma yapmaz.** `git checkout -- .`, `git restore .`, `git clean -fd`, `git stash` yasaktır; bunlar başkasının henüz commit'lenmemiş işini siler. Kendi dosyanı geri almak serbesttir: `git restore <yol>`.
4. **Başkasının dalını ve PR'ını silmez/kapatmaz.** Bir dalı silmeden önce: o dalı **taban alan açık PR var mı**? Varsa önce o PR'ın tabanı `main` yapılır.
5. **Ortak dosyaya dokunmadan önce okur.** `README.md`, `standartlar/`, `docs/teknik-borc.md`, proje rehberi (`CLAUDE.md`/`AI-RULES.md`) gibi dosyalarda: `git log --oneline -5 -- <dosya>` ile son durum okunur, üstüne yazılmaz.
6. **Kütük numarasını `main`'den alır.** Yeni `TB-xxx` numarası, ana daldaki en büyük numaranın bir fazlasıdır (arşiv dahil). İki oturum aynı numarayı açarsa senkron görevlisi iki kaydı aynı issue'ya bağlar.
7. **Tanımadığı, commit'lenmemiş dosyaya dokunmaz.** Çalışma alanında beklemediğin bir dosya varsa: büyük ihtimalle başka bir oturumun işidir. Commit'leme, silme, taşıma — proje sahibine sor.
8. **İşini bitirince gönderir.** Yerelde bırakılan commit, diğer oturum için görünmezdir; dal gönderilir (push) ve PR açılır. "Bitince" tur bitince demektir, her ara düzeltmede değil: açık PR dalına her gönderim CI'ı yeniden koşturur ve dakika yakar. Gönderimden önce yerel kapı çıkış kodu 0 olmalı (`quality/local-check.js`). Kota dolduğunda "hiç gönderme" rejimi kalıcı kural değildir; kota kapısı (`actions-kotasi`) eşikte uyarır, karar o gün sahibindir (#130, 2026-10-10).

## 2. Aynı depoda ikinci iş: ayrı çalışma alanı (worktree)

Aynı depoda **aynı anda** iki iş yapılacaksa, ikinci oturum kendi **worktree**'sinde çalışır:

```bash
git worktree add ../<proje>-<is-adi> -b feat/<is-adi>
```

Ayrı klasör, ayrı dal, tek depo ve tek geçmiş. Çakışma o zaman fiziksel olarak imkânsızdır; iki iş yalnız birleştirme sırasında buluşur. İş bitince:

```bash
git worktree remove ../<proje>-<is-adi>
```

**Ne zaman şart:** iki oturum aynı dosyalara dokunacaksa ya da biri dal değiştirecekse. **Ne zaman gerekmez:** biri yalnız okuyorsa.

## 3. Makine zorlaması

> Bu deponun ilkesi: zorlanamayan madde kural değil, öneridir.

| Kapı | Nerede | Ne yapar |
|---|---|---|
| **Oturum defteri** | `quality/session-registry.js` + oturum açılış bekçisi | Her oturum kendini deftere yazar; açılışta **"bu projede N başka oturum açık"** satırı gösterilir (dal ve son görülme zamanıyla). 2 saat haber vermeyen kayıt düşer. Defter bilgisayarda durur, depoya girmez. |
| **Geniş etkili komut denetimi** | `quality/wide-effect-git.js` + `guard-bash` bekçisi | `git add -A/.`, `git commit -a`, `git checkout -- .`, `git restore .`, `git clean -fd`, `git stash` engellenir; doğru yol mesajda yazar. |
| **Ana dal koruması** | aynı modül (`mainCommitBlock`) | `main`/`master` üzerindeyken commit engellenir: "önce kendi dalını aç". 1. maddenin makine karşılığıdır. |
| **Dal silme koruması** | aynı modül | Silinecek dalı **taban alan açık PR** varsa silme engellenir; mesaj PR numarasını söyler. |

Bekçiler `~/.claude/settings.json` üzerinden **tüm projelerde** çalışır: hiçbir projeye ayrı kurulum gerekmez.

**Defter kilit değildir.** Kimseyi engellemez, yalnız haber verir. Kilit yanlış güven verir ("kilitledim, artık dokunulmaz"); haber ise ajanı konuşmaya ve dikkatli olmaya iter.

**Defter çatalı ayırt edemez.** Masaüstü uygulaması bir oturumu çatallayınca ya da yeniden açınca yeni oturum kimliği üretir; defter bunu ikinci usta sanır (2026-09-23 Portföy: 7 saniyede 5 kayıt). Bu yüzden "aynı dalda buluşma" sayısı kilit gerekçesi değildir. Kilit kararı `node quality/file-overlap.js` ile verilir: aynı dosyaya kısa arayla iki oturum yazdı mı, kopya mı, sıralı mı? Ölçüm (2026-10-09, 6 hafta): 109 çakışmanın 2'si gerçek, 103'ü kopya. Kilit kurulmadı (TB-008).

### Bilinen davranış: bekçi metni okur, niyete bakmaz (#132, 2026-10-10)

- Bekçi komutun **metnini** düz arar. Yasak ifade bir dosya içeriğinde, heredoc'ta ya da yorumda geçse de engellenir. Çözüm: içeriği Write/Edit ile dosyaya yaz, dosyayı çalıştır. Vakalar: Portföy 2026-09-23 (iki gereksiz engel), SNN-Standartlar 2026-09-19, bellek derleme görevi 2026-10-10.
- "Ana dala commit" bekçisi dalı **oturumun çalışma klasöründen** okur; komut içindeki `cd`'yi görmez. Ayrı worktree'de `git -C <worktree> commit` kullan ya da oturumu `EnterWorktree` ile oraya taşı (Abacus-Core 2026-09-24).
- Worktree kardeş klasöre kurulur (`../<repo>-<is>`); geçici klasör yolu uzun olduğu için `node_modules` silinemiyor.
- Bekçiyi aşmak için başka komut aranmaz; engel meşruysa komutu sahip çalıştırır (madde 4).

## 4. Kaçış kapısı

Engellenen komut gerçekten gerekliyse (ör. tek başına çalışılan bir depoda toplu temizlik), komutu **proje sahibi kendisi çalıştırır**. Ajan bekçiyi devre dışı bırakmaz, kuralı gevşetmez.

## 5. İş bölümü ve haberleşme

- Aynı depoda çalışan oturumlar **farklı konu** alır; aynı dosyada buluşacaklarsa PR açıklamasına yazılır.
- Bir oturumun beklediği iş (ör. "şu yeniden adlandırma birleşsin") varsa, tasarım belgesine yazılır ve birleşince proje sahibi diğerine haber verir.
- Devir notu: uzun işlerde `docs/` altına tasarım/karar belgesi bırakılır; diğer oturum onu okuyarak devam eder.

## 6. Oturum sınırı: yalnız kendi projen

Aşağıdaki işaretli bölüm `setup/setup-machine.js` ile her makinede `~/.claude/CLAUDE.md` dosyasına kopyalanır (iletişim ve alt ajan bölümleriyle art arda).

**Neden (bellek derleme, 2026-10-10 — #128):** üç projede aynı kesin talimat. Portföy 2026-09-15 "bilgi kirliliği" (GHS kütüğünde Günüm Var kaydı), Portföy 2026-09-23 "teklif dahi etme", Nakit-Akış 2026-09-23 "diğer projelere karışma, bir daha bunu önerme bile". SNN-Standartlar'ın rehberinde yazılıydı ama yalnız o projede geçerliydi.

<!-- kullanici-talimati:basla -->
# Oturum sınırı

Bu kural SNN aile standardıdır (`SNN-Standartlar/standartlar/es-zamanli-calisma-standardi.md` §6).

1. Oturum yalnız açıldığı projeden sorumludur.
2. Açılıştaki "Diğer projelerde bekleyenler" satırları bilgi içindir; o projelere iş önerilmez, raporlanmaz, "bakalım mı" diye sorulmaz.
3. Başka projeyi ilgilendiren bulgu tek cümleyle not edilir ("Bu X projesinin konusu olabilir"); iş üstlenilmez.
4. Başka projenin kütüğüne ve dosyalarına yazılmaz; ölçüm için yalnız okunur.

# PR birleştirme

Bu kural SNN aile standardıdır (`SNN-Standartlar/standartlar/es-zamanli-calisma-standardi.md` §7). Proje sahibi 2026-10-17'de verdi (#164); otomatik birleştirme 2026-11-09.

1. CI denetimlerinin hepsi yeşilse Claude oturumun kendi projesindeki PR'ı birleştirir; ayrıca onay beklemez.
2. Birleştirmez: denetim kırmızı, beklemede ya da hiç çalışmamış; PR taslak; çakışma var; değişiklik istenmiş ya da çözülmemiş inceleme yorumu var; sahip "bekle" demiş.
3. `--delete-branch` öncesi o dalı taban alan açık PR olmadığı denetlenir.
4. Yöntem deponun alışkanlığıdır; son birleştirmelere bakılır (sıkıştırma ya da birleştirme commit'i).
5. Depoda zorunlu denetim ve otomatik birleştirme (auto-merge) açıksa Claude PR'ı açınca otomatik birleştirmeyi kendisi açar: `gh pr merge <no> --auto` ve madde 4'teki yöntem bayrağı. GitHub denetimler yeşil olunca birleştirir. Madde 2'deki engellerden biri varsa açılmaz. Depoda zorunlu denetim yoksa `--auto` kullanılmaz; CI yeşil olunca elle birleştirilir. Gizli depoda "dal güncel olsun" ayarı da açık olmalıdır.
6. Elle birleştirince sahibe tek mesajla haber verilir: hangi PR, denetim sonucu, kalan adım. Otomatik birleştirmede PR açılınca "CI yeşil olunca kendiliğinden birleşecek" denir; birleştikten sonra kalan adım varsa (canlı kopya tazeleme gibi) o da bu mesajda yazılır.
7. Komut engellenirse izni Claude eklemez. Sahip `~/.claude/settings.json` → `permissions.allow` içine `"Bash(gh pr merge:*)"` ekler.
<!-- kullanici-talimati:bitir -->

## 7. PR birleştirme yetkisi

Kuralın kendisi yukarıdaki işaretli bloğun içindedir: kopyalayıcı (`setup-machine.js`) dosya başına tek blok okur.

**Neden (#164, 2026-10-17):** SNN-Piyasa-Core PR #71'in CI'ı yeşildi; sahip "canlıya al" demişti. `gh pr merge 71 --squash` otomatik mod denetimine "Merge Without Review" gerekçesiyle takıldı, canlıya alma durdu. Sahip aynı gün kuralı bütün oturumlar için istedi. SNN-Standartlar'da aynı yetki 2026-10-14'ten beri yalnız proje belleğinde duruyordu.

**İzin ve kural ayrı şeylerdir.** İzin satırı komutu her durumda serbest bırakır; "CI yeşilse" koşulunu denetleyemez. Koşulu bu kural taşır. İzni Claude kendisi ekleyemez: kendi yetkisini genişletmek otomatik mod denetimine "Instruction Poisoning" olarak takılır ve bu sınır doğrudur.

**Ölçülmedi:** izin satırının otomatik mod denetimini gerçekten aştığı henüz denenmedi. İlk birleştirmede görülür; aşmazsa sahip komutu kendisi çalıştırır (§4).

### Otomatik birleştirme (2026-11-09)

**Neden (2026-11-09):** SNN-Standartlar PR #183'te CI yeşil olduğu hâlde oturum beklemek zorunda kaldı ve sahibin ayrıca "birleştir" demesi gerekti. Sahip aynı gün otomatik birleştirmeyi ortak süreç yaptı.

**Neden zorunlu denetim şart:** GitHub'da zorunlu denetim yoksa `--auto` denetim beklemeden birleştirebilir.

**Neden gizli depoda "dal güncel olsun":** gizli depolarda CI main'de koşmaz. PR main'in son hâli üstünde test edilmiş olmalı (`quality/merge-gate.js` `behindReason`).

**Depo ayarı (bir kez), üç adım:**

1. `allow_auto_merge` açılır.
2. Varsayılan dala zorunlu denetim yazılır. Denetim adları projenin kendi CI iş adlarıdır. Her PR'da çalışan işler seçilir; `paths:` süzgeçli iş seçilirse PR sonsuza dek bekler.
3. Gizli depoda `strict` açılır; açık depoda kapalı kalır.

Yönetici muafiyeti (`enforce_admins`) kapalı bırakılabilir; bu sahibe kaçış yolu bırakır. Bir depoda ayarı o projenin oturumu yapar (§6) ya da sahip açıkça ister.

**Ölçüm (2026-11-09, GitHub salt okuma, 16 aile projesi, `quality/data/family-projects.json`):** ayar öncesi otomatik birleştirme yalnız SNN-Games-Pulmaca'da açıktı (zorunlu denetim `ci`, strict kapalı). SNN-Standartlar aynı gün açıldı: zorunlu denetimler `test`, `python-araci`, `aile-kontrol`; strict kapalı (açık depo); yönetici muafiyeti var. Geri kalan 14 projede kapalı. Bunlardan globalhedef ve global-hedef-web-platform için yönetici iznimiz yok. Pulmaca gizli olduğu hâlde strict kapalı; bu yüzden kapı orada `--auto`yu reddeder, ayar düzelene kadar elle birleştirilir.

**Ölçülmedi:** diğer gizli depolarda zorunlu denetim ayarının yazılabildiği denenmedi. 2026-09-15'te Portföy'de 403 ölçülmüştü; 2026-11-09 okumasında 403 değil 404 ("koruma yok") döndü; Pulmaca gizli olduğu hâlde koruma taşıyor. Yazma denenmeden kesin söylenemez.

## Kontrol listesi maddesi

`standartlar/kod-inceleme-kontrol-listesi.md` içinde:

> Commit'e yalnız bu işin dosyaları mı girdi? Silinen dalı taban alan açık PR var mıydı?

## Sözlük

| Terim | Türkçe karşılığı |
|---|---|
| Worktree | Aynı deponun ikinci çalışma klasörü; ayrı dal, tek geçmiş |
| Sahne (stage) | Commit'e girecek dosyaların bekleme alanı |
| Taban dal (base) | Bir PR'ın hangi dalın üstüne açıldığı |
| Oturum | Tek bir yapay zekâ çalışma penceresi |
