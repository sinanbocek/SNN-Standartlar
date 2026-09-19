// PreToolUse (Bash|PowerShell): geri dönüşü zor komutları engeller veya onaya bağlar.
'use strict';
const fs = require('fs');

const DENY = [
  { re: /git\s+push\b[^\n;|&]*\s(--force\b|-f\b|--force-with-lease\b)/, why: 'force push geçmişi siler' },
  { re: /git\s+(commit|push)\b[^\n;|&]*--no-verify\b/, why: 'hook atlamak disiplin kapısını deler' },
  { re: /git\s+reset\s+--hard\b/, why: 'commit\'lenmemiş işi kalıcı siler' },
  { re: /git\s+clean\s+-[a-z]*f/, why: 'takip dışı dosyaları kalıcı siler' },
  { re: /supabase\s+db\s+reset\b[^\n;|&]*--linked\b/, why: 'canlı veritabanını sıfırlar' },
  { re: /\brm\s+-[a-z]*r[a-z]*f?\s+(\/|~|\*|\.\s*$)/, why: 'geniş kapsamlı silme' },
  { re: /Remove-Item\b[^\n;|]*-Recurse[^\n;|]*\s(C:\\|~|\\\*|\.\s*$)/i, why: 'geniş kapsamlı silme' },
  { re: /cat\s+[^\n;|]*\.gemini[\\/]|Get-Content\s+[^\n;|]*\.gemini[\\/]/i, why: '.gemini/ içeriği token barındırır' },
];

const ASK = [];

function decide(decision, reason) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: decision, permissionDecisionReason: `[global kural] ${reason}` },
  }));
  process.exit(0);
}

let input = {};
try {
  input = JSON.parse(fs.readFileSync(0, 'utf8').replace(/^\uFEFF/, '') || '{}');
} catch {
  process.exit(0);
}
const cmd = (input.tool_input && input.tool_input.command) || '';

const d = DENY.find((r) => r.re.test(cmd));
if (d) decide('deny', `Engellendi: ${d.why}. Gerekliyse kullanıcı komutu kendisi çalıştırmalı.`);
const a = ASK.find((r) => r.re.test(cmd));
if (a) decide('ask', `Onay gerekli: ${a.why}.`);

// Eş zamanlı çalışma: başkasının commit'lenmemiş işini silebilecek geniş etkili komutlar.
// Kural ortak depoda: quality/wide-effect-git.js · standartlar/es-zamanli-calisma-standardi.md
// Modül yüklenemezse iş durmaz; bu yalnız koruma katmanıdır (birleştirme kapısından farkı: orada
// denetlenemeyen birleştirme engellenir, burada engelsiz devam edilir).
try {
  const wide = require(require('./lib/shared').shared('quality/wide-effect-git.js'));
  const hit = wide.check(cmd);
  if (hit) decide('deny', wide.blockMessage(hit).replace('[global kural] ', ''));
  // Ana dala doğrudan commit: dal adı burada okunur (modül saf kalsın diye dışarıdan verilir)
  if (wide.isCommit && wide.isCommit(cmd)) {
    let branch = '';
    try {
      branch = require('child_process').execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'],
        { cwd: input.cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000 }).trim();
    } catch { /* dal okunamadı → engelleme yok */ }
    const mainBlock = wide.mainCommitBlock(cmd, branch);
    if (mainBlock) decide('deny', mainBlock.replace('[global kural] ', ''));
  }
  if (wide.deletedBranch(cmd)) {
    let openPRs = [];
    try {
      const out = require('child_process').execFileSync('gh',
        ['pr', 'list', '--state', 'open', '--json', 'number,baseRefName,headRefName'],
        { cwd: input.cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 8000 });
      openPRs = JSON.parse(out).map((p) => ({ number: p.number, base: p.baseRefName, head: p.headRefName }));
    } catch { /* gh okunamadı → dal silme koruması bu sefer atlanır */ }
    const block = wide.branchDeleteBlock(cmd, openPRs);
    if (block) decide('deny', block.replace('[global kural] ', ''));
  }
} catch { /* modül yok (canlı kopya eski) → koruma atlanır */ }

// Birleştirme kapısı: GitHub kontrolleri yeşil değilken PR birleştirilmez (kural ortak depoda: quality/merge-gate.js).
// Kural dosyası yüklenemezse kapı KAPALI kalır: denetlenemeyen birleştirme engellenir.
// Tetik geniş tutulur (REST/GraphQL birleştirme, taslak kaldırma); ayrıntılı karar modülde
if (/\bgh\s+pr\s+(merge|ready)\b|\/pulls\/[^/\s]+\/merge\b|mergePullRequest|enablePullRequestAutoMerge|markPullRequestReadyForReview/.test(cmd)) {
  let reason;
  try {
    reason = require(require('./lib/shared').shared('quality/merge-gate.js')).gate(cmd, input.cwd);
  } catch (e) {
    reason = `Birleştirme kapısı yüklenemedi (${e.message}); denetlenemeyen birleştirme engellendi.`;
  }
  if (reason) decide('deny', `Engellendi: ${reason}`);
}

process.exit(0);
