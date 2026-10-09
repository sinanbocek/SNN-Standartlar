// Alt ajan bekçisi testleri. Çalıştır: node hooks/test/guard-agent.test.js
//
// NEDEN: bu bekçi her Agent çağrısında çalışır. İki şeyi ASLA yapmamalı:
//   1. Çağrıyı ENGELLEMEK — uyarı kipidir.
//   2. 'allow' DÖNDÜRMEK — normalde onay soracak çağrıyı sessizce onaylar.
// İkisi de testle sabitlenir; kod değişirse kırmızıya döner.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const HOOKS = path.join(__dirname, '..');
// Ortak deponun kökü: testler hem depodan hem makineden (~/.claude/hooks) çalışır.
const ROOT = [
  process.env.SNN_STANDARTLAR,
  path.join(__dirname, '..', '..'),
  path.join(os.homedir(), '.claude', 'standartlar-canli'),
].find((p) => p && fs.existsSync(path.join(p, 'quality', 'agent-call.js')))
  || path.join(__dirname, '..', '..');

let fail = 0;
const expect = (name, actual, wanted) => {
  const ok = JSON.stringify(actual) === JSON.stringify(wanted);
  if (!ok) fail += 1;
  console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : `\n    gelen: ${JSON.stringify(actual)}\n    beklenen: ${JSON.stringify(wanted)}`}`);
};

function run(toolInput, extra = {}) {
  const r = spawnSync('node', [path.join(HOOKS, 'guard-agent.js')], {
    input: JSON.stringify({ tool_name: 'Agent', cwd: 'C:/p', tool_input: toolInput, ...extra }),
    encoding: 'utf8',
    env: { ...process.env, SNN_STANDARTLAR: ROOT },
  });
  return { code: r.status, out: r.stdout.trim() ? JSON.parse(r.stdout).hookSpecificOutput || {} : {} };
}

const INCOMPLETE = { description: 'teşhis', prompt: 'incele', subagent_type: 'general-purpose' };
const COMPLETE = { ...INCOMPLETE, model: 'haiku', effort: 'medium' };

console.log('— eksik çağrı uyarı üretir');
const r1 = run(INCOMPLETE);
expect('çıkış kodu 0 (iş durmaz)', r1.code, 0);
expect('uyarı bağlama eklenir', /\[alt ajan · uyarı\]/.test(r1.out.additionalContext || ''), true);
expect('model ve seviye birlikte anılır', /model yazılmamış/.test(r1.out.additionalContext) && /seviye/.test(r1.out.additionalContext), true);
// Bu iki satır kırmızıya dönerse bekçi uyarı kipinden çıkmış demektir.
expect('ASLA engellemez', r1.out.permissionDecision, undefined);
expect('ASLA allow döndürmez', 'permissionDecision' in r1.out, false);

console.log('— tam çağrı sessiz');
const r2 = run(COMPLETE);
expect('çıkış kodu 0', r2.code, 0);
expect('çıktı yok', r2.out, {});

console.log('— Kural 1 yakalanır');
expect('Fable uyarılır', /Fable/.test(run({ ...INCOMPLETE, model: 'fable', effort: 'medium' }).out.additionalContext || ''), true);

console.log('— bozuk girdi çökmez');
const r3 = spawnSync('node', [path.join(HOOKS, 'guard-agent.js')], { input: '{bozuk', encoding: 'utf8' });
expect('bozuk JSON → sessiz çıkış', [r3.status, r3.stdout.trim()], [0, '']);
expect('başka araç adı → sessiz', run(INCOMPLETE, { tool_name: 'Bash' }).out, {});

console.log(fail ? `\n${fail} test başarısız` : '\nTüm testler geçti');
process.exit(fail ? 1 : 0);
