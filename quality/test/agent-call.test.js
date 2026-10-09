// Alt ajan çağrısı bekçisi testleri. Çalıştır: node quality/test/agent-call.test.js
'use strict';
const a = require('../agent-call');

let fail = 0;
const expect = (name, actual, wanted) => {
  const ok = JSON.stringify(actual) === JSON.stringify(wanted);
  if (!ok) fail += 1;
  console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : `\n    gelen: ${JSON.stringify(actual)}\n    beklenen: ${JSON.stringify(wanted)}`}`);
};
const ids = (input) => a.findings(input).map((f) => f.id);

console.log('— gerçek vaka');
// 2026-10-09, Pulmaca (SNN-Games klasörü): teşhis ajanları model ve seviye verilmeden açıldı.
// Gerçek çağrının girdi biçimi: description + prompt + subagent_type, model/effort yok.
const PULMACA = { description: 'Pulmaca TB-003 teşhisi', prompt: 'Şu kaydı incele…', subagent_type: 'general-purpose' };
expect('2026-10-09 Pulmaca: modelsiz ve seviyesiz çağrı yakalanır', ids(PULMACA), ['model-yok', 'seviye-yok']);
// Ölçümde en sık ikinci biçim (97 çağrı): model var, seviye yok.
expect('model var seviye yok yakalanır', ids({ ...PULMACA, model: 'sonnet' }), ['seviye-yok']);

console.log('— tam çağrı temiz');
expect('Haiku · low temiz', ids({ ...PULMACA, model: 'haiku', effort: 'low' }), []);
expect('Sonnet · medium temiz', ids({ ...PULMACA, model: 'sonnet', effort: 'medium' }), []);
expect('Sonnet · high temiz', ids({ ...PULMACA, model: 'sonnet', effort: 'high' }), []);
expect('Opus · medium temiz (seyrek ama izinli)', ids({ ...PULMACA, model: 'opus', effort: 'medium' }), []);
expect('büyük harf ve boşluk tolere edilir', ids({ ...PULMACA, model: ' Sonnet ', effort: 'Medium' }), []);

console.log('— Kural 1: yasak ayarlar');
expect('Fable alt ajanda yakalanır', ids({ ...PULMACA, model: 'fable', effort: 'medium' }), ['fable']);
expect('Haiku · high yakalanır', ids({ ...PULMACA, model: 'haiku', effort: 'high' }), ['haiku-yuksek']);
expect('Haiku · max yakalanır', ids({ ...PULMACA, model: 'haiku', effort: 'max' }), ['haiku-yuksek']);
expect('Haiku · medium temiz', ids({ ...PULMACA, model: 'haiku', effort: 'medium' }), []);

console.log('— bilinmeyen değer');
expect('tabloda olmayan model', ids({ ...PULMACA, model: 'gpt', effort: 'low' }), ['model-bilinmiyor']);
expect('tanınmayan seviye', ids({ ...PULMACA, model: 'sonnet', effort: 'orta' }), ['seviye-bilinmiyor']);

console.log('— muafiyet');
// fork üst oturumun modelini kasıtla miras alır; model/effort orada anlamsız.
expect('fork tipi bakılmaz', ids({ ...PULMACA, subagent_type: 'fork' }), []);
expect('boş girdi çökmez', ids(undefined), ['model-yok', 'seviye-yok']);

console.log('— ileti');
const msg = a.message(a.findings(PULMACA), PULMACA.description);
expect('ileti başlık taşır', /\[alt ajan · uyarı\]/.test(msg), true);
expect('ileti açıklamayı gösterir', msg.includes('Pulmaca TB-003'), true);
expect('ileti standardı gösterir', msg.includes('alt-ajan-standardi.md'), true);
expect('ileti engel olmadığını söyler', /ENGEL değildir/.test(msg), true);
expect('bulgu yoksa ileti boş', a.message([], 'x'), '');

console.log(fail ? `\n${fail} test başarısız` : '\nTüm testler geçti');
process.exit(fail ? 1 : 0);
