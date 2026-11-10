# Yazılım — bağlam

Bu dosya az değişen bilgidir. Değişen durum `ekip/yazilim/DURUM.md` dosyasındadır.

## Sahip olunan klasörler

| Yol | Ne taşır |
|---|---|
| `quality/` (`quality/data/family-projects.json` ve `quality/data/pending-measurements.json` hariç) | Tarayıcılar, kapılar, kapı defteri, kelime listesi |
| `hooks/` | Bekçiler; makineye `setup/setup-machine.js` ile kopyalanır |
| `setup/` | Proje ve makine kurulumu |
| `debt-sync/` | Kütük → GitHub issue ve board senkronu |
| `core/` | Çekirdek sürüm yayılımı |
| `ornek/` | Projelere kopyalanan turnike şablonları |
| `.github/` | Akışlar ve ortak adım |

**Etki uyarısı:** `@main` ile çağrılan akışlardaki değişiklik, bir sonraki çalışmada bütün aile projelerinde geçerli olur (`CLAUDE.md` §1).

## İşe göre önce okunacaklar

| İş | Oku |
|---|---|
| Her iş | `CLAUDE.md` §2 ve §3 (çalışma sırası, bilinen tuzaklar) |
| Yeni kapı | `CLAUDE.md` §4, `standartlar/olcum-standardi.md`, `quality/gate-registry.js` |
| Yanlış alarm | `CLAUDE.md` §5 |
| Kod dili tarayıcısı | `standartlar/kod-dili-standardi.md`, `quality/data/turkish-words.json` |
| Kanca | `docs/makine-kurulumu.md` |
| Akış ya da kota | `docs/actions-kotasi.md`, `quality/workflow-budget.js` |

## Kalite kapısı

Kökte `package.json` yoktur; bu yüzden `quality/local-check.js` bu depoda uygulanmaz. Gerçek kapı `.github/workflows/test.yml` dosyasıdır. Yerelde şunlar koşulur:

```bash
export SNN_STANDARTLAR="$PWD"
for t in quality/test/*.test.js setup/test/*.test.js hooks/test/*.test.js debt-sync/test/*.test.js core/test/*.test.js; do node "$t" | tail -1; done
node quality/gate-registry.js
node quality/skill-paths.js
node quality/pending-measurements.js --liste
node quality/code-language-scan.js --tumu
python quality/test/safe_zone_test.py
```

`python` satırı Pillow ister; yalnız `quality/safe_zone.py` değişince koşulur.

## Yayın

Ayrı bir yayın yoktur. Yollar `CLAUDE.md` §1 tablosundadır. Kanca kodu makineye elle gider: `node setup/setup-machine.js` kuru çalışır, `--uygula` sahibin komutudur.
