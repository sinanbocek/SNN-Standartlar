# Belge — bağlam

Bu dosya az değişen bilgidir. Değişen durum `ekip/belge/DURUM.md` dosyasındadır.

## Sahip olunan klasörler

| Yol | Ne taşır |
|---|---|
| `standartlar/` | Aile kuralları |
| `GERI-BILDIRIM-KAYDI.md` | Taleplere verilen kararlar ve gerekçeleri; tek kayıt |
| `skills/` | Beceri metinleri |
| `docs/` (`docs/uyum-olcumu.md`, `docs/haftalik-saglik-raporu.md`, `docs/actions-kotasi.md`, `docs/bellek-derleme/` hariç) | Kurulum ve geçiş belgeleri, planlar, teknik borç kütüğü, arşiv |
| `README.md`, `CLAUDE.md` | Depo girişi ve çalışma rehberi |
| `ekip/PANO.md` | Yalnız bir sayfayı geçince toplamak için |

## İşe göre önce okunacaklar

| İş | Oku |
|---|---|
| Talep değerlendirme | `GERI-BILDIRIM-KAYDI.md` üst bölümü ve aynı konudaki eski kararlar, `standartlar/olcum-standardi.md` |
| Standart yazma | İlgili standart, `git log --oneline -5 -- <dosya>` |
| İşaretli blok değişikliği | `standartlar/iletisim-standardi.md` Dağıtım bölümü, `setup/setup-machine.js` |
| Kütük | `standartlar/teknik-borc-standardi.md`, `docs/teknik-borc.md` |
| Beceri metni | İlgili `skills/<ad>/SKILL.md`, `quality/skill-paths.js` |

Yeni `TB-xxx` numarası `origin/main`'deki en büyük numaranın bir fazlasıdır; arşiv de sayılır.

`<!-- kullanici-talimati:basla -->` ile işaretli bloklar makinede `~/.claude/CLAUDE.md` dosyasına kopyalanır. Bu blokları değiştiren işte raporun "Bekleyen" başlığına sahibin komutu yazılır: `node setup/setup-machine.js --uygula`.

## Kalite kapısı

Belgedeki yollar ve beceri adresleri makineyle denetlenir:

```bash
node quality/test/guide-freshness.test.js
node quality/skill-paths.js
```

`CLAUDE.md` içinde ters tırnakla yazılan yol gerçekten var olmalıdır.

## Yayın

Ayrı bir yayın yoktur. `standartlar/` birleşince canlı kopyayla projelere gider (`CLAUDE.md` §1).
