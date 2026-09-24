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
const { execFileSync } = require('child_process');

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
  { file: 'stop-shell-command.js', event: 'Stop' },
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

// SAF: birden çok kaynaktan beceri planı.
//
// NEDEN LİSTE (SNN-Abacus-Core bildirimi #59, 2026-09-19): bir beceri, atıf yaptığı deponun
// sürümüyle birlikte değişmelidir. `abacus-talep` çekirdeğin kendi defterine, `AI-RULES §4.1`
// ayıracına ve issue şablonuna atıf yapıyor; SNN-Standartlar'da dursaydı iki depoda iki hızda
// ilerleyen tek bir metin olurdu. Elle kopyalamanın bedeli bu ailede ölçüldü: `borclar` ve
// `proje-kur` sürümsüz kaldıkları için sessizce bozulmuştu.
//
// ÇAKIŞMA SESSİZCE ÇÖZÜLMEZ. Aynı beceri adı iki kaynakta varsa plan `conflicts` döner ve
// uygulama durur. "Hangisi kazanır" sorusunun sessiz bir cevabı, yanlış becerinin aylarca
// kurulu kalması demektir.
//
// sources: [{ name, dir }] — ilk sıradaki canlı kopyadır.
function planSkills(sources, targetRoot, sameContent = () => false) {
  const list = Array.isArray(sources) ? sources : [{ name: 'canli-kopya', dir: sources }];
  const copy = [];
  const remove = [];
  const conflicts = [];
  const owner = new Map(); // beceri adı → onu veren kaynak

  for (const source of list) {
    for (const name of skillNames(source.dir)) {
      if (owner.has(name)) {
        conflicts.push({ skill: name, sources: [owner.get(name).name, source.name] });
        continue;
      }
      owner.set(name, source);
      const src = listFiles(path.join(source.dir, name));
      const dst = listFiles(path.join(targetRoot, name));
      for (const f of src) if (!dst.includes(f) || !sameContent(source, name, f)) copy.push({ source, rel: `${name}/${f}` });
      for (const f of dst) if (!src.includes(f)) remove.push(`${name}/${f}`);
    }
  }
  return { copy, remove, conflicts, owner };
}

// EK beceri kaynakları. Canlı kopya yalnız SNN-Standartlar içindir; ek kaynaklar YEREL
// çalışma kopyasından okunur. Yerel kopya başka dalda olabilir — bu yüzden dal adı yazdırılır
// ("Yerel klasör gerçeği göstermez" dersi, CLAUDE.md).
function extraSkillSources(projectsRoot = path.join(__dirname, '..', '..')) {
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'skill-sources.json'), 'utf8'));
  } catch { return []; }
  return (raw.sources || [])
    .map((s) => ({ name: s.name, dir: path.join(projectsRoot, s.dir) }))
    .filter((s) => fs.existsSync(s.dir));
}

// Ek kaynağın hangi dalda olduğunu söyler (rapor için; ölçüm değil, uyarı).
function sourceBranch(dir) {
  try {
    return execFileSync('git', ['-C', dir, 'rev-parse', '--abbrev-ref', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch { return null; }
}

// ─── Kullanıcı talimatı (~/.claude/CLAUDE.md) ───────────────────────────────
// İletişim kuralları (standartlar/iletisim-standardi.md) her projedeki her oturuma ulaşmalı;
// Claude Code ~/.claude/CLAUDE.md dosyasını her oturumda okur. Kaynak, standarttaki işaretli
// bölümdür (2026-09-24: proje sahibi 6 günde 5 kez "anlamadım" dedi).
// Becerilerdeki kuralın aynısı: BİZİM OLMAYAN dosyaya dokunulmaz. İlk satırdaki işaret yoksa
// dosya proje sahibinindir; üzerine yazılmaz, birleştirme ona bırakılır.
const INSTRUCTIONS_BEGIN = '<!-- kullanici-talimati:basla -->';
const INSTRUCTIONS_END = '<!-- kullanici-talimati:bitir -->';
const MANAGED_MARK = '<!-- SNN-Standartlar yönetir: standartlar/iletisim-standardi.md · elle değiştirme, setup-machine.js yeniden yazar -->';

// SAF: standart metni → kullanıcı talimatı (işaretli bölüm yoksa null)
function instructionsFrom(standardText) {
  const text = String(standardText || '').replace(/\r\n/g, '\n');
  const a = text.indexOf(INSTRUCTIONS_BEGIN);
  const b = text.indexOf(INSTRUCTIONS_END);
  if (a < 0 || b < a) return null;
  return `${MANAGED_MARK}\n\n${text.slice(a + INSTRUCTIONS_BEGIN.length, b).trim()}\n`;
}

// SAF: istenen içerik + hedefin durumu → eylem.
// current: { state: 'var', text } | { state: 'yok' } | { state: 'okunamadi' } (olcum-standardi.md, Kural 3)
function planInstructions(wanted, current) {
  if (wanted === null) return { action: 'no-source' };
  if (current.state === 'okunamadi') return { action: 'unreadable' };
  if (current.state === 'yok') return { action: 'create', content: wanted };
  const text = current.text.replace(/\r\n/g, '\n');
  if (!text.startsWith(MANAGED_MARK)) return { action: 'conflict' };
  return text === wanted ? { action: 'same' } : { action: 'update', content: wanted };
}

function readState(file) {
  try { return { state: 'var', text: fs.readFileSync(file, 'utf8') }; } catch (e) {
    return e && e.code === 'ENOENT' ? { state: 'yok' } : { state: 'okunamadi' };
  }
}

function measure({ sourceDir, targetDir, settingsFile, skillsSource, skillsTarget, instructionsSource, instructionsTarget }) {
  const sourceFiles = listFiles(sourceDir);
  const targetFiles = listFiles(targetDir);
  const same = (f) => {
    try {
      return fs.readFileSync(path.join(sourceDir, f), 'utf8') === fs.readFileSync(path.join(targetDir, f), 'utf8');
    } catch { return false; }
  };
  const files = planFiles(sourceFiles, targetFiles, same);
  const sameSkill = (source, name, f) => {
    try {
      return fs.readFileSync(path.join(source.dir, name, f), 'utf8') === fs.readFileSync(path.join(skillsTarget, name, f), 'utf8');
    } catch { return false; }
  };
  const sources = [{ name: 'SNN-Standartlar (canlı kopya)', dir: skillsSource }, ...extraSkillSources()];
  const skills = planSkills(sources, skillsTarget, sameSkill);
  const settingsText = (() => { try { return fs.readFileSync(settingsFile, 'utf8'); } catch { return ''; } })();
  const source = instructionsSource ? readState(instructionsSource) : { state: 'yok' };
  const instructions = instructionsTarget
    ? planInstructions(source.state === 'var' ? instructionsFrom(source.text) : null, readState(instructionsTarget))
    : { action: 'no-source' };
  return { files, skills, settings: planSettings(settingsText, sourceFiles), instructions, sourceFiles, targetFiles, settingsText, skillsSource, skillsTarget };
}

function backup(targetDir) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dest = path.join(path.dirname(targetDir), BACKUP_PREFIX + stamp);
  fs.cpSync(targetDir, dest, { recursive: true });
  return dest;
}

function apply({ sourceDir, targetDir, settingsFile, skillsSource, skillsTarget, instructionsTarget }, plan) {
  // ÇAKIŞMA VARSA HİÇBİR ŞEY UYGULANMAZ. Yanlış becerinin kurulması, hiç kurulmamasından
  // daha pahalıdır: yanlış olan sessizce çalışır (SNN-Abacus-Core bildirimi #59).
  if (plan.skills && plan.skills.conflicts && plan.skills.conflicts.length) {
    const rows = plan.skills.conflicts.map((c) => `  "${c.skill}" — ${c.sources.join(' ve ')}`);
    throw new Error([
      'Beceri adı çakışması var; hiçbir şey uygulanmadı:',
      ...rows,
      'Aynı ad iki kaynakta duramaz; biri yeniden adlandırılmalı.',
    ].join('\n'));
  }
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
  for (const item of skills.copy) {
    const to = path.join(skillsTarget, item.rel);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(path.join(item.source.dir, item.rel), to);
  }
  for (const rel of skills.remove) {
    try { fs.rmSync(path.join(skillsTarget, rel), { force: true }); } catch { /* yoksa sorun degil */ }
  }
  if (plan.settings.stale.length) {
    const next = rewriteSettings(plan.settingsText);
    JSON.parse(next); // bozuk JSON yazmaktansa patla
    fs.writeFileSync(settingsFile, next);
  }
  // Yalnız oluşturma ve güncelleme yazılır; çakışma ve okunamama durumunda dosyaya dokunulmaz.
  const ins = plan.instructions || { action: 'no-source' };
  if (instructionsTarget && (ins.action === 'create' || ins.action === 'update')) {
    if (ins.action === 'update' && backupDir) fs.copyFileSync(instructionsTarget, path.join(backupDir, 'CLAUDE.md.yedek'));
    fs.mkdirSync(path.dirname(instructionsTarget), { recursive: true });
    fs.writeFileSync(instructionsTarget, ins.content);
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
  skills.copy.forEach((i) => lines.push(`   + skills/${i.rel}   (${i.source.name})`));
  skills.remove.forEach((f) => lines.push(`   - skills/${f}`));
  (skills.conflicts || []).forEach((c) => lines.push(`   ✗ ÇAKIŞMA: "${c.skill}" iki kaynakta var — ${c.sources.join(' ve ')}`));
  lines.push(`settings.json: ${plan.settings.stale.length} eski ad, ${plan.settings.missing.length} eksik kayit`);
  plan.settings.stale.forEach((s) => lines.push(`   ~ ${s.from} -> ${s.to || 'KARSILIGI YOK (elle bak)'}`));
  plan.settings.missing.forEach((s) => lines.push(`   ! ${s.file} (${s.event}) settings.json'da kayitli degil`));
  const INSTRUCTION_STATUS = {
    create: 'oluşturulacak',
    update: 'güncellenecek',
    same: 'güncel',
    conflict: '✗ senin kendi dosyan var, dokunulmadı. standartlar/iletisim-standardi.md içindeki işaretli bölümü elle ekle',
    unreadable: '? okunamadı, dokunulmadı',
    'no-source': 'kaynak yok (standartlar/iletisim-standardi.md işaretli bölüm)',
  };
  lines.push(`Kullanıcı talimatı (~/.claude/CLAUDE.md): ${INSTRUCTION_STATUS[(plan.instructions || { action: 'no-source' }).action]}`);
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
    instructionsSource: process.env.SNN_INSTRUCTIONS_SOURCE || path.join(home, '.claude', 'standartlar-canli', 'standartlar', 'iletisim-standardi.md'),
    instructionsTarget: process.env.SNN_INSTRUCTIONS_TARGET || path.join(home, '.claude', 'CLAUDE.md'),
  };
  if (!fs.existsSync(paths.sourceDir)) {
    console.error(`Kaynak yok: ${paths.sourceDir}\nCanli kopyayi indirin: docs/makine-kurulumu.md`);
    process.exit(1);
  }
  const plan = measure(paths);
  console.log(report(plan));
  for (const source of extraSkillSources()) {
    const branch = sourceBranch(source.dir);
    console.log(`Ek beceri kaynagi: ${source.name}${branch ? ` (dal: ${branch})` : ''} — YEREL kopyadan okunur`);
  }
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

module.exports = { listFiles, planFiles, planSkills, skillNames, extraSkillSources, planSettings, rewriteSettings, measure, apply, report, instructionsFrom, planInstructions, RENAMES, REGISTRY, BACKUP_PREFIX, INSTRUCTIONS_BEGIN, INSTRUCTIONS_END, MANAGED_MARK };
