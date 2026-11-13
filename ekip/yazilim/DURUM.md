# Yazılım — durum

Son güncelleme: 2026-11-13

## Açık

Yok. Talep #178 kodu yazıldı; commit/PR Genel Müdür'de bekliyor. Talebin kaydı Belge'de.

## Sahip kararı bekleyen

Yok.

## Biten (son 10)

- 2026-11-13 · `.gitignore`'a `__pycache__/` ve `*.pyc` eklendi (canlı kopyada izlenmeyen .pyc yüzünden `refresh()` tazelemeyi durduruyordu). Doğrulandı: `.pyc` varken `git status --porcelain` boş; satırlar kalkınca `?? quality/__pycache__/` göründü (sabotaj). Kod dili taraması temiz. Commit/PR Genel Müdür'de bekliyor.

- 2026-11-10 · TB-010 koddan kapandı (`quality/merge-gate.js`): `fetchProtection` klasik korumaya ek olarak `repos/<repo>/rules/branches/<dal>` okur, denetim adlarını birleştirir, strict ikisinden biri yeterli. Ruleset 403/404 → yok sayılır; diğer hata fırlatır (kapı kapalı). `KISAYOL (TB-010)` yorumu kalktı. Kütük kaydı Belge'de. Commit/PR Genel Müdür'de bekliyor (dal `fix/merge-gate-ruleset`).
- 2026-11-10 · Yerel kontrol Jest kapanış hatasını görüyor (Talep #178, `quality/local-check.js`): çıktı canlı akarken taranır; kod 0 olsa da `Jest environment has been torn down` / `Cannot log after tests are done` görülürse komut kalır, damga yazılmaz. `run()` artık asenkron (çağıran: `command-gates.test.js` düzeltildi, `command-gates.js` yalnız `gate` çağırıyor). Yeni test `quality/test/local-check.test.js`, CI adımı eklendi. Commit/PR Genel Müdür'de bekliyor.
- 2026-11-09 · Birleştirme kapısı `--auto` desteği (`quality/merge-gate.js`): yalnız GitHub'ın zorunlu denetimi beklediği depoda izin; gizli depoda ayrıca "dal güncel olsun" (strict) şart. Commit/PR Genel Müdür'de bekliyor. TB kaydı (ruleset okunmuyor) açılmayı bekliyor.
- 2026-11-05 · `quality/safe_zone.py` ve sosyal medya ölçü denetimi (#175, PR #176). Kaynak: `git log`.
