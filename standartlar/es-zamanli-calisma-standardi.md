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

Aynı standart, §7. Proje sahibi 2026-10-17'de verdi (#164).

1. CI denetimlerinin hepsi yeşilse Claude oturumun kendi projesindeki PR'ı birleştirir; ayrıca onay beklemez.
2. Birleştirmez: denetim kırmızı, beklemede ya da hiç çalışmamış; PR taslak; çakışma var; değişiklik istenmiş ya da çözülmemiş inceleme yorumu var; sahip "bekle" demiş.
3. `--delete-branch` öncesi o dalı taban alan açık PR olmadığı denetlenir.
4. Yöntem deponun alışkanlığıdır; son birleştirmelere bakılır (sıkıştırma ya da birleştirme commit'i).
5. Zorunlu denetimli depoda Claude PR'ı açınca `gh pr merge <no> --auto` ile otomatik birleştirmeyi açar; madde 2 ve 4 geçerlidir. Zorunlu denetim yoksa elle birleştirilir (§7).
6. Sahibe tek mesajla haber verilir: hangi PR, denetim sonucu ya da otomatik birleşeceği, kalan adım.
7. Komut engellenirse izni Claude eklemez. Sahip `~/.claude/settings.json` → `permissions.allow` içine `"Bash(gh pr merge:*)"` ekler.

Canlı veritabanına dokunmadan önce aynı standardın §8'i okunur.
<!-- kullanici-talimati:bitir -->

## 7. PR birleştirme yetkisi

Kuralın kendisi yukarıdaki işaretli bloğun içindedir: kopyalayıcı (`setup-machine.js`) dosya başına tek blok okur.

**Neden (#164, 2026-10-17):** SNN-Piyasa-Core PR #71'in CI'ı yeşildi; sahip "canlıya al" demişti. `gh pr merge 71 --squash` otomatik mod denetimine "Merge Without Review" gerekçesiyle takıldı, canlıya alma durdu. Sahip aynı gün kuralı bütün oturumlar için istedi. SNN-Standartlar'da aynı yetki 2026-10-14'ten beri yalnız proje belleğinde duruyordu.

**İzin ve kural ayrı şeylerdir.** İzin satırı komutu her durumda serbest bırakır; "CI yeşilse" koşulunu denetleyemez. Koşulu bu kural taşır. İzni Claude kendisi ekleyemez: kendi yetkisini genişletmek otomatik mod denetimine "Instruction Poisoning" olarak takılır ve bu sınır doğrudur.

**Ölçülmedi:** izin satırının otomatik mod denetimini gerçekten aştığı henüz denenmedi. İlk birleştirmede görülür; aşmazsa sahip komutu kendisi çalıştırır (§4).

### Otomatik birleştirme (2026-11-09)

**Neden (2026-11-09):** SNN-Standartlar PR #183'te CI yeşil olduğu hâlde oturum beklemek zorunda kaldı ve sahibin ayrıca "birleştir" demesi gerekti. Sahip aynı gün otomatik birleştirmeyi ortak süreç yaptı.

**Nasıl işler:** `--auto` açıldıktan sonra denetimler yeşil olunca GitHub kendisi birleştirir. Otomatik birleşmede sahibe PR açılınca "CI yeşil olunca kendiliğinden birleşecek" diye haber verilir; birleşme sonrası kalan adım (canlı kopya tazeleme gibi) aynı mesajda yazılır.

**Neden zorunlu denetim şart:** GitHub'da zorunlu denetim yoksa `--auto` denetim beklemeden birleştirebilir.

**Neden gizli depoda "dal güncel olsun":** gizli depolarda CI main'de koşmaz. PR main'in son hâli üstünde test edilmiş olmalı (`quality/merge-gate.js` `behindReason`).

**Depo ayarı (bir kez), üç adım:**

1. `allow_auto_merge` açılır.
2. Varsayılan dala zorunlu denetim yazılır. Denetim adları projenin kendi CI iş adlarıdır. Her PR'da çalışan işler seçilir; `paths:` süzgeçli iş seçilirse PR sonsuza dek bekler. Otomatik birleştirme yalnız zorunlu denetimleri bekler. Zorunlu olmayan bir iş sürerken ya da kırmızıyken de birleştirir. Bu yüzden zorunlu liste projenin gerçek CI'ını kapsamalıdır. Adı ortak depodan gelen işler (`tara / ...` gibi) zorunlu yazılmaz; ad değişirse PR'lar sonsuza dek bekler. Vaka: Naturapan'da aynı iş `tara / tara` iken `tara / bridge / scan` oldu. Her PR'da çalışan kendi CI işi olmayan depoda ayar açılmaz; elle birleştirme sürer.
3. Gizli depoda `strict` açılır; açık depoda kapalı kalır.

Yönetici muafiyeti (`enforce_admins`) kapalı bırakılabilir; bu sahibe kaçış yolu bırakır. Bir depoda ayarı o projenin oturumu yapar (§6) ya da sahip açıkça ister. Sahip 2026-11-09'da ayarı bu oturumdan aile depolarına yaydırdı; bu, §6 oturum sınırına sahibin verdiği tek istisnadır ve yalnız GitHub ayarını kapsar, dosyaları kapsamaz.

**Ölçüm (2026-11-09, ayar geri okundu, 16 aile projesi, `quality/data/family-projects.json`):**

| Sonuç | Proje | Zorunlu denetim |
|---|---|---|
| Açık (9) | SNN-Standartlar (açık depo) | `test`, `python-araci`, `aile-kontrol` |
| | SNN-UI (açık depo) | `test`, `aile` |
| | Gunum-Var | `Lint & Type Check` |
| | SNN-Piyasa-Core | `ci` |
| | SNN-Portfoy-Yonetimi | `build-and-lint` |
| | SNN-Proje-ve-Nakit-Akis-Yonetimi | `lint-tip-derleme` |
| | SNN-Games-Umi | `aile` |
| | SNN-ihale-ozeti | `aile` |
| | SNN-Games-Pulmaca | `ci` |

Gizli yedi depoda strict açık. Pulmaca dışındaki sekizde yönetici muafiyeti var; Pulmaca'da yok (mevcut ayarı korundu).

Açılmayan (7), nedeniyle:

- SNN-Abacus-Core, SNN-Ihale-Maliyet-Teklif-Yonetimi, SNN-Yonetici-Ozeti, trade-kasa, SNN-Siparis: asıl CI işi `paths:` süzgeçli; belge PR'ında çalışmaz. Zorunlu yazılırsa PR bekler, yazılmazsa CI bitmeden birleşir. Süzgeç kaldırılırsa açılır; bu Actions kotasına yük bindirir, karar projenin.
- Naturapan-Web-Sitesi: tek işi ortak depodan gelen tarama.
- globalhedef/global-hedef-web-platform: yönetici iznimiz yok, ayarı hesabın sahibi yapar.

**Ölçüldü:** 2026-09-15'teki Portföy 403 şüphesi çözüldü; altı gizli depoda koruma yazılabildi.

**Ölçülmedi:** strict'in Actions kotasına etkisi. Gizli depolarda strict, dal gerideyse CI'ı yeniden çalıştırır ve otomatik birleştirme dal güncellenene kadar bekler.

## 8. Canlı veritabanı işlemi

Canlı veritabanı: kullanıcıların gerçekten kullandığı veritabanıdır, deneme kopyası değildir. Kuralın kendisi bu bölümdedir; ev kâğıdında yalnız buraya bakan tek satır durur (yukarıdaki işaretli blok).

Bu bölümde iki ayrı engel var. Sebepleri ve çözümleri farklıdır, bu yüzden ayrı yazıldı:

| Engel | Kim durdurur | Çözüm |
|---|---|---|
| Otomatik izin denetleyicisi | Claude'un komutu çalıştırmadan önce bakan otomatik güvenlik süzgeci | §8.1: işlemi adıyla anan onay ya da SQL dosyası |
| "You do not have permission" | Supabase sunucusu | §8.2: bağlayıcının erişimi ölçülür, yetkilendirilir |

### 8.1 Yazmadan önce: işlemi adıyla anan onay (#167, 2026-10-19)

**Neden:** Otomatik izin denetleyicisi canlı veritabanına yazmayı engelliyor. Sohbetteki genel "evet" işlemi geçirmiyor. İki bağımsız projede aynı ders çıktı:

| Proje | Tarih | Gözlem |
|---|---|---|
| Gunum-Var | 2026-10-07 | MCP `execute_sql` ile DELETE ve UPDATE engellendi. Okuma ve `begin … rollback` sınamaları çalıştı. Yol: SQL dosyası hazırlandı, sahip SQL Editor'de çalıştırdı. |
| SNN-Portfoy-Yonetimi | 2026-10-12 | `apply_migration` üç kez takıldı (TB-033). "Hepsi evet" geçmedi. Sahip işlemi adıyla anan tam cümleyi yazınca geçti. |

Eski hâl: GHS-Panel notu (2026-09-26) Claude'un canlıda `apply_migration` çalıştırdığını yazar. Denetleyici o tarihte bu işi geçiriyordu. Ne zaman değiştiği ölçülmedi.

**Kural:**

1. Canlı veritabanına yazan işlemden önce ne yapılacağı, riski ve geri alma yolu yazılır.
2. Sahipten işlemi adıyla anan tam cümle istenir; önerilen cümle kalın yazılır. Genel "evet" yetmez.
3. İşlem önce `begin … rollback` ile sınanır: işlem çalışır, sonra geri alınır, veri kalıcı değişmez.
4. Denetleyici yine engellerse dolanılmaz. İşlem tek SQL dosyasında toplanır, sahip SQL Editor'de çalıştırır (§4 kaçış kapısı).

**Madde 2 neden böyle:** Adıyla anma, sahibin neyi onayladığını bilerek onaylamasıdır. Genel "evet" bir işlemi adıyla onaylamaz; sahip ne çalışacağını bilmeyebilir. Cümle denetleyiciyi geçirmek için kurulan bir hile değildir. Portföy'de bu cümle yazılınca işlem geçti (2026-10-12). Geçmezse madde 4 işler.

### 8.2 Erişim: önce `list_projects` (#172, 2026-11-02)

**Neden:** Supabase bağlayıcısı (Claude'un Supabase'e bağlandığı MCP aracı) izin hatası verince üç projede aynı olay üç farklı yorumla yazıldı:

| Proje | Tarih | Notun yorumu |
|---|---|---|
| SNN-Abacus-Core | 2026-08-31 | "Erişim var. `list_projects` göstermez, proje koduyla doğrudan çağır." |
| Gunum-Var | 2026-10-20 | "You do not have permission" hatası, denetleyici engellerinin devamı sayıldı: "artık okuma da engelli". |
| GHS-Panel | 2026-10-28 | "Bağlayıcı başka hesapla yetkilendirilmiş. Önce `list_projects` ile denetle." |

**Ölçüm (2026-11-02, salt okuma):** `list_projects` tek proje döndürdü: SNN_Portfoy_Yonetimi. Gunum-Var'ın proje koduyla `get_project` çağrısı `MCP error -32600: You do not have permission to perform this action` verdi. Abacus-Core notundaki "doğrudan çağrı çalışır" o gün geçerli değildi.

**Kural:**

1. Canlı veritabanı işinden önce `list_projects` çalıştırılır; proje listede mi bakılır.
2. "You do not have permission" sunucu yanıtıdır. İzin denetleyicisi engeli sayılmaz; §8.1'in çözümü bunu düzeltmez.
3. Erişim yoksa sahibe iki seçenek sunulur: bağlayıcıyı doğru hesapla yetkilendirmek ya da SQL dosyasını kendisi çalıştırmak.
4. Bellek notuna "erişim var/yok" yalnız tarihli ölçüm olarak yazılır. Örnek: "2026-11-02: `list_projects` Gunum-Var'ı göstermedi."

**Ölçülmedi:** bağlayıcının hangi hesaba yetkili olduğu (GHS-Panel notundaki "başka hesap" doğrulanmadı) ve yeniden yetkilendirmenin sorunu çözdüğü. Madde 3'ün birinci seçeneği bu yüzden denenmemiş bir yoldur.

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
| Canlı veritabanı | Kullanıcıların gerçekten kullandığı veritabanı; deneme kopyası değil |
| Otomatik izin denetleyicisi | Claude'un komutu çalıştırmadan önce bakan otomatik güvenlik süzgeci (auto mode) |
| Bağlayıcı | Claude'un başka bir hizmete (burada Supabase) bağlandığı MCP aracı |
| `rollback` | Açık işlemi geri alan komut; `begin` ile açılan işlem kalıcı yazmadan kapanır |
