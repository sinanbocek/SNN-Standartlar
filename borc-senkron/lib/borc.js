// Proje durumu ve teknik borç okuyucu. Standart: ~/.claude/standartlar/teknik-borc-standardi.md
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const PROJECTS_ROOT = process.env.CLAUDE_PROJECTS_ROOT || path.join(require('os').homedir(), 'Documents', 'SNN-AI-Asus-Z14');
const STANDARD_FILE = path.join('docs', 'teknik-borc.md');
const LEGACY_FILES = ['docs/tech-debt.md', 'docs/TECHNICAL_DEBT.md', 'TECH_DEBT.md', 'TECHNICAL_DEBT.md'];
const DAY_MS = 86400000;
// Özet ve oturum başı listelerinde gösterilmeyen klasörler (kullanıcı kararı, 2026-09-15: ihale-mcp test amaçlı)
const IGNORED_PROJECTS = new Set(['ihale-mcp']);

function git(cwd, args) {
  try {
    return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000 }).trim();
  } catch {
    return null;
  }
}

function parseDebts(text) {
  const items = [];
  const blocks = text.split(/^#{2,3} (?=TB-\d+)/m).slice(1);
  for (const block of blocks) {
    const head = block.match(/^(TB-\d+)\s*[—-]\s*(.+)$/m);
    if (!head) continue;
    const prio = block.match(/\*\*Öncelik:\*\*\s*(P[123])/);
    const issue = block.match(/\*\*Issue:\*\*\s*#(\d+)/);
    const hassas = /^- \*\*Hassas:\*\*[ \t]*Evet/im.test(block);
    const publicTitle = block.match(/^- \*\*Genel Başlık:\*\*[ \t]*([^\r\n]+)/m);
    const sade = block.match(/#### 🟢 Sade Anlatım\s*\n([\s\S]*?)(?=\n#### |\n---|$)/);
    items.push({
      id: head[1],
      title: head[2].trim(),
      priority: prio ? prio[1] : 'P?',
      issue: issue ? Number(issue[1]) : null,
      hassas,
      publicTitle: publicTitle ? publicTitle[1].trim() : null,
      sade: sade ? sade[1].trim() : '',
      text: block,
    });
  }
  return items;
}

// Kaydın bloğuna "- **Issue:** #N" yazar (varsa günceller). SAF: yeni metni döndürür.
function setIssueNumber(text, id, number) {
  const start = text.search(new RegExp(`^#{2,3} ${id}\\b`, 'm'));
  if (start < 0) throw new Error(`${id} kütükte bulunamadı`);
  const firstLineEnd = text.indexOf('\n', start);
  const bodyStart = firstLineEnd < 0 ? text.length : firstLineEnd + 1;
  const nextRel = text.slice(bodyStart).search(/^#{2,3} TB-\d+/m);
  const end = nextRel < 0 ? text.length : bodyStart + nextRel;
  const block = text.slice(start, end);
  let updated;
  if (/\*\*Issue:\*\*/.test(block)) {
    updated = block.replace(/(\*\*Issue:\*\*[ \t]*)#?\d*/, `$1#${number}`);
  } else if (/^- \*\*Öncelik:\*\*[^\r\n]*/m.test(block)) {
    const eol = block.includes('\r\n') ? '\r\n' : '\n';
    updated = block.replace(/^(- \*\*Öncelik:\*\*[^\r\n]*)/m, `$1${eol}- **Issue:** #${number}`);
  } else {
    throw new Error(`${id} içinde Öncelik satırı yok; geri yazım yapılamadı`);
  }
  return text.slice(0, start) + updated + text.slice(end);
}

// Arşivdeki kapanmış kayıt kimlikleri: yalnızca "- **Kapanış:**" (veya aksansız "Kapanis") satırlarındaki
// TB numaraları sayılır; açıklama satırlarındaki atıflar sayılmaz. Bir satırda birden çok kayıt olabilir.
function parseArchiveIds(text) {
  const ids = [];
  for (const line of text.match(/^- \*\*Kapan(ış|is):\*\*[^\n]*/gm) || []) {
    for (const m of line.matchAll(/TB-\d+/g)) ids.push(m[0]);
  }
  return [...new Set(ids)];
}

function readDebts(dir) {
  const file = path.join(dir, STANDARD_FILE);
  if (fs.existsSync(file)) {
    const items = parseDebts(fs.readFileSync(file, 'utf8'));
    const count = { P1: 0, P2: 0, P3: 0, 'P?': 0 };
    items.forEach((i) => { count[i.priority] += 1; });
    return { format: 'standart', items, count };
  }
  const legacy = LEGACY_FILES.find((f) => fs.existsSync(path.join(dir, f)));
  return { format: legacy ? `standart-disi (${legacy})` : 'yok', items: [], count: null };
}

function dirtyInfo(dir) {
  const out = git(dir, ['status', '--porcelain']);
  if (out === null || out === '') return { count: 0, ageDays: 0 };
  const lines = out.split('\n').filter(Boolean);
  let oldest = Date.now();
  for (const line of lines) {
    const rel = line.slice(3).replace(/^"|"$/g, '').split(' -> ').pop();
    try {
      const m = fs.statSync(path.join(dir, rel)).mtimeMs;
      if (m < oldest) oldest = m;
    } catch { /* silinmiş dosya */ }
  }
  return { count: lines.length, ageDays: Math.floor((Date.now() - oldest) / DAY_MS) };
}

function projectStatus(dir) {
  let version = null;
  try {
    version = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')).version || null;
  } catch { /* package.json yok */ }
  const last = git(dir, ['log', '-1', '--format=%cs|%s']);
  const [lastDate, lastMsg] = last ? last.split('|') : [null, null];
  return {
    name: path.basename(dir),
    dir,
    version,
    branch: git(dir, ['branch', '--show-current']),
    lastDate,
    lastMsg,
    dirty: dirtyInfo(dir),
    debts: readDebts(dir),
  };
}

function listProjects() {
  try {
    return fs.readdirSync(PROJECTS_ROOT, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !IGNORED_PROJECTS.has(d.name) && fs.existsSync(path.join(PROJECTS_ROOT, d.name, '.git')))
      .map((d) => path.join(PROJECTS_ROOT, d.name));
  } catch {
    return [];
  }
}

function findProjectRoot(cwd) {
  const top = git(cwd, ['rev-parse', '--show-toplevel']);
  return top ? path.resolve(top) : null;
}

function debtLabel(d) {
  if (!d.count) return d.format === 'yok' ? 'kütük yok' : d.format;
  const c = d.count;
  return `P1:${c.P1} P2:${c.P2} P3:${c.P3}` + (c['P?'] ? ` P?:${c['P?']}` : '');
}

module.exports = { PROJECTS_ROOT, projectStatus, listProjects, findProjectRoot, debtLabel, parseDebts, parseArchiveIds, setIssueNumber };
