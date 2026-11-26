// Gerçek geçici git depolarıyla (uzak = yerel bare depo) uçtan uca test. Çalıştır: node stop-debt-push.test.js
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const { decide } = require('../stop-debt-push');

const HOOK = path.join(__dirname, '..', 'stop-debt-push.js');
let fail = 0;
const expect = (name, actual, wanted) => {
  const ok = JSON.stringify(actual) === JSON.stringify(wanted);
  if (!ok) fail += 1;
  console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : `\n    gelen: ${JSON.stringify(actual)}\n    beklenen: ${JSON.stringify(wanted)}`}`);
};
const g = (cwd, ...args) => execFileSync('git', ['-C', cwd, '-c', 'user.email=t@t', '-c', 'user.name=t', ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
// Kanca kütük adını ortak depodan okur; testte canlı kopya değil bu çalışma kopyası kullanılır.
const ROOT = path.join(__dirname, '..', '..');
const spawnHook = (cwd, active = false, env = {}) => spawnSync('node', [HOOK], {
  input: JSON.stringify({ cwd, stop_hook_active: active }),
  encoding: 'utf8',
  env: { ...process.env, SNN_STANDARTLAR: ROOT, ...env },
});
const run = (cwd, active = false) => {
  const r = spawnHook(cwd, active);
  return r.stdout ? JSON.parse(r.stdout) : null;
};
const kind = (o) => (o ? (o.decision === 'block' ? 'engelle' : 'uyar') : 'geç');

console.log('— saf karar');
expect('temiz → geç', kind(decide({ uncommitted: [], unpushed: [], hookActive: false })), 'geç');
expect('commit\'siz → engelle', kind(decide({ uncommitted: ['docs/teknik-borc.md'], unpushed: [], hookActive: false })), 'engelle');
expect('gönderilmemiş → engelle', kind(decide({ uncommitted: [], unpushed: ['abc1234'], hookActive: false })), 'engelle');
expect('ikinci tur → yalnız uyar (döngü yok)', kind(decide({ uncommitted: ['x'], unpushed: [], hookActive: true })), 'uyar');

console.log('— gerçek git depolarıyla');
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'debt-gonderim-'));
const remote = path.join(base, 'uzak.git');
const repo = path.join(base, 'proje');
execFileSync('git', ['init', '-q', '--bare', remote]);
execFileSync('git', ['init', '-q', repo]);
fs.mkdirSync(path.join(repo, 'docs'));
fs.writeFileSync(path.join(repo, 'README.md'), 'x');
g(repo, 'add', '-A'); g(repo, 'commit', '-q', '-m', 'ilk');
g(repo, 'remote', 'add', 'origin', remote); g(repo, 'push', '-q', 'origin', 'HEAD:main');
expect('kütük dosyası olmayan proje → geç', kind(run(repo)), 'geç');

fs.writeFileSync(path.join(repo, 'docs/teknik-borc.md'), '# Kütük\n');
g(repo, 'add', '-A'); g(repo, 'commit', '-q', '-m', 'kutuk'); g(repo, 'push', '-q', 'origin', 'HEAD:main');
expect('kütük gönderilmiş, temiz → geç', kind(run(repo)), 'geç');

fs.appendFileSync(path.join(repo, 'docs/teknik-borc.md'), '### TB-001 — yeni\n');
expect('kütük değişti, commit\'siz → engelle', kind(run(repo)), 'engelle');
expect('aynı status ikinci tur → uyar', kind(run(repo, true)), 'uyar');

g(repo, 'add', '-A'); g(repo, 'commit', '-q', '-m', 'yeni kayit');
const o = run(repo);
expect('commit\'lendi ama gönderilmedi → engelle', kind(o), 'engelle');
expect('mesaj gönderilmemiş commit\'i söylüyor', /gönderilmemiş commit/.test(o.reason), true);

g(repo, 'push', '-q', 'origin', 'HEAD:refs/heads/docs/debt');
expect('bir dala gönderildi (PR bekliyor) → geç', kind(run(repo)), 'geç');

fs.writeFileSync(path.join(repo, 'README.md'), 'kütük dışı değişiklik');
expect('kütük dışı commit\'siz değişiklik → geç (bu hook\'un işi değil)', kind(run(repo)), 'geç');

// Arşiv dosyası da kütüğün parçasıdır: commit'lenmemiş arşiv değişikliği de engellenir.
g(repo, 'add', '-A'); g(repo, 'commit', '-q', '-m', 'kutuk-kapat'); g(repo, 'push', '-q', 'origin', 'HEAD:main');
expect('hazırlık: temiz → geç', kind(run(repo)), 'geç');
fs.writeFileSync(path.join(repo, 'docs/teknik-borc-arsiv.md'), '# Arşiv\n');
const ar = run(repo);
expect('commit\'siz arşiv dosyası → engelle', kind(ar), 'engelle');
expect('mesaj arşiv dosyasını adıyla söylüyor', /docs\/teknik-borc-arsiv\.md/.test(ar ? ar.reason : ''), true);

console.log('— ad tek kaynaktan ve standartla aynı');
process.env.SNN_STANDARTLAR = ROOT; // bu süreçte de canlı kopya değil çalışma kopyası okunsun
const { loadLedger } = require('../stop-debt-push');
const ledger = loadLedger();
const standard = fs.readFileSync(path.join(ROOT, 'standartlar', 'teknik-borc-standardi.md'), 'utf8');
const setupSrc = fs.readFileSync(path.join(ROOT, 'setup', 'setup-project.js'), 'utf8');
expect('kancanın adları standartlar/teknik-borc-standardi.md tablosundaki adlar', ledger.every((f) => standard.includes('`' + f + '`')), true);
expect('kancanın adları setup/setup-project.js şablon adları', ledger.every((f) => setupSrc.includes(`'${f}'`)), true);
expect('iki ad var, ikisi de docs/ altında', ledger.length === 2 && ledger.every((f) => f.startsWith('docs/') && !f.includes('\\')), true);
expect('"debt" ile yazılmış ayrışmış ad yok', ledger.some((f) => f.includes('debt')), false);

console.log('— ortak depo okunamazsa kanca çökmez');
const noShared = spawnHook(repo, false, { SNN_STANDARTLAR: path.join(base, 'olmayan-ortak-depo') });
expect('çıkış kodu 0 (oturum kilitlenmez)', noShared.status, 0);
expect('stdout boş', noShared.stdout, '');
expect('sebep stderr\'e yazılır', /stop-debt-push hook hatası/.test(noShared.stderr), true);

fs.rmSync(base, { recursive: true, force: true });
console.log(fail ? `\n✗ ${fail} test başarısız` : '\n✓ tümü geçti');
process.exit(fail ? 1 : 0);
