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
| trade-kasa | 2 · `kod-dili-kaydi`, `rehber-atfi` |
| SNN-Piyasa-Core · SNN-Portfoy-Yonetimi | 2 |
| GHS-Panel · Gunum-Var · SNN-Abacus-Core · SNN-Proje-ve-Nakit-Akis | 3 |
| Naturapan-Web-Sitesi | 4 |
| SNN-Yonetici-Ozeti | 5 |
| ihale-mcp | 6 |

İlk ölçümün ortaya çıkardıkları:

- **`kod-dili.yml` yalnız trade-kasa'da takılı.** Diğer 10 projede kural yazıdan ibaret (uyarı kipi hepsinde çalışıyor, ama PR kapısı yok).
- **SNN-Yonetici-Ozeti'nin `teknik-borc.yml` akışı yok** ama `docs/teknik-borc.md` var — yani kütüğü hiç issue'ya senkronlanmıyor. Kimsenin fark etmediği bir boşluktu.
- **Naturapan ve SNN-Yonetici-Ozeti'nde `anahtar-tarama.yml` yok** — sır sızıntısına karşı PR kapısı yok.
- **SNN-Standartlar'ın kendi rehber dosyası yok.** Kural koyan depo kendi ölçütünü karşılamıyor.

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
- **`rehber-atfi` metin arar.** Rehber `SNN-Standartlar` yazmadan aynı şeyi anlatıyorsa yanlış alarm üretir. 2026-09-19 ölçümünde bulgu veren 8 projenin rehberi elle okundu ve **bir yanlış alarm bulundu**: SNN-Piyasa-Core, depo adını yazmadan "SNN aile standardı" diyerek gerçek bir atıf yapıyordu. Ölçüt düzeltildi (atfın kendisi aranır, biçimi değil) ve iki gerileme testi eklendi. Kalan 7 bulgu doğrulandı.
