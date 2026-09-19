// MAKINE kurulumu: ortak depodaki hooks/ klasorunu ~/.claude/hooks'a tasir ve
// settings.json'daki kanca kayitlarini gunceller.
//
// Kullanim:
//   node setup/setup-machine.js            -> KURU CALISTIRMA (hicbir sey degismez)
//   node setup/setup-machine.js --uygula   -> yedekler, sonra uygular
//
// NEDEN KOPYALAMA, NEDEN CANLI KOPYADAN CALISTIRMA DEGIL:
// 2026-09-15'te canli kopya bozulunca (dal degisikligi yuzunden bir fonksiyon kayboldu)
// tum projelerde oturum acilisi durdu. Kancalarin KENDISI de canlidan gelseydi, geri donus
// yolu da ayni anda kirilirdi. Kural akabilir; kurali calistiran sey akmamalidir.
//
// Bkz. docs/makine-kurulumu.md
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

const BACKUP_PREFIX = 'hooks-yedek-';

// ─── SAF: plan ──────────────────────────────────────────────────────────────

// Bir klasordeki tum dosyalari koke goreli yollar olarak dondurur.
function listFiles(root, base = root) {
  if (!fs.existsSync(root)) return [];
  const out = [];
  for (const e of fs.readdirSync(root, { withFileTypes: true })) {
    const p = path.join(root, e.name);
    if (e.isDirectory()) out.push(...listFiles(p, base));
    else out.push(path.relative(base, p).split(path.sep).join('/'));
  }
  return out;
}

// SAF: kaynak ve hedef dosya listelerinden ne yapilacagini cikarir.
// copy   : kaynakta olan her dosya (icerik farkli ya da hedefte yok)
// remove : hedefte olup kaynakta OLMAYAN dosyalar (yeniden adlandirma artiklari)
function planFiles(sourceFiles, targetFiles, sameContent = () => false) {
  const source = new Set(sourceFiles);
  return {
    copy: sourceFiles.filter((f) => !targetFiles.includes(f) || !sameContent(f)),
    remove: targetFiles.filter((f) => !source.has(f)),
  };
}

// SAF: settings.json icindeki kanca komut yollarini ortak depodaki dosya adlariyla karsilastirir.
// Donen: { missing: [...], stale: [{ from, to }] }
//   missing : ortak depoda olan ama settings.json'da kayitli OLMAYAN bekci
//   stale   : settings.json'da kayitli ama ortak depoda ARTIK OLMAYAN dosya (ad degismis)
function planSettings(settingsText, sourceFiles, registry = REGISTRY) {
  const missing = [];
  const stale = [];
  for (const { file, event } of registry) {
    if (!sourceFiles.includes(file)) continue;
    if (!settingsText.includes(file)) missing.push({ file, event });
  }
  for (const m of settingsText.matchAll(/hooks\/([A-Za-z0-9_.-]+\.js)/g)) {
    const file = m[1];
    if (sourceFiles.includes(file)) continue;
    const guess = RENAMES[file];
    stale.push({ from: file, to: guess && sourceFiles.includes(guess) ? guess : null });
  }
  // Yeniden adlandirmayla ZATEN gelecek olan dosya "eksik" sayilmaz: uygulama sonrasi
  // kayitli olacak. Ikisini birden raporlamak okuyani yanlis yonlendirir.
  const willArrive = new Set(stale.map((x) => x.to).filter(Boolean));
  return { missing: missing.filter((x) => !willArrive.has(x.file)), stale: dedupe(stale) };
}

const dedupe = (rows) => {
  const seen = new Set();
  return rows.filter((r) => (seen.has(r.from) ? false : seen.add(r.from)));
};

// Bilinen yeniden adlandirmalar (TB-001: kanca adlari Ingilizceye tasindi, 2026-09-19).
const RENAMES = {
  'borc-senkron.js': 'debt-sync.js',
  'borclar.js': 'debts.js',
  'stop-borc-gonderim.js': 'stop-debt-push.js',
  'stop-sema-belgesi.js': 'stop-schema-doc.js',
};

// settings.json'a kayitli olmasi beklenen bekciler.
const REGISTRY = [
  { file: 'session-start.js', event: 'SessionStart' },
  { file: 'guard-files.js', event: 'PreToolUse' },
  { file: 'guard-code-language.js', event: 'PreToolUse' },
  { file: 'guard-bash.js', event: 'PreToolUse' },
  { file: 'stop-gate.js', event: 'Stop' },
  { file: 'stop-debt-push.js', event: 'Stop' },
  { file: 'stop-schema-doc.js', event: 'Stop' },
];

// SAF: eski adlari yenileriyle degistirir. Yalniz hooks/ yolundaki adlara dokunur.
function rewriteSettings(settingsText, renames = RENAMES) {
  let out = settingsText;
  for (const [from, to] of Object.entries(renames)) {
    out = out.split(`hooks/${from}`).join(`hooks/${to}`);
  }
  return out;
}

// ─── IO ─────────────────────────────────────────────────────────────────────

// ─── Beceriler ──────────────────────────────────────────────────────────────
// Beceriler de ortak depoda durur ve buraya KOPYALANIR (kancalarla aynı gerekçe).
// DİKKAT: ~/.claude/skills altında BİZİM OLMAYAN beceriler de var (ör. `archify`,
// eklenti olarak gelen bir kısayol). Bu yüzden silme YALNIZ bizim beceri klasörlerimizin
// içinde yapılır; klasörün kendisi dışındakine dokunulmaz (2026-09-19).
function skillNames(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
  } catch { return []; }
}

function planSkills(sourceRoot, targetRoot, sameContent = () => false) {
  const copy = [];
  const remove = [];
  for (const name of skillNames(sourceRoot)) {
    const src = listFiles(path.join(sourceRoot, name));
    const dst = listFiles(path.join(targetRoot, name));
    for (const f of src) if (!dst.includes(f) || !sameContent(name, f)) copy.push(`${name}/${f}`);
    for (const f of dst) if (!src.includes(f)) remove.push(`${name}/${f}`);
  }
  return { copy, remove };
}

function measure({ sourceDir, targetDir, settingsFile, skillsSource, skillsTarget }) {
  const sourceFiles = listFiles(sourceDir);
  const targetFiles = listFiles(targetDir);
  const same = (f) => {
    try {
      return fs.readFileSync(path.join(sourceDir, f), 'utf8') === fs.readFileSync(path.join(targetDir, f), 'utf8');
    } catch { return false; }
  };
  const files = planFiles(sourceFiles, targetFiles, same);
  const sameSkill = (name, f) => {
    try {
      return fs.readFileSync(path.join(skillsSource, name, f), 'utf8') === fs.readFileSync(path.join(skillsTarget, name, f), 'utf8');
    } catch { return false; }
  };
  const skills = planSkills(skillsSource, skillsTarget, sameSkill);
  const settingsText = (() => { try { return fs.readFileSync(settingsFile, 'utf8'); } catch { return ''; } })();
  return { files, skills, settings: planSettings(settingsText, sourceFiles), sourceFiles, targetFiles, settingsText, skillsSource, skillsTarget };
}

function backup(targetDir) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dest = path.join(path.dirname(targetDir), BACKUP_PREFIX + stamp);
  fs.cpSync(targetDir, dest, { recursive: true });
  return dest;
}

function apply({ sourceDir, targetDir, settingsFile, skillsSource, skillsTarget }, plan) {
  const backupDir = fs.existsSync(targetDir) ? backup(targetDir) : null;
  for (const f of plan.files.copy) {
    const to = path.join(targetDir, f);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(path.join(sourceDir, f), to);
  }
  for (const f of plan.files.remove) {
    try { fs.rmSync(path.join(targetDir, f), { force: true }); } catch { /* yoksa sorun degil */ }
  }
  const skills = plan.skills || { copy: [], remove: [] };
  for (const rel of skills.copy) {
    const to = path.join(skillsTarget, rel);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(path.join(skillsSource, rel), to);
  }
  for (const rel of skills.remove) {
    try { fs.rmSync(path.join(skillsTarget, rel), { force: true }); } catch { /* yoksa sorun degil */ }
  }
  if (plan.settings.stale.length) {
    const next = rewriteSettings(plan.settingsText);
    JSON.parse(next); // bozuk JSON yazmaktansa patla
    fs.writeFileSync(settingsFile, next);
  }
  return { backupDir };
}

function report(plan) {
  // Rapor bir GÖSTERİM işlevidir: eksik alanla çağrılırsa çökmez.
  const skills = plan.skills || { copy: [], remove: [] };
  const lines = [];
  lines.push(`Kopyalanacak : ${plan.files.copy.length} dosya`);
  plan.files.copy.slice(0, 10).forEach((f) => lines.push(`   + ${f}`));
  if (plan.files.copy.length > 10) lines.push(`   ...ve ${plan.files.copy.length - 10} tane daha`);
  lines.push(`Silinecek    : ${plan.files.remove.length} dosya (kaynakta yok)`);
  plan.files.remove.forEach((f) => lines.push(`   - ${f}`));
  lines.push(`Beceri       : ${skills.copy.length} kopyalanacak, ${skills.remove.length} silinecek`);
  skills.copy.forEach((f) => lines.push(`   + skills/${f}`));
  skills.remove.forEach((f) => lines.push(`   - skills/${f}`));
  lines.push(`settings.json: ${plan.settings.stale.length} eski ad, ${plan.settings.missing.length} eksik kayit`);
  plan.settings.stale.forEach((s) => lines.push(`   ~ ${s.from} -> ${s.to || 'KARSILIGI YOK (elle bak)'}`));
  plan.settings.missing.forEach((s) => lines.push(`   ! ${s.file} (${s.event}) settings.json'da kayitli degil`));
  return lines.join('\n');
}

function main() {
  const home = os.homedir();
  const paths = {
    sourceDir: process.env.SNN_HOOKS_SOURCE || path.join(home, '.claude', 'standartlar-canli', 'hooks'),
    targetDir: process.env.SNN_HOOKS_TARGET || path.join(home, '.claude', 'hooks'),
    settingsFile: process.env.SNN_SETTINGS || path.join(home, '.claude', 'settings.json'),
    skillsSource: process.env.SNN_SKILLS_SOURCE || path.join(home, '.claude', 'standartlar-canli', 'skills'),
    skillsTarget: process.env.SNN_SKILLS_TARGET || path.join(home, '.claude', 'skills'),
  };
  if (!fs.existsSync(paths.sourceDir)) {
    console.error(`Kaynak yok: ${paths.sourceDir}\nCanli kopyayi indirin: docs/makine-kurulumu.md`);
    process.exit(1);
  }
  const plan = measure(paths);
  console.log(report(plan));
  const willApply = process.argv.includes('--uygula');
  if (!willApply) {
    console.log('\nKURU CALISTIRMA — hicbir sey degismedi. Uygulamak icin: --uygula');
    return;
  }
  const { backupDir } = apply(paths, plan);
  console.log(`\nUygulandi. Yedek: ${backupDir}`);
  console.log('Dogrulama: node "' + path.join(paths.targetDir, 'test', 'hooks.test.js') + '"');
}

if (require.main === module) main();

module.exports = { listFiles, planFiles, planSkills, skillNames, planSettings, rewriteSettings, measure, apply, report, RENAMES, REGISTRY, BACKUP_PREFIX };
