// Yeni projeyi SNN standart sistemine bağlar: kütük + arşiv + görevli akışları (tek PR), board, depo güvenlik ayarları.
// Kullanım: node setup/setup-project.js <proje-klasörü>             → ÖLÇÜM + PLAN (hiçbir şey değişmez)
//           node setup/setup-project.js <proje-klasörü> --uygula    → betiğin yapabildiği adımları uygular
// Proje sahibine kalanlar (anahtar, yönetici olmayan depolarda ayarlar) sonda bağlantılarıyla listelenir.
// Dosyalar GitHub üzerinden ayrı dala yazılır: yerel çalışma klasörüne (başka oturum çalışıyor olabilir) dokunulmaz.
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const K = require('./lib/setup-plan');

const ROOT = path.join(__dirname, '..');
const BRANCH = 'chore/snn-standart-kurulum';
const LEGACY = ['docs/tech-debt.md', 'docs/TECHNICAL_DEBT.md', 'TECH_DEBT.md', 'TECHNICAL_DEBT.md'];

const gh = (args) => execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 1e8, stdio: ['ignore', 'pipe', 'pipe'] });
const ghJson = (args) => JSON.parse(gh(args));
const tryGh = (args) => { try { return { ok: true, out: gh(args) }; } catch (e) { return { ok: false, err: (e.stderr || e.message).toString() }; } };
const exists = (repo, file, ref) => tryGh(['api', `repos/${repo}/contents/${file}?ref=${ref}`]).ok;
// Tüketici akış dosyası mı? Ortak depodaki aynı adlı dosya çağrılabilir görevlidir (workflow_call), projeyi taramaz
const callerWorkflow = (repo, file, ref) => {
  const r = tryGh(['api', `repos/${repo}/contents/${file}?ref=${ref}`]);
  return r.ok && !Buffer.from(JSON.parse(r.out).content, 'base64').toString('utf8').includes('workflow_call');
};

function readRemote(dir) {
  try {
    const url = execFileSync('git', ['-C', dir, 'remote', 'get-url', 'origin'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    const m = url.match(/github\.com[/:]([^/]+)\/(.+?)(\.git)?$/);
    return m ? { owner: m[1], name: m[2] } : null;
  } catch {
    return null;
  }
}

function measure(dir) {
  const remote = readRemote(dir);
  if (!remote) return { repo: null };
  const info = ghJson(['api', `repos/${remote.owner}/${remote.name}`]);
  const full = info.full_name;
  const def = info.default_branch;
  const admin = !!(info.permissions && info.permissions.admin);
  const debt = exists(full, 'docs/teknik-borc.md', def) ? 'standart'
    : (LEGACY.find((f) => exists(full, f, def)) ? `standart-disi (${LEGACY.find((f) => exists(full, f, def))})` : 'yok');
  const board = (() => {
    const r = tryGh(['project', 'list', '--owner', info.owner.login, '--format', 'json', '--limit', '100']);
    return r.ok ? (JSON.parse(r.out).projects || []).some((p) => p.title === K.BOARD_TITLE(info.name)) : false;
  })();
  const secretList = tryGh(['api', `repos/${full}/actions/secrets`]);
  const alerts = tryGh(['api', `repos/${full}/vulnerability-alerts`, '-i']);
  const fixes = tryGh(['api', `repos/${full}/automated-security-fixes`]);
  return {
    repo: { owner: info.owner.login, name: info.name, full, isPublic: info.visibility === 'public', isOrg: info.owner.type === 'Organization', defaultBranch: def },
    admin,
    debt,
    archive: exists(full, 'docs/teknik-borc-arsiv.md', def),
    workflows: {
      'teknik-borc.yml': callerWorkflow(full, '.github/workflows/teknik-borc.yml', def),
      // Ortak deponun kendisinde bu ad çağrılabilir görevlidir; üzerine proje örneği YAZILMAMALI. Ortak depo kendi PR'larını test.yml ile tarar.
      'anahtar-tarama.yml': /\/SNN-Standartlar$/i.test(full) ? true : callerWorkflow(full, '.github/workflows/anahtar-tarama.yml', def),
    },
    board,
    inFamily: familyState(full),
    secret: secretList.ok ? JSON.parse(secretList.out).secrets.some((s) => s.name === 'PROJECT_TOKEN') : null,
    deleteBranchOnMerge: admin ? !!info.delete_branch_on_merge : null,
    vulnAlerts: admin ? (alerts.ok && /HTTP\/[\d.]+ 204/.test(alerts.out)) : null,
    securityFixes: fixes.ok ? !!JSON.parse(fixes.out).enabled : null,
  };
}

// Ortak deponun kendi adı; aile listesi oraya PR ile eklenir.
const STANDARDS_REPO = 'sinanbocek/SNN-Standartlar';
const FAMILY_FILE = 'quality/data/family-projects.json';

// Liste ortak depodan okunur; okunamazsa null ("ölçemedim") döner — varsayım yapılmaz.
// Karar saf modülde (setup-plan.familyLookup); burada yalnız dosya okunur.
function familyState(full) {
  try {
    return K.familyLookup(fs.readFileSync(path.join(ROOT, FAMILY_FILE), 'utf8'), full);
  } catch { return null; }
}

// Ortak depoya "projeyi aile listesine ekle" PR'ı açar. Hedef proje PR'ından AYRI tutulur:
// farklı depolar, farklı inceleme. Döner: PR adresi ya da null (zaten listede).
function applyFamilyEntry(o, dir) {
  const current = ghJson(['api', `repos/${STANDARDS_REPO}/contents/${FAMILY_FILE}`]);
  const next = K.familyWithEntry(Buffer.from(current.content, 'base64').toString('utf8'), o.repo.full, dir);
  if (!next) return null;
  const branch = `chore/aile-listesi-${o.repo.name.toLowerCase()}`;
  const base = ghJson(['api', `repos/${STANDARDS_REPO}/git/ref/heads/main`]).object.sha;
  if (!tryGh(['api', `repos/${STANDARDS_REPO}/git/ref/heads/${branch}`]).ok) {
    gh(['api', `repos/${STANDARDS_REPO}/git/refs`, '-f', `ref=refs/heads/${branch}`, '-f', `sha=${base}`]);
  }
  const b64 = Buffer.from(next).toString('base64');
  const tmp = path.join(require('os').tmpdir(), `aile-${Date.now()}.b64`);
  fs.writeFileSync(tmp, b64);
  try {
    const onBranch = tryGh(['api', `repos/${STANDARDS_REPO}/contents/${FAMILY_FILE}?ref=${branch}`]);
    const shaArgs = onBranch.ok ? ['-f', `sha=${JSON.parse(onBranch.out).sha}`] : [];
    gh(['api', '-X', 'PUT', `repos/${STANDARDS_REPO}/contents/${FAMILY_FILE}`,
      '-f', `branch=${branch}`, '-F', `content=@${tmp}`,
      '-f', `message=chore(aile): ${o.repo.name} aile listesine eklendi\n\nSNN-Standartlar/setup/setup-project.js`, ...shaArgs]);
  } finally { fs.rmSync(tmp, { force: true }); }
  const open = tryGh(['pr', 'list', '-R', STANDARDS_REPO, '--head', branch, '-s', 'open', '--json', 'url', '--jq', '.[0].url']);
  if (open.ok && open.out.trim()) return open.out.trim();
  const body = [
    `\`${o.repo.full}\` aile listesine eklenir.`,
    '',
    'Bu liste **haftalık uyum issue\'larının** ve **toplu ölçümün** kaynağıdır; proje listede',
    'değilken kapılar ve oturum açılışı yine çalışır, ama eksikleri issue olarak düşmez.',
    '',
    '🤖 SNN-Standartlar proje kurulum betiği',
  ].join('\n');
  const bodyFile = path.join(require('os').tmpdir(), `aile-pr-${Date.now()}.md`);
  fs.writeFileSync(bodyFile, body);
  try {
    return gh(['pr', 'create', '-R', STANDARDS_REPO, '--base', 'main', '--head', branch,
      '--title', `chore(aile): ${o.repo.name} aile listesine eklensin`, '--body-file', bodyFile]).trim();
  } finally { fs.rmSync(bodyFile, { force: true }); }
}

function putFile(repo, file, content, message) {
  const b64 = Buffer.from(content.replace(/\r\n/g, '\n')).toString('base64');
  const tmp = path.join(require('os').tmpdir(), `kurulum-${Date.now()}.b64`);
  fs.writeFileSync(tmp, b64);
  try {
    // Dal önceki bir çalıştırmadan kaldıysa dosya dalda zaten olabilir: aynı içerikse atla, farklıysa sha ile güncelle
    const onBranch = tryGh(['api', `repos/${repo}/contents/${file}?ref=${BRANCH}`]);
    const shaArgs = [];
    if (onBranch.ok) {
      const cur = JSON.parse(onBranch.out);
      if (cur.content.replace(/\s/g, '') === b64) return;
      shaArgs.push('-f', `sha=${cur.sha}`);
    }
    gh(['api', '-X', 'PUT', `repos/${repo}/contents/${file}`, '-f', `branch=${BRANCH}`, '-F', `content=@${tmp}`, '-f', `message=${message}`, ...shaArgs]);
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}

function applyFiles(o, steps) {
  const want = (id) => steps.some((s) => s.id === id && s.who === 'agent' && s.status === 'toAdd');
  const files = [];
  if (want('kutuk')) files.push(['docs/teknik-borc.md', K.debtFileTemplate(), 'docs(borc): standart teknik borc kutugu']);
  if (want('arsiv')) files.push(['docs/teknik-borc-arsiv.md', K.archiveFileTemplate(), 'docs(borc): standart teknik borc arsivi']);
  if (want('teknik-borc-akisi')) files.push(['.github/workflows/teknik-borc.yml', fs.readFileSync(path.join(ROOT, 'ornek', 'teknik-borc.yml'), 'utf8'), 'ci(borc): kutuk -> issue ve board senkron gorevlisi']);
  if (want('anahtar-tarama-akisi')) files.push(['.github/workflows/anahtar-tarama.yml', fs.readFileSync(path.join(ROOT, 'ornek', 'anahtar-tarama.yml'), 'utf8'), 'ci(guvenlik): PR\'da gizli anahtar taramasi']);
  if (!files.length) return null;
  const repo = o.repo.full;
  const sha = ghJson(['api', `repos/${repo}/git/ref/heads/${o.repo.defaultBranch}`]).object.sha;
  if (!tryGh(['api', `repos/${repo}/git/ref/heads/${BRANCH}`]).ok) gh(['api', `repos/${repo}/git/refs`, '-f', `ref=refs/heads/${BRANCH}`, '-f', `sha=${sha}`]);
  for (const [file, content, msg] of files) putFile(repo, file, content, `${msg}\n\nSNN-Standartlar/setup/setup-project.js`);
  const body = [
    'Projeyi SNN standart sistemine bağlar (SNN-Standartlar `setup/setup-project.js`):',
    '',
    ...files.map(([f]) => `- \`${f}\``),
    '',
    '- **Kütük** (`docs/teknik-borc.md`): açık teknik borçların tek kaynağı; kayıt biçimi `~/.claude/standartlar/teknik-borc-standardi.md`.',
    '- **Senkron görevlisi**: kütük main\'e ulaşınca, her gün ve elle tetiklenince issue + board günceller (kütüğe yazmaz).',
    '- **Anahtar taraması**: her PR\'da eklenen satırlarda gizli anahtar arar.',
    '',
    'Otomatik birleştirme yok.',
    '',
    '🤖 SNN-Standartlar proje kurulum betiği',
  ].join('\n');
  const bodyFile = path.join(require('os').tmpdir(), `kurulum-pr-${Date.now()}.md`);
  fs.writeFileSync(bodyFile, body);
  const existing = tryGh(['pr', 'list', '-R', repo, '--head', BRANCH, '-s', 'open', '--json', 'url', '--jq', '.[0].url']);
  const url = existing.ok && existing.out.trim() ? existing.out.trim()
    : gh(['pr', 'create', '-R', repo, '--base', o.repo.defaultBranch, '--head', BRANCH, '--title', 'chore: SNN standart sistemine bağlan (kütük, senkron, anahtar taraması)', '--body-file', bodyFile]).trim();
  fs.rmSync(bodyFile, { force: true });
  return url;
}

function applyBoard(o) {
  const { owner, name, full, isOrg } = o.repo;
  const number = JSON.parse(gh(['project', 'create', '--owner', owner, '--title', K.BOARD_TITLE(name), '--format', 'json'])).number;
  gh(['project', 'link', String(number), '--owner', owner, '--repo', full]);
  const scope = isOrg ? 'organization' : 'user';
  const q = `query{ ${scope}(login:"${owner}"){ projectV2(number:${number}){ items(first:1){ totalCount } field(name:"Status"){ ... on ProjectV2SingleSelectField { id options{ name color } } } } } }`;
  const p = ghJson(['api', 'graphql', '-f', `query=${q}`]).data[scope].projectV2;
  if (p.items.totalCount) throw new Error('board boş değil; sütunlar değiştirilmedi');
  // Durum seçenekleri Türkçeleşir. Not: adlar değişince GitHub board'un 5 otomatik kuralını kapatır; senkron durumu kendisi ayarlar.
  const map = { Todo: ['Açık', 'GRAY', 'Henüz başlanmadı'], 'In Progress': ['Devam', 'YELLOW', 'Üzerinde çalışılıyor'], Done: ['Kapandı', 'GREEN', 'Kütükte kapatıldı, arşivde'] };
  const opts = p.field.options.map((x) => { const [n, c, d] = map[x.name] || [x.name, x.color, '']; return `{name:${JSON.stringify(n)},color:${c},description:${JSON.stringify(d)}}`; }).join(',');
  gh(['api', 'graphql', '-f', `query=mutation{ updateProjectV2Field(input:{fieldId:"${p.field.id}", singleSelectOptions:[${opts}]}){ projectV2Field{ ... on ProjectV2SingleSelectField { name } } } }`]);
  return number;
}

function main() {
  const dir = path.resolve(process.argv[2] || process.cwd());
  const APPLY = process.argv.includes('--uygula');
  const o = measure(dir);
  const steps = K.plan(o);
  const icon = { present: '✅', toAdd: '➕', missing: '⚠', decide: '❓', unmeasured: '❔' };
  console.log(`${APPLY ? '▶ UYGULAMA' : '🔍 ÖLÇÜM + PLAN (hiçbir şey değişmez)'} · ${o.repo ? `${o.repo.full} (${o.repo.isPublic ? 'herkese açık' : 'gizli'})` : path.basename(dir)}`);
  steps.forEach((s) => console.log(`  ${icon[s.status] || '•'} [${s.who === 'agent' ? 'betik' : 'SEN  '}] ${s.id}: ${s.why}`));
  if (!APPLY) {
    const n = K.pending(steps).length;
    console.log(n ? `\nBetiğin yapacağı ${n} adım var. Uygulamak için: --uygula` : '\nBetiğin yapacağı adım yok.');
  } else {
    const done = [];
    const failed = [];
    const want = (id) => steps.some((s) => s.id === id && s.who === 'agent' && s.status === 'toAdd');
    const attempt = (label, fn) => { try { const r = fn(); done.push(`${label}${r ? `: ${r}` : ''}`); } catch (e) { failed.push(`${label}: ${(e.stderr || e.message).toString().trim().split('\n')[0]}`); } };
    attempt('dosyalar (PR)', () => applyFiles(o, steps));
    if (want('board')) attempt('board', () => `#${applyBoard(o)}`);
    if (want('aile-listesi')) attempt('aile listesi (PR)', () => applyFamilyEntry(o, path.basename(dir)) || 'zaten listede');
    if (want('dal-silme')) attempt('dal silme ayarı', () => { gh(['api', '-X', 'PATCH', `repos/${o.repo.full}`, '-F', 'delete_branch_on_merge=true']); });
    if (want('guvenlik-uyarilari')) attempt('güvenlik uyarıları', () => { gh(['api', '-X', 'PUT', `repos/${o.repo.full}/vulnerability-alerts`]); });
    if (want('guvenlik-duzeltme')) attempt('güvenlik düzeltme PR\'ları', () => { gh(['api', '-X', 'PUT', `repos/${o.repo.full}/automated-security-fixes`]); });
    console.log('\nYapılanlar:');
    done.forEach((d) => console.log(`  ✓ ${d}`));
    failed.forEach((f) => console.log(`  ✗ ${f}`));
    if (failed.length) process.exitCode = 1;
  }
  const tasks = K.userTasks(steps);
  if (tasks.length) {
    console.log('\nProje sahibine kalanlar:');
    tasks.forEach((t) => console.log(`  • ${t.why}`));
  }
}

try {
  main();
} catch (e) {
  console.error(`proje kurulum hatası: ${(e.stderr || e.message).toString().trim()}`);
  process.exit(1);
}
