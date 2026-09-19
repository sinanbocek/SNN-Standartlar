// Oturum açılış bekçisi testleri. Çalıştır: node hooks/test/session-start.test.js
//
// NEDEN (TB-004): bu bekçi TÜM projelerde her oturumda çalışır ve canlı kopya
// tazelemesini de o tetikler. Çökerse hem açılış özeti hem kural güncellemesi durur —
// 2026-09-15'te tam bu yaşandı ("forgottenWork is not a function"), testi yoktu.
//
// Bu yüzden testlerin çoğu "ÇÖKMEZ" üzerinedir: bir alt kontrol bozulsa bile açılış sürmeli.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync, execFileSync } = require('child_process');

const HOOKS = path.join(__dirname, '..');
// Ortak deponun koku: testler hem depodan hem makineden (~/.claude/hooks) calisir.
// Makinede depo-goreli yol ortak depo DEGILDIR; canli kopyaya duselim (2026-09-19 olcumu).
const ROOT = [
  process.env.SNN_STANDARTLAR,
  path.join(__dirname, '..', '..'),
  path.join(os.homedir(), '.claude', 'standartlar-canli'),
].find((p) => p && fs.existsSync(path.join(p, 'debt-sync', 'lib', 'debt.js')))
  || path.join(__dirname, '..', '..');

let fail = 0;
const expect = (name, actual, wanted) => {
  const ok = JSON.stringify(actual) === JSON.stringify(wanted);
  if (!ok) fail += 1;
  console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : `\n    gelen: ${JSON.stringify(actual)}\n    beklenen: ${JSON.stringify(wanted)}`}`);
};

const git = (dir, ...args) => execFileSync('git', ['-C', dir, ...args], { stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8' });

function run(input, env = {}) {
  const r = spawnSync('node', [path.join(HOOKS, 'session-start.js')], {
    input: JSON.stringify(input),
    encoding: 'utf8',
    env: { ...process.env, SNN_STANDARTLAR: ROOT, CLAUDE_PROJECTS_ROOT: env.CLAUDE_PROJECTS_ROOT || path.join(os.tmpdir(), 'snn-yok-klasor'), ...env },
  });
  return { code: r.status, out: r.stdout, err: r.stderr };
}

// Tek projelik sahte bir çalışma alanı
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'snn-acilis-'));
const project = path.join(base, 'DenemeProje');
fs.mkdirSync(path.join(project, 'docs'), { recursive: true });
fs.writeFileSync(path.join(project, 'package.json'), JSON.stringify({ version: '1.2.3' }));
fs.writeFileSync(path.join(project, 'docs', 'teknik-borc.md'), [
  '# Teknik Borç Kütüğü', '', '### TB-001 — Deneme kaydı', '- **Öncelik:** P1 (Acil)', '',
].join('\n'));
git(project, 'init', '-q', '-b', 'main');
git(project, 'add', '.');
git(project, '-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '-m', 'ilk');

console.log('— temel çıktı');
const r1 = run({ session_id: 'test-1', cwd: project }, { CLAUDE_PROJECTS_ROOT: base });
expect('çıkış kodu 0', r1.code, 0);
expect('proje adı yazılır', r1.out.includes('DenemeProje'), true);
expect('sürüm yazılır', r1.out.includes('1.2.3'), true);
expect('dal yazılır', r1.out.includes('main'), true);
expect('teknik borç sayısı yazılır', r1.out.includes('P1:1'), true);

console.log('— ÇÖKMEZ: bozuk ya da eksik girdi');
// Bekçi stdin'den JSON okur; bozuksa boş girdiyle devam etmeli, patlamamalı.
const badJson = spawnSync('node', [path.join(HOOKS, 'session-start.js')], {
  input: 'bu JSON değil', encoding: 'utf8',
  env: { ...process.env, SNN_STANDARTLAR: ROOT, CLAUDE_PROJECTS_ROOT: base },
});
expect('geçersiz JSON', badJson.status, 0);
expect('boş girdi', run({}, { CLAUDE_PROJECTS_ROOT: base }).code, 0);
expect('git olmayan klasör', run({ cwd: base }, { CLAUDE_PROJECTS_ROOT: base }).code, 0);
expect('var olmayan klasör', run({ cwd: path.join(base, 'yok') }, { CLAUDE_PROJECTS_ROOT: base }).code, 0);

console.log('— ÇÖKMEZ: ortak depo bulunamazsa');
// 2026-09-15 olayının çekirdeği: ortak depodaki bir modül kaybolunca açılış tamamen durdu.
// Artık her alt kontrol kendi try/catch'inde; biri düşse de açılış sürer.
const detached = run({ session_id: 't', cwd: project }, {
  SNN_STANDARTLAR: path.join(base, 'olmayan-ortak-depo'),
  CLAUDE_PROJECTS_ROOT: base,
});
expect('yine 0 ile çıkar', detached.code, 0);
expect('proje bilgisi yine yazılır', detached.out.includes('DenemeProje'), true);
// Sessizce geçmez: neyin çalışmadığını söyler.
expect('çalışmayan kontrol bildirilir', /çalışmadı|Kurallar/.test(detached.out), true);

console.log('— kütük yoksa');
const noLedger = path.join(base, 'Kutuksuz');
fs.mkdirSync(noLedger, { recursive: true });
git(noLedger, 'init', '-q', '-b', 'main');
fs.writeFileSync(path.join(noLedger, 'a.txt'), 'x');
git(noLedger, 'add', '.');
git(noLedger, '-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '-m', 'ilk');
const r2 = run({ session_id: 't', cwd: noLedger }, { CLAUDE_PROJECTS_ROOT: base });
expect('çöker mi', r2.code, 0);
expect('proje yine görünür', r2.out.includes('Kutuksuz'), true);

console.log('— oturum defteri');
// Aynı projede ikinci oturum açıldığında haber verilmeli (kilit değil, haber).
const registryDir = path.join(base, '.claude', 'oturumlar');
run({ session_id: 'birinci', cwd: project }, { CLAUDE_PROJECTS_ROOT: base, HOME: base, USERPROFILE: base });
const r3 = run({ session_id: 'ikinci', cwd: project }, { CLAUDE_PROJECTS_ROOT: base, HOME: base, USERPROFILE: base });
expect('ikinci oturum haber alır', /başka oturum açık/.test(r3.out), true);
expect('defter dosyası yazıldı', fs.existsSync(path.join(registryDir, 'DenemeProje.json')), true);

console.log('— çıktı stdout\'a gider (bağlama eklenir)');
expect('stdout dolu', r1.out.trim().length > 0, true);

fs.rmSync(base, { recursive: true, force: true });

console.log(fail ? `\n${fail} test başarısız` : '\nTüm testler geçti');
process.exit(fail ? 1 : 0);
