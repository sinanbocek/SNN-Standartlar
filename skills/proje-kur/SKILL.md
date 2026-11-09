---
name: proje-kur
description: Bir projeyi SNN standart sistemine bağlar (teknik borç kütüğü, GitHub issue/board senkronu, gizli anahtar taraması, satır sonu kuralı, dal silme, Dependabot ve otomatik birleştirme ayarları; sonunda Genel Müdür düzeni kurulsun mu diye sorar). Yeni proje açıldığında, oturum başı "standart sisteme bağlı değil" dediğinde ya da kullanıcı "projeyi kur", "sisteme bağla", "standartları uygula" dediğinde kullan.
---

# Projeyi standart sisteme bağla

> `<ev>` = ev klasörü. Öğrenmek için: `node -e "console.log(require('os').homedir())"`

Asıl işi ortak depodaki betik yapar; bu beceri onu doğru sırayla ve kullanıcı onayıyla çalıştırır.
Betik: `<ev>/.claude/standartlar-canli/setup/setup-project.js` (yalnız ana dalı izleyen canlı kopya; elle değiştirme).

## 1. Ölç (hiçbir şey değişmez)
```
node <ev>/.claude/standartlar-canli/setup/setup-project.js <proje kökü>
```
- "GitHub deposu yok" çıkarsa dur: kullanıcıya önce GitHub'da depo açıp `origin` bağlamasını söyle.
- "Eski biçimli kütük var" çıkarsa: betik yeni kütük açmaz. Kayıtların standarda taşınması ayrı bir iştir; kullanıcıya sor, onay gelirse `borc-ekle` becerisindeki biçimle taşı (ayrı PR).

## 2. Planı sade Türkçe anlat ve onay iste
Çıktıdaki satırları kullanıcıya tabloyla özetle:
- ✅ zaten var · ➕ betik ekleyecek · ⚠/❔ kullanıcıya kalan.
- Neyi değiştireceğini açık yaz: "tek PR ile şu dosyalar", "board kurulacak", "şu depo ayarları açılacak".
- Otomatik birleştirme ayarı (adım 6) de planda görünür: depo ayarı dış etkili işlemdir.
- Benzetme kullan (kütük = kitap, board = katalog panosu, anahtar taraması = kapıdaki röntgen).
**Onay gelmeden 3. adıma geçme.** Depo ayarı değiştirmek ve PR açmak dış etkili işlemlerdir.

## 3. Uygula
```
node <ev>/.claude/standartlar-canli/setup/setup-project.js <proje kökü> --uygula
```
- Dosyalar GitHub üzerinden `chore/snn-standart-kurulum` dalına yazılır ve tek PR açılır; yerel çalışma klasörüne dokunulmaz.
- Çıktıdaki ✗ satırlarını gizleme; kullanıcıya olduğu gibi söyle ve sebebini ölç.
- `.gitattributes` eklendiyse PR birleşince yerelde bir kez `git add --renormalize .` çalıştırılır; `git diff --cached --ignore-cr-at-eol --stat` boş olmalı. Değişen dosya varsa ayrı commit'e girer.

## 4. Kullanıcıya kalanları ver
"Proje sahibine kalanlar" listesini bağlantılarıyla ver. En sık:
- **PROJECT_TOKEN**: depo → Settings → Secrets and variables → Actions → New repository secret. ⚠ Değer sohbete yapıştırılmaz; ajan anahtarı oluşturmaz, görmez, girmez.
- Yönetici olunmayan (kurum) depolarda ayarlar depo sahibi hesapla açılır.

## 5. Doğrula (kanıtla bitir)
1. PR'ın kontrolleri: `gh pr checks <no> -R <depo> --watch -i 30` — `tara / tara` gerçekten çalışmalı (atlanma değil).
2. CI yeşilse `standartlar/es-zamanli-calisma-standardi.md` §7'ye göre birleştir: `gh pr merge <no> -R <depo> --merge` (birleştirme kapısı kontrolleri denetler). Kurulum PR'ında zorunlu denetim henüz yok; bu yüzden `--auto` kullanılmaz.
3. Senkronu kuru çalıştır: `gh workflow run teknik-borc.yml -R <depo> -f uygula=false`, sonra `gh run watch <id> -R <depo> -i 15` ve logda "Board … var" + hata olmadığını gör. PROJECT_TOKEN yoksa "board atlandı" yazar: kullanıcıya hatırlat.
4. Tekrar ölç (1. adım): betiğin yapacağı adım kalmamalı.

## 6. Otomatik birleştirmeyi aç
Kuralın kendisi `standartlar/es-zamanli-calisma-standardi.md` §7 "Otomatik birleştirme" ve "Depo ayarı" bölümlerindedir; burada tekrar edilmez.

**Koşul:** depoda her PR'da çalışan, `paths:` ya da `paths-ignore` süzgeci olmayan, projenin kendi CI işi var. Adı ortak depodan gelen işler (`tara / ...`) zorunlu yazılmaz.

- **Koşul tutuyorsa:** §7 "Depo ayarı"ndaki üç adım uygulanır. Denetim adı, son PR'daki gerçek denetim adından alınır (`gh pr checks <no> -R <depo>`). Ayar bitince GitHub'dan geri okunur; yazıldı demek yetmez.
- **Koşul tutmuyorsa:** ayar açılmaz. Kullanıcıya nedeni söylenir. Çözüm `ornek/ci-duzeni.yml` iskeletidir ve ayrı PR'dır.
- **Yeni projede CI yoksa:** bu adım atlanır; atlandığı özette yazılır.
- **Yönetici olunmayan depoda** ayarı depo sahibi yapar.

## 7. Genel Müdür düzeni
Betik bu adımda bir şey yazmaz; adım betiğe bağlı değildir. Standart düzenin ne zaman kurulacağını projeye bıraktığı için bu adım zorunlu değildir (`standartlar/ekip-duzeni-standardi.md`, "Zorunlu değil, projeye bırakılan").

Kullanıcıya tek soru sor, numaralı ve kısa:

> Bu projede Genel Müdür + müdürler düzeni kurulsun mu?
> 1. Evet, kur.
> 2. Hayır. (Varsayılan)

Küçük bir proje için gerekmeyebilir; bunu tek cümleyle söyle. Yanıt yoksa kurulmaz.

- **Evet:** hangi müdürlerin açılacağı kullanıcıyla seçilir. Adlar `standartlar/ekip-duzeni-standardi.md` "Ortak müdür adları" tablosundan alınır. Dört maddelik ortak iskelet kurulur. Ayrı PR açılır; kurulum PR'ına karışmaz.
- **Hayır:** hiçbir dosya eklenmez.

## Özet
Tek tablo: ne kuruldu, ne kullanıcıda, hangi doğrulama geçti. Tabloda iki satır daha bulunur:

| Satır | Değerler |
|---|---|
| Otomatik birleştirme | açık / açılmadı ve nedeni (CI yok ise atlandı) |
| Genel Müdür düzeni | kuruldu / istenmedi |
