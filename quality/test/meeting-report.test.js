// Buluşma günlüğü ve raporu testleri. Çalıştır: node quality/test/meeting-report.test.js
//
// NEDEN (2026-09-19): TB-002 "bir hafta defter verisi toplansın" diyordu ama defter geçmişi
// TUTMUYORDU — beklenen veri hiçbir zaman gelmeyecekti. Proje sahibi "TB-002 neyi bekliyor?"
// diye sorunca ölçüldü. Kayıt tutulmayan bir ölçüm, ölçüm değildir.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const t = require('../meeting-report');
const registry = require('../session-registry');

let fail = 0;
const expect = (name, actual, wanted) => {
  const ok = JSON.stringify(actual) === JSON.stringify(wanted);
  if (!ok) fail += 1;
  console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : `\n    gelen: ${JSON.stringify(actual)}\n    beklenen: ${JSON.stringify(wanted)}`}`);
};

const NOW = Date.parse('2026-09-19T12:00:00Z');
const daysAgo = (n) => new Date(NOW - n * 86400000).toISOString();

console.log('— günlük satırı');
const line = JSON.parse(registry.meetingLine('C:/x/SNN-Standartlar', 'main', [{ branch: 'main' }, { branch: 'feat/a' }], NOW));
expect('proje adı köke göre yazılır', line.project, 'SNN-Standartlar');
expect('kendi dalı yazılır', line.branch, 'main');
expect('diğer dallar yazılır', line.others, ['main', 'feat/a']);
// AYNI DAL asıl riskli durumdur; TB-002'nin kararı bu sayıya bakar.
expect('aynı dal işaretlenir', line.sameBranch, true);
expect('farklı dallarda işaret yok', JSON.parse(registry.meetingLine('C:/x/P', 'main', [{ branch: 'feat/a' }], NOW)).sameBranch, false);
// Günlük DAR tutulur: dosya adı, komut, içerik yazılmaz.
expect('günlükte yalnız beş alan var', Object.keys(line).sort(), ['at', 'branch', 'others', 'project', 'sameBranch']);

console.log('— ayrıştırma');
expect('bozuk satır ölçümü durdurmaz', t.parse('{"at":"2026-09-19T00:00:00Z"}\nBOZUK\n\n{"at":"2026-09-18T00:00:00Z"}').length, 2);
expect('boş günlük boş liste', t.parse(''), []);

console.log('— özet');
const rows = [
  { at: daysAgo(1), project: 'A', sameBranch: true },
  { at: daysAgo(2), project: 'A', sameBranch: false },
  { at: daysAgo(3), project: 'B', sameBranch: false },
  { at: daysAgo(30), project: 'B', sameBranch: true },   // pencere dışı
];
const s = t.summarize(rows, NOW, 7);
expect('pencere dışı kayıt sayılmaz', s.total, 3);
expect('aynı dal sayısı doğru', s.sameBranch, 1);
expect('projeye göre kırılım', s.projects.map(([n, v]) => `${n}:${v.meetings}`), ['A:2', 'B:1']);
expect('pencere genişletilebilir', t.summarize(rows, NOW, 60).total, 4);

console.log('— rapor kararı dayatmaz, iki yolu gösterir');
const same = t.report(t.summarize([{ at: daysAgo(1), project: 'A', sameBranch: true }], NOW, 7));
expect('aynı dal varsa P2 yolu yazılır', same.includes("P2'ye çıkar"), true);
const diff = t.report(t.summarize([{ at: daysAgo(1), project: 'A', sameBranch: false }], NOW, 7));
expect('aynı dal yoksa kapatma yolu yazılır', diff.includes('kapatılabilir'), true);
expect('veri yoksa bu da söylenir', t.report(t.summarize([], NOW, 7)).includes('kaydedilmedi'), true);

console.log('— gerçekten yazıyor mu (uçtan uca)');
{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'snn-bulusma-'));
  // Tek oturum: buluşma YOK, günlük yazılmaz.
  registry.announce({ dir, root: 'C:/x/P', sessionId: 'bir', branch: 'main', now: NOW });
  expect('tek oturumda günlük yazılmaz', fs.existsSync(path.join(dir, registry.MEETING_LOG)), false);

  // İkinci oturum aynı projede: buluşma VAR, günlüğe yazılır.
  registry.announce({ dir, root: 'C:/x/P', sessionId: 'iki', branch: 'main', now: NOW + 1000 });
  const written = t.parse(fs.readFileSync(path.join(dir, registry.MEETING_LOG), 'utf8'));
  expect('buluşma günlüğe yazılır', written.length, 1);
  expect('yazılan kayıt aynı dalı bildirir', written[0].sameBranch, true);

  fs.rmSync(dir, { recursive: true, force: true });
}

console.log(fail ? `\n${fail} test başarısız` : '\nTüm testler geçti');
process.exit(fail ? 1 : 0);
