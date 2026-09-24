---
name: oturum-teshis
description: Bir oturumda işlerin ters gittiği düşünüldüğünde kullan. "Bu oturumda ne yanlış gitti", "neden kuralı atladın", "aynı hataya neden tekrar düştün", "neden bu kadar uzun sürdü", "oturumu incele", "teşhis et" gibi durumlar. Bu oturum için de, kimliği verilen geçmiş bir oturum için de geçerli.
---

# Oturum teşhisi

> `<ev>` = ev klasörü. Öğrenmek için: `node -e "console.log(require('os').homedir())"`
> Betik: `<ev>/.claude/standartlar-canli/quality/session-digest.js`

**Kural:** Her bulgu kayıttan bir satır gösterir (`L437`). Satırı olmayan bulgu yazılmaz. Sayılar betikten ya da kayıttan gelir, hafızadan gelmez.

**Kayıt kişisel veridir.** Yalnız yerelde okunur, dışarı gönderilmez, içeriği sohbete toptan dökülmez. Kayıt dosyası değiştirilmez.

## 1. Sorunu netleştir

Tek soru sor: "Ne bekleniyordu, ne oldu?" Kullanıcı zaten söylediyse sorma. Hangi oturumun inceleneceği belirtilmediyse bu oturum incelenir.

## 2. Oturumu bul

```
node "<ev>/.claude/standartlar-canli/quality/session-digest.js" --liste
```

Başka bir projenin oturumu için `--klasor <proje kökü>` ekle. Geçmiş bir oturumu, ilk mesajını ve tarihini kullanıcıya göstererek doğrula. Alt ajan kayıtları `<oturum-id>/subagents/*.jsonl` altındadır; onları `--dosya <yol>` ile oku.

## 3. Özet ve işaretler

```
node "<ev>/.claude/standartlar-canli/quality/session-digest.js" --oturum <id>
```

Bu oturum için `--oturum <id>` yerine `--son` kullan.

Şikâyet maliyetle ilgiliyse ("neden bu kadar pahalı") token satırına bak. Yük genellikle girdidir: her model yanıtı, o ana kadarki bütün bağlamı yeniden okur. Para karşılığını hesaplama; fiyat oranları betiğin bilgisi dışında.

## 4. İşaretli yerleri oku

```
node "<ev>/.claude/standartlar-canli/quality/session-digest.js" --oturum <id> --satir 430-450
```

- Her işaretin öncesinden ve sonrasından yaklaşık 10'ar satır oku.
- Kullanıcının şikâyet ettiği bölgeyi, işaret olmasa da oku.
- İşaret bir hüküm değil, okunacak yerdir. Gerçekten bir sorun olup olmadığına okuyarak karar ver.

## 5. Rapor

| # | Ne oldu | Kanıt | Beklenen | Kullanıcıya yanlış bilgi ulaştı mı? | Kök neden | Öneri |
|---|---|---|---|---|---|---|

- Ölçülmemiş bir kök neden "hipotez" diye yazılır.
- Öneri türleri: kural (standart ve madde), dedektör ya da kapı, borç kaydı, hafıza. Önerisi olmayan bulgu da yazılır.
- Raporun sonunda kapsamı yaz: hangi satır aralıkları okundu, hangileri okunmadı.

## 6. Onayla uygula

Hiçbir öneriyi kendiliğinden uygulama. Kullanıcı seçerse:

- borç kaydı için `borc-ekle`
- ortak depoya talep için `standart-talep`
- yeni bir dedektör için SNN-Standartlar'da CLAUDE.md §4 sırası

## Bilinen sınırlar

- Tur ortasındaki açıklamalar kayıtta her zaman düz metin olarak durmaz. Ajanın söylediği her şey aranamaz.
- Dedektörlerin kapsamı dardır: "işaret yok" demek "sorun yok" demek değildir. Ölçüm: `docs/oturum-teshisi.md`.
