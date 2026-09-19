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
// HIZ: oturum acilisinda calisir, bu yuzden PAHALI is yapmaz. Kod dili taramasi
// (Yonetici-Ozeti'nde 10.153 bulgu) burada CALISTIRILMAZ; yalniz turnikenin takili
// olup olmadigina ve kutukte kayit bulunup bulunmadigina bakilir.
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

// SAF olmayan: diskten okunur, evaluate()'e veri olarak verilir.
function readState(root) {
  const guideNames = listOr(root).filter((f) => /^(CLAUDE|AI-RULES)\.md$/i.test(f));
  return {
    workflows: listOr(path.join(root, '.github', 'workflows')),
    hasLedger: fs.existsSync(path.join(root, 'docs', 'teknik-borc.md')),
    ledgerText: readFileOr(path.join(root, 'docs', 'teknik-borc.md')),
    guideNames,
    guideText: guideNames.map((f) => readFileOr(path.join(root, f))).join('\n'),
    exemptRaw: readFileOr(path.join(root, EXEMPT_FILE), null),
  };
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

const has = (state, file) => state.workflows.includes(file);
const mentions = (text, re) => re.test(text || '');

const CHECKS = [
  {
    id: 'kod-dili-akisi',
    title: 'Kod dili turnikesi',
    ok: (s) => has(s, 'kod-dili.yml'),
    detail: () => '.github/workflows/kod-dili.yml yok',
    fix: 'ornek/kod-dili.yml dosyasını projeye kopyala',
  },
  {
    id: 'kod-dili-kaydi',
    title: 'Kod dili teknik borç kaydı',
    ok: (s) => mentions(s.ledgerText, /kod dili/i),
    detail: (s) => (s.hasLedger ? 'kütükte kod dili kaydı yok' : 'docs/teknik-borc.md yok'),
    fix: 'docs/kod-dili-gecis.md §3 şablonuyla kendi kütüğüne kayıt aç',
  },
  {
    id: 'teknik-borc-akisi',
    title: 'Teknik borç akışı',
    ok: (s) => has(s, 'teknik-borc.yml'),
    detail: () => '.github/workflows/teknik-borc.yml yok — kütük issue/board ile senkron olmuyor',
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
    ok: (s) => has(s, 'anahtar-tarama.yml'),
    detail: () => '.github/workflows/anahtar-tarama.yml yok — sır sızıntısı PR kapısı yok',
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
function evaluate(state, exempt = exemptions(state.exemptRaw)) {
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

module.exports = { CHECKS, EXEMPT_FILE, readState, exemptions, evaluate, summary, check, MAX_SHOWN };
