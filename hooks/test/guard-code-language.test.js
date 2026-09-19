// Kod dili uyarı bekçisi testleri. Çalıştır: node hooks/test/guard-code-language.test.js
//
// NEDEN (TB-004): bu bekçi her Edit/Write çağrısında çalışır. İki şeyi ASLA yapmamalı:
//   1. Yazmayı ENGELLEMEK — uyarı kipidir; yarım kalmış işi iki dilli bırakır.
//   2. 'allow' DÖNDÜRMEK — normalde onay soracak yazmaları sessizce onaylar, güvenliği gevşetir.
// İkisi de testle sabitlenir; kod değişirse kırmızıya döner.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

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

function run(input, env = {}) {
  const r = spawnSync('node', [path.join(HOOKS, 'guard-code-language.js')], {
    input: JSON.stringify(input),
    encoding: 'utf8',
    env: { ...process.env, SNN_STANDARTLAR: ROOT, ...env },
  });
  return { code: r.status, out: r.stdout.trim() ? JSON.parse(r.stdout).hookSpecificOutput || {} : {} };
}
const write = (file, content, env) => run({ tool_name: 'Write', cwd: 'C:/p', tool_input: { file_path: file, content } }, env);

console.log('— Türkçe ad uyarı üretir');
const turkishName = write('C:/p/src/a.ts', 'const gunSonu = 1;\nconst satirlar = [];');
expect('uyarı geldi', !!turkishName.out.additionalContext, true);
expect('adlar mesajda', turkishName.out.additionalContext.includes('gunSonu') && turkishName.out.additionalContext.includes('satirlar'), true);

console.log('— ASLA engellemez, ASLA allow demez');
// Uyarı vermek için izin kararı döndürmek, normalde onay soracak yazmaları da sessizce
// onaylardı. Bekçi hiçbir koşulda permissionDecision döndürmez.
expect('permissionDecision yok', 'permissionDecision' in turkishName.out, false);
expect('çıkış kodu 0', turkishName.code, 0);

console.log('— temiz kod sessiz');
expect('İngilizce ad', write('C:/p/src/a.ts', 'const dayEnd = 1;').out, {});
expect('taranmayan uzantı', write('C:/p/README.md', 'const gunSonu = 1;').out, {});
expect('boş içerik', write('C:/p/src/a.ts', '').out, {});

console.log('— aile istisnası burada da geçerli');
// Kapılar aynı kaynaktan beslenmezse zamanla ayrışır; uyarı kipi de wordSet() kullanır.
expect('tradeKasa sessiz', write('C:/p/src/a.ts', 'const tradeKasa = 1;').out, {});
expect('bakiyeKurus uyarır', !!write('C:/p/src/a.ts', 'const bakiyeKurus = 1;').out.additionalContext, true);

console.log('— yalnız YENİ yazılan metin taranır');
// old_string taranmaz: geçmiş kod bu kapının işi değil, projenin kütüğünün işidir.
const edit = run({ tool_name: 'Edit', cwd: 'C:/p', tool_input: { file_path: 'C:/p/src/a.ts', old_string: 'gunSonu', new_string: 'dayEnd' } });
expect('eski metin sayılmaz', edit.out, {});
const multi = run({ tool_name: 'MultiEdit', cwd: 'C:/p', tool_input: { file_path: 'C:/p/src/a.ts', edits: [{ new_string: 'const x = 1;' }, { new_string: 'const hataAdayi = 2;' }] } });
expect('MultiEdit tüm düzenlemeler', !!multi.out.additionalContext, true);

console.log('— kural yüklenemezse İŞ DURMAZ');
// Ortak depo bulunamazsa bekçi sessizce çekilir; bu yalnız bir uyarı katmanıdır.
const detached = write('C:/p/src/a.ts', 'const gunSonu = 1;', { SNN_STANDARTLAR: path.join(__dirname, 'olmayan-klasor') });
expect('sessizce çekilir', detached.out, {});
expect('yine de 0 ile çıkar', detached.code, 0);

console.log('— bozuk girdi çökertmez');
const badInput = spawnSync('node', [path.join(HOOKS, 'guard-code-language.js')], { input: 'bu JSON değil', encoding: 'utf8', env: { ...process.env, SNN_STANDARTLAR: ROOT } });
expect('geçersiz JSON', badInput.status, 0);
const noPath = run({ tool_name: 'Write', tool_input: {} });
expect('dosya yolu yok', noPath.code, 0);

console.log(fail ? `\n${fail} test başarısız` : '\nTüm testler geçti');
process.exit(fail ? 1 : 0);
