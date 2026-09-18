// Geniş etkili git komutları: aynı klasörde başka bir oturum çalışıyorken BAŞKASININ işini silebilecek
// komutları engeller. Neden (2026-09-18, ölçülmüş iki olay):
//   1. `git add -A` paralel oturumun commit'lenmemiş dosyasını sahneye aldı (fark edildi, geri alındı).
//   2. `gh pr merge --delete-branch` üstünde açık PR duran dalı sildi; o PR kapandı ve tabanı
//      değiştirilemediği için yeniden açılamadı (#18 → #19 olarak yeniden açmak gerekti).
//
// Kural: komut DAR olsun. "Her şeyi al" ve "her şeyi geri al" biçimleri yasaktır; dosyalar açıkça yazılır.
// Bu iş SAFTIR: komut metnini okur, karar döndürür. Çalıştırma, dosya sistemi, ağ yok.
'use strict';

// Her kural: komutu tanıyan kalıp + engel gerekçesi + doğru yol
const RULES = [
  {
    name: 'git add -A',
    re: /\bgit\s+add\s+(-A\b|--all\b|\.(?:\s|$))/,
    reason: 'Sahneye her şeyi alır; paralel oturumun commit\'lenmemiş dosyası da commit\'e girer.',
    instead: 'Dosyaları açıkça yaz: git add <yol1> <yol2>',
  },
  {
    name: 'git commit -a',
    re: /\bgit\s+commit\b[^\n]*(?:\s-a\b|\s--all\b|\s-[a-zA-Z]*a[a-zA-Z]*\b)/,
    reason: 'İzlenen tüm dosyaları commit\'ler; başkasının düzenlemesi de girer.',
    instead: 'Önce git add <yol>, sonra git commit',
  },
  {
    name: 'git checkout -- .',
    re: /\bgit\s+checkout\s+--\s+\.(?:\s|$)|\bgit\s+restore\s+(?:--\w+\s+)*\.(?:\s|$)/,
    reason: 'Çalışma alanındaki TÜM değişiklikleri geri alır; başkasının yazdığı da silinir (geri dönüşü yok).',
    instead: 'Yalnız kendi dosyanı geri al: git restore <yol>',
  },
  {
    name: 'git clean',
    re: /\bgit\s+clean\b[^\n]*-[a-zA-Z]*[fd]/,
    reason: 'İzlenmeyen dosyaları siler; paralel oturumun henüz commit\'lenmemiş yeni dosyası gider.',
    instead: 'Silinecek dosyayı elle sil ya da git clean -n ile önce listele',
  },
  {
    name: 'git stash',
    re: /\bgit\s+stash\b(?!\s+list\b|\s+show\b)/,
    reason: 'Çalışma alanının tamamını kenara alır; başkasının düzenlemesi de görünmez olur.',
    instead: 'Kendi değişikliğini kendi dalına commit\'le',
  },
];

// SAF: komut metni → { name, reason, instead } ya da null
function check(cmd) {
  const text = String(cmd || '');
  for (const r of RULES) if (r.re.test(text)) return { name: r.name, reason: r.reason, instead: r.instead };
  return null;
}

// SAF: engel mesajı (bekçi bunu kullanıcıya gösterir)
const blockMessage = (hit) => `[global kural] Engellendi: ${hit.name} — ${hit.reason} `
  + `Doğrusu: ${hit.instead}. Kural: standartlar/es-zamanli-calisma-standardi.md`;

// ── Dal silme koruması ──────────────────────────────────────────────────────
// SAF: komut bir dal siliyor mu? → silinecek dal adı ya da null
function deletedBranch(cmd) {
  const text = String(cmd || '');
  const push = text.match(/\bgit\s+push\s+\S+\s+(?:--delete|-d)\s+(\S+)/) || text.match(/\bgit\s+push\s+\S+\s+:(\S+)/);
  if (push) return push[1];
  const local = text.match(/\bgit\s+branch\s+(?:-D|-d|--delete)\s+(\S+)/);
  if (local) return local[1];
  if (/\bgh\s+pr\s+merge\b[^\n]*--delete-branch\b/.test(text)) return '(gh pr merge --delete-branch)';
  return null;
}

// SAF: dal siliniyor ve o dalı TABAN alan açık PR varsa engel gerekçesi döndürür.
// openBasePRs: [{ number, base }] — bekçi bu listeyi gh ile okur, burada ağ yok.
function branchDeleteBlock(cmd, openBasePRs = []) {
  const branch = deletedBranch(cmd);
  if (!branch) return null;
  const hits = (openBasePRs || []).filter((p) => p && p.base && (branch === p.base || branch.endsWith(`/${p.base}`) || branch === '(gh pr merge --delete-branch)'));
  if (!hits.length) return null;
  const list = hits.map((p) => `#${p.number} (taban: ${p.base})`).join(', ');
  return `[global kural] Engellendi: üstünde açık PR duran dal siliniyor — ${list}. `
    + 'Taban dalı silinen PR GitHub tarafından KAPATILIR ve tabanı değiştirilemez (2026-09-18, PR #18). '
    + 'Önce üstteki PR\'ın tabanını main yap, sonra dalı sil.';
}

module.exports = { RULES, check, blockMessage, deletedBranch, branchDeleteBlock };
