---
name: proje-kur
description: Bir projeyi SNN standart sistemine bağlar (teknik borç kütüğü, GitHub issue/board senkronu, gizli anahtar taraması, dal silme ve Dependabot ayarları). Yeni proje açıldığında, oturum başı "standart sisteme bağlı değil" dediğinde ya da kullanıcı "projeyi kur", "sisteme bağla", "standartları uygula" dediğinde kullan.
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
- Benzetme kullan (kütük = kitap, board = katalog panosu, anahtar taraması = kapıdaki röntgen).
**Onay gelmeden 3. adıma geçme.** Depo ayarı değiştirmek ve PR açmak dış etkili işlemlerdir.

## 3. Uygula
```
node <ev>/.claude/standartlar-canli/setup/setup-project.js <proje kökü> --uygula
```
- Dosyalar GitHub üzerinden `chore/snn-standart-kurulum` dalına yazılır ve tek PR açılır; yerel çalışma klasörüne dokunulmaz.
- Çıktıdaki ✗ satırlarını gizleme; kullanıcıya olduğu gibi söyle ve sebebini ölç.

## 4. Kullanıcıya kalanları ver
"Proje sahibine kalanlar" listesini bağlantılarıyla ver. En sık:
- **PROJECT_TOKEN**: depo → Settings → Secrets and variables → Actions → New repository secret. ⚠ Değer sohbete yapıştırılmaz; ajan anahtarı oluşturmaz, görmez, girmez.
- Yönetici olunmayan (kurum) depolarda ayarlar depo sahibi hesapla açılır.

## 5. Doğrula (kanıtla bitir)
1. PR'ın kontrolleri: `gh pr checks <no> -R <depo> --watch -i 30` — `tara / tara` gerçekten çalışmalı (atlanma değil).
2. Kullanıcı onayıyla birleştir: `gh pr merge <no> -R <depo> --merge` (birleştirme kapısı kontrolleri denetler).
3. Senkronu kuru çalıştır: `gh workflow run teknik-borc.yml -R <depo> -f uygula=false`, sonra `gh run watch <id> -R <depo> -i 15` ve logda "Board … var" + hata olmadığını gör. PROJECT_TOKEN yoksa "board atlandı" yazar: kullanıcıya hatırlat.
4. Tekrar ölç (1. adım): betiğin yapacağı adım kalmamalı.

Özet tek tablo: ne kuruldu, ne kullanıcıda, hangi doğrulama geçti.
