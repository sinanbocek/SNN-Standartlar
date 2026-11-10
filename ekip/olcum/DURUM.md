# Ölçüm — durum

Son güncelleme: 2026-11-10

## Açık

- TB-009 ölçüldü (2026-11-10), sonuç "bu veriyle ayırt edilemiyor"; rapor `docs/tb-009-kural-etkisi-olcumu.md` (henüz commit edilmedi). Kütük ve issue #162 güncellemesi Belge Müdürü / Genel Müdür'de bekliyor. `pending-measurements.json` içinde TB-009 kaydı yok, dokunulmadı.
- TB-010 ruleset sayımı (2026-11-10): 18 depodan 17'sinde 0; GHS-Panel okunamadı (HTTP 403, özel depo ve ücretsiz plan ruleset API'sini vermiyor). Komut: `gh api repos/<repo>/rulesets --jq length`.
- (durumu belirsiz) Alt ajan bekçisi sayımı: 2026-10-09 sonrası `Agent` çağrılarında modelsiz ve seviyesiz oran. 2026-10-16'dan sonra yapılacaktı; depoda sonuç yok. Ölçüm öncesi değer: 522 çağrının 347'si modelsiz, 497'si seviyesiz. Sonuç sahibe "uyarıda kalsın / engele dönsün" seçenekleriyle sunulur. Kaynak: `docs/arsiv/2026-11-08-bellek-notlari.md`.
- Bellek derleme denemesi: dört haftalık sayılar 2026-11-09 civarında çıkarılır (haftada yeni not, tekrar, kural olan aday). Sonra döngünün kalıp kalmayacağı sahibe sorulur. Kaynak: `docs/bellek-derleme/README.md`, `docs/arsiv/2026-11-08-bellek-notlari.md`.
- Actions kotası: 2026-11-08 açılış satırı 905/3.000 dakika, ay sonu gidişi yaklaşık 3.394. Kaynak: oturum açılışı. Ayrıntı `docs/actions-kotasi.md`.

## Sahip kararı bekleyen

Yok.

## Biten (son 10)

- 2026-11-10 · TB-009 kural etkisi ölçümü (`docs/tb-009-kural-etkisi-olcumu.md`) ve TB-010 ruleset sayımı. Kaynak: `gh pr list`, `gh api`.
- 2026-10-26 · Dördüncü bellek derleme raporu (PR #171). Kaynak: `git log`.
- 2026-10-19 · Üçüncü bellek derleme raporu (PR #168). Kaynak: `git log`.
- 2026-10-17 · TB-009 ara sayımı (#162, PR #166). Kaynak: `docs/teknik-borc.md`.
