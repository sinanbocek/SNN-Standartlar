// Aile standardi UYUM OLCERI: "her proje beklenen durumdan ne kadar uzakta?"
//
// TASARIM: mesaj degil, DURUM FARKI.
// Ortak depo projelere duyuru GONDERMEZ; beklenen durumu ilan eder, her proje kendi
// eksigini hesaplar. Neden (2026-09-19 karari):
//   - mesaj kuyrugu "okundu mu?" defteri ister; defter tutulmazsa mesaj kaybolur,
//   - kacirilan duyuru sonsuza kadar kacar,
//   - yeni proje gecmis duyurulari hic gormez,
//   - ve dagitimi bir insan yapmak zorunda kalir.
// Durum farki bunlarin hicbirini gerektirmez: her oturumda yeniden hesaplanir,
// eksik giderilince kendiliginden kaybolur.
//
// HIZ (2026-09-19'da OLCULDU, once yanlis varsayilmisti):
// Ilk surum "kod dili taramasi pahali" diye tarama YAPMIYORDU. Sonuc: Naturapan'a
// (0 bulgu) "kod dili kaydi ac" deniyordu — yanlis alarm. Olcum varsayimi curuttu:
//   Naturapan 53 ms · Abacus 76 ms · trade-kasa 77 ms
//   GHS-Panel 321 ms · Gunum-Var 445 ms · Yonetici-Ozeti 134 ms (10.153 bulguya ragmen)
// Sureyi bulgu sayisi degil DOSYA SAYISI belirliyor. En kotu hal 445 ms; acilis
// bekcisinin butcesi 30 sn. Tarama artik yapilir ve bulgu sayisi acilista gorunur.
//
// Kural: standartlar/ · Belge: docs/uyum-olcumu.md
'use strict';
const fs = require('fs');
const path = require('path');

const EXEMPT_FILE = '.snn-uyum.json';

// ─── Olculen durum (IO) ─────────────────────────────────────────────────────

const readFileOr = (p, fallback = '') => {
  try { return fs.readFileSync(p, 'utf8'); } catch { return fallback; }
};
const listOr = (p) => {
  try { return fs.readdirSync(p); } catch { return []; }
};

// Aile listesinde GEREKCELI olarak dislanmis depolar olculmez. Neden (2026-09-19): yerelde duran
// her klasor aile projesi degil. `ihale-mcp` ucuncu tarafin (saidsurucu) deposu ve olcer ona
// sonsuza kadar "6 eksik" diyordu. Bosuna dirdir, kapinin guvenilirligini oldurur.
// Yalniz ACIKCA dislananlar atlanir; tanimadigimiz yeni bir depo yine olculur.
function excludedRepos(file = path.join(__dirname, 'data', 'family-projects.json')) {
  try {
    return (JSON.parse(fs.readFileSync(file, 'utf8')).excluded || [])
      .filter((x) => x && x.repo && x.reason)
      .map((x) => x.repo.toLowerCase());
  } catch { return []; }
}

// SAF: uzak adresten "sahip/depo" cikarir (https ya da ssh).
function repoSlug(remoteUrl) {
  const m = String(remoteUrl || '').trim().match(/github\.com[:/]+([^/]+\/[^/\s]+?)(?:\.git)?$/i);
  return m ? m[1].toLowerCase() : '';
}

function readRemote(root) {
  try {
    return require('child_process').execFileSync('git', ['-C', root, 'remote', 'get-url', 'origin'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch { return ''; }
}

// SAF olmayan: diskten okunur, evaluate()'e veri olarak verilir.
// ANA DALDAN OKUMA (2026-09-19'da ölçüldü — bu ölçer önce yanlış yapıyordu).
//
// İlk sürüm çalışma klasörünü okuyordu. Sonuç: Naturapan'a "sır tarama kapısı yok",
// Yönetici-Özeti'ne "kütüğü hiç issue'ya senkronlanmıyor" dedi. İkisi de YANLIŞTI —
// dosyalar ana dalda vardı, yerel kopyalar 3 ve 7 commit gerideydi. Üstelik projelerin
// üçü o an kendi çalışma dallarındaydı, yani klasörün içeriği main'i hiç göstermiyordu.
//
// Bu ders göç notunun 11.0 bölümünde 2026-09-15'te zaten yazılıydı:
// "rapor ve denetimler GitHub'dan okumalı, yerel klasörden değil". Yazılı kural tutmadı.
//
// SINIR: `origin/main` en son ÇEKİLDİĞİ andaki hâlidir; ölçüm burada ağa çıkmaz
// (oturum açılışı bütçesi). Uzak dal yoksa çalışma klasörüne düşülür.
const gitOut = (root, args) => {
  try {
    return require('child_process').execFileSync('git', ['-C', root, ...args],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000 }).trim();
  } catch { return null; }
};

const hasMain = (root) => gitOut(root, ['rev-parse', '--verify', '--quiet', 'origin/main']) !== null;

// Ana daldaki bir klasörün dosya adları (yoksa çalışma klasörü)
// KÖK için `origin/main:.` GEÇERSİZDİR ("Not a valid object name"); kökte `origin/main:`
// kullanılır. İlk sürüm `:.` yazdı, rehber listesi hep boş döndü ve üç projeye yanlış
// "rehber yok" dedi — 2026-09-19'da ölçüldü.
function listAt(root, dir, fromMain) {
  if (!fromMain) return listOr(path.join(root, dir));
  const ref = dir === '.' || dir === '' ? 'origin/main:' : `origin/main:${dir}`;
  const out = gitOut(root, ['ls-tree', '--name-only', ref]);
  return out === null ? [] : out.split('\n').filter(Boolean);
}

// Ana daldaki bir dosyanın içeriği (yoksa çalışma klasörü)
function readAt(root, file, fromMain) {
  if (!fromMain) return readFileOr(path.join(root, file));
  const out = gitOut(root, ['show', `origin/main:${file}`]);
  return out === null ? '' : out;
}

function readState(root) {
  const fromMain = hasMain(root);
  const WF = '.github/workflows';
  const workflows = listAt(root, WF, fromMain);
  const guideNames = (fromMain ? listAt(root, '.', fromMain) : listOr(root))
    .filter((f) => /^(CLAUDE|AI-RULES)\.md$/i.test(f));
  const ledgerText = readAt(root, 'docs/teknik-borc.md', fromMain);
  return {
    repo: repoSlug(readRemote(root)),
    fromMain,
    workflows,
    workflowText: workflows.map((f) => readAt(root, `${WF}/${f}`, fromMain)).filter((t) => isTriggered(t)),
    hasLedger: fromMain ? ledgerText !== '' : fs.existsSync(path.join(root, 'docs', 'teknik-borc.md')),
    ledgerText,
    guideNames,
    guideText: guideNames.map((f) => readAt(root, f, fromMain)).join('\n'),
    exemptRaw: readFileOr(path.join(root, EXEMPT_FILE), null),
    findings: countFindings(root),
  };
}

// Kod dili bulgu sayisi. Tarama coker ya da yuklenemezse null doner: "bilmiyorum".
// Bilmiyorken kayit ISTENMEZ — var olmayan bir is icin dirdir etmek, kapinin
// guvenilirligini oldurur (ihale-mcp dersi).
function countFindings(root) {
  try {
    return require('./code-language-scan.js').scanAll(root).findings.length;
  } catch { return null; }
}

// ─── Muafiyet (SAF) ─────────────────────────────────────────────────────────
// Gerekcesiz muafiyet SAYILMAZ — istisna kurallarinin aynisi. Muafiyet, projenin
// aileye ait olmadigi gercek durumlar icindir (or. disaridan tuketilen bir MCP sunucusu),
// "simdilik ugrasmayalim" icin degil.
function exemptions(raw) {
  const ids = new Set();
  const warnings = [];
  if (!raw) return { ids, warnings };
  let parsed;
  try { parsed = JSON.parse(raw); } catch { return { ids, warnings: [`${EXEMPT_FILE} okunamadı (geçersiz JSON) → yok sayıldı`] }; }
  for (const g of parsed.exempt || []) {
    if (!g || !g.check) continue;
    if (!g.reason) { warnings.push(`muafiyet "${g.check}" gerekçesiz → sayılmadı`); continue; }
    ids.add(String(g.check));
  }
  return { ids, warnings };
}

// ─── Olcutler (SAF) ─────────────────────────────────────────────────────────
// Her olcut: durumdan tek bir evet/hayir uretir ve NE YAPILACAGINI soyler.

// SAF: bu akis dosyasi PR ya da push ile TETIKLENIYOR mu?
// Yalniz workflow_call olan bir dosya baska bir depo tarafindan cagrilir; KENDI deposunda
// hicbir sey yapmaz. 2026-09-19: bu deponun kod-dili.yml dosyasi tam olarak boyleydi ve
// uyum olceri "turnike var" diyordu — YANLIS GECIS. Kapinin varligi degil, CALDIGI olculur.
function isTriggered(text) {
  const head = String(text || '').split(/^jobs:/m)[0];
  return /^\s*(pull_request|push)\s*:/m.test(head);
}

// SAF: tetiklenen akislardan herhangi biri bu kapiyi calistiriyor mu?
const runsGate = (state, re) => (state.workflowText || []).some((t) => re.test(t));

const has = (state, file) => state.workflows.includes(file);
const mentions = (text, re) => re.test(text || '');

const CHECKS = [
  {
    id: 'kod-dili-akisi',
    title: 'Kod dili turnikesi',
    ok: (s) => runsGate(s, /kod-dili\.yml|code-language-scan/),
    detail: (s) => (has(s, 'kod-dili.yml')
      ? 'kod-dili.yml var ama PR/push ile tetiklenmiyor (yalnız workflow_call) — bu depoda hiç çalışmıyor'
      : '.github/workflows/kod-dili.yml yok'),
    fix: 'ornek/kod-dili.yml dosyasını projeye kopyala',
  },
  {
    id: 'kod-dili-kaydi',
    title: 'Kod dili teknik borç kaydı',
    // Bulgu yoksa kayıt da gerekmez; bilinmiyorsa (tarama çalışmadı) istenmez.
    ok: (s) => s.findings === 0 || s.findings === null || s.findings === undefined
      || mentions(s.ledgerText, /kod dili/i),
    detail: (s) => (s.hasLedger
      ? `kütükte kod dili kaydı yok (${(s.findings || 0).toLocaleString('tr-TR')} bulgu)`
      : `docs/teknik-borc.md yok (${(s.findings || 0).toLocaleString('tr-TR')} bulgu)`),
    fix: 'docs/kod-dili-gecis.md §3 şablonuyla kendi kütüğüne kayıt aç',
  },
  {
    id: 'teknik-borc-akisi',
    title: 'Teknik borç akışı',
    ok: (s) => runsGate(s, /teknik-borc\.yml|borc-senkron|debt-sync/),
    detail: (s) => (has(s, 'teknik-borc.yml')
      ? 'teknik-borc.yml var ama PR/push ile tetiklenmiyor — kütük issue/board ile senkron olmuyor'
      : '.github/workflows/teknik-borc.yml yok — kütük issue/board ile senkron olmuyor'),
    fix: 'ornek/teknik-borc.yml dosyasını projeye kopyala',
  },
  {
    id: 'kutuk',
    title: 'Teknik borç kütüğü',
    ok: (s) => s.hasLedger,
    detail: () => 'docs/teknik-borc.md yok',
    fix: 'node setup/setup-project.js <proje> --uygula',
  },
  {
    id: 'anahtar-tarama',
    title: 'Anahtar taraması',
    ok: (s) => runsGate(s, /anahtar-tarama\.yml|secret-scan/),
    detail: (s) => (has(s, 'anahtar-tarama.yml')
      ? 'anahtar-tarama.yml var ama PR/push ile tetiklenmiyor — sır sızıntısı kapısı çalmıyor'
      : '.github/workflows/anahtar-tarama.yml yok — sır sızıntısı PR kapısı yok'),
    fix: 'ornek/anahtar-tarama.yml dosyasını projeye kopyala',
  },
  {
    id: 'rehber-atfi',
    title: 'Rehberde aile standardı atfı',
    ok: (s) => s.guideNames.length > 0 && mentions(s.guideText, /SNN-Standartlar|SNN aile standard|aile standard[ıi]/i),
    detail: (s) => (s.guideNames.length ? 'CLAUDE.md / AI-RULES.md aile standardına atıf yapmıyor' : 'CLAUDE.md ya da AI-RULES.md yok'),
    fix: 'rehbere "Aile standartları: sinanbocek/SNN-Standartlar" atfını ekle',
  },
];

// SAF: durum -> bulgular. Muaf olanlar listeden dusulur.
function evaluate(state, exempt = exemptions(state.exemptRaw), excluded = excludedRepos()) {
  if (state.repo && excluded.includes(state.repo)) {
    return { gaps: [], warnings: [], total: CHECKS.length, exemptCount: 0, excluded: true };
  }
  const gaps = [];
  for (const c of CHECKS) {
    if (exempt.ids.has(c.id)) continue;
    if (c.ok(state)) continue;
    gaps.push({ id: c.id, title: c.title, detail: c.detail(state), fix: c.fix });
  }
  return { gaps, warnings: exempt.warnings, total: CHECKS.length, exemptCount: exempt.ids.size };
}

// SAF: oturum acilisinda gosterilecek satirlar. Kisa tutulur; acilis ozeti bir rapor degildir.
const MAX_SHOWN = 3;

function summary({ gaps, warnings }) {
  if (!gaps.length && !warnings.length) return [];
  const lines = [];
  if (gaps.length) {
    lines.push(`   ⚠ Aile standardı uyumu: ${gaps.length} eksik`);
    for (const g of gaps.slice(0, MAX_SHOWN)) lines.push(`     · ${g.title}: ${g.detail}`);
    if (gaps.length > MAX_SHOWN) lines.push(`     · ...ve ${gaps.length - MAX_SHOWN} tane daha`);
    lines.push(`     → ${gaps[0].fix}`);
  }
  for (const w of warnings) lines.push(`   ⚠ ${w}`);
  return lines;
}

// IO sarmalayici: tek cagri ile olcum.
function check(root) {
  return evaluate(readState(root));
}

module.exports = { CHECKS, EXEMPT_FILE, isTriggered, runsGate, repoSlug, excludedRepos, listAt, readAt, hasMain, readState, exemptions, evaluate, summary, check, MAX_SHOWN };
