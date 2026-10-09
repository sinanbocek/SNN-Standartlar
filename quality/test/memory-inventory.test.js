// Bellek envanteri testleri. Çalıştır: node quality/test/memory-inventory.test.js
// Vakalar 2026-10-09 envanterinden: aynı ders farklı projelerde ayrı notlarda.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const m = require('../memory-inventory');

let fail = 0;
const expect = (name, actual, wanted) => {
  const ok = JSON.stringify(actual) === JSON.stringify(wanted);
  if (!ok) fail += 1;
  console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : `\n    gelen: ${JSON.stringify(actual)}\n    beklenen: ${JSON.stringify(wanted)}`}`);
};
const NOW = Date.parse('2026-10-09T12:00:00Z');
const daysAgo = (n) => new Date(NOW - n * 86400000);
const note = (project, file, description, body, extra = {}) => ({ project, file, name: file.replace('.md', ''), description, body, type: 'feedback', modified: daysAgo(3), ...extra });

console.log('— ön madde');
const fm = m.frontmatter('---\nname: x\ndescription: "Çalıştır düğmesi yeni sekme açar"\nmetadata:\n  type: feedback\n---\n\nGövde metni\n');
expect('ad, açıklama, tip ve gövde ayrışır', [fm.name, fm.description, fm.type, fm.body.trim()], ['x', 'Çalıştır düğmesi yeni sekme açar', 'feedback', 'Gövde metni']);
expect('ön madde yoksa gövde tüm metin', m.frontmatter('düz metin').body, 'düz metin');
expect('CRLF ön madde okunur', m.frontmatter('---\r\nname: y\r\n---\r\ngövde').name, 'y');

console.log('— kelime kümesi');
expect('kısa ve durak sözler elenir', [...m.tokens('bir kural için her oturumda PowerShell komutları')].sort(), ['komut', 'powershell']);
expect('Türkçe harfler korunur', m.tokens('Çalıştır düğmesi').has('çalıştır'), true);

console.log('— gerçek vakalar: aynı ders, iki proje (2026-10-09 envanteri)');
// GHS 26 Eylül ↔ Games 2 Ekim: Çalıştır düğmesi her bloğu yeni terminal sekmesinde açar.
const run1 = note('GHS-Panel', 'calistir-dugmesi-yeni-sekme.md', 'Kod bloğundaki "Çalıştır" her bloğu YENİ terminal sekmesinde açar', 'Çalıştır düğmesi her kod bloğunu yeni terminal sekmesinde başlatır; sıralı adımlar tek blokta verilmeli, yoksa ikinci sekme ilkini görmez.');
const run2 = note('SNN-Games', 'calistir-dugmesi-tek-komut.md', 'Masaüstü uygulamasındaki "Çalıştır" düğmesi her kod bloğunu yeni terminal sekmesinde açar', 'Çalıştır düğmesi her kod bloğunu yeni terminal sekmesinde açar; bu yüzden sahibe tek komut tek blok verilir, sıralı adımlar birleştirilmez.');
// Portföy 23 Eylül ↔ Nakit-Akış 23 Eylül: yalnız bu projeyle ilgilen.
const only1 = note('SNN-Portfoy-Yonetimi', 'yalniz-kendi-projem.md', 'Yalnız bu projeden sorumluyum; diğer projelerin bekleyenlerine bakmam', 'Oturum açılışında diğer projelerin bekleyenleri listelenir; onlara dokunmam, yalnız bu projenin işini yaparım.');
const only2 = note('SNN-Proje-ve-Nakit-Akis-Yonetimi', 'yalniz-bu-proje.md', 'Bu oturumda yalnız bu proje ile ilgilen; diğer projelerin bekleyenlerine bakma', 'Açılışta listelenen diğer projelerin bekleyenleri bu oturumun işi değildir; yalnız bu projenin işini yaparım.');
// İlgisiz not: küme kurmamalı.
const other = note('Gunum-Var', 'telefon-gorunumu-onizleme.md', 'Sahip uygulamayı tarayıcı panelinde telefon çerçevesi içinde görmek istiyor', 'Önizleme açılırken mobil görünüm seçilir; masaüstü genişliği istenmez.');
const groups = m.clusters([run1, only1, other, run2, only2]);
expect('iki gerçek küme bulunur, ilgisiz not dışarıda', groups.map((g) => g.notes.map((n) => n.file).sort()), [['calistir-dugmesi-tek-komut.md', 'calistir-dugmesi-yeni-sekme.md'], ['yalniz-bu-proje.md', 'yalniz-kendi-projem.md']]);
expect('küme projeleri listeler', groups[0].projects.length, 2);
// Aynı projede iki benzer not derleme değil düzen işidir; küme kurmaz.
expect('aynı projedeki benzer notlar küme kurmaz', m.clusters([run1, { ...run2, project: 'GHS-Panel' }]), []);
// Eşik sabotajı: eşik yükselince gerçek küme kaybolur (varsayılan eşik bilinçli düşük).
expect('eşik 0.5 gerçek kümeyi kaçırır', m.clusters([run1, run2], 0.5), []);
expect('varsayılan eşik 0.13', m.DEFAULT_THRESHOLD, 0.13);

console.log('— yeni ve tarihi geçmiş');
const oldProject = note('trade-kasa', 'trade-kasa-v21-plan.md', 'Sürüm durumu', 'v2.1 planı', { type: 'project', modified: daysAgo(60) });
const freshNote = note('SNN-Games', 'yeni.md', 'Yeni ders', 'gövde', { modified: daysAgo(1) });
expect('son 7 gün yeni notu bulur', m.recent([oldProject, freshNote], NOW, 7).map((n) => n.file), ['yeni.md']);
expect('45 günden eski project notu işaretlenir', m.stale([oldProject, freshNote, run1], NOW).map((n) => n.file), ['trade-kasa-v21-plan.md']);

console.log('— rapor');
const r = m.report({ notes: [run1, run2, only1, only2, other, oldProject], groups, fresh: [freshNote], old: [oldProject], days: 7, now: NOW });
expect('rapor sayıları taşır', /Not: 6 · proje: 6/.test(r) && /tekrar kümesi: 2/.test(r), true);
expect('rapor kümeleri listeler', /### Küme 1/.test(r) && /### Küme 2/.test(r), true);
expect('rapor not gövdesini yazmaz', r.includes('ikinci sekme ilkini görmez'), false);

console.log('— okunamadı ≠ yok');
expect('klasör yoksa okunamadı', m.scan(path.join(os.tmpdir(), 'snn-olmayan-' + Date.now())).state, 'okunamadi');
{
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'snn-bellek-'));
  const mem = path.join(root, 'C--Users-x-Documents-SNN-AI-Asus-Z14-Deneme', 'memory');
  fs.mkdirSync(mem, { recursive: true });
  fs.writeFileSync(path.join(mem, 'MEMORY.md'), '- dizin');
  fs.writeFileSync(path.join(mem, 'ders.md'), '---\nname: ders\ndescription: bir ders\nmetadata:\n  type: feedback\n---\ngövde');
  const s = m.scan(root);
  expect('dizin dosyası sayılmaz, not sayılır', [s.state, s.notes.length, s.notes[0].project, s.notes[0].type], ['var', 1, 'Deneme', 'feedback']);
  fs.rmSync(root, { recursive: true, force: true });
}

console.log(fail ? `\n${fail} test başarısız` : '\nTüm testler geçti');
process.exit(fail ? 1 : 0);
