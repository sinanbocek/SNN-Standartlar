# İletişim Standardı — proje sahibine yazarken (tüm projeler)

Bu standart, bir ajanın sohbette proje sahibine nasıl yazacağını düzenler. Amaç kısa yazmak değil, **ilk okumada anlaşılmak**.

## Neden (ölçüm, 2026-09-24)

Proje sahibi 6 günde, 3 ayrı oturumda **5 kez** "anlamadım" dedi. Üçünde benzetme ya da basit anlatım istedi.

| Tarih | Oturum | Proje sahibi |
|---|---|---|
| 2026-09-18 | 8da3e54e L990 | "sorunu anlamadım. anaolojiyle anlat" |
| 2026-09-18 | 687ebaca L137 | "Ne demek istediğini anlamadım." |
| 2026-09-19 | 8da3e54e L4585 | "TB-006 sorusunu anlamadım. basitçe anlat" |
| 2026-09-19 | 8da3e54e L4890 | "… anlamadım. anaolojiyle anlat" |
| 2026-09-23 | 088c2398 L1153 | "… ne demek bilemdim." |

Son vakanın sebebi ölçüldü: ajan aynı şeye tek bir mesajda **dört ayrı ad** vermişti ("uyum ölçeri", "uyum akışı", "uyum issue akışı", `compliance.js`). Okuyan kişi dört ayrı şey olduğunu sandı.

İkinci sinyal sessizlik. "Kullanıcı bir süredir haber almadı" uyarısı 2026-09-23 oturumunda **13 kez** düştü.

Kaynak: `quality/session-digest.js` (`kullanici-duzeltmesi` işareti ve sessiz kalma sayısı).

### Komut kuralının nedeni (ölçüm, 2026-09-24)

Talep SNN-Piyasa-Core oturumundan geldi. Asistan sahibe `cd "C:/…/SNN-Piyasa-Core" && npx supabase functions deploy …` verdi. Sahip PowerShell'de hata aldı ve komutu elle düzeltti. Bu tek vaka değil. 99 oturum tarandı (2026-08-15 → 2026-09-24):

| Ölçü | Sayı |
|---|---|
| Asistanın `bash` etiketli komut blokları | 334 |
| Bunlardan bash sözdizimi taşıyan (`&&`, `\|\|`, `/dev/null`, `$(…)`) | 38 |
| Sahibin şikâyeti | 2 — 2026-08-15 Portföy `fcfefdd2` L112 (`git add -A && git commit …`, PowerShell hatası "At line:1 char:12"), 2026-09-24 Piyasa-Core `bb9f3899` L661 |

Kalan 36 komutta sahip muhtemelen sessizce düzeltti; bu kısım ölçülmedi. Proje hafızasına yazmak yetmedi: yalnız o projede geçerli. `~/.claude/CLAUDE.md`'ye elle yazmak da yetmez: `setup-machine.js` dosyayı bu standarttan yeniden üretir.

Etiket notu: masaüstü uygulaması kabuk etiketli bloklara "Çalıştır" düğmesi koyar. Düğmenin `powershell` etiketinde çıkıp çıkmadığı ölçülmedi; çıkmıyorsa etiket `bash` olur, sözdizimi yine PowerShell kalır.

## Kurallar

Aşağıdaki işaretli bölüm, `setup/setup-machine.js` tarafından her makinede `~/.claude/CLAUDE.md` dosyasına kopyalanır. Claude Code bu dosyayı her projede, her oturumda okur. Bölümü değiştirirsen makinede `node setup/setup-machine.js --uygula` çalıştır.

<!-- kullanici-talimati:basla -->
# Proje sahibine yazarken

Bu kurallar SNN aile standardıdır (`SNN-Standartlar/standartlar/iletisim-standardi.md`). Sohbette proje sahibine yazılan her cevap için geçerlidir. Amaç kısa yazmak değil, ilk okumada anlaşılmaktır.

1. **Önce sonuç.** İlk cümle ne olduğunu ya da ne önerdiğini söyler. Ayrıntı sonra gelir.
2. **Tek cümle, tek fikir.** Cümle en fazla 20 kelime olsun. Uzun cümleyi böl.
3. **Bir şeye tek ad.** Bir şeyi ilk kez anarken ne olduğunu bir cümleyle söyle: "Uyum ölçeri: her sabah 10 projeye bakan otomatik görevli." Sonra hep aynı adı kullan. Dosya adı ile gündelik ad arasında gidip gelme.
4. **Terimi açıkla ya da kullanma.** Teknik ya da İngilizce bir terim ilk geçtiğinde gündelik karşılığını yaz. Kısaltma uydurma.
5. **Yeni ya da soyut bir şeyi benzetmeyle anlat.** Proje sahibi "anlamadım" derse önce gündelik bir benzetme ver, sonra kısaca tekrar anlat.
6. **Karar isterken:** seçenekleri numarala, önerdiğini işaretle, her seçeneğin sonucunu bir cümleyle yaz. Kısa bir cevapla karar verilebilsin ("hepsi evet", "1 evet").
7. **Uzun işte ara bilgi ver.** Birkaç dakikada bir tek cümle yaz: şu an ne yapıyorsun, sırada ne var.
8. **Güvenlik ve geri alınamaz işlemlerde kısaltma yapma.** Tam cümleyle yaz.

Kısa, açık demek değildir. Anlaşılmak için gereken kelimeyi silme.

## Proje sahibine komut verirken

Proje sahibinin terminali Windows PowerShell 5.1'dir. Ona çalıştırması için verilen her komut PowerShell sözdiziminde yazılır; kod bloğu `powershell` etiketi taşır.

- **Tek komut, tek blok.** Sıralı adımları ayrı bloklara böl; sahip hangisinin hata verdiğini görsün.
- `&&` ve `||` PowerShell 5.1'de yoktur, hata verir. Zorunluysa `A; if ($?) { B }` yaz.
- Bash sözdizimi kullanma: `export X=1` yerine `$env:X = '1'`, `/dev/null` yerine `$null`, `cd` yerine `Set-Location "C:\yol"`.
- Kural yalnız sahibe verilen komutlar içindir. Asistanın kendi Bash aracında `&&` serbesttir.
<!-- kullanici-talimati:bitir -->

## Nereden alındı

- **Caveman'in "netlik" bölümü** (ASD-STE100 Basitleştirilmiş Teknik İngilizce): tek fikir tek cümle, 20 kelime sınırı, bir terime tek anlam, güvenlik uyarısında tam cümle.
- **Caveman'in kısaltma kısmı alınmadı.** Ölçüldü: cevaplar bu ailede token hacminin yalnız %0,2–0,5'i (`docs/oturum-teshisi.md`). Sorun uzunluk değil, anlaşılırlık.
- **Kütükteki "🟢 Sade Anlatım" bölümü** (`teknik-borc-standardi.md`): aynı ilkenin sohbetteki karşılığı.

## Nasıl ölçülür

Bu kural makineyle zorlanamaz: bir cümlenin anlaşılır olup olmadığını makine bilemez (Kural 1 ile aynı durum, `olcum-standardi.md`). Etkisi şöyle ölçülür:

| Ölçü | Araç | Hedef |
|---|---|---|
| Proje sahibinin "anlamadım" demesi | `session-digest.js` → `kullanici-duzeltmesi` | Azalmalı |
| "Kullanıcı bir süredir haber almadı" uyarısı | `session-digest.js` → sessiz kalma sayısı | Azalmalı |

Kural yürürlüğe girdikten sonraki oturumlar bu tabloyla karşılaştırılır. Azalma görülmezse kural değiştirilir.

**Komut kuralı ise makineyle zorlanabilir:** kabuk etiketli bir kod bloğunda `&&` olup olmadığını makine görür. Zorlaması komut bekçisidir (`hooks/`; kaydı `quality/data/gates.json`). Asistan cevabını bitirirken kabuk etiketli bloklara bakar. Bash sözdizimi görürse cevabı düzelttirir.

## Dağıtım

| Durum | `setup-machine.js` ne yapar |
|---|---|
| `~/.claude/CLAUDE.md` yok | Oluşturur |
| Dosya var ve SNN-Standartlar yönetiyor (ilk satırdaki işaret) | İçerik farklıysa günceller |
| Dosya var ama **proje sahibinin kendi dosyası** | **Dokunmaz**; raporda bildirir, birleştirmeyi proje sahibi yapar |
| Dosya okunamıyor | Dokunmaz; "okunamadı" der (`olcum-standardi.md` Kural 3) |
