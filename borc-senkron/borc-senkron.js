// Kütük → GitHub Issue (+ varsa board) senkronu.
// Kullanım: node borc-senkron.js <proje-klasörü>                 → KURU ÇALIŞTIRMA (hiçbir şey değiştirmez)
//           node borc-senkron.js <proje-klasörü> --uygula        → GitHub'a yazar, issue numaralarını kütüğe geri yazar
//           node borc-senkron.js <proje-klasörü> --uygula --ci   → GitHub Actions: kütüğe HİÇ yazmaz
// Anahtarlar: GH_TOKEN (issue/etiket; Actions'ta github.token) · PROJECT_TOKEN (yalnız board; kişisel hesap
// board'larına github.token yazamaz). Yerelde ikisi de yoksa gh oturumu kullanılır.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { parseDebts, parseArchiveIds, setIssueNumber } = require('./lib/borc');
const { plan } = require('./lib/senkron-plan');
const kota = require('./lib/kota');

const OPEN_FILE = path.join('docs', 'teknik-borc.md');
const ARCHIVE_FILE = path.join('docs', 'teknik-borc-arsiv.md');
const ISSUE_LIMIT = '500';
const boardTitle = (repoName) => `${repoName} · Teknik Borç`;

const CI = process.argv.includes('--ci');

// Board çağrıları PROJECT_TOKEN ile, geri kalanı GH_TOKEN / gh oturumu ile
function gh(args, { project = false } = {}) {
  const env = project && process.env.PROJECT_TOKEN ? { ...process.env, GH_TOKEN: process.env.PROJECT_TOKEN } : process.env;
  return execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env }).trim();
}
const ghp = (args) => gh(args, { project: true });

function readRepo(dir) {
  const url = execFileSync('git', ['-C', dir, 'remote', 'get-url', 'origin'], { encoding: 'utf8' }).trim();
  const m = url.match(/github\.com[/:]([^/]+)\/(.+?)(\.git)?$/);
  if (!m) throw new Error(`GitHub deposu çözülemedi: ${url}`);
  const info = JSON.parse(gh(['repo', 'view', `${m[1]}/${m[2]}`, '--json', 'visibility,defaultBranchRef,url']));
  return { owner: m[1], name: m[2], full: `${m[1]}/${m[2]}`, isPublic: info.visibility === 'PUBLIC', branch: info.defaultBranchRef.name, url: info.url };
}

// Board'daki kart durumunu senkron kendisi ayarlar; GitHub'ın otomatik kurallarına güvenilmez
// (2026-09-15 ölçümü: durum seçeneklerinin adı değişince GitHub 5 kuralı kendiliğinden kapattı).
const BOARD_STATUS = { open: 'Açık', closed: 'Kapandı' };

function findBoard(repo) {
  // Actions'ta board anahtarı yoksa board bilinçli atlanır (issue senkronu yine çalışır); bu durum uyarı olarak yazılır.
  if (CI && !process.env.PROJECT_TOKEN) return { skipped: 'PROJECT_TOKEN tanımlı değil — board atlandı, yalnız issue senkronlandı' };
  // Hata "board yok" diye yutulmaz: yoksa senkron eksik kartları görmeden "senkron" der (2026-09-15 ölçümü)
  const list = JSON.parse(ghp(['project', 'list', '--owner', repo.owner, '--format', 'json', '--limit', '100']));
  const found = (list.projects || []).find((p) => p.title === boardTitle(repo.name));
  if (!found) return null;
  const fields = JSON.parse(ghp(['project', 'field-list', String(found.number), '--owner', repo.owner, '--format', 'json'])).fields;
  const status = fields.find((f) => f.name === 'Status');
  const option = (name) => (status && status.options.find((o) => o.name === name) || {}).id || null;
  return {
    number: found.number,
    id: found.id,
    statusFieldId: status ? status.id : null,
    optionIds: { open: option(BOARD_STATUS.open), closed: option(BOARD_STATUS.closed) },
  };
}

// GitHub'ın art arda içerik oluşturma koruması (2026-09-15: 42. issue'dan sonra takıldı) için istekler arası bekleme
const CREATE_PAUSE_MS = 1500;
const pause = () => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, CREATE_PAUSE_MS);

// Board kartları tur başında BİR KEZ okunur ve bellekte tutulur. Eskiden her kart için tüm board yeniden
// okunuyordu; ilk toplu doldurmada saatlik istek hakkını bitiriyordu (2026-09-15 ölçümü).
// board.items: issue numarası → { id, status }
function loadBoardItems(repo, board) {
  const items = JSON.parse(ghp(['project', 'item-list', String(board.number), '--owner', repo.owner, '--format', 'json', '--limit', '1000'])).items;
  board.items = new Map(items.filter((i) => i.content && i.content.repository === repo.full)
    .map((i) => [i.content.number, { id: i.id, status: i.status || null }]));
}

// Issue'su olan ama board'da kartı olmayan YA DA kartı olup durumu boş kalan kayıtlar
// (2026-09-15: hız sınırında kart eklendi, durum ayarı düştü → "var ama durumsuz" kart)
// issueOf: kaydın issue numarası — kütükteki "Issue: #N" satırı yoksa başlıktaki [TB-xxx] eşleşmesinden (--ci modunda kütüğe yazılmaz)
function missingOnBoard(board, debts, issueOf) {
  return debts
    .map((d) => ({ ...d, issue: issueOf(d) }))
    .filter((d) => d.issue && (!board.items.has(d.issue) || !board.items.get(d.issue).status))
    .map((d) => ({ ...d, boardReason: board.items.has(d.issue) ? 'kart var, durum boş' : 'issue var, kart yok' }));
}

function setBoardStatus(board, item, key) {
  if (!board.statusFieldId || !board.optionIds[key]) return `board durumu "${BOARD_STATUS[key]}" bulunamadı`;
  if (item.status === BOARD_STATUS[key]) return `board: ${BOARD_STATUS[key]}`;
  ghp(['project', 'item-edit', '--id', item.id, '--project-id', board.id, '--field-id', board.statusFieldId, '--single-select-option-id', board.optionIds[key]]);
  item.status = BOARD_STATUS[key];
  return `board: ${BOARD_STATUS[key]}`;
}

function ensureOnBoard(repo, board, issueNumber, key) {
  if (!board || board.skipped) return '';
  let item = board.items.get(issueNumber);
  if (!item) {
    const url = `${repo.url}/issues/${issueNumber}`;
    item = { id: JSON.parse(ghp(['project', 'item-add', String(board.number), '--owner', repo.owner, '--url', url, '--format', 'json'])).id, status: null };
    board.items.set(issueNumber, item);
  }
  return ` (${setBoardStatus(board, item, key)})`;
}

// En düşük kalan GraphQL hakkı (issue anahtarı ve board anahtarı ayrı ayrı ölçülür). rate_limit sorgusu hak harcamaz.
function measureBudget() {
  const read = (project) => {
    try {
      return JSON.parse(gh(['api', 'rate_limit', '--jq', '.resources.graphql'], { project }));
    } catch {
      return null;
    }
  };
  const all = [read(false), process.env.PROJECT_TOKEN ? read(true) : null].filter(Boolean);
  if (!all.length) return { remaining: null, resetAt: null };
  const low = all.reduce((a, b) => (b.remaining < a.remaining ? b : a));
  return { remaining: low.remaining, resetAt: low.reset * 1000 };
}

function writeBack(file, id, number) {
  fs.writeFileSync(file, setIssueNumber(fs.readFileSync(file, 'utf8'), id, number));
}

function describe(a) {
  switch (a.type) {
    case 'label': return `etiket oluştur: ${a.label.name}`;
    case 'create': return `issue AÇ: ${a.title}  [${a.labels.join(', ')}]`;
    case 'update': return `issue #${a.number} güncelle: ${a.title}${a.addLabels.length ? ` +${a.addLabels}` : ''}${a.removeLabels.length ? ` -${a.removeLabels}` : ''}`;
    case 'close': return `issue #${a.number} KAPAT (${a.id} arşivde)`;
    case 'reopen': return `issue #${a.number} yeniden aç (${a.id} kütükte açık)`;
    case 'writeback': return `kütüğe yaz: ${a.id} → Issue #${a.number}`;
    default: return JSON.stringify(a);
  }
}

function apply(a, repo, openFile, board) {
  const R = ['-R', repo.full];
  if (a.type === 'label') {
    gh(['label', 'create', a.label.name, ...R, '--color', a.label.color, '--description', a.label.description]);
  } else if (a.type === 'create') {
    const bodyFile = path.join(os.tmpdir(), `borc-${a.id}.md`);
    fs.writeFileSync(bodyFile, a.body);
    const url = gh(['issue', 'create', ...R, '--title', a.title, '--body-file', bodyFile, ...a.labels.flatMap((l) => ['--label', l])]);
    const number = Number(url.split('/').pop());
    a.createdNumber = number;
    if (!CI) writeBack(openFile, a.id, number);
    const boardNote = ensureOnBoard(repo, board, number, 'open');
    pause();
    return `→ #${number}${boardNote}`;
  } else if (a.type === 'update') {
    gh(['issue', 'edit', String(a.number), ...R, '--title', a.title,
      ...a.addLabels.flatMap((l) => ['--add-label', l]), ...a.removeLabels.flatMap((l) => ['--remove-label', l])]);
  } else if (a.type === 'close') {
    gh(['issue', 'close', String(a.number), ...R, '--reason', 'completed', '--comment', `${a.id} kütükte kapatıldı ve arşive taşındı (docs/teknik-borc-arsiv.md).`]);
    return `✓${ensureOnBoard(repo, board, a.number, 'closed')}`;
  } else if (a.type === 'reopen') {
    gh(['issue', 'reopen', String(a.number), ...R, '--comment', `${a.id} kütükte hâlâ açık. Kapatmak için kaydı \`docs/teknik-borc-arsiv.md\`'ye taşıyın; GitHub'dan kapatmak yeterli değildir.`]);
    return `✓${ensureOnBoard(repo, board, a.number, 'open')}`;
  } else if (a.type === 'writeback') {
    writeBack(openFile, a.id, a.number);
  }
  return '✓';
}

function main() {
  const dir = path.resolve(process.argv[2] || process.cwd());
  const doApply = process.argv.includes('--uygula');
  const openFile = path.join(dir, OPEN_FILE);
  if (!fs.existsSync(openFile)) throw new Error(`${OPEN_FILE} yok (standart dışı kütük önce taşınmalı)`);

  const repo = readRepo(dir);
  const debts = parseDebts(fs.readFileSync(openFile, 'utf8'));
  const archiveFile = path.join(dir, ARCHIVE_FILE);
  const archiveIds = fs.existsSync(archiveFile) ? parseArchiveIds(fs.readFileSync(archiveFile, 'utf8')) : [];
  const issues = JSON.parse(gh(['issue', 'list', '-R', repo.full, '--state', 'all', '--limit', ISSUE_LIMIT, '--json', 'number,title,state,labels']))
    .map((i) => ({ ...i, labels: i.labels.map((l) => l.name) }));
  const existingLabels = JSON.parse(gh(['label', 'list', '-R', repo.full, '--limit', '200', '--json', 'name'])).map((l) => l.name);
  const board = findBoard(repo);

  const planned = plan({
    debts, archiveIds, issues,
    ctx: { isPublic: repo.isPublic, repoUrl: repo.url, branch: repo.branch, existingLabels },
  });
  // --ci modunda kütüğe geri yazım yapılmaz (bot main'e commit atmaz; eşleşme [TB-xxx] başlığıyla)
  const actions = CI ? planned.actions.filter((a) => a.type !== 'writeback') : planned.actions;
  const { warnings } = planned;
  const issueById = new Map();
  issues.forEach((i) => { const m = i.title.match(/^\[(TB-\d+)\]/); if (m) issueById.set(m[1], i.number); });
  const issueOf = (d) => d.issue || issueById.get(d.id) || null;

  const boardLabel = !board ? 'YOK — issue\'lar board\'a eklenmeyecek'
    : board.skipped ? `ATLANDI — ${board.skipped}`
      : `var (#${board.number}) · durumlar: ${board.optionIds.open ? BOARD_STATUS.open : 'AÇIK SÜTUNU YOK'} / ${board.optionIds.closed ? BOARD_STATUS.closed : 'KAPANDI SÜTUNU YOK'}`;
  console.log(`${doApply ? '▶ UYGULAMA' : '🔍 KURU ÇALIŞTIRMA (hiçbir şey değişmez)'}${CI ? ' [CI]' : ''} · ${repo.full} (${repo.isPublic ? 'PUBLIC' : 'private'})`);
  console.log(`Kütük: ${debts.length} açık · arşiv: ${archiveIds.length} · depodaki issue: ${issues.length}`);
  console.log(`Board "${boardTitle(repo.name)}": ${boardLabel}`);
  if (board && !board.skipped) loadBoardItems(repo, board);

  // İş listesi: önce plan işlemleri, sonra board düzeltmeleri (kartlar bellekte olduğu için baştan hesaplanır;
  // bu turda açılacak issue'ların kartı açılırken eklenir, düzeltme listesine girmez)
  const work = actions.map((a) => ({ label: describe(a), run: () => apply(a, repo, openFile, board) }));
  if (board && !board.skipped) {
    const created = new Set(actions.filter((a) => a.type === 'create').map((a) => a.id));
    for (const d of missingOnBoard(board, debts.filter((x) => !created.has(x.id)), issueOf)) {
      work.push({ label: `board düzelt: ${d.id} → #${d.issue} (${d.boardReason})`, run: () => { const n = ensureOnBoard(repo, board, d.issue, 'open'); pause(); return n; } });
    }
  }

  let done = 0;
  let budget = { remaining: null, resetAt: null };
  const stopForBudget = (remaining) => {
    const msg = kota.pauseMessage({ remaining, resetAt: budget.resetAt, done, left: work.length - done });
    console.log(`  ${msg}`);
  };
  for (const w of work) {
    if (!doApply) {
      console.log(`  • ${w.label}`);
      continue;
    }
    if (done % kota.CHECK_EVERY === 0) {
      budget = measureBudget();
      if (kota.shouldPause(budget.remaining)) { stopForBudget(budget.remaining); break; }
    }
    try {
      console.log(`  • ${w.label} ${w.run()}`);
      done += 1;
    } catch (e) {
      const msg = (e.stderr || e.message).toString().trim();
      // Hak sınırı arıza değildir: yeşil biter, kalanlar sonraki turda (kırmızı hata e-postası atmaz)
      if (kota.isRateLimitError(msg)) { budget = measureBudget(); stopForBudget(null); break; }
      console.log(`  ✗ ${w.label} — HATA: ${msg}`);
      process.exitCode = 1;
      break;
    }
  }
  if (!work.length) console.log('Yapılacak işlem yok; senkron.');
  if (board && board.skipped) console.log(`  ⚠ ${board.skipped}`);
  warnings.forEach((w) => console.log(`  ⚠ ${w}`));
}

try {
  main();
} catch (e) {
  const msg = (e.stderr || e.message).toString().trim();
  // İşlemlere başlamadan önceki okumalarda (depo, issue listesi, board) hak biterse de arıza sayılmaz
  // (2026-09-15: Portföy'de board okunurken hak bitti, görevli kırmızı bitti)
  if (kota.isRateLimitError(msg)) {
    console.log(`  ${kota.pauseMessage({ remaining: null, resetAt: null, done: 0, left: 'tüm' })}`);
    process.exit(0);
  }
  console.error(`borc-senkron hatası: ${msg}`);
  process.exit(1);
}
