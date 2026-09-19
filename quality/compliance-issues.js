// UYUM EKSIKLERI -> GitHub ISSUE (TB-003)
//
// NEDEN (2026-09-19 olcumu):
// Uyum olceri her projenin kendi eksigini oturum acilisinda gosteriyor. Ama o satir
// YALNIZ o projeye giren kisiye gorunur ve oturum kapaninca kaybolur; "yapildi mi?"
// kaydi tutulmaz. Proje sahibi 11 projenin durumunu tek yerde goremiyor.
//
// DUZELTME: eksik, ilgili deponun kendi issue listesine dusurulur. Boylece
//   - panodan hepsi birden gorunur,
//   - yapilana kadar DURUR,
//   - giderilince KENDILIGINDEN kapanir,
//   - ve ajan icin bir uyari degil, kutuktekilerle ayni yerde duran bir IS KALEMI olur.
//
// Not: "uyuyan proje eksigini gormez" gerekcesi 2026-09-19'da OLCULDU ve zayif cikti
// (en eski proje 3 gun once hareket etmisti). Asil gerekce gorunurluk ve kaliciliktir.
//
// Desen: debt-sync/lib/sync-plan.js ile ayni — SAF plan + ayri IO.
'use strict';

const LABEL = 'aile-uyum';
const MARK = 'UYUM';

// SAF: issue basligi. Kimlik basliga gomulur ki tekrar acilmasin.
const issueTitle = (gap) => `[${MARK}:${gap.id}] ${gap.title}`;

// SAF: baslitan olcut kimligi (eslesme icin)
const idFromTitle = (title) => (String(title || '').match(new RegExp(`^\\[${MARK}:([a-z0-9-]+)\\]`)) || [])[1] || null;

// SAF: issue govdesi. Ayrinti kuralda; burada NE YAPILACAGI yazar.
function issueBody(gap, ctx = {}) {
  const repo = ctx.standardsRepo || 'sinanbocek/SNN-Standartlar';
  return [
    `**Ölçüt:** \`${gap.id}\``,
    '',
    `**Durum:** ${gap.detail}`,
    '',
    `**Yapılacak:** ${gap.fix}`,
    '',
    '---',
    '',
    `Bu issue [${repo}](https://github.com/${repo}) tarafından **otomatik** açıldı ve`,
    'eksik giderilince **kendiliğinden kapanır**. Elle kapatmak yerine eksiği giderin;',
    'aksi hâlde bir sonraki turda yeniden açılır.',
    '',
    `Kural: [\`docs/uyum-olcumu.md\`](https://github.com/${repo}/blob/main/docs/uyum-olcumu.md)`,
  ].join('\n');
}

// SAF: acik eksikler + depodaki issue'lar -> yapilacak eylemler
//   gaps   : [{ id, title, detail, fix }]
//   issues : [{ number, title, state }]  (state: 'OPEN' | 'CLOSED')
//
// Elle kapatilan ama eksigi SUREN issue yeniden acilir: kutuk senkronundaki kuralin aynisi.
// Sebep: kapatmak eksigi gidermez; kapanis yalnizca olcumden gelir.
function plan({ gaps = [], issues = [] } = {}) {
  const actions = [];
  const open = new Map();
  for (const i of issues) {
    const id = idFromTitle(i.title);
    if (id) open.set(id, i);
  }
  const wanted = new Set(gaps.map((g) => g.id));

  for (const g of gaps) {
    const existing = open.get(g.id);
    if (!existing) { actions.push({ type: 'create', id: g.id, title: issueTitle(g), body: issueBody(g), labels: [LABEL] }); continue; }
    if (existing.state === 'CLOSED') { actions.push({ type: 'reopen', id: g.id, number: existing.number }); continue; }
    if (existing.title !== issueTitle(g)) actions.push({ type: 'update', id: g.id, number: existing.number, title: issueTitle(g) });
  }
  for (const [id, i] of open) {
    if (!wanted.has(id) && i.state === 'OPEN') actions.push({ type: 'close', id, number: i.number });
  }
  return actions;
}

// SAF: kuru calistirma raporu
function report(byProject) {
  const lines = [];
  let total = 0;
  for (const { project, actions, error } of byProject) {
    if (error) { lines.push(`  ✗ ${project}: ${error}`); continue; }
    if (!actions.length) { lines.push(`  ✓ ${project}: değişiklik yok`); continue; }
    total += actions.length;
    lines.push(`  ${project}:`);
    for (const a of actions) {
      if (a.type === 'create') lines.push(`     + issue AÇ: ${a.title}`);
      else if (a.type === 'close') lines.push(`     − issue KAPAT: #${a.number} (${a.id} giderilmiş)`);
      else if (a.type === 'reopen') lines.push(`     ↻ issue YENİDEN AÇ: #${a.number} (${a.id} sürüyor)`);
      else lines.push(`     ~ issue GÜNCELLE: #${a.number} → ${a.title}`);
    }
  }
  lines.unshift(`Toplam ${total} işlem:`);
  return lines.join('\n');
}

// ─── IO ─────────────────────────────────────────────────────────────────────

const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const gh = (args, opts = {}) => execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts }).trim();

// Depodaki uyum issue'lari (acik + kapali). Etiket yoksa gh bos liste doner.
function readIssues(repo) {
  const out = gh(['issue', 'list', '-R', repo, '--label', LABEL, '--state', 'all',
    '--limit', '100', '--json', 'number,title,state']);
  return JSON.parse(out || '[]').map((i) => ({ number: i.number, title: i.title, state: String(i.state).toUpperCase() }));
}

// Etiket yoksa acar. Varsa gh hata verir; yutulur (yarisma durumu da dahil).
function ensureLabel(repo) {
  try {
    gh(['label', 'create', LABEL, '-R', repo, '--color', 'BFD4F2',
      '--description', 'SNN aile standardı uyum eksiği (otomatik)']);
  } catch { /* zaten var */ }
}

function applyActions(repo, actions) {
  if (actions.some((a) => a.type === 'create')) ensureLabel(repo);
  for (const a of actions) {
    if (a.type === 'create') {
      gh(['issue', 'create', '-R', repo, '--title', a.title, '--body', a.body, '--label', LABEL]);
    } else if (a.type === 'close') {
      gh(['issue', 'close', String(a.number), '-R', repo, '--comment', 'Eksik giderildi; ölçüm artık temiz.']);
    } else if (a.type === 'reopen') {
      gh(['issue', 'reopen', String(a.number), '-R', repo, '--comment', 'Eksik sürüyor: ölçüm hâlâ bu eksiği görüyor.']);
    } else if (a.type === 'update') {
      gh(['issue', 'edit', String(a.number), '-R', repo, '--title', a.title]);
    }
  }
}

function run({ baseDir, apply = false }) {
  const compliance = require('./compliance.js');
  const projects = require('./measure-projects.js').readList();
  const rows = [];
  for (const p of projects) {
    const dir = path.join(baseDir, p.dir);
    if (!fs.existsSync(path.join(dir, '.git'))) { rows.push({ project: p.dir, error: 'klonlanamadı' }); continue; }
    try {
      const result = compliance.check(dir);
      if (result.excluded) { rows.push({ project: p.dir, actions: [] }); continue; }
      const actions = plan({ gaps: result.gaps, issues: readIssues(p.repo) });
      if (apply && actions.length) applyActions(p.repo, actions);
      rows.push({ project: p.dir, actions });
    } catch (e) {
      rows.push({ project: p.dir, error: (e.stderr || e.message || '').toString().split('\n')[0] });
    }
  }
  return rows;
}

function main() {
  const args = process.argv.slice(2);
  const baseDir = args.find((a) => !a.startsWith('--'));
  if (!baseDir) {
    console.error('Kullanım: node quality/compliance-issues.js <projeler-klasoru> [--uygula]');
    process.exit(1);
  }
  const apply = args.includes('--uygula');
  console.log(apply ? '⚙  UYGULANIYOR\n' : '🔍 KURU ÇALIŞTIRMA (hiçbir şey değişmez)\n');
  console.log(report(run({ baseDir, apply })));
  if (!apply) console.log('\nUygulamak için: --uygula');
}

if (require.main === module) main();

module.exports = { LABEL, MARK, issueTitle, idFromTitle, issueBody, plan, report, readIssues, run };
