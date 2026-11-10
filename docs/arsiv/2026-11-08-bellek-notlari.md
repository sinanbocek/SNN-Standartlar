# Bellek notları arşivi (2026-11-08)

Genel Müdür düzeni kurulurken bu projenin Claude belleğindeki iki durum notu okundu. Maddeler `ekip/olcum/DURUM.md` dosyasına dağıtıldı. Bu dosya notların o günkü tam metnidir. Bu depoda ayrı bir devir notu yoktu.

## alt-ajan-bekcisi-izleme

Bellekte yönlendirme satırına döndü; yeni durum artık `ekip/olcum/DURUM.md` dosyasına yazılır.

> **Açıklama:** Alt ajan bekçisi (guard-agent) 2026-10-09'da uyarı kipinde kuruldu; 2026-10-16'dan sonra yanlış alarm sayımı bekleniyor
>
> Alt ajan model/seviye kuralı 2026-10-09'da kullanıcı talimatına girdi (PR #122), bekçi `hooks/guard-agent.js` aynı gün uyarı kipinde kuruldu (PR #123), issue #121 proje sahibince kapatıldı. Ayar kaydı makinede elle eklendi; yedek `~/.claude/settings.json.yedek-2026-10-09T19-55-50-699Z`.
>
> **Why:** Standart "kural sonrası yanlış alarm bir hafta izlenir; sıfırsa engele çevrilmesi tartışılır" diyor. Tarih repoda yok.
>
> **How to apply:** 2026-10-16'dan sonra oturum kayıtlarında (`~/.claude/projects/*/*.jsonl`, yalnız sayı) 2026-10-09 sonrası Agent çağrılarında modelsiz/seviyesiz oranını say; sayım betiği örneği o günkü oturumun scratchpad'indeydi, yeniden yazılır. Sonucu proje sahibine seçenekli sun (uyarıda kalsın / engele dönsün). Ölçüm öncesi değer: 522 çağrının 347'si modelsiz, 497'si seviyesiz (2026-09-01 → 2026-10-09).

## bellek-derleme-dongusu

Bellekte yerinde kaldı: `bellek-derleme` zamanlanmış görevi her hafta bu nota yazıyor. Yönlendirme satırına çevrilirse görevin yazdığı yer bozulur.

> **Açıklama:** Haftalık bellek derleme görevi (pazartesi 09:30, bu bilgisayar) 2026-10-09'da kuruldu; bir aylık deneme, ilk çalışma 2026-10-10 (PR #135, 8 talep #127–#134), ikinci 2026-10-12, üçüncü 2026-10-19, dördüncü 2026-10-26 (talep #170, sahip iptal etti), beşinci 2026-11-02 (talep #172)
>
> Proje sahibi 2026-10-09'da "kendi kendini besleyen" bellek döngüsünü istedi. Kurulan: zamanlanmış görev `bellek-derleme` (`~/.claude/scheduled-tasks/bellek-derleme/SKILL.md`, cron pazartesi 09:30, bilgisayar kapalıysa sonraki açılışta). Araç ve tarif: `quality/memory-inventory.js`, `docs/bellek-derleme/README.md` (PR #126). Görev notları birleştirir ve emekliye ayırır; standartlara dokunmaz, standart adaylarını `talep` etiketli issue olarak açar.
>
> **Why:** 109 not, 8 projeler arası tekrar kümesi; GHS-Panel 2026-09-28 dersi Pulmaca'da 2026-10-09'da ~1M parçayla yeniden keşfedildi. Deneme süresi dört hafta; sonra üç sayıya bakılır (haftada yeni not, tekrar, kural olan aday).
>
> **How to apply:** Pazartesi görev bildirimi gelince PR'ı ve açılan talepleri sahibe özetle; talepleri `standart-talep` akışıyla değerlendir. 2026-11-09 civarında dört haftalık sayıları çıkar ve döngünün kalıp kalmayacağını seçenekli sor.
