// KAPI KAYIT DEFTERI DENETIMI: her kapi, kendisini doguran gercek vakayi ve o vakayi
// yakalayan testi bildirmek zorundadir.
//
// NEDEN (2026-09-19):
// Uyum olceri, yakalamasi gereken boslugu "tamam" diye isaretledi — bu deponun kod-dili.yml
// dosyasi yalniz workflow_call'du, yani KENDI PR'larinda hic calismiyordu. Olcut yazilirken
// "ayni gunku `liste` hatasini yakalar miydi?" diye sorulmamisti. Sorulsaydi yanlis gecis
// ilk dakikada gorulurdu.
//
// Yanlis kapi, kapisizliktan DAHA TEHLIKELIDIR: yanlis guven uretir.
//
// Bu denetim su dort seyi zorlar:
//   1. Bir kanca bir kural modulu calistiriyorsa, o modul defterde KAYITLI olmali.
//   2. Her kaydin modulu ve test dosyasi GERCEKTEN var olmali.
//   3. Her kaydin bildirdigi test adi, test dosyasinda GERCEKTEN bulunmali.
//   4. Her vaka TARIHLI olmali — "sanirim boyle olmustu" kayit degildir.
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const FILE = path.join(__dirname, 'data', 'gates.json');
const DATE = /\b20\d{2}-\d{2}-\d{2}\b/;

// SAF: ham kayittan gecerli girdiler + bicim sorunlari
function parseGates(raw) {
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  const gates = [];
  const problems = [];
  for (const g of (parsed && parsed.gates) || []) {
    if (!g || !g.id) { problems.push('kimliksiz kayit'); continue; }
    if (!g.module) { problems.push(`${g.id}: modul yazilmamis`); continue; }
    if (!g.test) { problems.push(`${g.id}: vakayi yakalayan test yazilmamis`); continue; }
    if (!g.vaka) { problems.push(`${g.id}: vaka yazilmamis`); continue; }
    if (!DATE.test(g.vaka)) { problems.push(`${g.id}: vaka TARIHSIZ — "${g.vaka.slice(0, 40)}..."`); continue; }
    gates.push(g);
  }
  return { gates, problems };
}

// SAF: modul yolundan test dosyasi yolu (quality/x.js -> quality/test/x.test.js)
function testPathFor(modulePath) {
  const dir = path.dirname(modulePath);
  const base = path.basename(modulePath, '.js');
  return `${dir}/test/${base}.test.js`;
}

// SAF: test dosyasinda TAM BU ADLA bir test var mi?
// Alt dizge yetmez: 'baska bir test' metni 'bir test' adini iceriyor ve sahte gecis uretiyordu
// (2026-09-19, bu modulun kendi sabotaj testi yazilirken olculdu). Ad, tirnak icinde TAM
// eslesmelidir — yani gercekten o testin adidir.
function hasTestNamed(text, name) {
  const t = String(text || '');
  return t.includes(`'${name}'`) || t.includes(`"${name}"`) || t.includes(`\`${name}\``);
}

// SAF: kancalarin cagirdigi kural modulleri (hooks/ metinlerinden)
const CALL = /shared\('((?:quality|debt-sync)\/[A-Za-z0-9/_-]+\.js)'\)/g;
function calledModules(hookTexts) {
  const out = new Set();
  for (const t of hookTexts) for (const m of String(t || '').matchAll(CALL)) out.add(m[1]);
  return [...out].sort();
}

// SAF: kancanin calistirdigi ama defterde OLMAYAN moduller.
// debt-sync yonlendiricileri kapi degildir (veri okur, karar vermez) — disarida tutulur.
function unregistered(called, gates, ignore = ['debt-sync/']) {
  const known = new Set(gates.map((g) => g.module));
  return called.filter((m) => !known.has(m) && !ignore.some((p) => m.startsWith(p)));
}

// IO: defteri dosya sistemine karsi dogrular
function verify({ root = ROOT, file = FILE } = {}) {
  const { gates, problems } = parseGates(fs.readFileSync(file, 'utf8'));
  const errors = [...problems];

  for (const g of gates) {
    if (!fs.existsSync(path.join(root, g.module))) { errors.push(`${g.id}: modul yok — ${g.module}`); continue; }
    const testFile = testPathFor(g.module);
    if (!fs.existsSync(path.join(root, testFile))) { errors.push(`${g.id}: test dosyasi yok — ${testFile}`); continue; }
    const text = fs.readFileSync(path.join(root, testFile), 'utf8');
    if (!hasTestNamed(text, g.test)) errors.push(`${g.id}: bildirilen test ${testFile} icinde yok — "${g.test}"`);
  }

  const hooksDir = path.join(root, 'hooks');
  const hookTexts = fs.existsSync(hooksDir)
    ? fs.readdirSync(hooksDir).filter((f) => f.endsWith('.js')).map((f) => fs.readFileSync(path.join(hooksDir, f), 'utf8'))
    : [];
  for (const m of unregistered(calledModules(hookTexts), gates)) {
    errors.push(`kancalar ${m} calistiriyor ama defterde kayitli degil (quality/data/gates.json)`);
  }
  return { gates, errors };
}

const report = ({ gates, errors }) => (errors.length
  ? `✗ Kapı kaydı ${errors.length} sorun:\n` + errors.map((e) => `  ✗ ${e}`).join('\n')
    + '\n\nKural: standartlar/olcum-standardi.md — her kapı, kendisini doğuran gerçek vakayı\n'
    + 've o vakayı yakalayan testi bildirir. Vakasız kapı, yanlış güven üretir.'
  : `✓ ${gates.length} kapının hepsi vakasını ve onu yakalayan testi bildiriyor.`);

if (require.main === module) {
  const out = verify();
  console.log(report(out));
  process.exit(out.errors.length ? 1 : 0);
}

module.exports = { parseGates, testPathFor, hasTestNamed, calledModules, unregistered, verify, report, FILE };
