// YEREL TEST KAPISI: kod buluta (PR/CI) gitmeden önce bu bilgisayarda lint + tip + test koşmuş mu?
//
// NEDEN (2026-09-29, Actions kotası teşhisi):
//   Bilgisayardaki bekçi yalnız tip kontrolü yapıyordu (hooks/lib/stop-gate-plan.js). Lint ve
//   testler İLK KEZ bulutta, ücretli dakikada koşuyordu; hata yakalamanın tek yeri CI idi.
//   Eylülde başarısız CI koşumları 49 dk tuttu — kota kazancı küçük. Asıl kazanç: kırmızı CI
//   görüp düzeltip yeniden gönderme döngüsü hiç başlamaz; hata PR'a girmeden durur.
//
// Nasıl:
//   node ~/.claude/standartlar-canli/quality/local-check.js [proje-klasörü]
//     → komutları sırayla koşar; hepsi geçerse o commit için DAMGA yazar (.git/snn-yerel-kontrol.json)
//   Bekçi (quality/command-gates.js) `git push` ve `gh pr create` öncesinde damgayı arar.
//
// Komutlar package.json'dan çıkar:
//   - `verify` betiği varsa YALNIZ o koşar (proje kendi tam listesini tanımlar; CI ile aynı olmalı)
//   - yoksa: format:check · lint · typecheck/type-check (yoksa tsconfig varsa tsc --noEmit) · test
//   - her iki durumda en sona kod dili taraması (yalnız origin/main'e göre eklenen satırlar, #146)
//   CI'da projeye özgü adım varsa (Gunum-Var'da Deno kontrolü: 18 Eylül kırmızısı) proje `verify`
//   betiği tanımlamalıdır; varsayılan liste onu bilemez.
// Komut çıktısı canlı akar ve taranır: çıkış kodu 0 olsa bile Jest'in kapanış hatası görülürse komut
//   kalır, damga yazılmaz (Talep #178; ifadeler TEARDOWN_PHRASES).
// package.json yoksa ya da koşacak komut yoksa kapı uygulanmaz.
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync, spawn } = require('child_process');

const STAMP = 'snn-yerel-kontrol.json';
const DOCS_ONLY = /^docs\/|\.md$/i;
const NPM_DEFAULT_TEST = /no test specified/;
const SCRIPT_PATH = path.join(require('os').homedir(), '.claude', 'standartlar-canli', 'quality', 'local-check.js');
const SCAN_PATH = path.join(__dirname, 'code-language-scan.js');

// SAF: package.json + tsconfig varlığı → koşulacak komutlar [{ name, cmd }]
//   hasMain: origin/main okunabiliyor mu (kod dili taraması onunla karşılaştırır)
function planCommands(pkg, hasTsconfig, { hasMain = false } = {}) {
  const out = projectCommands(pkg, hasTsconfig);
  // Kod dili taraması her zaman eklenir, verify olsa da (#146, 2026-10-14): tarama yalnız PR'da
  // koşuyordu; dalı yerelde main'e birleştiren SNN-ihale-ozeti'de kural yazıldıktan sonra 162
  // Türkçe tanımlayıcı main'e girdi. `--diff` yalnız eklenen satırlara bakar; eski borç durdurmaz.
  // Tek başına kapıyı açmaz: koşacak proje komutu yoksa kapı yine uygulanmaz.
  if (out.length && hasMain) out.push({ name: 'kod-dili', cmd: `node "${SCAN_PATH}" --diff origin/main .` });
  return out;
}

// SAF: projenin kendi komutları (package.json betikleri).
function projectCommands(pkg, hasTsconfig) {
  if (!pkg) return [];
  const s = pkg.scripts || {};
  if (s.verify) return [{ name: 'verify', cmd: 'npm run verify' }];
  const out = [];
  // format:check (2026-09-29 ölçümü): İhale'nin 24 Eylül'deki kırmızı CI'ı yalnız format adımıydı.
  if (s['format:check']) out.push({ name: 'format:check', cmd: 'npm run format:check' });
  if (s.lint) out.push({ name: 'lint', cmd: 'npm run lint' });
  const tc = ['typecheck', 'type-check'].find((k) => s[k]);
  if (tc) out.push({ name: tc, cmd: `npm run ${tc}` });
  else if (hasTsconfig) out.push({ name: 'tsc', cmd: 'npx --no-install tsc --noEmit' });
  if (s.test && !NPM_DEFAULT_TEST.test(s.test)) out.push({ name: 'test', cmd: 'npm test' });
  return out;
}

// Jest kapanış hatası (Talep #178, 2026-11-05): SNN-Games-Pulmaca PR #147'de yerel kontrol üç commit
// için "geçti" dedi, CI üçünde kırmızı oldu. Jest tam çalıştırmada bu hatayı yan süreçte
// `process.exitCode = 1` ile yazıyor; ana süreç 0 ile çıkıyor. Yalnız Jest'in bu iki ifadesi aranır;
// Vitest için ifade eklenmedi (ölçülmedi).
const TEARDOWN_PHRASES = ['Jest environment has been torn down', 'Cannot log after tests are done'];
const ANSI = /\x1b\[[0-9;]*[A-Za-z]/g;
const TAIL_KEEP = Math.max(...TEARDOWN_PHRASES.map((p) => p.length)) - 1;

// SAF: metinde kapanış hatası ifadesi var mı? Döner: bulunan ifade ya da null.
function findTeardown(text) {
  const clean = String(text).replace(ANSI, '');
  return TEARDOWN_PHRASES.find((p) => clean.includes(p)) || null;
}

// SAF (durumlu): parça parça gelen akışı tarar; parçalar arasında bölünen ifadeyi de yakalar.
// Her akış (stdout, stderr) için ayrı üretilir; iki akış birbirine karışıp ifadeyi bölmesin.
function createTeardownScanner() {
  let tail = '';
  let found = null;
  return {
    feed(chunk) {
      if (found) return found;
      const text = tail + String(chunk).replace(ANSI, '');
      found = findTeardown(text);
      tail = text.slice(-TAIL_KEEP);
      return found;
    },
    get found() { return found; },
  };
}

// SAF: bir komutun sonucu → kaldı mı? Çıkış kodu sıfırdan farklıysa bugünkü gibi kalır;
// kod 0 ama kapanış hatası görüldüyse de kalır.
//   Döner: { failed, teardown } (teardown: yalnız "kod 0 ama ifade var" durumunda ifade)
function judgeResult(status, teardownPhrase) {
  if (status !== 0) return { failed: true, teardown: null };
  if (teardownPhrase) return { failed: true, teardown: teardownPhrase };
  return { failed: false, teardown: null };
}

// SAF: değişen dosyaların hepsi belge mi? Boş liste belge SAYILMAZ.
const docsOnly = (files) => files.length > 0 && files.every((f) => DOCS_ONLY.test(f));

// SAF: karar. Döner: ret gerekçesi ya da null.
//   applies        : proje bu kapıya tabi mi (koşacak komut var mı)
//   head           : şu anki commit
//   stampHead      : damgadaki commit (yoksa null)
//   sinceStamp     : damgadan bu yana değişen dosyalar (damga yoksa null)
//   vsMain         : origin/main'e göre değişen dosyalar (okunamazsa null)
function decide({ applies, head, stampHead, sinceStamp, vsMain }) {
  if (!applies) return null;
  if (stampHead && stampHead === head) return null;
  // main'e göre yeni commit yok → gönderilecek/test edilecek bir şey yok (2026-09-29 gerçek veride:
  // main'de duran 4 proje yanlışlıkla durduruluyordu).
  if (vsMain && (vsMain.length === 0 || docsOnly(vsMain))) return null;
  if (stampHead && sinceStamp && (sinceStamp.length === 0 || docsOnly(sinceStamp))) return null;
  return `Yerel kontrol bu commit için koşmadı (${(head || '?').slice(0, 7)}). Kod buluta gitmeden önce `
    + `lint + tip + test bu bilgisayarda geçmeli; CI dakikası kırmızı koşumlara harcanmasın. `
    + `Önce çalıştır (1-3 dk sürebilir, zaman aşımını uzun ver): node "${SCRIPT_PATH}"`
    + ' — geçince bu komutu yeniden dene.';
}

// ─── IO ─────────────────────────────────────────────────────────────────────
const git = (root, args) => {
  try {
    return execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 8000 }).trim();
  } catch { return null; }
};
const lines = (out) => (out === null ? null : out.split('\n').map((l) => l.trim()).filter(Boolean));

function readPkg(root) {
  try { return JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')); } catch { return null; }
}

function stampFile(root) {
  const p = git(root, ['rev-parse', '--git-path', STAMP]);
  return p ? path.resolve(root, p) : null;
}

const hasMain = (root) => git(root, ['rev-parse', '--verify', '--quiet', 'origin/main']) !== null;

function readStamp(root) {
  try { return JSON.parse(fs.readFileSync(stampFile(root), 'utf8')); } catch { return null; }
}

// Kapının ihtiyaç duyduğu durumu okur.
function readState(root) {
  const top = git(root, ['rev-parse', '--show-toplevel']);
  if (!top) return { applies: false };
  const cmds = planCommands(readPkg(top), fs.existsSync(path.join(top, 'tsconfig.json')), { hasMain: hasMain(top) });
  const head = git(top, ['rev-parse', 'HEAD']);
  const stamp = readStamp(top);
  const stampHead = stamp && stamp.head ? stamp.head : null;
  return {
    applies: cmds.length > 0,
    head,
    stampHead,
    sinceStamp: stampHead ? lines(git(top, ['diff', '--name-only', stampHead, 'HEAD'])) : null,
    vsMain: lines(git(top, ['diff', '--name-only', 'origin/main...HEAD'])),
  };
}

const gate = (root) => decide(readState(root));

// Tek komutu koşar; çıktı canlı akar (stdout/stderr aynen iletilir) ve aynı anda taranır.
// Döner: Promise<{ status, teardown }>. Windows'ta shell: true ile çalışır.
function runCommand(cmd, cwd) {
  return new Promise((resolve) => {
    const child = spawn(cmd, { cwd, shell: true, stdio: ['inherit', 'pipe', 'pipe'] });
    const out = createTeardownScanner();
    const err = createTeardownScanner();
    child.stdout.on('data', (d) => { process.stdout.write(d); out.feed(d); });
    child.stderr.on('data', (d) => { process.stderr.write(d); err.feed(d); });
    child.on('error', () => resolve({ status: 1, teardown: null }));
    child.on('close', (code) => resolve({ status: code === null ? 1 : code, teardown: out.found || err.found }));
  });
}

// Komutları koşar; hepsi geçerse damga yazar. Çıkış: 0 geçti · 1 kaldı · 2 uygulanmaz
async function run(root) {
  const top = git(root, ['rev-parse', '--show-toplevel']);
  if (!top) { console.log('✗ Git deposu değil.'); return 2; }
  const cmds = planCommands(readPkg(top), fs.existsSync(path.join(top, 'tsconfig.json')), { hasMain: hasMain(top) });
  if (!cmds.length) { console.log('Bu projede koşacak yerel kontrol yok (package.json / betik yok) — kapı uygulanmaz.'); return 2; }
  const dirty = git(top, ['status', '--porcelain', '--untracked-files=no']);
  if (dirty) console.log('⚠ Commit\'lenmemiş değişiklik var; damga yalnız COMMIT\'e yazılır. Önce commit, sonra kontrol.');
  const head = git(top, ['rev-parse', 'HEAD']);
  for (const c of cmds) {
    console.log(`\n▶ ${c.name}: ${c.cmd}`);
    const started = Date.now();
    const r = await runCommand(c.cmd, top);
    const sec = Math.round((Date.now() - started) / 1000);
    const verdict = judgeResult(r.status, r.teardown);
    if (verdict.teardown) {
      console.log(`\n✗ ${c.name} kaldı (${sec} sn): çıkış kodu 0 ama Jest'in kapanış hatası görüldü ("${verdict.teardown}"). `
        + 'Bir test, test ortamı kapandıktan sonra çalışıyor; Jest bunu yan süreçte hata sayar, CI kırmızı olur. Damga yazılmadı.');
      return 1;
    }
    if (verdict.failed) { console.log(`\n✗ ${c.name} kaldı (${sec} sn). Damga yazılmadı.`); return 1; }
    console.log(`✓ ${c.name} (${sec} sn)`);
  }
  if (dirty) { console.log('\n✓ Komutlar geçti ama çalışma alanı kirliydi; damga yazılmadı. Commit edip yeniden koş.'); return 1; }
  fs.writeFileSync(stampFile(top), JSON.stringify({ head, at: new Date().toISOString(), commands: cmds.map((c) => c.name) }));
  console.log(`\n✓ Yerel kontrol geçti; damga: ${head.slice(0, 7)}`);
  return 0;
}

module.exports = { planCommands, docsOnly, decide, readState, gate, run, runCommand, createTeardownScanner, findTeardown, judgeResult, TEARDOWN_PHRASES, STAMP, SCRIPT_PATH };

if (require.main === module) run(path.resolve(process.argv[2] || process.cwd())).then((code) => process.exit(code));
