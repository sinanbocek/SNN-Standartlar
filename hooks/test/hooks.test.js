// Global hook testleri. Çalıştır: node ~/.claude/hooks/test/hooks.test.js
'use strict';
const path = require('path');
const { spawnSync } = require('child_process');
const { parseDebts } = require('../lib/debt');

const HOOKS = path.join(__dirname, '..');
let fail = 0;

function run(script, input) {
  const r = spawnSync('node', [path.join(HOOKS, script)], { input: JSON.stringify(input), encoding: 'utf8' });
  if (!r.stdout.trim()) return 'allow';
  return JSON.parse(r.stdout).hookSpecificOutput.permissionDecision;
}

function expect(name, actual, wanted) {
  const ok = actual === wanted;
  if (!ok) fail += 1;
  console.log(`${ok ? '✓' : '✗'} ${name} → ${actual}${ok ? '' : ` (beklenen: ${wanted})`}`);
}

const bash = (c) => run('guard-bash.js', { tool_input: { command: c } });
const file = (p, content) => run('guard-files.js', { tool_input: { file_path: p, content } });

console.log('— guard-bash');
expect('force push', bash('git push --force origin main'), 'deny');
expect('force-with-lease', bash('git push --force-with-lease'), 'deny');
expect('--no-verify', bash('git commit -m x --no-verify'), 'deny');
expect('reset --hard', bash('git reset --hard HEAD~1'), 'deny');
expect('git clean -fd', bash('git clean -fd'), 'deny');
expect('.gemini okuma', bash('Get-Content .gemini\\settings.json'), 'deny');
// Kullanıcı kararı (2026-09-15): onay penceresi kaldırıldı; bu işlemler sohbette onayla yönetilir.
expect('firebase deploy (pencere yok)', bash('firebase deploy --only hosting'), 'allow');
expect('npm run deploy:prod (pencere yok)', bash('npm run deploy:prod'), 'allow');
expect('push main (pencere yok)', bash('git push origin main'), 'allow');
expect('supabase db push (pencere yok)', bash('supabase db push'), 'allow');
// Onay penceresi yok (ASK boş), ama birleştirme kapısı kontrolleri denetler; numarasız birleştirme çevrimdışı da reddedilir.
// Yeşil/kırmızı kontrol durumları: snn-standartlar/kalite/test/birlestirme-kapisi.test.js
expect('gh pr merge numarasız → deny (birleştirme kapısı)', bash('gh pr merge --merge'), 'deny');
expect('dal push', bash('git push -u origin feat/debt'), 'allow');
expect('build', bash('git status && npm run build'), 'allow');
expect('git log -f benzeri', bash('git log --format=%H -n 3'), 'allow');
expect('vite önbellek silme', bash('rm -rf node_modules/.vite'), 'allow');
expect('supabase db reset (yerel)', bash('supabase db reset'), 'allow');

console.log('— guard-files');
expect('.env', file('C:\\p\\.env', 'A=1'), 'deny');
expect('.env.local', file('C:\\p\\.env.local', 'A=1'), 'deny');
expect('.gemini', file('C:\\p\\.gemini\\settings.json', '{}'), 'deny');
expect('servis hesabı', file('C:\\p\\firebase-service-account.json', '{}'), 'deny');
expect('GitHub token içerik', file('C:\\p\\src\\a.ts', 'const k = "ghp_abcdefghijklmnopqrstuvwxyz0123456789"'), 'deny');
expect('JWT içerik', file('C:\\p\\docs\\x.md', 'eyJhbGciOiJIUzI1NiIsInR5cCI6.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4eHh4.abcdefghijklmnopqrstuvwxyz12'), 'deny');
expect('Edit new_string', run('guard-files.js', { tool_input: { file_path: 'C:\\p\\a.ts', new_string: 'sbp_' + 'a'.repeat(40) } }), 'deny');
expect('.env.example', file('C:\\p\\.env.example', 'VITE_SUPABASE_URL='), 'allow');
expect('environment.ts', file('C:\\p\\src\\environment.ts', 'export const x = 1'), 'allow');
expect('normal kod', file('C:\\p\\src\\a.ts', 'const token = import.meta.env.VITE_KEY'), 'allow');

console.log('— borç ayrıştırıcı');
const sample = [
  '### TB-001 — Birinci', '- **Öncelik:** P1', '---',
  '### TB-002 — İkinci (öncelik yok)', '---',
  '### TB-010 - Kısa tire', '- **Öncelik:** P3',
  '## TB-020 — İki diyezli başlık (Yonetici-Ozeti)', '- **Öncelik:** P2',
  '#### TB-099 alt başlık sayılmaz',
].join('\n');
const items = parseDebts(sample);
expect('kayıt sayısı', String(items.length), '4');
expect('## başlık okunur', items[3].priority, 'P2');
expect('P1 okunur', items[0].priority, 'P1');
expect('önceliksiz P?', items[1].priority, 'P?');
expect('kısa tire kabul', items[2].id, 'TB-010');

const yeni = parseDebts([
  '### TB-091 — Yeni biçim', '- **Öncelik:** P1 (Acil)', '- **Issue:** #12',
  '#### 🟢 Sade Anlatım', '- **Sorun ne?** x', '#### 🔧 Teknik Detay', '- **Açıklama:** y', '---',
  '### TB-092 — İkinci', '- **Öncelik:** P3 (Fırsatta)',
].join('\n'));
expect('yeni biçim: alt başlıklar kaydı bölmez', String(yeni.length), '2');
expect('yeni biçim: "P1 (Acil)" okunur', yeni[0].priority, 'P1');

console.log(fail ? `\n✗ ${fail} test başarısız` : '\n✓ tümü geçti');
process.exit(fail ? 1 : 0);
