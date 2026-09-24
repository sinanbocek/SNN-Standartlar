// Uyum issue senkronu testleri. Çalıştır: node quality/test/compliance-issues.test.js
'use strict';
const s = require('../compliance-issues');

let fail = 0;
const expect = (name, actual, wanted) => {
  const ok = JSON.stringify(actual) === JSON.stringify(wanted);
  if (!ok) fail += 1;
  console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : `\n    gelen: ${JSON.stringify(actual)}\n    beklenen: ${JSON.stringify(wanted)}`}`);
};

const GAP = { id: 'kod-dili-akisi', title: 'Kod dili turnikesi', detail: 'yok', fix: 'kopyala' };
const types = (p) => s.plan(p).map((a) => a.type);

console.log('— başlık ve kimlik');
expect('başlıkta kimlik var', s.issueTitle(GAP), '[UYUM:kod-dili-akisi] Kod dili turnikesi');
expect('başlıktan kimlik okunur', s.idFromTitle(s.issueTitle(GAP)), 'kod-dili-akisi');
// Kutuk issue'lari [TB-xxx] ile baslar; onlari SAHIPLENMEMELI.
expect('teknik borç issue\'su sayılmaz', s.idFromTitle('[TB-004] Kancaların testi yok'), null);
expect('alakasız başlık sayılmaz', s.idFromTitle('Bir hata var'), null);

console.log('— plan');
expect('eksik var, issue yok → aç', types({ gaps: [GAP], issues: [] }), ['create']);
expect('eksik var, issue açık → işlem yok', types({ gaps: [GAP], issues: [{ number: 5, title: s.issueTitle(GAP), state: 'OPEN' }] }), []);
expect('eksik yok, issue açık → kapat', types({ gaps: [], issues: [{ number: 5, title: s.issueTitle(GAP), state: 'OPEN' }] }), ['close']);
expect('eksik yok, issue kapalı → işlem yok', types({ gaps: [], issues: [{ number: 5, title: s.issueTitle(GAP), state: 'CLOSED' }] }), []);
// Elle kapatmak eksigi GIDERMEZ: kapanis yalnizca olcumden gelir (kutuk senkronundaki kural).
expect('eksik sürüyor, issue elle kapatılmış → yeniden aç', types({ gaps: [GAP], issues: [{ number: 5, title: s.issueTitle(GAP), state: 'CLOSED' }] }), ['reopen']);
expect('başlık değişmişse güncelle', types({ gaps: [GAP], issues: [{ number: 5, title: '[UYUM:kod-dili-akisi] Eski başlık', state: 'OPEN' }] }), ['update']);
// Baska kaynaktan gelen issue'lara DOKUNULMAZ.
expect('yabancı issue kapatılmaz', types({ gaps: [], issues: [{ number: 9, title: '[TB-004] başka iş', state: 'OPEN' }] }), []);
expect('hiç eksik ve issue yoksa boş', s.plan({}), []);
// Ölçülemeyen ölçüt "giderildi" sayılmaz: açık issue KAPATILMAZ, yeni issue da açılmaz (Kural 3).
// Kapatılsaydı ertesi gün okuma düzelince yeniden açılırdı: boşuna aç-kapa.
expect('ölçülemeyen ölçütün açık issue\'su kapatılmaz', types({ gaps: [], unknown: ['kod-dili-akisi'], issues: [{ number: 5, title: s.issueTitle(GAP), state: 'OPEN' }] }), []);
expect('ölçülemeyen ölçüt için issue açılmaz', types({ gaps: [], unknown: ['kod-dili-akisi'], issues: [] }), []);

console.log('— birden çok eksik');
const IKI = [GAP, { id: 'rehber-atfi', title: 'Rehberde aile standardı atfı', detail: 'yok', fix: 'ekle' }];
expect('ikisi de açılır', types({ gaps: IKI, issues: [] }), ['create', 'create']);
expect('biri giderilmiş → biri kapanır', types({
  gaps: [IKI[0]],
  issues: IKI.map((g, i) => ({ number: i + 1, title: s.issueTitle(g), state: 'OPEN' })),
}), ['close']);

console.log('— proje süzgeci (kademeli uygulama)');
// 27 issue 11 depoya aynı anda düşerse, yanlış bir şey varsa 27 kez temizlik gerekir.
// Önce tek projede denenir. Süzgeç hem klasör adını hem depo adını kabul eder.
const PROJECTS = [{ repo: 'a/bir', dir: 'bir' }, { repo: 'a/iki', dir: 'iki' }];
const pick = (only) => PROJECTS.filter((p) => !only || p.dir === only || p.repo === only).map((p) => p.dir);
expect('süzgeçsiz hepsi', pick(null), ['bir', 'iki']);
expect('klasör adıyla süzülür', pick('iki'), ['iki']);
expect('depo adıyla da süzülür', pick('a/bir'), ['bir']);
expect('tanınmayan ad hiçbirini seçmez', pick('yok'), []);

console.log('— gövde');
const body = s.issueBody(GAP);
expect('ölçüt kimliği görünür', body.includes('kod-dili-akisi'), true);
expect('yapılacak iş görünür', body.includes('kopyala'), true);
// Ajan "kapatayim gitsin" demesin diye acikca yaziyoruz.
expect('elle kapatmanın işe yaramadığı yazar', body.includes('yeniden açılır'), true);
expect('kurala yönlendirir', body.includes('uyum-olcumu.md'), true);

console.log('— rapor');
const text = s.report([
  { project: 'A', actions: s.plan({ gaps: [GAP], issues: [] }) },
  { project: 'B', actions: [] },
  { project: 'C', error: 'klonlanamadı' },
]);
expect('açılacak issue görünür', text.includes('issue AÇ'), true);
expect('değişmeyen proje görünür', text.includes('değişiklik yok'), true);
expect('hatalı proje görünür', text.includes('klonlanamadı'), true);
expect('toplam sayılır', text.startsWith('Toplam 1 işlem'), true);
const unknownText = s.report([{ project: 'D', actions: [], unknown: ['kutuk', 'kutuk-adresi'] }]);
expect('ölçülemeyen ölçüt raporda görünür', /D: ölçülemedi — kutuk, kutuk-adresi/.test(unknownText), true);

console.log(fail ? `\n${fail} test başarısız` : '\nTüm testler geçti');
process.exit(fail ? 1 : 0);
