// Kapı kayıt defteri testleri. Çalıştır: node quality/test/gate-registry.test.js
'use strict';
const path = require('path');
const g = require('../gate-registry');

let fail = 0;
const expect = (name, actual, wanted) => {
  const ok = JSON.stringify(actual) === JSON.stringify(wanted);
  if (!ok) fail += 1;
  console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : `\n    gelen: ${JSON.stringify(actual)}\n    beklenen: ${JSON.stringify(wanted)}`}`);
};

const ENTRY = { id: 'x', module: 'quality/x.js', test: 'bir test', vaka: '2026-09-19: bir şey oldu.' };
const ids = (raw) => g.parseGates(raw).gates.map((x) => x.id);
const problems = (raw) => g.parseGates(raw).problems;

console.log('— kayıt biçimi');
expect('tam kayıt geçer', ids({ gates: [ENTRY] }), ['x']);
expect('metin de okunur', ids(JSON.stringify({ gates: [ENTRY] })), ['x']);

console.log('— SABOTAJ: eksik alanlar sayılmamalı');
// Her biri "kapi kurdum ama gerekcesini yazmadim" durumunun bir bicimi.
expect('modülsüz kayıt sayılmaz', ids({ gates: [{ ...ENTRY, module: undefined }] }), []);
expect('testsiz kayıt sayılmaz', ids({ gates: [{ ...ENTRY, test: undefined }] }), []);
expect('vakasız kayıt sayılmaz', ids({ gates: [{ ...ENTRY, vaka: undefined }] }), []);
// TARIHSIZ vaka kayit degildir: "sanirim boyle olmustu" dogrulanamaz.
expect('tarihsiz vaka sayılmaz', ids({ gates: [{ ...ENTRY, vaka: 'bir zamanlar bir sorun olmuştu' }] }), []);
expect('tarihsizlik problems olarak bildirilir', problems({ gates: [{ ...ENTRY, vaka: 'tarihsiz' }] }).length, 1);
expect('problems mesajı kimliği söyler', problems({ gates: [{ ...ENTRY, vaka: 'tarihsiz' }] })[0].startsWith('x:'), true);

console.log('— test dosyası yolu');
expect('quality modülü', g.testPathFor('quality/compliance.js'), 'quality/test/compliance.test.js');
expect('alt klasörlü modül', g.testPathFor('debt-sync/lib/debt.js'), 'debt-sync/lib/test/debt.test.js');

console.log('— kancaların çağırdığı modüller');
const HOOK = "const a = require(shared('quality/wide-effect-git.js'));\nrequire(shared('quality/merge-gate.js'));";
expect('çağrılanlar bulunur', g.calledModules([HOOK]), ['quality/merge-gate.js', 'quality/wide-effect-git.js']);
expect('aynı modül bir kez', g.calledModules([HOOK, HOOK]).length, 2);
// SABOTAJ: bir kanca kayitsiz bir kapi calistiriyorsa yakalanmali.
expect('kayıtsız kapı yakalanır', g.unregistered(['quality/yeni-kapi.js'], [ENTRY]), ['quality/yeni-kapi.js']);
expect('kayıtlı kapı problems değil', g.unregistered(['quality/x.js'], [ENTRY]), []);
// debt-sync yonlendiricileri kapi degildir: veri okur, karar vermez.
expect('debt-sync yönlendiricisi sayılmaz', g.unregistered(['debt-sync/debts.js'], [ENTRY]), []);

console.log('— gerçek registryFile');
const real = g.verify();
expect('gerçek defterde problems yok', real.errors, []);
expect('kapı sayısı', real.gates.length > 10, true);
// Her vakanin tarihi olmali — defterin kendisi kurala uyuyor mu?
expect('her vaka tarihli', real.gates.every((x) => /20\d{2}-\d{2}-\d{2}/.test(x.vaka)), true);

console.log('— SABOTAJ: yanlış test adı yakalanmalı');
const fs = require('fs');
const os = require('os');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'snn-kapi-'));
fs.mkdirSync(path.join(tmp, 'quality', 'test'), { recursive: true });
fs.writeFileSync(path.join(tmp, 'quality', 'x.js'), '// kapı');
fs.writeFileSync(path.join(tmp, 'quality', 'test', 'x.test.js'), "expect('bambaska ad', 1, 1);");
const registryFile = path.join(tmp, 'gates.json');
fs.writeFileSync(registryFile, JSON.stringify({ gates: [ENTRY] }));
const wrongName = g.verify({ root: tmp, file: registryFile });
expect('bildirilen test yoksa hata', wrongName.errors.length, 1);
expect('hata test adını söyler', wrongName.errors[0].includes('bir test'), true);

fs.writeFileSync(path.join(tmp, 'quality', 'test', 'x.test.js'), "expect('bir test', 1, 1);");
expect('test varsa problems yok', g.verify({ root: tmp, file: registryFile }).errors, []);

fs.rmSync(path.join(tmp, 'quality', 'x.js'));
expect('modül yoksa hata', g.verify({ root: tmp, file: registryFile }).errors.length, 1);
fs.rmSync(tmp, { recursive: true, force: true });

console.log('— alt dizge sahte geçiş üretmemeli');
// 2026-09-19: ilk surum includes() kullaniyordu; 'baska bir test' metni 'bir test' adini
// iceriyor ve sabotaj testi KIRMIZIYA DONMUYORDU. Ad artik tirnak icinde tam aranir.
expect('tam ad bulunur', g.hasTestNamed("expect('bir test', 1, 1)", 'bir test'), true);
expect('alt dizge yetmez', g.hasTestNamed("expect('baska bir test', 1, 1)", 'bir test'), false);
expect('çift tırnak da sayılır', g.hasTestNamed('expect("bir test", 1, 1)', 'bir test'), true);

console.log('— rapor');
expect('problems yoksa yeşil', g.report({ gates: [ENTRY], errors: [] }).includes('✓'), true);
expect('problems varsa kırmızı', g.report({ gates: [], errors: ['bir sorun'] }).includes('✗'), true);
expect('rapor kurala yönlendirir', g.report({ gates: [], errors: ['x'] }).includes('olcum-standardi.md'), true);

console.log(fail ? `\n${fail} test başarısız` : '\nTüm testler geçti');
process.exit(fail ? 1 : 0);
