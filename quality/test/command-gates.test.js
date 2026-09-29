// Yerel test kapısı ve komut kapıları testleri. Çalıştır: node quality/test/command-gates.test.js
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const lc = require('../local-check');
const cg = require('../command-gates');

let fail = 0;
const expect = (name, actual, wanted) => {
  const ok = JSON.stringify(actual) === JSON.stringify(wanted);
  if (!ok) fail += 1;
  console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : `\n    gelen: ${JSON.stringify(actual)}\n    beklenen: ${JSON.stringify(wanted)}`}`);
};
const names = (cmds) => cmds.map((c) => c.name);

console.log('— komut planı (gerçek package.json betikleri, 2026-09-29)');
// VAKA: İhale'nin 24 Eylül CI kırmızısı (koşum 36009419908) yalnız "Format check" adımıydı.
const ihaleScripts = { typecheck: 'tsc', lint: 'eslint .', format: 'prettier -w .', 'format:check': 'prettier -c .', test: 'vitest run' };
expect('İhale: format kontrolü planda', names(lc.planCommands({ scripts: ihaleScripts }, true)), ['format:check', 'lint', 'typecheck', 'test']);
// VAKA: Gunum-Var'ın 18 Eylül CI kırmızısı (koşum 35325709596) "Lint Check" adımıydı.
const gunumScripts = { lint: 'eslint .', test: 'jest', 'format:check': 'prettier -c .' };
expect('Gunum-Var: lint planda; typecheck betiği yok → tsc', names(lc.planCommands({ scripts: gunumScripts }, true)), ['format:check', 'lint', 'tsc', 'test']);
expect('verify betiği varsa yalnız o', names(lc.planCommands({ scripts: { ...gunumScripts, verify: 'npm run lint && deno check' } }, true)), ['verify']);
expect('npm varsayılan test betiği sayılmaz', names(lc.planCommands({ scripts: { test: 'echo "Error: no test specified" && exit 1' } }, false)), []);
expect('package.json yok → kapı uygulanmaz', lc.planCommands(null, false), []);

console.log('— karar');
const base = { applies: true, head: 'b'.repeat(40), stampHead: null, sinceStamp: null, vsMain: ['src/a.ts'] };
expect('damga yok, kod değişmiş → ret', lc.decide(base) !== null, true);
expect('ret, çalıştırılacak komutu söyler', lc.decide(base).includes('local-check.js'), true);
expect('damga bu commit → geçer', lc.decide({ ...base, stampHead: base.head }), null);
expect('dal yalnız belge → geçer', lc.decide({ ...base, vsMain: ['docs/a.md', 'README.md'] }), null);
// VAKA (2026-09-29, gerçek veri): main'de duran Naturapan, Portföy, Yönetici-Özeti, Siparis durduruluyordu.
expect('main\'e göre yeni commit yok → geçer', lc.decide({ ...base, vsMain: [] }), null);
expect('damgadan sonra yalnız belge → geçer', lc.decide({ ...base, stampHead: 'a'.repeat(40), sinceStamp: ['docs/x.md'] }), null);
expect('damgadan sonra kod → ret', lc.decide({ ...base, stampHead: 'a'.repeat(40), sinceStamp: ['src/x.ts'] }) !== null, true);
expect('tabi olmayan proje → geçer', lc.decide({ ...base, applies: false }), null);
expect('fark okunamadı (null) → temkinli: ret', lc.decide({ ...base, vsMain: null }) !== null, true);

console.log('— hangi komut kapıya tabi');
expect('gh pr create', cg.needsLocalCheck('gh pr create --base main --title x --body-file b.md'), true);
expect('başka depoya PR (-R) → klasör bilinmez, tabi değil', cg.needsLocalCheck('gh pr create -R o/r --title x'), false);
expect('git push -u origin dal', cg.needsLocalCheck('git push -u origin feat/x'), true);
expect('git -C yol push', cg.needsLocalCheck('git -C "C:/p/proje" push'), true);
expect('dal silme tabi değil', cg.needsLocalCheck('git push origin --delete feat/x'), false);
expect('yalnız etiket gönderimi tabi değil', cg.needsLocalCheck('git push --tags'), false);
expect('git status tabi değil', cg.needsLocalCheck('git status'), false);
expect('commit mesajında "push" geçmesi tabi değil', cg.needsLocalCheck('git commit -m "fix push"'), false);

console.log('— komutun klasörü');
expect('git -C', cg.targetDir('git -C "C:/p/proje" push', 'C:/x'), path.resolve('C:/p/proje'));
expect('baştaki cd', cg.targetDir('cd "C:/p/proje" && git push', 'C:/x'), path.resolve('C:/p/proje'));
expect('yoksa cwd', cg.targetDir('git push', 'C:/x'), 'C:/x');

console.log('— kapılar birlikte (bağımlılıklar sahte)');
const deny = { gate: () => 'yerel kontrol yok' };
const pass = { gate: () => null };
const quota = (billable) => ({ askBeforePr: require('../actions-quota').askBeforePr, cachedSummary: () => ({ billable }) });
expect('yerel kontrol yok → deny', cg.check('git push', '.', { local: () => deny }).decision, 'deny');
expect('yerel geçti, kota %96 → PR açarken ask', cg.check('gh pr create --title x', '.', { local: () => pass, quota: () => quota(2880) }).decision, 'ask');
expect('kota %96 ama push → sorulmaz', cg.check('git push', '.', { local: () => pass, quota: () => quota(2880) }), null);
expect('modül çökerse iş durmaz', cg.check('git push', '.', { local: () => { throw new Error('x'); } }), null);

console.log('— uçtan uca (geçici git deposu)');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'snn-yerel-'));
const git = (...a) => execFileSync('git', ['-C', dir, ...a], { stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8' });
fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ scripts: { test: 'node -e "process.exit(0)"' } }));
git('init', '-q', '-b', 'main');
git('add', '.');
git('-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '-m', 'ilk');
expect('damga yok → kapı durdurur', lc.gate(dir) !== null, true);
const origLog = console.log; console.log = () => {};
const code = lc.run(dir);
console.log = origLog;
expect('kontrol geçer', code, 0);
expect('damga yazıldı → kapı geçer', lc.gate(dir), null);
fs.writeFileSync(path.join(dir, 'a.js'), '1');
git('add', '.');
git('-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '-m', 'kod');
expect('yeni kod commit → kapı yeniden durdurur', lc.gate(dir) !== null, true);
fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ scripts: { test: 'node -e "process.exit(3)"' } }));
git('add', '.');
git('-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '-m', 'kirik');
console.log = () => {};
const bad = lc.run(dir);
console.log = origLog;
expect('kırık test → kontrol kalır', bad, 1);
expect('kırık testte damga yazılmaz → kapı durdurur', lc.gate(dir) !== null, true);
fs.rmSync(dir, { recursive: true, force: true });

console.log(fail ? `\n✗ ${fail} test başarısız` : '\n✓ tümü geçti');
process.exit(fail ? 1 : 0);
