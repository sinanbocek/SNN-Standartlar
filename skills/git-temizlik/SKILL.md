---
name: git-temizlik
description: Oturumun açıldığı projenin GitHub'da biriken bekleyenlerini (açık issue, PR, Dependabot uyarısı, silinmemiş dal) tek tabloda ölçer, sınıflandırır, müdürlere dağıtır, PR'ları sıraya koyup birleştirir ve sahibe tek brifle bitirir. Genel Müdür düzeni olan projelerde çalışır. "Git temizliği", "bekleyenleri topla", "issue ve PR'ları temizle", "Dependabot uyarılarını kapat", "/git-temizlik" dendiğinde kullan.
---

# Projenin GitHub bekleyenlerini topla ve kapat

> `<ev>` = ev klasörü. Öğrenmek için: `node -e "console.log(require('os').homedir())"`

Bu işi ana oturum, yani Genel Müdür yürütür. Kod yazmaz; işi müdürlere verir, sonucu denetler, PR'ları birleştirir, sahibe tek brif yazar.
Kuralların kendisi standartlardadır, burada tekrar edilmez. Atıf: `<ev>/.claude/standartlar-canli/standartlar/alt-ajan-standardi.md`, `es-zamanli-calisma-standardi.md` (§1, §6, §7, §8), `ekip-duzeni-standardi.md`, `iletisim-standardi.md`, `olcum-standardi.md` (Kural 3).
Çelişkide standart önce gelir.

## 0. Başlamadan

1. **Depoyu bul.** Yalnız oturumun açıldığı klasördeki depo: `gh repo view --json nameWithOwner,isPrivate,defaultBranchRef`. Hiçbir komuta başka depo adı (`-R`) yazılmaz. `isPrivate` değeri kota (adım 1) ve açık depo uyarısı (adım 4) için kullanılır.
2. **Ekip düzeni var mı?** `ekip/genel-mudur.md` ve `.claude/agents/` ikisi de olmalı.
   - **Biri yoksa dur.** Kullanıcıya tek cümleyle söyle: "Bu projede Genel Müdür düzeni kurulu değil; kurmak için `proje-kur` becerisinin 7. adımı var." Yalnız adım 1'i (envanter) yap, tabloyu göster, orada bitir. Sınıflandırma, dağıtım ve birleştirme yapılmaz.
3. **Projenin kendi bilgisini oku.** Müdür adları, kapsamları, model·seviye tablosu ve iş tarifi şablonu `ekip/genel-mudur.md` içindedir ("Departmanlar", "İş verme kalıbı"). Kartlar `.claude/agents/*.md` içindedir. Bu beceri bunları kendi metnine kopyalamaz; her çalışmada okur.
4. **Oturum sınırı** (`es-zamanli-calisma-standardi.md` §6). Açılıştaki "Diğer projelerde bekleyenler" satırları bu işin girdisi değildir. Başka projeye iş önerilmez; başka projeyi ilgilendiren bulgu tek cümleyle not edilir.
5. **Ölçülemeyen "yok" olmaz** (`olcum-standardi.md` Kural 3). Bir sorgu hata verirse tabloya "okunamadı: <hata>" yazılır. 0 yazılmaz.

## 1. Envanter

Tek tablo çıkar. Satırlar: açık issue, açık PR, Dependabot uyarısı, silinmemiş dal, Actions kotası. Her satırda sayı ve "nasıl ölçüldü" bulunur.

Aşağıdaki komutlar Bash aracında çalıştırılır: dal komutu Bash sözdizimi kullanır ve PowerShell'de çalışmaz.

```bash
# Açık issue
gh issue list --state open --limit 200 --json number,title,labels,updatedAt --jq '.[]|[.number,.title,(.labels|map(.name)|join(",")),.updatedAt[:10]]|@tsv'

# Açık PR: CI, çakışma, taslak, dokunduğu dosya sayısı, yazar (Dependabot "app/dependabot" görünür)
gh pr list --state open --limit 100 --json number,title,isDraft,mergeable,mergeStateStatus,changedFiles,reviewDecision,author,statusCheckRollup --jq '.[]|[.number,.title,(if .isDraft then "taslak" else "hazir" end),.mergeable,.mergeStateStatus,.changedFiles,((.statusCheckRollup//[])|map(.conclusion // .state // .status)|unique|join("/")),(.reviewDecision//"-"),.author.login]|@tsv'

# Dependabot uyarısı: no, önem, kapsam (runtime = çalışan, development = geliştirme), paket, düzeltme sürümü
gh api "repos/{owner}/{repo}/dependabot/alerts?state=open&per_page=100" --paginate --jq '.[]|[.number,.security_advisory.severity,(.dependency.scope // "?"),.security_vulnerability.package.name,(.security_vulnerability.first_patched_version.identifier // "yok")]|@tsv'

# Silinmemiş dal: ucu, birleşmiş bir PR'ın son commit'iyle AYNI olan dallar (aşağıdaki not)
D=$(gh api "repos/{owner}/{repo}/branches?per_page=100" --paginate --jq '.[]|select(.name!="main")|[.name,.commit.sha]|@tsv') && M=$(gh pr list --state merged --limit 200 --json headRefName,headRefOid,isCrossRepository --jq '.[]|select(.isCrossRepository|not)|[.headRefName,.headRefOid]|@tsv') && comm -12 <(echo "$D"|sort -u) <(echo "$M"|sort -u) || echo OKUNAMADI

# Actions kotası: hesap toplamı (çıkış 0 tamam, 1 eşik aşıldı, 2 ölçemedim)
node "<ev>/.claude/standartlar-canli/quality/actions-quota.js"
```

Okuma notları:
- Varsayılan dal `main` değilse dal komutundaki `main` yerine onun adı yazılır (adım 0 çıktısından).
- `mergeable` ve `mergeStateStatus` bazen `UNKNOWN` döner (GitHub geç hesaplar). Bir kez daha sorulur; yine `UNKNOWN` ise tabloda "bilinmiyor" yazılır.
- Dependabot uyarısı komutu hata verirse (alt sistem kapalı olabilir, yetki olmayabilir) satır "okunamadı: <hata>" olur. "0 uyarı" denmez.
- **Dal için ad eşleşmesi yetmez.** 2026-11-10'da SNN-Standartlar'da ad eşleşmesi 1 dal gösterdi, uç eşitliği 0: dalın ucu birleşmiş PR'ın ucundan farklıydı (nedeni araştırılmadı). Ucu farklı dala dokunulmaz.
- Birleşmemiş ama kapatılmış PR'ın dalı bu listeye girmez; o dalda birleşmemiş iş olabilir, "karar" kutusuna gider.
- Kota hesap geneli ölçülür (`<ev>/.claude/standartlar-canli/docs/actions-kotasi.md`). Tabloya hesap toplamı ve eşik ile bu projenin satırı yazılır; öteki projelerin satırları yazılmaz (§6). Yalnız gizli depo kota yakar (`isPrivate`). Açık depoda satır "ücretsiz, sayılmadı" olur.
- **Kota öngörüsü.** Birleştirilecek PR sayısı N ise en az N−1 ek CI koşumu gelir (adım 4, neden orada). Bir koşumun süresi `gh run list --limit 10 --json name,startedAt,updatedAt,conclusion` ile okunur; GitHub her işi dakikaya yuvarlar (`<ev>/.claude/standartlar-canli/docs/actions-kotasi.md`). Çarpım kalan kotayı aşıyorsa brife yazılır ve PR toplama (adım 3) zorunlu olur.

**Vaka (Gunum-Var, 2026-11-10, talep #191):** 14 PR ardışık birleşti. Her PR iki kez CI koştu, yaklaşık 70 dakika kota gitti. Bu sayı sahibin ölçümüdür; bu depoda yeniden ölçülmedi.

## 2. Sınıflandırma

Genel Müdür sınıflandırır; müdüre sorulmaz. Her kalem dört kutudan birine girer.

| Kutu | Ne zaman | Kim, nasıl |
|---|---|---|
| **Koddan kapanır** | Bir kod, belge ya da SQL değişikliği kalemi kapatır | Müdüre (adım 3) |
| **Sahip adımı** | Yalnız sahibin yapabildiği iş: SQL Editor, konsol, mağaza, hesap ayarı | Hazırlanır, çalıştırılmaz; "Sizin yapacaklarınız / elle" listesine PowerShell biçiminde yazılır |
| **Karar** | Ürün kararı, öncelik, iki yoldan birini seçme | Brife numaralı, seçenekli, önerili soru |
| **Kapanmaz** | Eskimiş, tekrar eden, yapılmayacak ya da düzeltmesi olmayan kalem | Gerekçesi yazılı kapatılır ya da bırakılır (adım 4) |

Kurallar:
- **TB kaydı olan issue elle kapatılmaz.** Başlığında `TB-xxx` olan issue, kayıt kütükten arşive taşınınca senkronla kapanır (`teknik-borc-standardi.md`, "Kapanış"). Kutu: "koddan kapanır"; kütük işi belge turundadır (adım 5).
- **Canlı veritabanına yazan iş "koddan kapanır" olmaz.** Önce `es-zamanli-calisma-standardi.md` §8 okunur: işlemi adıyla anan onay ya da SQL dosyası. SQL dosyası hazırlanır, sahip çalıştırır; kutu "sahip adımı".
- **Dependabot uyarısı bir kalemdir; güvenlik sınıflandırması Genel Müdür'de kalır** (`alt-ajan-standardi.md` Kural 8). Önem, çalışan/geliştirme kapsamı ve "düzeltme var mı" tablodan okunur:
  - Düzeltme sürümü var: "koddan kapanır". Müdüre yalnız paket yükseltme kodu gider.
  - Düzeltme yok: "kapanmaz", gerekçeyle kapatılır. **Ek kural (bu becerinin kararı, standartta yok):** çalışan (`runtime`) kapsamda, önemi yüksek ya da kritik ve düzeltmesi olmayan uyarı kapatılmaz; "karar" kutusuna gider. Riski kabul etmek sahibin kararıdır.
- Aynı paketi yükselten uyarılar tek kalemde toplanır; bir yükseltme çoğu zaman birkaç uyarıyı birden kapatır.

## 3. Dağıtım

1. **Gruplama.** Aynı dosyalara dokunacak kalemler aynı müdüre gider. Aynı müdürün kalemleri mümkün olduğunca tek tarif, tek PR olur. Gerekçe iki tane: PR sayısı kota yakar (adım 1) ve `ekip/<müdür>/DURUM.md` her PR'da aynı yerden çakışır (Gunum-Var 2026-11-10: 7 çakışma). Bağımsız gruplar aynı anda çalışır.
2. **Müdür seçimi.** Adım 0'da okunan "Departmanlar" tablosundan, kapsama göre. Kapsamı hiçbir müdüre uymayan kalem zorlanmaz; "karar" kutusuna gider.
3. **Model ve seviye** her çağrıda açık yazılır (`alt-ajan-standardi.md` Kural 2). Projenin `ekip/genel-mudur.md` tablosu varsa o, yoksa standardın tablosu geçerlidir. Güvenlik incelemesi hiçbir ajana verilmez.
4. **Eşzamanlılık.** Aynı anda en çok 6–8 ajan (Kural 10; varsayımdır, ölçülmedi). Ağır test koşturan (`npm ci` + doğrulama) ajan sayısı ayrıca düşürülür: Gunum-Var 2026-11-10'da `ImportWizard.test.tsx` yük altında zaman aşımına düştü. Kaç ajanın güvenli olduğu ölçülmedi.
5. **Yazan ajan ayrı çalışma kopyasında çalışır** (`isolation: "worktree"`, Kural 7). Bir kopyaya iki ajan yazmaz.
6. **İş tarifi.** Şablon `ekip/genel-mudur.md` içindeki "İş verme kalıbı"ndır; alanlarını oradan al. Tarife şunlar girer:
   - Kalem numaraları, **dokunabileceği dosyalar** ve dokunmayacakları.
   - **İlk işler** (kopya `origin/main`'in gerisinde olabilir):
     1. `git merge origin/main`
     2. Kökte `package-lock.json` varsa `npm ci`. Yoksa kurulum yapılmaz; projenin rehberindeki yol izlenir. Belge ve SQL işinde `npm ci` atlanır (5 dakikadan uzun sürebilir; Gunum-Var 2026-11-10'da üç müdür bu yüzden doğrulama koşamadı ya da süre kaybetti).
   - Kod yazan ajan için, değiştirmeden: "Tanımlayıcılar İngilizce; yorum ve kullanıcı metni Türkçe (kod-dili-standardi.md)." Bunun yanına: "Dosya, betik ve SQL dosyası adları da tanımlayıcıdır, İngilizce olur." Vaka (Gunum-Var, 2026-11-10): aile CI'ı iki PR'ı bu yüzden kırmızı yaptı (#254 `kurulum_tablo_tamamlama.sql`, #255 bir bekçi betiği).
   - Test zaman aşımına düşerse: tek başına yeniden koşulur; yine düşerse sınırı gevşetmeden raporlanır.
   - Müdür raporu: Yaptım, Denetlemedim, Bekleyen.
7. **Müdür tipi Agent aracında yüklü değilse** (`.claude/agents/*` oturum başında kayıtlı olmayabilir; vaka: Gunum-Var 2026-11-10): `subagent_type: "general-purpose"` kullanılır ve tarifin ilk satırı "Önce `.claude/agents/<kart adı>.md` dosyasını oku ve ona uy" olur. Yedekte de model ve seviye açık yazılır; kartın `model` alanı yedeğe uygulanmaz.
8. **Rapor doğrulama.** Kritik iddia (test sonucu, dosya listesi) Genel Müdür tarafından doğrulanır (Kural 6): `git -C <kopya> diff --stat origin/main`. Commit ve PR açma müdürün değil Genel Müdür'ündür; `ekip/genel-mudur.md` "İş verme kalıbı" sonundaki üç adım uygulanır.

## 4. PR döngüsü

Birleştirme kuralı `es-zamanli-calisma-standardi.md` §7'dedir. Burada yalnız sıra ve yöntem seçimi.

**Önce plan, sonra döngü.**
1. PR'lar sıralanır: **en çok dosyaya dokunan önce** (`changedFiles`). İlk PR dal güncellemesi istemez; sonrakiler küçük olduğu için çakışma ucuz çözülür. Aynı dosyaya dokunan PR'lar yan yana konur.
2. Yöntem (birleştirme commit'i mi, sıkıştırma mı) son birleştirmelerden okunur: `git log --first-parent --oneline -10 origin/main`.
3. Zorunlu denetim var mı: `gh api "repos/{owner}/{repo}/branches/<varsayılan dal>/protection/required_status_checks" --jq '.contexts'`. Hata metni "Branch not protected" ise yok. Başka bir hata (yetki, ağ) ise **okunamadı**: elle birleştirme yolu seçilir ve tabloya "okunamadı" yazılır.

**Her PR için, sırayla.** Önceki PR birleşmeden bir sonrakinin dalı güncellenmez. Hepsini baştan güncellemek her birleşmeden sonra hepsini yeniden geride bırakır ve CI iki kez koşar.
1. `mergeStateStatus` `BEHIND` ise `gh pr update-branch <no>`. Çakışma varsa kopyada çözülür (aşağıda).
2. Birleştirme §7'ye göre:
   - **Zorunlu denetimli depoda:** `gh pr merge <no> --auto --merge` (ya da deponun yöntemi). GitHub CI yeşil olunca kendisi birleştirir. Birleşme görülmeden sonraki PR'a geçilmez: `gh pr view <no> --json state,mergedAt`.
   - **Zorunlu denetim yoksa:** `gh pr checks <no> --watch -i 20`, hepsi yeşilse elle `gh pr merge <no> --merge`.
3. **Birleştirilmez:** denetim kırmızı, beklemede ya da hiç çalışmamış; PR taslak; çakışma var; değişiklik istenmiş ya da çözülmemiş yorum var; sahip "bekle" demiş. Bu PR atlanır, sıradaki devam eder, brife yazılır.
4. `--delete-branch` kullanılacaksa önce o dalı taban alan açık PR olmadığı denetlenir: `gh pr list --state open --base <dal> --json number`.
5. Ara düzeltme anında gönderilmez; her gönderim CI'ı yeniden koşar (`es-zamanli-calisma-standardi.md` §1 madde 8). Kırmızı PR'ın düzeltmesi tek turda toplanır.

**`ekip/<müdür>/DURUM.md` çakışması.** İki taraf da korunur.
1. Kopyada `git merge origin/main` çakışmayı gösterir.
2. Dosya Edit aracıyla açılır; iki tarafın girişleri de kalır, tarih sırasına konur, yalnız `<<<<<<<`, `=======`, `>>>>>>>` satırları kaldırılır. **Satır silen `sed` kullanılmaz** (iki tarafın girişini de silebilir; dosyalar CRLF taşıyabilir).
3. Denetim: Grep ile işaret kalmadığına bakılır. `git show origin/main:<dosya>` içindeki her giriş ile dalın eski hâlindeki her giriş yeni dosyada aranır; eksik giriş varsa çözüm geri alınır.

**Dependabot PR'ı.** Yerini alan PR birleşmiş ve ilgili uyarılar `fixed` olmuşsa Dependabot PR'ı "Yerine #<no> birleşti" yorumuyla kapatılır. Yalnız bu işin yerini alan PR kapatılır; başkasının PR'ına dokunulmaz (`es-zamanli-calisma-standardi.md` §1 madde 4).

**Uyarı ve issue kapatma.** Geri alınması zahmetli ve dışa görünür işlerdir:
- Gerekçe yazılı değilse kapatılmaz. Uyarıya: `gh api -X PATCH "repos/{owner}/{repo}/dependabot/alerts/<no>" -f state=dismissed -f dismissed_reason=<fix_started|inaccurate|no_bandwidth|not_used|tolerable_risk> -f dismissed_comment="<gerekçe>"`. Issue'ya: `gh issue close <no> --reason "not planned" --comment "<gerekçe>"`.
- Her gerekçe brife de girer ("Kapattıklarım" satırı), sahip geri açabilsin.
- **Açık depoda** (`isPrivate` false) PR ve issue metnine açığın niteliği yazılmaz; yalnız paket adı ve sürüm (`teknik-borc-standardi.md`: başlık açığı anlatmaz).
- Düzeltmesi birleşen uyarı birkaç dakika açık görünebilir. Bitiş ölçümünde hâlâ açıksa brife "GitHub taraması bekleniyor, ölçüm <saat>" yazılır; 0 denmez.

**Silinmemiş dal.** Adım 1 listesindeki dallar için, her dalda önce: uç hâlâ birleşmiş PR'ın ucu mu, o dalı taban ya da kaynak alan açık PR var mı? Hepsi temizse `git push origin --delete <dal>` bir kez denenir. **Engellenirse başka yol aranmaz, izin eklenmez, bekçi gevşetilmez** (`es-zamanli-calisma-standardi.md` §4 ve §7 madde 7). Sahibe komut verilir (komut kuralı: `iletisim-standardi.md`, "Proje sahibine komut verirken"). Klasör denetimi ve komut aynı blokta:

```bash
Set-Location "<proje klasörü>"; if ((git remote get-url origin) -match '<depo adı>') { git push origin --delete <dal1> <dal2> } else { Write-Host 'YANLIS KLASOR' }
```

**Oturum arşivi** engellenirse aynı kural: sahibe "kenar çubuğundan bu oturumu arşivleyin" yazılır.

Döngü bitince adım 1'in komutları yeniden çalışır; bitiş sayıları oradan alınır.

## 5. Belge turu

En sonda, tek müdür. Kapsamı kütük, pano ve rehber olan müdür seçilir (ortak adı "Belge Müdürü", `ekip-duzeni-standardi.md`; kartı `.claude/agents/` içinden bulunur). Böyle bir müdür yoksa tur yapılmaz; brifte "belge turu yapılmadı: belge müdürü yok" yazılır.

Tarife girenler:
1. **Kütük kapanışları:** bu turda çözülen `TB-xxx` kayıtları kütükten arşive taşınır (`teknik-borc-standardi.md`, "Kapanış"); iki dosya aynı commit'te.
2. **Pano:** biten işler yazılır, eskiyen satır kısaltılır.
3. **Rehber sayıları:** `CLAUDE.md` ve proje rehberinde elle yazılmış sayılar (test sayısı, açık kayıt sayısı gibi) güncel ölçümle düzeltilir. Ölçülmeyen sayı "ölçülmedi" diye bırakılır.
4. **Oturum belleği:** bu turdan kalıcı bir ders çıktıysa tarihli ve ölçümlü yazılır.

Belge turu son PR'ı açar; bir PR daha kota demektir (adım 1 öngörüsüne eklenir).

## 6. Brif

Sahibe tek mesaj. Önce sonuç, sonra ayrıntı. Cümle en fazla 20 kelime. Teknik terim ilk geçtiğinde açıklanır (CI: otomatik denetim; Dependabot: bağımlılık güvenlik robotu; dal: bir işin ayrı kopyası). Karar soruları numaralı, seçenekli, öneri işaretli. Komutlar `bash` etiketli, içerik PowerShell, tek komut tek blok.

````
Git temizliği bitti: <depo>, <tarih>. <Tek cümle sonuç>.

Sonuç (başlangıç → bitiş)
- Açık PR: <a> → <b>
- Açık issue: <a> → <b>
- Açık Dependabot uyarısı: <a> → <b>
- Silinmemiş birleşmiş dal: <a> → <b>
- Actions kotası (hesap): <a> / <eşik> dk → <b> dk
- Ölçüm notu: <ölçülemeyen ya da "okunamadı" olan satır ve nedeni; yoksa "hepsi ölçüldü">

Departman özeti
- <Müdür adı>: PR <no listesi>, issue <no listesi>. <Tek cümle>.
- Genel Müdür (güvenlik ve sınıflandırma): <n> uyarı kapandı.
- Kapattıklarım (gerekçeyle): <#no: gerekçe>

Sizin yapacaklarınız
Karar:
1. <Soru>?
   a) <Seçenek> → <sonucu> (önerim)
   b) <Seçenek> → <sonucu>
Elle:
2. <İş> — <neden sizin işiniz>
```bash
<PowerShell komutu>
```

Denetlenmeyen ve risk
- <Denetlenmeyen şey>
- <Risk ve neden kabul edildi>

Arşiv (isteğe bağlı)
Oturumun işi bitti. İsterseniz oturumu kenar çubuğundan arşivleyebilirsiniz.
````

Brifte yer alan her sayı adım 1'in bitiş ölçümünden gelir; hatırdan yazılmaz. Karar ve elle iş yoksa "Sizin yapacaklarınız" başlığına "Yok" yazılır.

## Yapma

- Başka projeye iş önerme, başka projenin dosyasına yazma (§6).
- Güvenlik incelemesini müdüre verme; müdüre yalnız paket yükseltme kodu ver.
- Engellenen komutun yerine başka komut arama, izin ekleme, bekçiyi gevşetme.
- Ölçemediğini "0" ya da "yok" yazma.
- Gerekçesiz uyarı ya da issue kapatma.
- Kod yazma; küçük okuma ve sayım dışında işi müdüre ver.
