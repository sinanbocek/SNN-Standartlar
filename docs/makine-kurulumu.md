# Makine Kurulumu (kancalar)

Bu belge **makineyi** sisteme bağlar. Projeyi bağlamak ayrı iştir: `setup/setup-project.js`.

## Neden var (ölçüm, 2026-09-19)

Kuralların **içeriği** ortak depoda sürümlüydü, ama o kuralları **çalıştıran mekanizma** hiçbir depoda yoktu: `~/.claude/hooks` altında 13 dosya, 530 kod satırı, yalnız tek bir bilgisayarda. 12 projede bu dosyaların kopyası arandı, **0 sonuç** çıktı.

Bu makine kaybolsaydı **7 kapı birden** susardı:

| Kapı | Kaybolunca |
|---|---|
| `guard-files` | `.env`, özel anahtar, servis hesabı yazımı ve 7 sır deseni serbest kalır |
| `guard-bash` | 8 yıkıcı komut kalıbı ve birleştirme kapısı düşer |
| `guard-code-language` | Kod dili uyarısı susar |
| `session-start` | Açılış özeti yok — **ve canlı kopya güncellemesi buradan tetiklendiği için kurallar donar** |
| `stop-gate` | Kırmızı tiple "bitti" denebilir |
| `stop-debt-push` | Kütük değişikliği GitHub'a ulaşmadan oturum kapanabilir |
| `stop-schema-doc` | Şema değişip belge güncellenmeden iş biter |

Kayıp ölçümü: 530 kod satırının **~%88'i** gerçekten kaybolurdu; gerisi ortak depoya yönlendiriciydi. En kritik tek dosya `hooks/lib/shared.js` (32 satır) — o giderse kalan her şey ortak depoyu bulamaz.

## Tasarım kararı: kancalar depoda durur, **canlı kopyadan çalıştırılmaz**

Kurallar canlı kopyadan (`~/.claude/standartlar-canli`) okunur ve kendiliğinden güncellenir. Kancaların kendisi **öyle değildir**: depodan `~/.claude/hooks`'a **kopyalanır**.

**Neden ayrım var:** 2026-09-15'te canlı kopya bozulunca (dal değişikliği yüzünden bir fonksiyon kayboldu) tüm projelerde oturum açılışı durdu. Kancaların kendisi de canlıdan gelseydi, geri dönüş yolu da aynı anda kırılırdı. **Kural akabilir; kuralı çalıştıran şey akmamalı.**

**Güvenlik notu (ölçülmüştür, gizlenmez):** kancalar hâlihazırda canlı kopyadan `require()` ile kod çalıştırıyor (12 çağrı) ve canlı kopya oturum başında onaysız güncelleniyor. Yani "ortak depoya yazabilen, bu makinede kod çalıştırır" durumu **bugün de geçerli**. Kopyalama modeli bu yüzeyi büyütmez, küçültme fırsatı verir. Ortak depo `main`'ine yazma yetkisi bir kişiden büyükse bu ayrı bir sertleştirme kalemidir.

## Kurulum (bugün: elle)

> `setup/setup-machine.js` henüz yazılmadı. Bu bölüm o betik gelene kadar geçerli tarifedir.

1. Node.js, `git`, `gh` kurulu olmalı; `gh auth login` yapılmış olmalı.
2. Canlı kopya:
   ```bash
   git clone https://github.com/sinanbocek/SNN-Standartlar.git "$HOME/.claude/standartlar-canli"
   ```
3. Kancaları kopyala:
   ```bash
   mkdir -p "$HOME/.claude/hooks"
   cp -r "$HOME/.claude/standartlar-canli/hooks/." "$HOME/.claude/hooks/"
   ```
4. `~/.claude/settings.json` içindeki `hooks` bölümünü `ornek/claude-settings-hooks.json` şablonundan doldur. `<HOME>` yerine ev klasörünün yolu yazılır. **Şablon settings.json'un tamamı değildir**; mevcut diğer ayarlar korunur.
5. Doğrula:
   ```bash
   node "$HOME/.claude/hooks/test/hooks.test.js"
   node "$HOME/.claude/hooks/test/stop-debt-push.test.js"
   ```

## Bilinen eksikler

- **Kurulum betiği yok.** 3. ve 4. adım elle. Planlanan: `setup/setup-machine.js` — ölçüm kipi (fark listesi) + `--uygula` (yedekle → kopyala → `settings.json` kanca bloğunu birleştir), `setup/setup-project.js` deseniyle aynı.
- **Sürüklenme ölçülmüyor.** Çalışan `~/.claude/hooks` ile depo sürümü ayrışabilir; oturum açılışında "kancalar depo sürümünden eski" uyarısı planlanıyor.
- **Beceriler paketin dışında.** `~/.claude/skills` altındaki beceriler bu depoda sürümlenmiyor; makine kaybında birlikte giderler.
- **Yollar mutlak.** Şablondaki yollar `<HOME>` ile üretilir; kancaların kendisi `os.homedir()` kullanır, taşınabilir.
