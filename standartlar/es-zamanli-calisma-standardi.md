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

1. **Kendi dalında çalışır.** `main`'e doğrudan commit yok. Dal adı işi anlatır (`feat/…`, `fix/…`, `docs/…`, `refactor/…`).
2. **Commit'e yalnız kendi dosyalarını ekler.** `git add <yol>` ile açıkça. `git add -A`, `git add .`, `git commit -a` **yasaktır**.
3. **Toplu geri alma yapmaz.** `git checkout -- .`, `git restore .`, `git clean -fd`, `git stash` yasaktır; bunlar başkasının henüz commit'lenmemiş işini siler. Kendi dosyanı geri almak serbesttir: `git restore <yol>`.
4. **Başkasının dalını ve PR'ını silmez/kapatmaz.** Bir dalı silmeden önce: o dalı **taban alan açık PR var mı**? Varsa önce o PR'ın tabanı `main` yapılır.
5. **Ortak dosyaya dokunmadan önce okur.** `README.md`, `standartlar/`, `docs/teknik-borc.md`, proje rehberi (`CLAUDE.md`/`AI-RULES.md`) gibi dosyalarda: `git log --oneline -5 -- <dosya>` ile son durum okunur, üstüne yazılmaz.
6. **Kütük numarasını `main`'den alır.** Yeni `TB-xxx` numarası, ana daldaki en büyük numaranın bir fazlasıdır (arşiv dahil). İki oturum aynı numarayı açarsa senkron görevlisi iki kaydı aynı issue'ya bağlar.
7. **Tanımadığı, commit'lenmemiş dosyaya dokunmaz.** Çalışma alanında beklemediğin bir dosya varsa: büyük ihtimalle başka bir oturumun işidir. Commit'leme, silme, taşıma — proje sahibine sor.
8. **İşini bitirince gönderir.** Yerelde bırakılan commit, diğer oturum için görünmezdir; dal gönderilir (push) ve PR açılır.

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
| **Dal silme koruması** | aynı modül | Silinecek dalı **taban alan açık PR** varsa silme engellenir; mesaj PR numarasını söyler. |

Bekçiler `~/.claude/settings.json` üzerinden **tüm projelerde** çalışır: hiçbir projeye ayrı kurulum gerekmez.

**Defter kilit değildir.** Kimseyi engellemez, yalnız haber verir. Kilit yanlış güven verir ("kilitledim, artık dokunulmaz"); haber ise ajanı konuşmaya ve dikkatli olmaya iter.

## 4. Kaçış kapısı

Engellenen komut gerçekten gerekliyse (ör. tek başına çalışılan bir depoda toplu temizlik), komutu **proje sahibi kendisi çalıştırır**. Ajan bekçiyi devre dışı bırakmaz, kuralı gevşetmez.

## 5. İş bölümü ve haberleşme

- Aynı depoda çalışan oturumlar **farklı konu** alır; aynı dosyada buluşacaklarsa PR açıklamasına yazılır.
- Bir oturumun beklediği iş (ör. "şu yeniden adlandırma birleşsin") varsa, tasarım belgesine yazılır ve birleşince proje sahibi diğerine haber verir.
- Devir notu: uzun işlerde `docs/` altına tasarım/karar belgesi bırakılır; diğer oturum onu okuyarak devam eder.

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
