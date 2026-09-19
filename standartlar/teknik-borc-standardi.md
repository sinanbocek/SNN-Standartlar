# Teknik Borç Standardı (tüm projeler)

Kaynak model: GHS-Panel `docs/teknik-borc.md`. Tüm projeler bu biçimi kullanır;
`~/.claude/hooks/lib/borc.js` bu dosyaları bu kurallara göre okur.

## Temel ilke: iki okuyucu, tek kayıt

Her kayıt iki kişiye yazılır:

| Okuyucu | Neye ihtiyacı var | Kaydın hangi kısmı |
|---|---|---|
| **Proje sahibi** (teknik olmayan) | Sorun ne, neden önemli, ne karar vermem lazım | 🟢 **Sade Anlatım** bölümü |
| **Yapay zeka** (kodu yazan) | Tam olarak nerede, nasıl ölçülür, nasıl çözülür | 🔧 **Teknik Detay** bölümü |

**Dil kuralları**
- Sade Anlatım bölümünde İngilizce terim **kullanılmaz**. Kaçınılmazsa ilk geçtiği yerde parantez içinde Türkçesi verilir: "RLS (satır bazlı erişim kuralı)".
- Her kayıtta en az bir **benzetme** bulunur. Benzetme gündelik hayattan olur (ev, dükkân, banka, araba, apartman).
- Teknik Detay bölümünde kod adları, dosya yolları, tablo adları **olduğu gibi** yazılır; yapay zeka bunlarla arama yapar. Açıklama cümleleri yine Türkçedir.
- Kısaltma kullanılmaz (RLS, FK, CI gibi); kullanılırsa Sözlük'e eklenir.

## Dosyalar

| Dosya | İçerik |
|---|---|
| `docs/teknik-borc.md` | **Yalnızca açık** borçlar. Tek doğruluk kaynağı. |
| `docs/teknik-borc-arsiv.md` | Kapanan borçlar. Silinmez; ders ve uyarı taşır. |

Başka ad (`tech-debt.md`, `TECHNICAL_DEBT.md`, `TECH_DEBT.md`) kullanılmaz.

## Bekleyen ölçüm kütükte durmaz

**Kural:** bir kayıt *"önce ölçelim, sonra karar veririz"* diyorsa o **borç değildir**, vadesi
gelmemiş bir **ölçümdür**. Kütükten çıkarılır ve `quality/data/pending-measurements.json`
dosyasına yazılır. Her kaydın **dört** alanı zorunludur:

| Alan | Neden zorunlu |
|---|---|
| `question` | Neyin ölçüldüğü yazılmadan bekleme olmaz |
| `command` | **Çalıştırılabilir** olmalı; çalıştırılamayan ölçüm, ölçüm değildir |
| `due` | Vadesiz bekleme, unutulmuş beklemedir |
| `decision` | Sayı gelince **ne yapılacağı önceden** yazılır; sonra tartışılmaz |

**Makine zorlar, hatırlamak değil.** `quality/pending-measurements.js`:

- komutun betiği **gerçekten var mı** diye bakar (yoksa kırmızı),
- komutu izin listesine sokar (`node quality/<dosya>.js …`; serbest kabuk komutu çalıştırılmaz),
- **vade gelince komutu çalıştırır** ve karar verilene kadar kırmızı kalır,
- kütüğü tarar: bir kayıt *"ölçüm bekliyor"* diyorsa ve kayıtlı ölçümü yoksa **kırmızı verir**.

**Gerçek olay (2026-09-19):** TB-002 *"bir hafta defter verisi beklensin"* diyordu. Ölçüldü:
defter yalnız şu anki oturumları tutuyordu, geçmiş hiç biriktirilmiyordu — **beklenen veri hiçbir
zaman gelmeyecekti**. Üstelik beklemeyi tetikleyen bir şey de yoktu; *"bir hafta sonra bakarız"*
bir kontrol değil, bir niyetti. Proje sahibi: *"bu ve benzeri işlemler tamamen makine zorlamasıyla
kontrol edilerek otomatik tetiklenen bir makine kuralı olmalı; aksi asla kabul edilemez."*

## Bir deponun iş listesi kütükten ibaret değildir

**Kural:** *"iş kaldı mı?"* sorusu **iki** kaynağa birden bakılarak cevaplanır:

1. **Kütük** — `docs/teknik-borc.md` (bu deponun kendi kayıtları)
2. **Açık talepler** — `talep` etiketli açık issue'lar (başka depolardan gelen bildirimler)

Yalnız kütüğe bakıp *"iş kalmadı"* demek **ölçülmemiş iddiadır** (`olcum-standardi.md` kural 1).

**Gerçek olay (2026-09-19):** SNN-Standartlar'da kütükteki son kayıt kapandı ve oturum
*"eyleme geçirilebilir borç kalmadı"* dedi. Aynı anda **dört açık talep** duruyordu; biri
kapıyı sessizce bozan bir kusuru bildiriyordu. Talepler kütükte görünmüyor, oturum açılışında
görünmüyor, hiçbir kapı onları saymıyordu. Proje sahibi ekran görüntüsüyle gösterdi.

**Talep cevapsız bırakılmaz.** Açık bir talep 7 günden uzun süre **hiç yanıtsız** kalırsa
(ne yorum, ne karar, ne kapanış) `quality/open-requests.js` kırmızı verir. Kural metni değil,
kapı zorlar: *"bakacağım" bir kontrol değildir.*

Karar verildiğinde — kabul ya da ret — gerekçesi `GERI-BILDIRIM-KAYDI.md`'ye yazılır ve issue
kapatılır. Reddedilen talep gerekçesiyle durur; aynı talep ikinci kez değerlendirilmez.

## Kayıt biçimi (açık borç)

```markdown
### TB-091 — Kısa, herkesin anlayacağı başlık
- **Tespit Tarihi:** 2026-09-15 (hangi iş sırasında bulundu)
- **Öncelik:** P1 (Acil)
- **Issue:** #12

#### 🟢 Sade Anlatım
- **Sorun ne?** Bir iki cümle, teknik terimsiz.
- **Benzetme:** Gündelik hayattan bir örnek.
- **Çözülmezse ne olur?** Somut sonuç (para, veri, zaman, güvenlik).
- **Senden beklenen karar:** Varsa; yoksa "Yok".

#### 🔧 Teknik Detay
- **Açıklama:** Ne var, nerede (`dosya.ts:42`), ölçüm sayılarıyla. Ölçülmemiş iddia "hipotez" diye yazılır.
- **Etki:** Hangi ekran, tablo, kullanıcı etkileniyor.
- **Çözüm yönü:** Önce ne ölçülecek, sonra ne yapılacak, nasıl doğrulanacak.
- **Neden Şimdi Çözülmüyor:** Kapsam / karar / bağımlılık.
- **Bağlı kalemler:** TB-082.
```

Kurallar:
- Başlık satırı tam olarak `### TB-<sayı> — <başlık>` (uzun tire `—`).
- Numara proje içinde sıralı, **asla yeniden kullanılmaz** (arşivdekiler dahil).
- Zorunlu: `Tespit Tarihi`, `Öncelik`, Sade Anlatım'ın dört maddesi, `Açıklama`, `Neden Şimdi Çözülmüyor`.
- `Issue` satırını elle yazma; senkron betiği ekler.
- **Hassas kayıt** (anahtar/parola, yetki kuralı, denetim izi, kişisel veri, açığın yerini tarif eden bilgi): `Öncelik` satırının altına iki satır eklenir:
  ```markdown
  - **Hassas:** Evet
  - **Genel Başlık:** Güvenlik: bir bağlantı parolasının yenilenmesi
  ```
  Senkron bu kayıtta GitHub issue'suna **yalnızca Genel Başlık + kütük linki** yazar; Sade Anlatım ve teknik başlık issue'ya gitmez (proje sahibi kararı, 2026-09-15). Genel Başlık açığın yerini/türünü ele vermez. Public depoda hassas kayıt için hiç issue açılmaz.
- Kayıtlar arasında `---` ayırıcı.

## Öncelik

| Kod | Türkçe adı | Benzetme | Ne zaman |
|---|---|---|---|
| **P1** | **Acil** | Evde su kaçağı: bekledikçe hasar büyür | Veri kaybı, yanlış para/hesap, güvenlik açığı, sessizce bozulan iş. Bir sonraki işten önce bakılır. |
| **P2** | **Planlı** | Arabanın periyodik bakımı: bugün yürüyor ama ertelenirse arıza çıkar | Yanlış davranış riski veya işi yavaşlatan borç. Planlı bir tura alınır. |
| **P3** | **Fırsatta** | Dağınık dolap: rahatsız eder ama zarar vermez | Temizlik, düzen, bakım kolaylığı. |

Önceliği olmayan eski kayıtlar özetlerde `P?` sayılır ve düzeltilmeyi bekler.

## Kapanış

1. Kaydı `teknik-borc.md`'den çıkar.
2. `teknik-borc-arsiv.md` → "Kapanan Kalemler" altına ekle:
   `- **Kapanış:** 2026-09-15 — **TB-091: Başlık.**` ve altında:
   - **Ne yapıldı (sade):** bir cümle
   - **Ölçülen sonuç:** sayılarla
   - **Ders:** bir sonraki benzer işte hatırlanacak şey
3. İki dosya aynı commit'e girer.

## Dosya başlığı ve sözlük

```markdown
# Teknik Borç Kütüğü

Fark edilen ama şimdi çözülmeyen sorunlar. **Açık borçlar için tek kaynak burasıdır.**
Kapanan kayıtlar: `docs/teknik-borc-arsiv.md`

> **Teknik borç nedir?** Bir işi hızlı bitirmek için kestirme yol kullanmak, sonradan
> ödenecek bir borç almak gibidir. Borç ödenmedikçe faizi (bakım zorluğu, hata riski) büyür.

## Sözlük
| Terim | Türkçe karşılığı |
|---|---|
| (kütükte geçen her teknik terim buraya) | |
```
