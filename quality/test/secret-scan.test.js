// Anahtar taraması testleri. Sahte anahtarlar çalışma anında parçalardan üretilir: bu dosya taramaya kendini yakalatmaz
// ve depoda gerçek anahtar biçiminde metin durmaz. Çalıştır: node quality/test/secret-scan.test.js
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { scanLine, scanDiff, report, looksPlaceholder } = require('../secret-scan');

let fail = 0;
const expect = (name, actual, wanted) => {
  const ok = JSON.stringify(actual) === JSON.stringify(wanted);
  if (!ok) fail += 1;
  console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : `\n    gelen: ${JSON.stringify(actual)}\n    beklenen: ${JSON.stringify(wanted)}`}`);
};

// Sahte ama gerçekçi değerler (rastgele karakterler; hiçbiri geçerli anahtar değildir)
const rand = (n, set = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789') => Array.from({ length: n }, (_, i) => set[(i * 7919 + n * 31) % set.length]).join('');
const b64u = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = (payload) => [b64u({ alg: 'HS256', typ: 'JWT' }), b64u(payload), rand(43)].join('.');
const GH = ['gh', 'p_'].join('') + rand(36);
const SBP = ['sb', 'p_'].join('') + rand(40, '0123456789abcdef');
const SERVICE = jwt({ iss: 'supabase', ref: 'abc', role: 'service_role', exp: 2000000000 });
const ANON = jwt({ iss: 'supabase', ref: 'abc', role: 'anon', exp: 2000000000 });
const DEMO = jwt({ iss: 'supabase-demo', role: 'anon' });
const APPLE = jwt({ iss: 'TEAM', aud: 'https://appleid.apple.com', exp: 2000000000 });
const PK = ['-----BEGIN', 'PRIVATE KEY-----'].join(' ');
const types = (l) => scanLine(l).map((f) => f.type);

console.log('— satır taraması (bugünkü gerçek bulguların sahte eşleri)');
expect('GitHub anahtarı', types(`GITHUB_TOKEN=${GH}`), ['GitHub anahtarı']);
expect('Supabase erişim anahtarı', types(`SUPABASE_ACCESS_TOKEN=${SBP}`), ['Supabase erişim anahtarı']);
expect('service_role JWT', types(`const key = '${SERVICE}';`), ['Tam yetkili veritabanı anahtarı (service_role)']);
expect('Apple istemci anahtarı (rolsüz JWT)', scanLine(APPLE).map((f) => f.reason), ['hedef=https://appleid.apple.com']);
expect('özel anahtar, JSON içinde gövdesiyle', types(`"private_key": "${PK}\\n${rand(64)}"`), ['Özel anahtar (private key)']);
expect('özel anahtar, PEM dosyasında yalnız başlık satırı', types(PK), ['Özel anahtar (private key)']);
expect('kodun başlığı metin olarak araması anahtar değil', types(`if (pem.includes('${PK}')) return pem;`), []);

console.log('— tehlikesiz sayılanlar');
expect('anon JWT (istemciye zaten gider) sayılmaz', types(`VITE_SUPABASE_ANON_KEY=${ANON}`), []);
expect('Supabase demo anahtarı sayılmaz', types(DEMO), []);
expect('yer tutucu GitHub anahtarı sayılmaz', types(`GITHUB_TOKEN=${['gh', 'p_'].join('')}${'x'.repeat(36)}`), []);
expect('yer tutucu tespiti', [looksPlaceholder(`${'sbp_'}${'0'.repeat(40)}`), looksPlaceholder(SBP)], [true, false]);
expect('bozuk JWT biçimi çökmez', types('eyJhbGciOiJIUzI1NiJ9.eyJub3Rqc29uIjp9x.abcdefghijklm'), []);

console.log('— diff: yalnız eklenen satırlar');
const diff = [
  'diff --git a/.env.example b/.env.example',
  '--- a/.env.example',
  '+++ b/.env.example',
  '@@ -1,0 +3,2 @@',
  `+SUPABASE_URL=https://abc.supabase.co`,
  `+GITHUB_TOKEN=${GH}`,
  'diff --git a/eski.js b/eski.js',
  '--- a/eski.js',
  '+++ b/eski.js',
  '@@ -10 +10 @@',
  `-const key = '${SERVICE}';`,
  `+const key = process.env.SUPABASE_SERVICE_ROLE_KEY;`,
].join('\n');
const f = scanDiff(diff);
expect('eklenen anahtar dosya:satır ile bulunur', f.map((x) => `${x.file}:${x.line} ${x.type}`), ['.env.example:4 GitHub anahtarı']);
expect('SİLİNEN anahtar bulgu sayılmaz (temizlik PR\'ı kırmızı olmaz)', f.some((x) => x.file === 'eski.js'), false);

console.log('— rapor değer sızdırmaz');
const r = report(f);
expect('rapor anahtar değerini içermez', [r.includes(GH), r.includes(GH.slice(4, 14))], [false, false]);
expect('temiz rapor', report([]).startsWith('✓'), true);

console.log('— gerçek git deposuyla komut satırı');
const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'anahtar-'));
const g = (...a) => execFileSync('git', ['-C', repo, '-c', 'user.email=t@t', '-c', 'user.name=t', ...a], { stdio: 'ignore' });
execFileSync('git', ['init', '-q', '-b', 'main', repo]);
fs.writeFileSync(path.join(repo, 'eski.js'), `const k = '${SERVICE}';\n`);
g('add', '-A'); g('commit', '-q', '-m', 'eski anahtar (depoda zaten var)');
const base = execFileSync('git', ['-C', repo, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
g('switch', '-q', '-c', 'pr');
fs.writeFileSync(path.join(repo, 'yeni.md'), 'temiz değişiklik\n');
g('add', '-A'); g('commit', '-q', '-m', 'temiz');
const cli = () => { try { execFileSync('node', [path.join(__dirname, '..', 'secret-scan.js'), '--diff', base], { cwd: repo, stdio: 'pipe' }); return 0; } catch (e) { return e.status; } };
expect('depoda eski anahtar var ama PR temiz → çıkış 0', cli(), 0);
fs.writeFileSync(path.join(repo, 'ayar.env'), `SUPABASE_ACCESS_TOKEN=${SBP}\n`);
g('add', '-A'); g('commit', '-q', '-m', 'anahtar eklendi');
expect('PR anahtar ekliyor → çıkış 1', cli(), 1);
fs.rmSync(repo, { recursive: true, force: true });

console.log(fail ? `\n✗ ${fail} test başarısız` : '\n✓ tümü geçti');
process.exit(fail ? 1 : 0);
