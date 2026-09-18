// Uçtan uca: sahte "gh" ile (GitHub'a HİÇ istek atmaz) istek hakkı davranışı ve board okuma maliyeti.
// Yalnız Linux/macOS (CI): Windows'ta Node, PATH'teki betik "gh"yi çalıştıramaz. Çalıştır: node senkron-e2e.test.js
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

if (process.platform === 'win32') {
  console.log('— Windows: atlandı (CI Linux\'ta çalışır)');
  process.exit(0);
}

let fail = 0;
const expect = (name, actual, wanted) => {
  const ok = JSON.stringify(actual) === JSON.stringify(wanted);
  if (!ok) fail += 1;
  console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : `\n    gelen: ${JSON.stringify(actual)}\n    beklenen: ${JSON.stringify(wanted)}`}`);
};

const SCRIPT = path.join(__dirname, '..', 'debt-sync.js');
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'borc-e2e-'));
const bin = path.join(base, 'bin');
fs.mkdirSync(bin);

// Sahte gh: çağrıları calls.log'a yazar; FAKE_REMAINING, FAKE_FAIL_AFTER, FAKE_OTHER_ERR ile davranış seçilir
fs.writeFileSync(path.join(bin, 'gh'), `#!/usr/bin/env node
const fs = require('fs'); const a = process.argv.slice(2); const dir = process.env.FAKE_DIR;
fs.appendFileSync(dir + '/calls.log', a.slice(0, 2).join(' ') + '\\n');
const out = (o) => { process.stdout.write(typeof o === 'string' ? o : JSON.stringify(o)); process.exit(0); };
const k = a.slice(0, 2).join(' ');
if (k === 'repo view') out({ visibility: 'PRIVATE', defaultBranchRef: { name: 'main' }, url: 'https://github.com/o/r' });
if (k === 'issue list') out([]);
if (k === 'label list') out(['teknik-borç', 'P1-Acil', 'P2-Planlı', 'P3-Fırsatta'].map((name) => ({ name })));
if (k === 'api rate_limit') out({ remaining: Number(process.env.FAKE_REMAINING || 5000), reset: 1789999999 });
if (k === 'project list') out({ projects: [{ number: 1, id: 'P', title: 'r · Teknik Borç' }] });
if (k === 'project field-list') out({ fields: [{ name: 'Status', id: 'F', options: [{ id: 'o1', name: 'Açık' }, { id: 'o2', name: 'Kapandı' }] }] });
if (k === 'project item-list') {
  if (process.env.FAKE_BOARD_LIMIT) { process.stderr.write('GraphQL: API rate limit exceeded for user ID 1.'); process.exit(1); }
  out({ items: [] });
}
if (k === 'project item-add') out({ id: 'I' + Date.now() });
if (k === 'project item-edit') out('');
if (k === 'issue create') {
  const f = dir + '/creates'; const n = (fs.existsSync(f) ? Number(fs.readFileSync(f, 'utf8')) : 0) + 1;
  if (process.env.FAKE_OTHER_ERR) { process.stderr.write('resource not found'); process.exit(1); }
  if (process.env.FAKE_FAIL_AFTER && n > Number(process.env.FAKE_FAIL_AFTER)) { process.stderr.write('GraphQL: API rate limit exceeded for user ID 1.'); process.exit(1); }
  fs.writeFileSync(f, String(n)); out('https://github.com/o/r/issues/' + n);
}
process.stderr.write('sahte gh: bilinmeyen komut ' + a.join(' ')); process.exit(1);
`, { mode: 0o755 });

const repo = path.join(base, 'proje');
fs.mkdirSync(path.join(repo, 'docs'), { recursive: true });
execFileSync('git', ['init', '-q', repo]);
execFileSync('git', ['-C', repo, 'remote', 'add', 'origin', 'https://github.com/o/r.git']);
const record = (n) => `### TB-00${n} — Kayıt ${n}\n- **Öncelik:** P3 (Fırsatta)\n\n#### 🟢 Sade Anlatım\n- **Sorun ne?** x\n\n---\n`;
fs.writeFileSync(path.join(repo, 'docs', 'teknik-borc.md'), `# Kütük\n\n${[1, 2, 3, 4, 5].map(record).join('\n')}`);

function run(env) {
  for (const f of ['calls.log', 'creates']) fs.rmSync(path.join(base, f), { force: true });
  const r = spawnSync('node', [SCRIPT, repo, '--uygula', '--ci'], {
    encoding: 'utf8',
    env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, FAKE_DIR: base, PROJECT_TOKEN: 'x', GH_TOKEN: 'y', ...env },
  });
  const calls = fs.existsSync(path.join(base, 'calls.log')) ? fs.readFileSync(path.join(base, 'calls.log'), 'utf8').split('\n') : [];
  return { code: r.status, out: r.stdout + r.stderr, calls };
}
const count = (calls, k) => calls.filter((c) => c === k).length;

console.log('— normal tur');
let r = run({});
expect('5 issue açılır, çıkış 0', [r.code, count(r.calls, 'issue create')], [0, 5]);
expect('board kartları turda BİR KEZ okunur (maliyet)', count(r.calls, 'project item-list'), 1);

console.log('— hak tur ortasında bitti');
r = run({ FAKE_FAIL_AFTER: '2' });
expect('kırmızı hata yok: çıkış 0', r.code, 0);
expect('durma mesajı: 2 yapıldı, 3 sonraki tura', [r.out.includes('⏸'), r.out.includes('2 işlem yapıldı'), r.out.includes('3 işlem sonraki')], [true, true, true]);
expect('hata satırı (✗) yazılmaz', r.out.includes('✗'), false);

console.log('— hak baştan azdı');
r = run({ FAKE_REMAINING: '100' });
expect('hiç issue açılmaz, çıkış 0', [r.code, count(r.calls, 'issue create')], [0, 0]);
expect('durma mesajı kalan hakkı söyler', r.out.includes('kalan hak 100'), true);

console.log('— hak board okunurken bitti (işlemlerden önce)');
r = run({ FAKE_BOARD_LIMIT: '1' });
expect('kırmızı hata yok: çıkış 0 ve ⏸', [r.code, r.out.includes('⏸')], [0, true]);
expect('hiç issue açılmaz', count(r.calls, 'issue create'), 0);

console.log('— gerçek arıza (hak sınırı değil)');
r = run({ FAKE_OTHER_ERR: '1' });
expect('kırmızı kalır: çıkış 1 ve ✗', [r.code, r.out.includes('✗')], [1, true]);

fs.rmSync(base, { recursive: true, force: true });
console.log(fail ? `\n✗ ${fail} test başarısız` : '\n✓ tümü geçti');
process.exit(fail ? 1 : 0);
