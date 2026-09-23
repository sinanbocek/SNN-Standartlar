// Çekirdek (SNN-Abacus-Core) yeni sürümünün tüketici projelere yayılma planı. SAF: ağa ve diske dokunmaz.
// Karar (2026-09-15, proje sahibi): çekirdekte sürüm çıkınca her tüketiciye GÜNCELLEME PR'ı açılır; projenin kendi
// kontrolleri yeni sürümü sınar. Ana sürüm atlanıyorsa kütük kaydı PR'ın içinde gelir (bot kütüğe doğrudan yazmaz;
// kayıt, PR onaylanınca kütüğe girer). Otomatik birleştirme yok.
'use strict';

const PACKAGE = '@snn/abacus-core';
const CORE_REPO = 'sinanbocek/SNN-Abacus-Core';

// SAF: "v3.2.0" / "3.2.0" → [3,2,0] | null
function parse(v) {
  const m = String(v || '').trim().match(/^v?(\d+)\.(\d+)\.(\d+)$/);
  return m ? m.slice(1).map(Number) : null;
}

// SAF: a<b → -1, eşit 0, a>b → 1
function compare(a, b) {
  const x = parse(a); const y = parse(b);
  for (let i = 0; i < 3; i += 1) if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1;
  return 0;
}

// SAF: tüketici için karar
// locked = kilit dosyasındaki kurulu sürüm (yoksa null), target = yeni çekirdek sürümü
function decide({ locked, target, hasOpenPr }) {
  if (!parse(target)) return { action: 'hata', reason: `geçersiz hedef sürüm: ${target}` };
  if (!locked) return { action: 'atla', reason: 'kilit dosyasında çekirdek sürümü okunamadı' };
  if (compare(locked, target) >= 0) return { action: 'atla', reason: `güncel (${locked})` };
  if (hasOpenPr) return { action: 'atla', reason: 'bu sürüm için açık güncelleme PR\'ı zaten var' };
  const major = parse(locked)[0] !== parse(target)[0];
  return { action: 'pr', major, from: locked, to: String(target).replace(/^v/, '') };
}

// SAF: package.json bağımlılık tanımını hedef sürüme çevirir; depo yazımını (büyük/küçük harf) korur.
// "#v2.7.0" (sabit) → "#v3.2.0"; "#semver:^3.0.0" → "#semver:^3.2.0"
function rewriteSpec(spec, target) {
  const t = String(target).replace(/^v/, '');
  const m = String(spec).match(/^(github:[^#]+)#(.*)$/);
  if (!m) return `github:${CORE_REPO}#semver:^${t}`;
  if (/^v?\d+\.\d+\.\d+$/.test(m[2])) return `${m[1]}#v${t}`;
  return `${m[1]}#semver:^${t}`;
}

// SAF: CHANGELOG'dan (from, to] aralığındaki sürüm bölümleri (Keep a Changelog: "## [x.y.z] - tarih")
function changelogBetween(text, from, to) {
  const heads = [...String(text).matchAll(/^## \[(\d+\.\d+\.\d+)\][^\n]*$/gm)];
  const out = [];
  heads.forEach((h, i) => {
    const v = h[1];
    if (compare(v, from) > 0 && compare(v, to) <= 0) {
      const end = i + 1 < heads.length ? heads[i + 1].index : text.length;
      out.push(text.slice(h.index, end).trim());
    }
  });
  return out.join('\n\n');
}

// SAF: kütükteki en büyük TB numarası (açık + arşiv metni) → sonraki kimlik "TB-042"
function nextDebtId(texts) {
  const nums = texts.join('\n').match(/TB-(\d+)/g) || [];
  const max = nums.reduce((m, x) => Math.max(m, Number(x.slice(3))), 0);
  const width = Math.max(3, String(max + 1).length);
  return `TB-${String(max + 1).padStart(width, '0')}`;
}

// SAF: ana sürüm geçişi için standart kütük kaydı (Sade Anlatım + Teknik Detay)
function majorDebtRecord({ id, from, to, date, usage }) {
  return [
    `### ${id} — Çekirdek (SNN-Abacus-Core) ${from} → ${to} ana sürüm geçişi incelenmeli`,
    '',
    `- **Tespit Tarihi:** ${date} (çekirdek v${to} yayını; otomatik güncelleme PR'ı)`,
    '- **Öncelik:** P2 (Planlı)',
    '',
    '#### 🟢 Sade Anlatım',
    '',
    `- **Sorun ne?** Proje, ortak hesaplama çekirdeğinin eski ana sürümünü (${from}) kullanıyor; yeni ana sürüm (${to}) çıktı. Ana sürüm değişikliği, bazı fonksiyonların adının ya da davranışının değişmiş olabileceği anlamına gelir.`,
    '- **Benzetme:** Bütün şubelerin kullandığı hesap makinesinin yeni modeli çıktı; tuşların bir kısmı yer değiştirmiş olabilir. Eski modelde kalan şube, merkezde düzeltilen hataların düzeltmesini de almaz.',
    '- **Çözülmezse ne olur?** Çekirdekte yapılan düzeltmeler ve yenilikler bu projeye ulaşmaz; projeler arasında aynı hesap farklı sonuç verebilir. Aradaki fark büyüdükçe geçiş zorlaşır.',
    '- **Senden beklenen karar:** Güncelleme PR\'ının kontrolleri yeşilse birleştirmeye onay; kırmızıysa geçişin ne zaman yapılacağı.',
    '',
    '#### 🔧 Teknik Detay',
    '',
    `- **Açıklama:** Kilit dosyasında \`@snn/abacus-core\` ${from}; hedef ${to}. Değişiklik ayrıntısı güncelleme PR'ının açıklamasında (çekirdeğin CHANGELOG bölümleri).`,
    `- **Kullanım (PR açılışındaki ölçüm):** ${usage || 'ölçülmedi'}`,
    '- **Çözüm yönü:** (1) Güncelleme PR\'ında kontrolleri oku. (2) Kırılan yerleri CHANGELOG\'daki göç notlarına göre düzelt. (3) Yeşil olunca birleştir; bu kaydı arşive taşı.',
    '- **Neden Şimdi Çözülmüyor:** Otomatik güncelleme PR\'ı ile açıldı; inceleme ve karar proje sahibinde.',
  ].join('\n');
}

// SAF: kaydı kütükte P2 grubunun sonuna (ilk P3'ün önüne) yerleştirir
function insertRecord(debtText, record) {
  const heads = [...debtText.matchAll(/^### TB-\d+/gm)].map((m) => m.index);
  let pos = debtText.length;
  for (let i = 0; i < heads.length; i += 1) {
    const end = i + 1 < heads.length ? heads[i + 1] : debtText.length;
    if (/\*\*Öncelik:\*\*\s*P3/.test(debtText.slice(heads[i], end))) { pos = heads[i]; break; }
  }
  const sep = '\n\n---\n\n';
  if (pos === debtText.length) return `${debtText.replace(/\s*$/, '')}${sep}${record}\n`;
  return `${debtText.slice(0, pos)}${record}${sep}${debtText.slice(pos)}`;
}

// ─── Aşılmış PR'lar ─────────────────────────────────────────────────────────
//
// KURAL: bir tüketicide aynı anda YALNIZ BİR açık çekirdek güncelleme PR'ı bulunur — en güncel olan.
//
// VAKA (SNN-Abacus-Core bildirimi #79, 2026-09-19): çekirdek bir günde beş sürüm yayımladı
// (3.5.0 → 3.5.1 → 4.0.0 → 4.1.0 → 4.1.1). Her yayılım yeni PR açtı, eskisini KAPATMADI. Sekiz
// tüketicide 25 açık PR yığıldı; Gunum-Var'da altısı da AYNI tabandan (3.2.0) geliyordu ve
// başlıkları neredeyse aynıydı. Zarar görsel kalabalık değil: listeden 4.0.0'ı seçen bir gözden
// geçiren, 4.1.1'deki düzeltmeyi ALMAMIŞ olur — o düzeltme 1000 kat sapma üreten bir hatayı
// kapatıyordu ve risk hesabına giriyordu.
//
// İKİ ÖNEK: dal adı bir dönem `cekirdek/`, sonra `core/` oldu. Yalnız birini aramak eskileri
// sonsuza kadar açık bırakır — bildiren kişi elle temizlikte tam bunu yaşadı (Gunum-Var #176).
const BRANCH_PREFIXES = ['core/abacus-core-v', 'cekirdek/abacus-core-v'];

// SAF: dal adından çekirdek sürümü → '4.1.1' ya da null
function versionOfBranch(branch) {
  for (const prefix of BRANCH_PREFIXES) {
    if (String(branch || '').startsWith(prefix)) return String(branch).slice(prefix.length) || null;
  }
  return null;
}

// SAF: açık PR'lardan hangisi kapatılır, hangisi kalır?
//
// prs: [{ number, headRefName, commits, reviews }] — commits/reviews sayı ya da dizi olabilir.
// keepVersion: kalacak sürüm (yeni açılan PR). Verilmezse EN YÜKSEK sürüm kalır (temizlik kipi).
//
// İNSAN EMEĞİ DOKUNULMAZ: üstüne ikinci bir commit atılmış ya da inceleme/yorum almış PR
// KAPATILMAZ, yalnız bildirilir. Ölçüm (#79 eki, 2026-09-23): kapatılan 14 PR'ın 14'ü de tek
// makine commit'iydi ve hiçbirinde inceleme yoktu — yani bu koruma nadiren devreye girer, ama
// girdiğinde birinin işini korur.
function supersede(prs, keepVersion = null) {
  const core = (prs || [])
    .map((pr) => ({ ...pr, version: versionOfBranch(pr.headRefName) }))
    .filter((pr) => pr.version && parse(pr.version));
  if (!core.length) return { close: [], keep: null, touched: [] };

  const count = (v) => (Array.isArray(v) ? v.length : Number(v || 0));
  const keep = keepVersion
    ? core.find((pr) => compare(pr.version, keepVersion) === 0) || null
    : core.reduce((best, pr) => (!best || compare(pr.version, best.version) > 0 ? pr : best), null);

  const close = [];
  const touched = [];
  for (const pr of core) {
    if (keep && pr.number === keep.number) continue;
    if (keepVersion && compare(pr.version, keepVersion) > 0) continue;   // daha YENİ olana dokunulmaz
    // DOKUNULMUŞ PR DA KAPATILIR (proje sahibi kararı, 2026-09-23 — #79'un önerisi).
    // Gerekçe: açık kalan eski PR tam da bu talebin şikâyet ettiği riski sürdürür — listeden
    // eski sürümü seçen gözden geçiren, yenisindeki düzeltmeyi almamış olur. Ama dokunulmuş
    // olduğu SAYILIR ve hem çıktıda hem kapatma yorumunda YAZILIR: sessiz kapatma, emeğini
    // koyan kişinin "benim PR'ıma ne oldu?" diye aramasına yol açar.
    if (count(pr.commits) > 1 || count(pr.reviews) > 0) touched.push(pr);
    close.push(pr);
  }
  return { close, keep, touched };
}

// SAF: kapatma yorumu. Neden kapandığı ve yerine ne geçtiği YAZILI olmalı; sessiz kapatma,
// gözden geçirenin "benim PR'ıma ne oldu?" diye aramasına yol açar.
const supersedeComment = (pr, keep, touched = false) => {
  const head = keep
    ? `Aşılmış: yerini #${keep.number} aldı (çekirdek ${pr.version} → ${keep.version}). `
      + 'Göç notlarının tamamı yeni PR gövdesinde — aradaki tüm sürüm bölümleri orada toplanıyor.'
    : `Aşılmış: bu tüketici çekirdeğin daha yeni bir sürümünde; ${pr.version} güncellemesi geçersiz kaldı.`;
  // Emeğini koyan kişi sessizce kapatılmaz: PR'ın dokunulmuş olduğu yazılır.
  const note = touched
    ? '\n\nBu PR üzerinde inceleme ya da ek commit vardı. Kapatma kararı kuraldan geliyor '
      + '(bir tüketicide yalnız bir açık çekirdek PR\'ı bulunur); kaybolmasını istemediğiniz bir '
      + 'değişiklik varsa yeni PR\'a taşıyın. Dal silinmedi.'
    : '\n\nDal silinmedi.';
  return head + note;
};

module.exports = { PACKAGE, CORE_REPO, parse, compare, decide, rewriteSpec, changelogBetween, nextDebtId, majorDebtRecord, insertRecord, supersede, versionOfBranch, supersedeComment, BRANCH_PREFIXES };
