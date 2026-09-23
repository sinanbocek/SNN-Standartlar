# Oturum teşhisi

Kapılar **kodu** denetler. Bu araç **ajanın davranışını** denetler: bir oturumda ne ters gitti, kullanıcıya yanlış bilgi ulaştı mı, aynı hataya kaç kez düşüldü.

| Parça | Ne yapar |
|---|---|
| `quality/session-digest.js` | Oturum kaydını (JSONL) olay listesine indirir, işaretleri satır numarasıyla çıkarır, anahtar biçimli değerleri maskeler |
| `skills/oturum-teshis/SKILL.md` | Ajanın izlediği yol: sorunu netleştir, oturumu bul, işaretleri oku, satır kanıtlı rapor yaz, öneriyi onayla uygula |

Fikir Superpowers'ın `diagnosing-superpowers` becerisinden alındı: "her bulgu kayıttan satır gösterir". Onun yedi paralel alt ajanlı yapısı alınmadı. Burada tek bir betik okunacak yerleri işaretliyor, ajan o yerleri okuyup karar veriyor.

## Neden (2026-09-23)

Aynı oturumda dört tökezleme oldu. Üçü kullanıcıya yanlış bilgi olarak ulaştı ve ancak kullanıcı düzeltince ya da ajan kendisi fark edince görüldü:

| # | Ne oldu | Yakalayan dedektör |
|---|---|---|
| 1 | Hata çıktısı susturulmuş bir döngü, 404'ü "adres yok" diye bastı (GHS-Panel) | `hata-susturma` |
| 2 | Ölçüm yerel klasörler gezilerek yapıldı; üçüncü tarafın deposu aileye sayıldı (ihale-mcp) | `yerel-klasor-olcumu` |
| 3 | Sabotaj `git checkout --` ile geri alınırken asıl düzeltme de silindi | `geri-alma-sonrasi-degisiklik` |
| 4 | Bir `sed` sabotajı sessizce hiç uygulanmadı | **yok** (aşağıdaki sınıra bakın) |

## Dedektörler

| İşaret | Neye bakar |
|---|---|
| `hata-susturma` | `gh`/`git`/`curl` hatası `2>/dev/null` ile susturulmuş ve sonuç "yok" diye etiketleniyor; "okunamadı" etiketi varsa işaretlenmez (Kural 3) |
| `yerel-klasor-olcumu` | Proje kökündeki klasörler `for d in */` ile geziliyor; liste `family-projects.json`'dan gelmeli |
| `geri-alma-sonrasi-degisiklik` | `git checkout --`, `restore`, `reset --hard` komutundan sonraki 20 satır içinde komutta adı geçen dosya diskte değişti |
| `geri-alma` | Aynı komut, ardından değişiklik görülmedi (yalnız bilgi) |
| `kullanici-duzeltmesi` | 600 karakterden kısa kullanıcı mesajında "değil", "yanlış", "hayır", "dikkate alma", "anlamadım" gibi ifadeler |
| `kendi-hatasi` | Ajanın metninde "yanlıştı", "benim hatam", "yanlışlıkla", "düzeltmemi sildi" gibi itiraflar ("yanlış alarm" konuşması sayılmaz) |
| `tekrarlanan-engel` | Aynı bekçi engeline 2 ya da daha fazla kez takılma |

Sayılar da raporlanır: süre, kullanıcı mesajı, araç çağrısı, araç hatası, "kullanıcı bir süredir haber almadı" uyarısı ve PR'lar.

## Ölçüm (2026-09-23, bu depodaki oturumlar)

| Oturum | Boyut | İşaret | Değerlendirme |
|---|---:|---:|---|
| 088c2398 (bu araç bu oturumda yazıldı; tökezlemeler biliniyor) | 2,7 MB | 12 | **10 gerçek, 2 yanlış**: L345 bir sabotaj anlatımı, L968 dedektör betiğinin kendi metni. Bilinen dört vakanın üçü doğru satırda |
| 52cff32d | 1,3 MB | 1 | "main'e doğrudan commit" engeline 3 kez takılma; gerçek |
| 687ebaca | 0,8 MB | 5 | Yaklaşık 4'ü okunmaya değer. L112 sınırda: susturulan komut `ls`, `git` değil |
| 8da3e54e | 26 MB | 30 | Yaklaşık 22'si okunmaya değer. Açık yanlışlar: L36, L1734, L1772, L5768, L7165, L9510 |

Son üç satırdaki değerlendirme **özet satırlarından** yapıldı; kayıttaki bölgeler tek tek okunmadı.

İlk sürümdeki gürültü de ölçüldü, dedektörler buna göre daraltıldı:

- "Ajanın kendi hatası" ilk hâlinde 8da3e54e'de 126 isabet verdi, çünkü "yanlış alarm" konuşmaları da eşleşiyordu. Daraltılınca 16'ya indi.
- "Dosya diskte değişti" tek başına 103 isabet verdi. Artık yalnız geri alma komutunun ardından geldiğinde sayılıyor.

## Bilinen sınırlar

- **Tur ortasındaki açıklamalar kayıtta her zaman düz metin olarak durmaz.** 4. vakanın ("sed uygulanmadı") açıklaması kayıtta aranabilir metin olarak bulunamadı; bu yüzden hiçbir dedektör onu yakalamıyor.
- **Dedektörler Türkçe ve bu aileye özgü.** `yerel-klasor-olcumu` proje kök klasörünün adına (`SNN-AI-Asus-Z14`) bakar.
- **"İşaret yok" ≠ "sorun yok".** Kapsam, yukarıdaki yedi işaretle sınırlıdır.
- **Alt ajan kayıtları otomatik okunmaz.** `<oturum-id>/subagents/*.jsonl` dosyaları `--dosya` ile ayrıca verilir.
