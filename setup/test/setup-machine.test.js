// Makine kurulum planı testleri. Çalıştır: node setup/test/setup-machine.test.js
'use strict';
const m = require('../setup-machine');

let fail = 0;
const expect = (name, actual, wanted) => {
  const ok = JSON.stringify(actual) === JSON.stringify(wanted);
  if (!ok) fail += 1;
  console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : `\n    gelen: ${JSON.stringify(actual)}\n    beklenen: ${JSON.stringify(wanted)}`}`);
};

console.log('— dosya planı');
const SRC = ['guard-bash.js', 'debt-sync.js', 'lib/shared.js'];
const TGT = ['guard-bash.js', 'borc-senkron.js', 'lib/ortak.js'];
const p = m.planFiles(SRC, TGT, () => true);
expect('kaynakta olup hedefte olmayan kopyalanır', p.copy.sort(), ['debt-sync.js', 'lib/shared.js']);
// Yeniden adlandırma artığı SİLİNMELİ: kalırsa eski dosya settings.json'dan çağrılmaya devam eder.
expect('hedefte olup kaynakta olmayan silinir', p.remove.sort(), ['borc-senkron.js', 'lib/ortak.js']);
expect('aynı içerik kopyalanmaz', m.planFiles(['a.js'], ['a.js'], () => true).copy, []);
expect('farklı içerik kopyalanır', m.planFiles(['a.js'], ['a.js'], () => false).copy, ['a.js']);
expect('boş hedefe hepsi kopyalanır', m.planFiles(SRC, [], () => false).copy.length, 3);
expect('boş hedefte silinecek yok', m.planFiles(SRC, [], () => false).remove, []);

console.log('— settings planı');
const AYAR = JSON.stringify({
  hooks: { Stop: [{ hooks: [{ command: 'node "C:/u/.claude/hooks/stop-borc-gonderim.js"' }] }] },
});
const s = m.planSettings(AYAR, ['stop-debt-push.js', 'guard-bash.js', 'session-start.js']);
expect('eski ad yakalanır', s.stale.map((x) => x.from), ['stop-borc-gonderim.js']);
expect('yeni karşılığı bulunur', s.stale[0].to, 'stop-debt-push.js');
expect('kayıtlı olmayan bekçi bildirilir', s.missing.map((x) => x.file).sort(), ['guard-bash.js', 'session-start.js']);
// stop-debt-push.js EKSIK sayilmaz: stale kaydin yeniden adlandirilmasiyla zaten gelecek.
// Ilk surum ikisini birden raporluyordu; test yazarken goruldu ve kod duzeltildi.
expect('yeniden adlandırmayla gelecek olan eksik sayılmaz', s.missing.some((x) => x.file === 'stop-debt-push.js'), false);
// Kaynakta olmayan bir bekçi "eksik" sayılmamalı: henüz yazılmamış olabilir.
expect('kaynakta yoksa eksik sayılmaz', m.planSettings('{}', []).missing, []);
expect('karşılığı bilinmeyen eski ad null döner', m.planSettings('hooks/bilinmeyen.js', ['a.js']).stale[0].to, null);
expect('aynı ad iki kez sayılmaz', m.planSettings('hooks/eski.js hooks/eski.js', ['a.js']).stale.length, 1);

console.log('— settings yeniden yazma');
const rewritten = m.rewriteSettings(AYAR);
expect('eski ad değişti', rewritten.includes('stop-debt-push.js'), true);
expect('eski ad kalmadı', rewritten.includes('stop-borc-gonderim.js'), false);
expect('geçerli JSON kalır', typeof JSON.parse(rewritten), 'object');
// hooks/ yolunda OLMAYAN aynı isimli metne dokunulmamalı.
expect('hooks dışı metne dokunulmaz', m.rewriteSettings('"note": "borclar.js hakkinda"').includes('borclar.js'), true);

console.log('— text');
const text = m.report({ files: { copy: ['a.js'], remove: ['b.js'] }, settings: { stale: [{ from: 'b.js', to: 'a.js' }], missing: [] } });
expect('kopyalanacak görünür', text.includes('+ a.js'), true);
expect('silinecek görünür', text.includes('- b.js'), true);
expect('eski ad görünür', text.includes('b.js -> a.js'), true);

console.log('— beceriler');
// Beceriler de ortak depoda durur ve makineye kopyalanır (kancalarla aynı gerekçe).
// EN RİSKLİ DAVRANIŞ: ~/.claude/skills altında BİZİM OLMAYAN beceriler var (archify,
// eklenti kısayolu). Silme yalnız bizim beceri klasörlerimizin İÇİNDE yapılmalı.
{
  const fs2 = require('fs');
  const os2 = require('os');
  const p2 = require('path');
  const root = fs2.mkdtempSync(p2.join(os2.tmpdir(), 'snn-beceri-'));
  const src = p2.join(root, 'kaynak');
  const dst = p2.join(root, 'hedef');
  const put = (base, rel, text) => { fs2.mkdirSync(p2.dirname(p2.join(base, rel)), { recursive: true }); fs2.writeFileSync(p2.join(base, rel), text); };
  put(src, 'bizim/SKILL.md', 'yeni');
  put(dst, 'bizim/SKILL.md', 'eski');
  put(dst, 'bizim/artik.md', 'silinmeli');
  put(dst, 'baskasinin/SKILL.md', 'DOKUNULMAMALI');

  const plan = m.planSkills(src, dst, () => false);
  expect('içeriği değişen beceri kopyalanır', plan.copy, ['bizim/SKILL.md']);
  expect('bizim klasördeki artık silinir', plan.remove, ['bizim/artik.md']);
  // Bu satır kırmızıya dönerse üçüncü tarafın becerisi silinecek demektir.
  expect('BAŞKASININ becerisine dokunulmaz', plan.remove.some((f) => f.startsWith('baskasinin/')), false);
  expect('kaynakta olmayan klasör hiç görülmez', m.skillNames(src), ['bizim']);
  expect('aynı içerik kopyalanmaz', m.planSkills(src, dst, () => true).copy, []);
  expect('kaynak yoksa boş plan', m.planSkills(p2.join(root, 'yok'), dst), { copy: [], remove: [] });

  fs2.rmSync(root, { recursive: true, force: true });
}

console.log('— kayıt listesi tutarlı');
expect('yeniden adlandırma hedefleri kayıtta', Object.values(m.RENAMES).filter((t) => t.startsWith('stop-')).every((t) => m.REGISTRY.some((r) => r.file === t)), true);

console.log(fail ? `\n${fail} test başarısız` : '\nTüm testler geçti');
process.exit(fail ? 1 : 0);
