# Uyum Ölçümü — dağıtım nasıl çalışır

## Sorun

Kuralın **içeriği** projelere kendiliğinden ulaşıyordu (canlı kopya + bekçiler). Ama *"senin projende şunu yapman lazım"* haberi ulaşmıyordu; onu bir insan tek tek iletiyordu.

```
proje/docs/teknik-borc.md  →  debt-sync  →  GitHub issue + board   ✓
oturum açılışı             →  "Diğer projelerde bekleyenler"       ✓
SNN-Standartlar'da karar   →  ???  →  projenin kütüğü              ✗  insan
```

## Çözüm: mesaj değil, durum farkı

Ortak depo projelere **duyuru göndermez**. Beklenen durumu ilan eder; her proje kendi **farkını** hesaplar.

| Mesaj kuyruğu | Durum farkı |
|---|---|
| "Okundu mu?" defteri gerekir | Defter yok — eksik varsa görünür, giderilince kaybolur |
| Kaçırılan mesaj sonsuza kadar kaçar | Her açılışta yeniden hesaplanır |
| Yeni proje geçmiş duyuruları görmez | Yeni proje ilk oturumda tam listeyi görür |
| Dağıtımı bir insan yapar | Kimse yapmaz |

Kendini onarır. Ölçüt eklemek, tüm projelere aynı anda ulaşan tek satırlık bir değişikliktir.

## Nasıl görünür

Oturum açılışında, o projenin kendi eksiği:

```
📂 trade-kasa · v2.3.1 · dal: ci/kod-dili
   Teknik borç: P1:0 P2:0 P3:0
   ⚠ Aile standardı uyumu: 2 eksik
     · Kod dili teknik borç kaydı: kütükte kod dili kaydı yok
     · Rehberde aile standardı atfı: CLAUDE.md / AI-RULES.md aile standardına atıf yapmıyor
     → docs/kod-dili-gecis.md §3 şablonuyla kendi kütüğüne kayıt aç
```

## Ölçütler

`quality/compliance.js` içinde, altı ölçüt:

| id | Ne arar |
|---|---|
| `kod-dili-akisi` | `.github/workflows/kod-dili.yml` |
| `kod-dili-kaydi` | Kütükte "kod dili" geçen bir kayıt |
| `teknik-borc-akisi` | `.github/workflows/teknik-borc.yml` |
| `kutuk` | `docs/teknik-borc.md` |
| `anahtar-tarama` | `.github/workflows/anahtar-tarama.yml` |
| `rehber-atfi` | `CLAUDE.md`/`AI-RULES.md` içinde `SNN-Standartlar` ya da "aile standardı" atfı |

**Hız kuralı:** ölçüm oturum açılışında çalışır, bu yüzden pahalı iş yapmaz. Kod dili taraması (Yönetici-Özeti'nde 10.153 bulgu) burada **çalıştırılmaz**; yalnız turnikenin takılı olup olmadığına bakılır.

## İlk ölçüm (2026-09-19)

| Proje | Eksik |
|---|---|
| SNN-Ihale-Maliyet-Teklif-Yonetimi | 1 · `kod-dili-akisi` |
| SNN-Standartlar | 1 · `rehber-atfi` |
| Naturapan-Web-Sitesi · SNN-Portfoy-Yonetimi | 2 |
| Diğer 7 proje | 3 |
| **Toplam** | **27** |

İlk ölçümün ortaya çıkardıkları:

- **`kod-dili.yml` hiçbir projenin ana dalında yok.** trade-kasa'da kuruluyor ama henüz `ci/kod-dili` dalında. Uyarı kipi 11 projede çalışıyor; PR kapısı hiçbirinde yok.
- **8 projenin rehberi aile standardına atıf yapmıyor** — bu depo dahil.

### Bu tablo bir kez yanlış çıktı (2026-09-19)

İlk sürüm **çalışma klasörünü** okuyordu ve iki alarm üretti:

> *"Naturapan ve Yönetici-Özeti'nde sır tarama kapısı yok"*
> *"Yönetici-Özeti'nin kütüğü hiç issue'ya senkronlanmıyor"*

**İkisi de yanlıştı.** Dosyalar ana dalda vardı; yerel kopyalar 3 ve 7 commit gerideydi ve projelerin üçü kendi çalışma dalındaydı — yani klasörün içeriği ana dalı hiç göstermiyordu.

Ders göç notunun 11.0 bölümünde **2026-09-15'te zaten yazılıydı**: *"rapor ve denetimler GitHub'dan okumalı, yerel klasörden değil."* Yazılı kural tutmadı. Ölçer artık `origin/main`'den okur ve bu gerileme testlerle korunuyor.

Düzeltirken ikinci bir hata daha çıktı: kök klasör için `origin/main:.` yazılmıştı, git bunu geçersiz sayıyor ("Not a valid object name") ve rehber listesi hep boş dönüyordu — üç projeye yanlış *"rehber yok"* dedi. Kökte `origin/main:` kullanılır; bu da teste yazıldı.


## Eksikler issue olarak da düşer (TB-003)

Oturum açılışındaki satır yalnız **o projeye girene** görünür ve oturum kapanınca kaybolur; "yapıldı mı?" kaydı tutulmaz. Bu yüzden eksikler her projenin kendi issue listesine de düşer.

| Oturum açılışı | Issue |
|---|---|
| Yalnız içeri giren görür | Panodan hepsi birden görünür |
| Oturum kapanınca kaybolur | Yapılana kadar durur |
| Kayıt yok | Giderilince kendiliğinden kapanır |
| Uyarı | Kütüktekilerle aynı yerde duran iş kalemi |

Akış: `.github/workflows/uyum-issue.yml` — Pazartesi 08:23 TSİ. Elle çalıştırıldığında **varsayılan kuru çalıştırmadır**; yazmak için `uygula` işaretlenir.

**Elle kapatmak eksiği gidermez.** Ölçüm eksiği hâlâ görüyorsa issue bir sonraki turda yeniden açılır — kapanış yalnızca ölçümden gelir. Kütük senkronundaki kuralın aynısı.

**Başka kaynaktan gelen issue'lara dokunulmaz:** yalnız `[UYUM:<ölçüt>]` başlıklı ve `aile-uyum` etiketli olanlar yönetilir. Kütüğün `[TB-xxx]` issue'larına karışmaz.

> **Gerekçe düzeltmesi (2026-09-19):** bu iş ilk önerildiğinde gerekçe "aylarca açılmayan proje eksiğini görmez" diye yazılmıştı. Ölçüldü ve zayıf çıktı: en eski projenin ana dalı 3 gün önce hareket etmişti. Gerçek gerekçe **görünürlük ve kalıcılık**.

## Muafiyet

Aileye gerçekten ait olmayan bir depo için (`ihale-mcp` gibi dışarıdan tüketilen bir MCP sunucusu) proje kökünde `.snn-uyum.json`:

```json
{
  "exempt": [
    { "check": "kod-dili-akisi", "reason": "dışarıdan tüketilen MCP sunucusu, aile kod tabanı değil" }
  ]
}
```

**Gerekçesiz muafiyet sayılmaz** ve uyarı üretir — istisna kurallarının aynısı. Muafiyet "şimdilik uğraşmayalım" için değildir; o durumda kütüğe teknik borç kaydı açılır.

## Bilinen sınırlar

- **Worktree'ler ayrı proje sayılır.** `GHS-Panel-teklif`, GHS-Panel'in worktree'sidir (`.git` bir dosya, klasör değil) ve proje listesinde ikinci kez görünür. Oturum açılışında zararsız; toplu ölçümde çift sayar.
- **Ölçüt varlığa bakar, içeriğe değil.** `kod-dili.yml` takılı ama bozuk olabilir; ölçer bunu görmez. Akışın gerçekten çalıştığını CI gösterir.
- **`origin/main` en son çekildiği andaki hâlidir.** Ölçüm ağa çıkmaz (oturum açılışı bütçesi), bu yüzden hiç `fetch` yapılmamış bir kopyada eski bilgi gösterebilir. Uzak dal hiç yoksa çalışma klasörüne düşülür.
- **`rehber-atfi` metin arar.** Rehber `SNN-Standartlar` yazmadan aynı şeyi anlatıyorsa yanlış alarm üretir. 2026-09-19 ölçümünde bulgu veren 8 projenin rehberi elle okundu ve **bir yanlış alarm bulundu**: SNN-Piyasa-Core, depo adını yazmadan "SNN aile standardı" diyerek gerçek bir atıf yapıyordu. Ölçüt düzeltildi (atfın kendisi aranır, biçimi değil) ve iki gerileme testi eklendi. Kalan 7 bulgu doğrulandı.
