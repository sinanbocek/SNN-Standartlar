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
  // Birleştirme komutu dalı silerken silinen dal, O PR'IN KENDİ dalıdır (head).
  // Burada PR numarası döndürülür; hangi dal olduğunu çağıran (bekçi) gh ile okur.
  // 2026-09-18: yer tutucu bir metin döndürmek, her açık PR'ı eşleşme sayıp kendi
  // birleştirmemizi engelledi — yanlış alarm, kendi kapımıza takıldık.
  const viaCli = text.match(/\bgh\s+pr\s+merge\s+(\d+)\b[^\n]*--delete-branch\b/);
  if (viaCli) return { prNumber: Number(viaCli[1]) };
  return null;
}

// SAF: dal siliniyor ve o dalı TABAN alan açık PR varsa engel gerekçesi döndürür.
// openBasePRs: [{ number, base }] — bekçi bu listeyi gh ile okur, burada ağ yok.
// SAF: dal siliniyor ve o dalı TABAN alan BAŞKA bir açık PR varsa engel gerekçesi döndürür.
// openPRs: [{ number, base, head }] — bekçi bu listeyi gh ile okur; burada ağ yok.
function branchDeleteBlock(cmd, openPRs = []) {
  const target = deletedBranch(cmd);
  if (!target) return null;
  const list = openPRs || [];
  // Silinecek dalın adı: doğrudan verilmişse o, değilse birleştirilen PR'ın kendi dalı
  let branch = typeof target === 'string' ? target : null;
  let mergingPr = null;
  if (!branch && target && target.prNumber) {
    mergingPr = list.find((p) => p && p.number === target.prNumber);
    branch = mergingPr ? mergingPr.head : null;
  }
  if (!branch) return null; // hangi dalın silineceği okunamadı → engelleme yok
  const hits = list.filter((p) => p && p.base === branch && p.number !== (target.prNumber || null));
  if (!hits.length) return null;
  const text = hits.map((p) => `#${p.number} (taban: ${p.base})`).join(', ');
  return `[global kural] Engellendi: silinecek dalı (${branch}) TABAN alan açık PR var — ${text}. `
    + 'Taban dalı silinen PR GitHub tarafından KAPATILIR ve tabanı değiştirilemez (2026-09-18, PR #18). '
    + 'Önce üstteki PR\'ın tabanını main yap, sonra dalı sil.';
}
// ── Ana dala doğrudan commit koruması ────────────────────────────────────────
// Neden (2026-09-18, kendi üzerimizde ölçüldü): dal açma komutu başka bir bekçiye takılınca
// fark edilmeden ana dala commit atıldı. Kural yazılıydı ("her oturum kendi dalında çalışır")
// ama makine zorlamıyordu; yazılı kural, dikkat dağıldığı anda tutmaz.
//
// Ana dalda commit yasaktır: paralel oturumlar aynı dalda birikirse hangi işin hangi commit
// olduğu kaybolur, geri alma tek tek commit ayıklamaya döner.
const MAIN_BRANCHES = ['main', 'master'];

// SAF: komut yerel bir commit mi? (mesaj okuma, günlük listeleme gibi çağrılar hariç)
const isCommit = (cmd) => /\bgit\s+commit\b/.test(String(cmd || '')) && !/\bgit\s+commit\b[^\n]*\s--dry-run\b/.test(String(cmd || ''));

// SAF: komut, commit'ten ÖNCE dal değiştiriyor mu? (`git checkout -b x && git commit …`)
// Neden (2026-09-19'da ölçüldü): kapı komutu değil, komut BAŞLARKEN bulunulan dalı okuyor.
// Ana daldayken "önce dalımı açayım" diye yazılan doğru komut engelleniyordu — kapının
// tam olarak teşvik ettiği davranış. Üç yanlış alarmın biri buydu.
function switchesBranchFirst(cmd) {
  const text = String(cmd || '');
  const commitAt = text.search(/\bgit\s+commit\b/);
  if (commitAt < 0) return false;
  const before = text.slice(0, commitAt);
  const hits = [...before.matchAll(/\bgit\s+(?:checkout|switch)\s+(?:(?:-b|-c|-B)\s+)?([^\s&|;]+)/g)];
  if (!hits.length) return false;
  // ÖNEMLİ: `git checkout main && git commit` muaf OLMAMALI — kapının engellemek istediği
  // şeyin ta kendisi. Son geçilen dala bakılır; ana dalsa muafiyet yok.
  const target = hits[hits.length - 1][1];
  return !MAIN_BRANCHES.includes(target);
}

// SAF: ana dalda commit ediliyorsa engel gerekçesi döndürür. branch = o an bulunulan dal.
function mainCommitBlock(cmd, branch) {
  if (!isCommit(cmd)) return null;
  if (switchesBranchFirst(cmd)) return null;
  if (!MAIN_BRANCHES.includes(String(branch || '').trim())) return null;
  return `[global kural] Engellendi: ${branch} dalına doğrudan commit. `
    + 'Önce kendi dalını aç: git checkout -b <tur>/<kisa-ad> (feat/ fix/ docs/ refactor/), sonra commit\'le ve PR aç. '
    + 'Kural: standartlar/es-zamanli-calisma-standardi.md — paralel oturumlar aynı dalda birikirse hangi işin hangi commit olduğu kaybolur.';
}
module.exports = { RULES, check, blockMessage, deletedBranch, branchDeleteBlock, MAIN_BRANCHES, isCommit, mainCommitBlock, switchesBranchFirst };
