// Şema belgesi bekçisi testleri (gerçek geçici git depolarıyla). Çalıştır: node kalite/test/sema-belgesi.test.js
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { isStructural, decide, measure } = require('../sema-belgesi');

let fail = 0;
const expect = (name, actual, wanted) => {
  const ok = JSON.stringify(actual) === JSON.stringify(wanted);
  if (!ok) fail += 1;
  console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : `\n    gelen: ${JSON.stringify(actual)}\n    beklenen: ${JSON.stringify(wanted)}`}`);
};
const kind = (o) => (o ? (o.decision === 'block' ? 'engelle' : 'uyar') : 'geç');

console.log('— yapısal değişiklik tanıma');
expect('CREATE TABLE yapısal', isStructural('create table public.x (id int);'), true);
expect('ALTER TABLE ADD COLUMN yapısal', isStructural('ALTER TABLE loans ADD COLUMN rate numeric(8,4);'), true);
expect('DROP TABLE yapısal', isStructural('drop table if exists old_backup;'), true);
expect('ALTER TABLE ... ENABLE RLS yapısal değil', isStructural('alter table x enable row level security;'), false);
expect('cron / fonksiyon yapısal değil', isStructural("select cron.schedule('j','0 * * * *',$$select 1$$); create or replace function f() returns int as $$select 1$$ language sql;"), false);
expect('yorumdaki CREATE TABLE sayılmaz', isStructural('-- create table eski_not\nselect 1;'), false);
expect('istisna satırı → yapısal sayılmaz', isStructural('-- sema-belgesi: gerek yok (geçici yedek)\ndrop table tmp;'), false);

console.log('— saf karar');
expect('yapısal + belge değişmedi → engelle', kind(decide({ schemaDoc: 'd.md', structural: ['m.sql'], changed: ['m.sql'], hookActive: false })), 'engelle');
expect('yapısal + belge değişti → geç', kind(decide({ schemaDoc: 'd.md', structural: ['m.sql'], changed: ['m.sql', 'd.md'], hookActive: false })), 'geç');
expect('ikinci tur → yalnız uyar', kind(decide({ schemaDoc: 'd.md', structural: ['m.sql'], changed: ['m.sql'], hookActive: true })), 'uyar');
expect('şema belgesi olmayan proje → geç', kind(decide({ schemaDoc: null, structural: ['m.sql'], changed: ['m.sql'], hookActive: false })), 'geç');

console.log('— gerçek git depolarıyla');
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'sema-'));
const remote = path.join(base, 'uzak.git');
const repo = path.join(base, 'proje');
const g = (...a) => execFileSync('git', ['-C', repo, '-c', 'user.email=t@t', '-c', 'user.name=t', ...a], { stdio: 'ignore' });
execFileSync('git', ['init', '-q', '--bare', remote]);
execFileSync('git', ['init', '-q', '-b', 'main', repo]);
fs.mkdirSync(path.join(repo, 'supabase', 'migrations'), { recursive: true });
fs.mkdirSync(path.join(repo, 'docs', 'database'), { recursive: true });
fs.writeFileSync(path.join(repo, 'docs', 'database', 'schema.md'), '# şema\n');
fs.writeFileSync(path.join(repo, 'supabase', 'migrations', '001_ilk.sql'), 'create table a (id int);');
g('add', '-A'); g('commit', '-q', '-m', 'ilk');
g('remote', 'add', 'origin', remote); g('push', '-q', 'origin', 'main');
g('remote', 'set-head', 'origin', 'main');
const m = () => decide({ ...measure(repo), hookActive: false });
expect('ana dalda eski migration → geç (bu işin değişikliği değil)', kind(m()), 'geç');

g('switch', '-q', '-c', 'is');
fs.writeFileSync(path.join(repo, 'supabase', 'migrations', '002_cron.sql'), "select cron.schedule('x','* * * * *','select 1');");
expect('yapısal olmayan yeni migration → geç', kind(m()), 'geç');

fs.writeFileSync(path.join(repo, 'supabase', 'migrations', '003_sutun.sql'), 'alter table a add column ad text;');
expect('commit\'lenmemiş yapısal migration → engelle', kind(m()), 'engelle');
g('add', '-A'); g('commit', '-q', '-m', 'sutun');
expect('commit\'lenmiş ama belge yok (dalda) → engelle', kind(m()), 'engelle');
expect('mesaj dosya adını ve belgeyi söylüyor', /003_sutun\.sql.*docs\/database\/schema\.md/.test(m().reason), true);

fs.appendFileSync(path.join(repo, 'docs', 'database', 'schema.md'), '- a.ad text\n');
expect('belge güncellendi (commit\'siz) → geç', kind(m()), 'geç');
g('add', '-A'); g('commit', '-q', '-m', 'belge');
expect('belge aynı dalda commit\'lendi → geç', kind(m()), 'geç');

fs.rmSync(path.join(repo, 'supabase'), { recursive: true });
expect('migration klasörü olmayan proje → ölçüm yok', measure(repo), null);

fs.rmSync(base, { recursive: true, force: true });
console.log(fail ? `\n✗ ${fail} test başarısız` : '\n✓ tümü geçti');
process.exit(fail ? 1 : 0);
