// Unutulan iş testleri (gerçek geçici git depolarıyla). Çalıştır: node debt-sync/test/forgotten-work.test.js
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { unpushedBranches, forgottenWork } = require('../lib/debt');

let fail = 0;
const expect = (name, actual, wanted) => {
  const ok = JSON.stringify(actual) === JSON.stringify(wanted);
  if (!ok) fail += 1;
  console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : `\n    gelen: ${JSON.stringify(actual)}\n    beklenen: ${JSON.stringify(wanted)}`}`);
};

console.log('— saf karar');
const b = (name, ageDays, commits = 1) => ({ name, ageDays, commits });
expect('temiz → uyarı yok', forgottenWork({ dirty: { count: 0, ageDays: 0 }, branches: [] }, 7), []);
expect('taze commit\'siz dosya → uyarı yok', forgottenWork({ dirty: { count: 3, ageDays: 2 }, branches: [] }, 7), []);
expect('eski commit\'siz dosya → uyarı', forgottenWork({ dirty: { count: 3, ageDays: 30 }, branches: [] }, 7), ["3 dosya 30 gündür commit'siz"]);
expect('bugün çalışılan gönderilmemiş dallar → uyarı yok (aktif iş)', forgottenWork({ dirty: { count: 0, ageDays: 0 }, branches: [b('a', 0), b('b', 1)] }, 7), []);
expect('eski dal → uyarı ve dal adı', forgottenWork({ dirty: { count: 0, ageDays: 0 }, branches: [b('eski', 12), b('yeni', 0)] }, 7), ['1 dal 12+ gündür hiç gönderilmemiş: eski (12g)']);
expect('4+ eski dal → ilk 3 ve …', forgottenWork({ dirty: { count: 0, ageDays: 0 }, branches: [b('a', 9), b('b', 8), b('c', 20), b('d', 7)] }, 7)[0].endsWith('…'), true);

console.log('— gerçek git depolarıyla');
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'unutulan-'));
const remote = path.join(base, 'uzak.git');
const repo = path.join(base, 'proje');
const g = (env, ...a) => execFileSync('git', ['-C', repo, '-c', 'user.email=t@t', '-c', 'user.name=t', ...a], { stdio: 'ignore', env: { ...process.env, ...env } });
execFileSync('git', ['init', '-q', '--bare', remote]);
execFileSync('git', ['init', '-q', '-b', 'main', repo]);
fs.writeFileSync(path.join(repo, 'a.txt'), '1');
g({}, 'add', '-A'); g({}, 'commit', '-q', '-m', 'ilk');
expect('uzak depo yokken → dal sayılmaz (gönderim yeri yok)', unpushedBranches(repo), []);
g({}, 'remote', 'add', 'origin', remote); g({}, 'push', '-q', 'origin', 'main');
expect('gönderilmiş main → boş', unpushedBranches(repo), []);

g({}, 'switch', '-q', '-c', 'eski-is');
fs.writeFileSync(path.join(repo, 'b.txt'), '2');
const old = '2026-08-01T10:00:00';
g({ GIT_COMMITTER_DATE: old, GIT_AUTHOR_DATE: old }, 'add', '-A');
g({ GIT_COMMITTER_DATE: old, GIT_AUTHOR_DATE: old }, 'commit', '-q', '-m', 'eski');
let r = unpushedBranches(repo);
expect('gönderilmemiş dal bulunur, commit sayısı doğru', r.map((x) => [x.name, x.commits]), [['eski-is', 1]]);
expect('yaş son commit tarihinden (≥ 30 gün)', r[0].ageDays >= 30, true);

g({}, 'push', '-q', 'origin', 'eski-is');
expect('dal gönderilince listeden çıkar', unpushedBranches(repo), []);

fs.rmSync(base, { recursive: true, force: true });
console.log(fail ? `\n✗ ${fail} test başarısız` : '\n✓ tümü geçti');
process.exit(fail ? 1 : 0);
