// Yerel kontrolün Jest kapanış hatası taraması testleri. Çalıştır: node quality/test/local-check.test.js
// VAKA (2026-11-05, Talep #178): SNN-Games-Pulmaca PR #147'de yerel kontrol üç commit için "geçti"
// dedi, CI üçünde kırmızı oldu; Jest kapanış hatasını yan süreçte yazıyor, ana süreç 0 ile çıkıyor.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const lc = require('../local-check');

let fail = 0;
const expect = (name, actual, wanted) => {
  const ok = JSON.stringify(actual) === JSON.stringify(wanted);
  if (!ok) fail += 1;
  console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : `\n    gelen: ${JSON.stringify(actual)}\n    beklenen: ${JSON.stringify(wanted)}`}`);
};

const TORN = 'Jest environment has been torn down';
const LOG = 'Cannot log after tests are done';

console.log('— saf tarama');
expect('kapanış ifadesi bulunur', lc.findTeardown(`x\nReferenceError: ${TORN}\ny`), TORN);
expect('günlük ifadesi bulunur', lc.findTeardown(`${LOG}. Did you forget to wait?`), LOG);
expect('temiz çıktı: yok', lc.findTeardown('Tests: 3305 passed'), null);
expect('renk kodu araya girse de bulunur', lc.findTeardown(`Cannot \x1b[1mlog\x1b[0m after tests are done`), LOG);
expect('renk kodu ifadenin dışındaysa bulunur', lc.findTeardown(`\x1b[31m${LOG}\x1b[0m`), LOG);
expect('yalnız bu iki ifade aranır', lc.TEARDOWN_PHRASES, [TORN, LOG]);

console.log('— parçalar arasında bölünen ifade');
{
  const s = lc.createTeardownScanner();
  s.feed('önce biraz çıktı. Jest environment has been to');
  expect('ilk parçada henüz yok', s.found, null);
  s.feed('rn down after the test');
  expect('ikinci parçayla tamamlanınca bulunur', s.found, TORN);
}
{
  const s = lc.createTeardownScanner();
  for (const ch of `...${LOG}...`) s.feed(ch);
  expect('tek karakterlik parçalarda da bulunur', s.found, LOG);
}
{
  const s = lc.createTeardownScanner();
  s.feed('Cannot log');
  s.feed(' after tests are dons');
  expect('yarım kalan ifade (yanlış harf) bulunmaz', s.found, null);
}

console.log('— karar');
expect('kod 0, ifade yok: geçti', lc.judgeResult(0, null), { failed: false, teardown: null });
expect('kod 0, ifade var: kaldı', lc.judgeResult(0, TORN), { failed: true, teardown: TORN });
expect('kod 1, ifade yok: kaldı (bugünkü gibi)', lc.judgeResult(1, null), { failed: true, teardown: null });
expect('kod 1, ifade var: bugünkü gibi kaldı', lc.judgeResult(1, TORN), { failed: true, teardown: null });

console.log('— gerçek süreç (sahte test komutu)');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'snn-lc-'));
const fixture = (name, body) => { const p = path.join(dir, name); fs.writeFileSync(p, body); return `node "${p}"`; };
const origOut = process.stdout.write.bind(process.stdout);
const origErr = process.stderr.write.bind(process.stderr);
const quiet = async (fn) => {
  let captured = '';
  process.stdout.write = (d) => { captured += d; return true; };
  process.stderr.write = (d) => { captured += d; return true; };
  try { return { value: await fn(), captured }; } finally { process.stdout.write = origOut; process.stderr.write = origErr; }
};

(async () => {
  const cases = [
    ['stdout: ifade + çıkış 0 → kaldı', `console.log("${TORN}")`, 0, TORN],
    ['stderr: ifade + çıkış 0 → kaldı', `console.error("${LOG}")`, 0, LOG],
    ['temiz + çıkış 0 → geçti', 'console.log("ok")', 0, null],
    ['ifade yok + çıkış 1 → kod aynen', 'process.exit(1)', 1, null],
    ['ifade + çıkış 1 → kod aynen', `console.log("${LOG}"); process.exit(1)`, 1, LOG],
  ];
  for (const [name, body, status, teardown] of cases) {
    const { value, captured } = await quiet(() => lc.runCommand(fixture('c.js', body), dir));
    expect(name, { status: value.status, teardown: value.teardown }, { status, teardown });
    if (teardown) expect(`  çıktı canlı iletildi (${name})`, captured.includes(teardown), true);
  }
  // Parçalı yazım: ifade iki ayrı yazmada, araya bekleme girer (gerçek boru parçalanması).
  const split = 'process.stdout.write("Jest environment has been to"); setTimeout(() => process.stdout.write("rn down"), 150);';
  const r = await quiet(() => lc.runCommand(fixture('s.js', split), dir));
  expect('iki yazmaya bölünen ifade gerçek süreçte bulunur', r.value.teardown, TORN);
  // Canlı akış: ilk satır, süreç bitmeden gelmeli.
  const live = 'console.log("ilk"); setTimeout(() => {}, 1500);';
  let firstAt = null;
  const t0 = Date.now();
  process.stdout.write = (d) => { if (firstAt === null && String(d).includes('ilk')) firstAt = Date.now() - t0; return true; };
  await lc.runCommand(fixture('l.js', live), dir);
  process.stdout.write = origOut;
  expect('çıktı süreç bitmeden akar (ilk satır < 1000 ms, süreç 1500 ms yaşar)', firstAt !== null && firstAt < 1000, true);

  // Uçtan uca: kod 0 ama kapanış hatası basan sahte test → run() 1 döner, damga yazılmaz.
  const { execFileSync } = require('child_process');
  const repo = path.join(dir, 'repo');
  fs.mkdirSync(repo);
  const git = (...a) => execFileSync('git', ['-C', repo, ...a], { stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8' });
  const fakeTest = fixture('fake.js', `console.error("${TORN}")`).replace(/\\/g, '/');
  fs.writeFileSync(path.join(repo, 'package.json'), JSON.stringify({ scripts: { test: fakeTest } }));
  git('init', '-q', '-b', 'main');
  git('add', '.');
  git('-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '-m', 'ilk');
  const e2e = await quiet(() => lc.run(repo));
  expect('uçtan uca: kod 0 + kapanış hatası → run() 1', e2e.value, 1);
  expect('uçtan uca: Türkçe açıklama basıldı', e2e.captured.includes('kapanış hatası görüldü'), true);
  expect('uçtan uca: damga yazılmadı', fs.existsSync(path.join(repo, '.git', lc.STAMP)), false);

  fs.rmSync(dir, { recursive: true, force: true });
  console.log(fail ? `\n${fail} test KALDI` : '\nTümü geçti');
  process.exit(fail ? 1 : 0);
})();
