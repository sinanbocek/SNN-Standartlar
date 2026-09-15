// Çekirdek yeni sürümünü tüketici projelere GÜNCELLEME PR'ı olarak yayar.
// Kullanım: node cekirdek/yayilim.js --surum v3.2.0                → KURU ÇALIŞTIRMA (plan yazdırır, hiçbir şey değiştirmez)
//           node cekirdek/yayilim.js --surum v3.2.0 --uygula       → dal açar, sürümü yükseltir, PR açar
//           ... --yalniz sinanbocek/SNN-Yonetici-Ozeti             → yalnız bu depo (deneme için)
// Anahtar: GH_TOKEN (repo yetkili). Kural: bot kütüğe doğrudan yazmaz; ana sürüm kaydı PR'ın içinde gelir. Otomatik birleştirme yok.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const P = require('./lib/yayilim-plan');

const argv = process.argv.slice(2);
const arg = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : null; };
const TARGET = arg('--surum');
const APPLY = argv.includes('--uygula');
const ONLY = arg('--yalniz');
const OWNER = 'sinanbocek';
// Kişisel hesap dışındaki tüketiciler (kurum depoları kullanıcı listesinde görünmez)
const EXTRA_REPOS = ['globalhedef/global-hedef-web-platform'];
const BRANCH = `cekirdek/abacus-core-v${String(TARGET || '').replace(/^v/, '')}`;

const gh = (args, opts = {}) => execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 1e8, stdio: ['ignore', 'pipe', 'pipe'], ...opts });
const ghJson = (args) => JSON.parse(gh(args));
const run = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1e8, shell: process.platform === 'win32' && cmd === 'npm' });

function fileAt(repo, file, ref) {
  try {
    return Buffer.from(ghJson(['api', `repos/${repo}/contents/${file}${ref ? `?ref=${ref}` : ''}`]).content, 'base64').toString('utf8');
  } catch {
    return null;
  }
}

function consumers() {
  if (ONLY) return [ONLY];
  const own = ghJson(['api', 'user/repos?per_page=100&affiliation=owner', '--paginate'])
    .filter((r) => !r.fork && !r.archived && r.owner.login === OWNER && r.full_name.toLowerCase() !== P.CORE_REPO.toLowerCase())
    .map((r) => r.full_name);
  return [...own, ...EXTRA_REPOS];
}

function lockedVersion(lockText) {
  try {
    const lock = JSON.parse(lockText);
    const entry = lock.packages && lock.packages[`node_modules/${P.PACKAGE}`];
    return entry ? entry.version : null;
  } catch {
    return null;
  }
}

function usageSummary(dir) {
  const counts = {};
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (['node_modules', '.git', 'dist', 'build', 'coverage'].includes(e.name)) continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(e.name)) {
        const t = fs.readFileSync(p, 'utf8');
        for (const m of t.matchAll(/import\s*\{([^}]*)\}\s*from\s*['"]@snn\/abacus-core[^'"]*['"]/g)) {
          m[1].split(',').map((s) => s.trim().split(/\s+as\s+/)[0]).filter(Boolean).forEach((n) => { counts[n] = (counts[n] || 0) + 1; });
        }
      }
    }
  };
  try { walk(dir); } catch { return 'ölçülemedi'; }
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (!top.length) return 'doğrudan adlı import bulunamadı';
  return `${top.length} farklı ad, ${top.reduce((s, x) => s + x[1], 0)} import: ${top.slice(0, 12).map(([n, c]) => `\`${n}\`×${c}`).join(', ')}${top.length > 12 ? '…' : ''}`;
}

// npm 10 sabit etiketli git bağımlılığını kilit dosyasına işlemiyor (2026-09-15 ölçümü); uygulamadan önce durdur
function assertNpm11() {
  const major = Number(run('npm', ['--version']).trim().split('.')[0]);
  if (!(major >= 11)) throw new Error(`npm ${major} ile güncelleme yapılamaz; npm 11 gerekli (npm 10 git bağımlılığını kilit dosyasına işlemiyor)`);
}

function applyOne(repo, plan, pkgText, changelog) {
  const token = process.env.GH_TOKEN;
  if (!token) throw new Error('GH_TOKEN yok');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cekirdek-'));
  const url = `https://x-access-token:${token}@github.com/${repo}.git`;
  run('git', ['clone', '-q', '--depth', '20', url, dir]);
  run('git', ['switch', '-q', '-c', BRANCH], dir);

  const pkg = JSON.parse(pkgText);
  const section = pkg.dependencies && pkg.dependencies[P.PACKAGE] ? 'dependencies' : 'devDependencies';
  const oldSpec = pkg[section][P.PACKAGE];
  const newSpec = P.rewriteSpec(oldSpec, plan.to);
  const pkgPath = path.join(dir, 'package.json');
  const raw = fs.readFileSync(pkgPath, 'utf8');
  if (!raw.includes(`"${oldSpec}"`)) throw new Error('package.json içinde tanım metni bulunamadı');
  fs.writeFileSync(pkgPath, raw.replace(`"${oldSpec}"`, `"${newSpec}"`));

  run('npm', ['install', '--package-lock-only', '--ignore-scripts', '--no-audit', '--no-fund'], dir);
  const after = lockedVersion(fs.readFileSync(path.join(dir, 'package-lock.json'), 'utf8'));
  if (after !== plan.to) throw new Error(`kilit dosyası ${plan.to} olmadı (okunan: ${after})`);

  const usage = usageSummary(dir);
  let recordNote = '';
  const debtPath = path.join(dir, 'docs', 'teknik-borc.md');
  if (plan.major && fs.existsSync(debtPath)) {
    const archive = path.join(dir, 'docs', 'teknik-borc-arsiv.md');
    const texts = [fs.readFileSync(debtPath, 'utf8'), fs.existsSync(archive) ? fs.readFileSync(archive, 'utf8') : ''];
    const id = P.nextDebtId(texts);
    const record = P.majorDebtRecord({ id, from: plan.from, to: plan.to, date: new Date().toISOString().slice(0, 10), usage });
    fs.writeFileSync(debtPath, P.insertRecord(texts[0], record));
    recordNote = `\n\n**Ana sürüm geçişi:** kütüğe **${id} (P2)** kaydı bu PR'ın içinde eklendi; PR birleşince kütüğe girer.`;
  }

  run('git', ['add', '-A'], dir);
  run('git', ['-c', 'user.name=SNN Standartlar Görevlisi', '-c', 'user.email=sbocek@gmail.com', 'commit', '-q', '-m',
    `chore(deps): @snn/abacus-core ${plan.from} → ${plan.to}\n\nÇekirdek v${plan.to} yayını; otomatik güncelleme PR'ı (SNN-Standartlar/cekirdek).`], dir);
  run('git', ['push', '-q', '-u', 'origin', BRANCH], dir);

  const MAX = 50000;
  const log = changelog.length > MAX ? `${changelog.slice(0, MAX)}\n\n… (kısaltıldı; tamamı çekirdeğin CHANGELOG.md dosyasında)` : changelog;
  const body = [
    `Çekirdek **SNN-Abacus-Core v${plan.to}** yayınlandı. Bu PR projeyi **${plan.from} → ${plan.to}** sürümüne yükseltir; projenin kendi kontrolleri yeni sürümü bu PR'da sınar.`,
    '',
    `- Bağımlılık: \`${oldSpec}\` → \`${newSpec}\``,
    `- Çekirdek kullanımı (ölçüm): ${usage}`,
    plan.major ? '- ⚠ **Ana sürüm atlanıyor**: ad ya da davranış değişikliği olabilir. Aşağıdaki göç notlarını okuyun.' : '- Ana sürüm aynı: geriye dönük uyumlu olması beklenir.',
    recordNote,
    '',
    '**Otomatik birleştirme yok.** Kontroller yeşilse proje sahibinin onayıyla birleştirilir; kırmızıysa kırılan yer göç notlarına göre düzeltilir.',
    '',
    '<details><summary>Çekirdek değişiklik günlüğü (bu projenin atladığı sürümler)</summary>',
    '',
    log || '_Bu aralık için CHANGELOG bölümü bulunamadı._',
    '',
    '</details>',
    '',
    '🤖 SNN-Standartlar çekirdek yayılım görevlisi',
  ].join('\n');
  const bodyFile = path.join(dir, '..', `pr-govde-${Date.now()}.md`);
  fs.writeFileSync(bodyFile, body);
  const prUrl = gh(['pr', 'create', '-R', repo, '--head', BRANCH, '--title', `chore(deps): çekirdek @snn/abacus-core ${plan.from} → ${plan.to}`, '--body-file', bodyFile]).trim();
  fs.rmSync(dir, { recursive: true, force: true });
  fs.rmSync(bodyFile, { force: true });
  return prUrl;
}

function main() {
  if (!P.parse(TARGET)) throw new Error('Kullanım: --surum vX.Y.Z');
  const coreLog = fileAt(P.CORE_REPO, 'CHANGELOG.md', TARGET.startsWith('v') ? TARGET : `v${TARGET}`) || fileAt(P.CORE_REPO, 'CHANGELOG.md') || '';
  console.log(`${APPLY ? '▶ UYGULAMA' : '🔍 KURU ÇALIŞTIRMA (hiçbir şey değişmez)'} · çekirdek ${TARGET}${ONLY ? ` · yalnız ${ONLY}` : ''}`);
  if (APPLY) assertNpm11();
  let failed = 0;
  for (const repo of consumers()) {
    const pkgText = fileAt(repo, 'package.json');
    if (!pkgText) continue;
    let pkg;
    try { pkg = JSON.parse(pkgText); } catch { continue; }
    const spec = (pkg.dependencies || {})[P.PACKAGE] || (pkg.devDependencies || {})[P.PACKAGE];
    if (!spec) continue;
    const locked = lockedVersion(fileAt(repo, 'package-lock.json') || '');
    let hasOpenPr = false;
    try { hasOpenPr = ghJson(['pr', 'list', '-R', repo, '-s', 'open', '--head', BRANCH, '--json', 'number']).length > 0; } catch { /* okunamadı → açık PR yok say */ }
    const plan = P.decide({ locked, target: TARGET, hasOpenPr });
    if (plan.action !== 'pr') { console.log(`  • ${repo}: ${plan.action.toUpperCase()} — ${plan.reason}`); continue; }
    const label = `${repo}: ${plan.from} → ${plan.to}${plan.major ? ' (ANA SÜRÜM: kütük kaydı PR içinde)' : ''}`;
    if (!APPLY) { console.log(`  • PR açılacak: ${label}`); continue; }
    try {
      const changelog = P.changelogBetween(coreLog, plan.from, plan.to);
      console.log(`  • PR açıldı: ${label} → ${applyOne(repo, plan, pkgText, changelog)}`);
    } catch (e) {
      failed += 1;
      const msg = (e.stderr || e.message || '').toString().replace(/x-access-token:[^@]+@/g, 'x-access-token:***@').trim().split('\n').slice(-3).join(' | ');
      console.log(`  ✗ ${label} — HATA: ${msg}`);
    }
  }
  if (failed) process.exitCode = 1;
}

try {
  main();
} catch (e) {
  console.error(`çekirdek yayılım hatası: ${(e.stderr || e.message).toString().replace(/x-access-token:[^@]+@/g, 'x-access-token:***@').trim()}`);
  process.exit(1);
}
