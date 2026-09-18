// Rehber tazelik testleri. Çalıştır: node quality/test/guide-freshness.test.js
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { pathRefs, claimedVersion, check, summary } = require('../guide-freshness');

let fail = 0;
const expect = (name, actual, wanted) => {
  const ok = JSON.stringify(actual) === JSON.stringify(wanted);
  if (!ok) fail += 1;
  console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : `\n    gelen: ${JSON.stringify(actual)}\n    beklenen: ${JSON.stringify(wanted)}`}`);
};

console.log('— atıf ayrıştırma');
expect('yol biçimli atıflar alınır', pathRefs('bkz `docs/teknik-borc.md` ve `src/lib/`'), ['docs/teknik-borc.md', 'src/lib/']);
expect('tek dosya adı sayılmaz (bağlama göreli)', pathRefs('`App.tsx`'), []);
expect('yer tutucular sayılmaz', pathRefs('`domain/IXxxRepository.ts` `supabase/migrations/YYYYAAGG_x.sql`'), []);
expect('URL, ~ ve komut sayılmaz', pathRefs('`https://x.com/a.md` `~/.claude/x.md` `npm run dev`'), []);
expect('uzantı listesi sayılmaz', pathRefs('`.ts/.tsx`'), []);
expect('sondaki noktalama temizlenir', pathRefs('(`docs/a.md`),'), ['docs/a.md']);

console.log('— sürüm iddiası');
expect('package.json satırındaki sürüm okunur', claimedVersion('> Referans sürüm: `package.json` → **v0.1.54**'), '0.1.54');
expect('başka satırdaki sürüm okunmaz', claimedVersion('Node 20.1.0 kullanılır'), null);

console.log('— gerçek depo ile');
const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'rehber-'));
const g = (...a) => execFileSync('git', ['-C', repo, '-c', 'user.email=t@t', '-c', 'user.name=t', ...a], { stdio: 'ignore' });
execFileSync('git', ['init', '-q', repo]);
fs.mkdirSync(path.join(repo, 'docs'));
fs.mkdirSync(path.join(repo, 'src', 'lib'), { recursive: true });
fs.writeFileSync(path.join(repo, 'docs', 'teknik-borc.md'), '#');
fs.writeFileSync(path.join(repo, 'src', 'lib', 'calc.ts'), '');
fs.writeFileSync(path.join(repo, '.gitignore'), 'dist/\n.agent/\n');
fs.writeFileSync(path.join(repo, 'package.json'), '{"version":"0.3.2"}');
fs.writeFileSync(path.join(repo, 'CLAUDE.md'), 'Sürüm: `package.json` → v0.3.2\n`docs/teknik-borc.md` `lib/calc.ts` `src/lib/` `dist/` `.agent/rules.md`\n');
fs.mkdirSync(path.join(repo, 'node_modules', 'pdfjs-dist', 'legacy', 'build'), { recursive: true });
fs.writeFileSync(path.join(repo, 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.mjs'), '');
fs.appendFileSync(path.join(repo, '.gitignore'), 'node_modules/\n');
fs.appendFileSync(path.join(repo, 'CLAUDE.md'), 'Paket: `legacy/build/pdf.mjs`\n');
g('add', '-A'); g('commit', '-q', '-m', 'ilk');
expect('güncel rehber → uyarı yok', summary(check(repo)), null);

fs.appendFileSync(path.join(repo, 'CLAUDE.md'), 'Eski: `docs/tech-debt.md`\n');
let r = check(repo);
expect('silinmiş dosya atfı yakalanır', r.missing, ['docs/tech-debt.md']);
expect('git dışı (dist/, .agent/) eksik sayılmaz', r.missing.includes('dist/') || r.missing.includes('.agent/rules.md'), false);

fs.writeFileSync(path.join(repo, 'package.json'), '{"version":"0.4.0"}');
r = check(repo);
expect('sürüm uyuşmazlığı yakalanır', r.version, { claimed: '0.3.2', actual: '0.4.0' });
expect('özet ikisini de söyler', [/0\.3\.2.*0\.4\.0/.test(summary(r)), summary(r).includes('docs/tech-debt.md')], [true, true]);

fs.rmSync(path.join(repo, 'CLAUDE.md'));
expect('rehber yok → kontrol atlanır', check(repo), null);

fs.rmSync(repo, { recursive: true, force: true });
console.log(fail ? `\n✗ ${fail} test başarısız` : '\n✓ tümü geçti');
process.exit(fail ? 1 : 0);
