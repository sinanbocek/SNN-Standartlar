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
// Yerel okuma ÜÇ durumlu (olcum-standardi.md, Kural 3): yok → '' / [], okunamadı → null.
const readLocal = (p) => {
  try { return fs.readFileSync(p, 'utf8'); } catch (e) { return e && e.code === 'ENOENT' ? '' : null; }
};
const listLocal = (p) => {
  try { return fs.readdirSync(p); } catch (e) { return e && e.code === 'ENOENT' ? [] : null; }
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

// Herkese acik depolar: Actions dakikasi ucretsiz, akis butcesi olcutleri UYGULANMAZ.
// 2026-09-29 gercek veride olculdu: Abacus-Core ve Siparis'e "main'de CI kosuyor" demek
// bedava dakika icin dirdirdi — yanlis alarm.
function publicRepos(file = path.join(__dirname, 'data', 'family-projects.json')) {
  try {
    return (JSON.parse(fs.readFileSync(file, 'utf8')).projects || [])
      .filter((x) => x && x.repo && x.public === true)
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

// Ana daldaki bir klasörün dosya adları (yoksa çalışma klasörü).
// Döner: [] = klasör yok ya da boş · null = OKUNAMADI (Kural 3).
//
// 2026-09-19: ilk sürüm kök için `origin/main:.` yazdı; git hata verdi, hata boş liste sayıldı ve
// üç projeye yanlış "rehber yok" dendi. Aynı kök 2026-09-24'e kadar sürdü: `origin/main:<klasör>`
// biçimi olmayan klasörde de hata veriyor, yani "yok" ile "okuma hatası" aynı değeri üretiyordu.
// `ls-tree origin/main -- <klasör>/` olmayan klasörde boş döner (çıkış 0), yalnız gerçek hatada
// başarısız olur (2026-09-24'te ölçüldü).
function listAt(root, dir, fromMain) {
  if (!fromMain) return listLocal(path.join(root, dir));
  const atRoot = dir === '.' || dir === '';
  const out = gitOut(root, atRoot
    ? ['ls-tree', '--name-only', 'origin/main']
    : ['ls-tree', '--name-only', 'origin/main', '--', `${dir.replace(/\/$/, '')}/`]);
  if (out === null) return null;
  return out.split('\n').filter(Boolean).map((p) => p.split('/').pop());
}

// Ana daldaki bir dosyanın içeriği (yoksa çalışma klasörü).
// Döner: '' = dosya yok · null = OKUNAMADI (Kural 3).
// listed: dosya zaten bir klasör listesinden geldiyse varlığı bilinir; ek "var mı" sorusu sorulmaz.
// Sorulsaydı GHS-Panel'de ölçüm 1,5 sn'den 3,2 sn'ye çıkıyordu (2026-09-24'te ölçüldü).
function readAt(root, file, fromMain, listed = false) {
  if (!fromMain) return readLocal(path.join(root, file));
  if (!listed) {
    const found = gitOut(root, ['ls-tree', '--name-only', 'origin/main', '--', file]);
    if (found === null) return null;
    if (found === '') return '';
  }
  return gitOut(root, ['show', `origin/main:${file}`]);
}

function readState(root) {
  const fromMain = hasMain(root);
  const WF = '.github/workflows';
  // Okunamayan girdi null kalır; ona dayanan ölçütler evaluate()'te "ölçülemedi" olur.
  const allOrNull = (texts) => (texts === null || texts.includes(null) ? null : texts);
  const workflows = listAt(root, WF, fromMain);
  const rootNames = fromMain ? listAt(root, '.', fromMain) : listLocal(root);
  const guideNames = rootNames === null ? null : rootNames.filter((f) => /^(CLAUDE|AI-RULES)\.md$/i.test(f));
  const ledgerText = readAt(root, 'docs/teknik-borc.md', fromMain);
  const workflowTexts = allOrNull(workflows === null ? null : workflows.map((f) => readAt(root, `${WF}/${f}`, fromMain, true)));
  const guideTexts = allOrNull(guideNames === null ? null : guideNames.map((f) => readAt(root, f, fromMain, true)));
  // Dependabot yalnız npm projesinde istenir (kök package.json). Okunamazsa null (Kural 3).
  const hasPackageJson = rootNames === null ? null : rootNames.includes('package.json');
  const dependabotText = hasPackageJson === null ? null
    : (hasPackageJson ? readAt(root, '.github/dependabot.yml', fromMain) : '');
  return {
    repo: repoSlug(readRemote(root)),
    fromMain,
    workflows,
    workflowFiles: workflowTexts === null ? null : workflows.map((name, i) => ({ name, text: workflowTexts[i] })),
    hasPackageJson,
    dependabotText,
    workflowText: workflowTexts === null ? null : workflowTexts.filter((t) => isTriggered(t)),
    hasLedger: ledgerText === null ? null : (fromMain ? ledgerText !== '' : fs.existsSync(path.join(root, 'docs', 'teknik-borc.md'))),
    ledgerText,
    guideNames,
    guideText: guideTexts === null ? null : guideTexts.join('\n'),
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

// Kütük BAŞLIĞINDAKİ makine adresleri kurulan bir yeri gösteriyor mu? Eşleme beceri adres
// kapısıyla aynıdır (quality/skill-paths.js): adres SNN-Standartlar'daki dosyaya çevrilir.
// Yalnız başlık (ilk `---` satırından öncesi) ölçülür; kayıt gövdesi tarihçe anlatabilir.
// 2026-09-23: 10 tüketici kütüğünün 10'u `~/.claude/standartlar/…` adresini taşıyordu; o yeri
// hiçbir betik kurmuyor, yeni makinede boş çıkar.
const STANDARDS_ROOT = path.join(__dirname, '..');
function brokenLedgerRefs(ledgerText, exists = (p) => fs.existsSync(path.join(STANDARDS_ROOT, p))) {
  const { extractRefs, mapToRepo } = require('./skill-paths');
  const header = String(ledgerText || '').split(/^---\s*$/m)[0];
  return extractRefs(header)
    .filter((r) => { const { repoPath } = mapToRepo(r.rel); return repoPath === null || !exists(repoPath); })
    .map((r) => r.raw);
}

const has = (state, file) => state.workflows.includes(file);
const mentions = (text, re) => re.test(text || '');

// Ortak adım (2026-09-29): aile kontrolü CI işinin içinde bir adım. Kod dili taraması
// `kod-dili: false` verilerek kapatılabilir; kapalıysa kod dili turnikesi YOK sayılır.
const FAMILY_STEP = /SNN-Standartlar\/\.github\/actions\/aile-kontrol@/;
const familyStepRuns = (s, { codeLanguage = false } = {}) => (s.workflowText || []).some((t) => FAMILY_STEP.test(t)
  && (!codeLanguage || !/kod-dili:\s*['"]?false/.test(t)));
const budget = (s) => require('./workflow-budget').analyzeWorkflows(s.workflowFiles || []);
const budgetFix = 'iskelet: ornek/ci-duzeni.yml (CI\'ı olmayan proje: ornek/aile-kontrol.yml) · gerekçe: SNN-Standartlar/docs/actions-kotasi.md';

const CHECKS = [
  {
    id: 'kod-dili-akisi',
    input: 'workflowText',
    title: 'Kod dili turnikesi',
    ok: (s) => runsGate(s, /kod-dili\.yml|code-language-scan/) || familyStepRuns(s, { codeLanguage: true }),
    detail: (s) => (has(s, 'kod-dili.yml')
      ? 'kod-dili.yml var ama PR/push ile tetiklenmiyor (yalnız workflow_call) — bu depoda hiç çalışmıyor'
      : 'kod dili taraması çalışmıyor (ortak adım yok ya da `kod-dili: false`)'),
    fix: 'CI işine ortak adımı ekle: `uses: sinanbocek/SNN-Standartlar/.github/actions/aile-kontrol@main` (ornek/ci-duzeni.yml)',
  },
  {
    id: 'kod-dili-kaydi',
    input: 'ledgerText',
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
    input: 'workflowText',
    title: 'Teknik borç akışı',
    ok: (s) => runsGate(s, /teknik-borc\.yml|borc-senkron|debt-sync/),
    detail: (s) => (has(s, 'teknik-borc.yml')
      ? 'teknik-borc.yml var ama PR/push ile tetiklenmiyor — kütük issue/board ile senkron olmuyor'
      : '.github/workflows/teknik-borc.yml yok — kütük issue/board ile senkron olmuyor'),
    fix: 'ornek/teknik-borc.yml dosyasını projeye kopyala',
  },
  {
    id: 'kutuk',
    input: 'ledgerText',
    title: 'Teknik borç kütüğü',
    ok: (s) => s.hasLedger,
    detail: () => 'docs/teknik-borc.md yok',
    fix: 'node setup/setup-project.js <proje> --uygula',
  },
  {
    id: 'kutuk-adresi',
    input: 'ledgerText',
    title: 'Kütükteki standart adresi',
    // Adres hiç yazılmamışsa eksik sayılmaz: ölçüt "yazılan adres doğru olsun" der.
    ok: (s) => brokenLedgerRefs(s.ledgerText).length === 0,
    detail: (s) => `docs/teknik-borc.md başlığı hiçbir betiğin kurmadığı bir yeri gösteriyor: ${brokenLedgerRefs(s.ledgerText).join(', ')}`,
    fix: 'kütük başlığındaki adresi `~/.claude/standartlar-canli/standartlar/teknik-borc-standardi.md` yap',
  },
  {
    id: 'anahtar-tarama',
    input: 'workflowText',
    title: 'Anahtar taraması',
    ok: (s) => runsGate(s, /anahtar-tarama\.yml|secret-scan/) || familyStepRuns(s),
    detail: (s) => (has(s, 'anahtar-tarama.yml')
      ? 'anahtar-tarama.yml var ama PR/push ile tetiklenmiyor — sır sızıntısı kapısı çalmıyor'
      : 'gizli anahtar taraması çalışmıyor — sır sızıntısı PR kapısı yok'),
    fix: 'CI işine ortak adımı ekle: `uses: sinanbocek/SNN-Standartlar/.github/actions/aile-kontrol@main` (CI yoksa ornek/aile-kontrol.yml)',
  },
  // ─── Akış bütçesi (quality/workflow-budget.js · docs/actions-kotasi.md) ───
  {
    id: 'ci-main-kosumu',
    budget: true,
    input: 'workflowFiles',
    title: 'CI main\'de ikinci kez koşuyor',
    ok: (s) => budget(s).mainRuns.length === 0,
    detail: (s) => `${budget(s).mainRuns.join(', ')} main'e gönderimde de test koşuyor; PR'da test edilen kod baştan test ediliyor (eylül: ailede 1.214 dk)`,
    fix: `\`on:\` bölümünden \`push\` tetiğini kaldır, yalnız \`pull_request\` kalsın · ${budgetFix}`,
  },
  {
    id: 'aile-kontrol-adimi',
    budget: true,
    input: 'workflowFiles',
    title: 'Aile kontrolü ayrı akışta',
    ok: (s) => budget(s).separateScans.length === 0,
    detail: (s) => `${budget(s).separateScans.join(', ')} ayrı makine açıyor; ~15 sn'lik tarama 1 dk faturalanıyor (eylül: ailede 769 dk)`,
    fix: `bu dosyaları sil, CI işine \`uses: sinanbocek/SNN-Standartlar/.github/actions/aile-kontrol@main\` adımını ekle · ${budgetFix}`,
  },
  {
    id: 'ci-iptal',
    budget: true,
    input: 'workflowFiles',
    title: 'CI eski koşumu iptal etmiyor',
    ok: (s) => budget(s).noCancel.length === 0,
    detail: (s) => `${budget(s).noCancel.join(', ')} aynı PR'a art arda gönderimde eski koşumu bitirmeden yenisini başlatıyor`,
    fix: `\`concurrency: { group: ci-\${{ github.ref }}, cancel-in-progress: true }\` ekle · ${budgetFix}`,
  },
  {
    id: 'dependabot-aylik',
    budget: true,
    input: 'dependabotText',
    title: 'Dependabot aylık ve gruplu değil',
    ok: (s) => !s.hasPackageJson || require('./workflow-budget').dependabotState(s.dependabotText) === 'ok',
    detail: (s) => ({
      yok: '.github/dependabot.yml yok — güvenlik güncellemeleri paket başına ayrı PR açıyor, her biri CI koşturuyor',
      haftalik: 'dependabot.yml haftalık/günlük — aylık olmalı',
      grupsuz: 'dependabot.yml güvenlik güncellemelerini tek grupta toplamıyor',
    })[require('./workflow-budget').dependabotState(s.dependabotText)],
    fix: 'SNN-Standartlar/ornek/dependabot.yml dosyasını .github/dependabot.yml olarak kopyala',
  },
  {
    id: 'rehber-atfi',
    input: 'guideText',
    title: 'Rehberde aile standardı atfı',
    ok: (s) => s.guideNames.length > 0 && mentions(s.guideText, /SNN-Standartlar|SNN aile standard|aile standard[ıi]/i),
    detail: (s) => (s.guideNames.length ? 'CLAUDE.md / AI-RULES.md aile standardına atıf yapmıyor' : 'CLAUDE.md ya da AI-RULES.md yok'),
    fix: 'rehbere "Aile standartları: sinanbocek/SNN-Standartlar" atfını ekle',
  },
];

// SAF: durum -> bulgular. Muaf olanlar listeden dusulur.
// Dayandigi girdi OKUNAMAMIS (null) olcut eksik de temiz de sayilmaz: `unknown` listesine girer
// (olcum-standardi.md, Kural 3). compliance-issues bu olcutlerin issue'larina dokunmaz.
function evaluate(state, exempt = exemptions(state.exemptRaw), excluded = excludedRepos(), publics = publicRepos()) {
  const isPublic = !!state.repo && publics.includes(state.repo);
  if (state.repo && excluded.includes(state.repo)) {
    return { gaps: [], unknown: [], warnings: [], total: CHECKS.length, exemptCount: 0, excluded: true };
  }
  const gaps = [];
  const unknown = [];
  for (const c of CHECKS) {
    if (exempt.ids.has(c.id)) continue;
    if (c.budget && isPublic) continue; // açık depoda dakika ücretsiz
    if (c.input && state[c.input] === null) { unknown.push(c.id); continue; }
    if (c.ok(state)) continue;
    gaps.push({ id: c.id, title: c.title, detail: c.detail(state), fix: c.fix });
  }
  const warnings = [...exempt.warnings];
  if (unknown.length) {
    const titles = CHECKS.filter((c) => unknown.includes(c.id)).map((c) => c.title);
    warnings.push(`ölçülemedi (okuma hatası; eksik sayılmadı): ${titles.join(', ')}`);
  }
  return { gaps, unknown, warnings, total: CHECKS.length, exemptCount: exempt.ids.size };
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

module.exports = { CHECKS, EXEMPT_FILE, brokenLedgerRefs, isTriggered, runsGate, repoSlug, excludedRepos, publicRepos, listAt, readAt, hasMain, readState, exemptions, evaluate, summary, check, MAX_SHOWN };
