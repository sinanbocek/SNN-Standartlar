// Buluşma günlüğü ve raporu testleri. Çalıştır: node quality/test/meeting-report.test.js
//
// NEDEN (2026-09-19): TB-002 "bir hafta defter verisi toplansın" diyordu ama defter geçmişi
// TUTMUYORDU — beklenen veri hiçbir zaman gelmeyecekti. Proje sahibi "TB-002 neyi bekliyor?"
// diye sorunca ölçüldü. Kayıt tutulmayan bir ölçüm, ölçüm değildir.
// 2026-10-09 (TB-008): okunamadı ≠ yok ve çatal şişmesi testleri eklendi.
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
const secAgo = (n) => new Date(NOW - n * 1000).toISOString();

console.log('— günlük satırı');
const line = JSON.parse(registry.meetingLine('C:/x/SNN-Standartlar', 'main', [{ branch: 'main' }, { branch: 'feat/a' }], NOW));
expect('proje adı köke göre yazılır', line.project, 'SNN-Standartlar');
expect('kendi dalı yazılır', line.branch, 'main');
expect('diğer dallar yazılır', line.others, ['main', 'feat/a']);
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

console.log('— çatal şişmesi (2026-09-23 Portföy: 7 saniyede 5 kayıt)');
// Gerçek günlükten alınan biçim: aynı proje, saniyeler içinde art arda, "others" her seferinde bir fazla.
const burst = [
  { at: '2026-09-23T09:36:43.529Z', project: 'SNN-Portfoy-Yonetimi', sameBranch: true },
  { at: '2026-09-23T09:36:43.858Z', project: 'SNN-Portfoy-Yonetimi', sameBranch: true },
  { at: '2026-09-23T09:36:47.059Z', project: 'SNN-Portfoy-Yonetimi', sameBranch: true },
  { at: '2026-09-23T09:36:48.545Z', project: 'SNN-Portfoy-Yonetimi', sameBranch: true },
  { at: '2026-09-23T09:36:50.823Z', project: 'SNN-Portfoy-Yonetimi', sameBranch: true },
];
expect('Portföy patlaması tek buluşma sayılır', t.collapse(burst).length, 1);
expect('tek sayılan kayıt kaç kaydı topladığını bilir', t.collapse(burst)[0].collapsed, 5);
expect('60 sn sonrası ayrı buluşmadır', t.collapse([...burst, { at: '2026-09-23T09:38:00Z', project: 'SNN-Portfoy-Yonetimi', sameBranch: false }]).length, 2);
expect('farklı proje aynı saniyede ayrı sayılır', t.collapse([{ at: secAgo(1), project: 'A' }, { at: secAgo(1), project: 'B' }]).length, 2);
expect('gruptan biri aynı dal diyorsa buluşma aynı daldadır', t.collapse([{ at: secAgo(2), project: 'A', sameBranch: false }, { at: secAgo(1), project: 'A', sameBranch: true }])[0].sameBranch, true);
const sb = t.summarize(burst, Date.parse('2026-09-24T00:00:00Z'), 7);
expect('özet ham sayıyı da taşır', [sb.raw, sb.total], [5, 1]);
expect('rapor şişmeyi söyler', /ham 5/.test(t.report(sb)), true);

console.log('— okunamadı ≠ yok (olcum-standardi.md Kural 3)');
{
  const missing = path.join(os.tmpdir(), `snn-yok-${Date.now()}`);
  // Bu satır kırmızıya dönerse CI'da "buluşma yok" yanlış sonucu geri gelir (OLC-001, 2026-09-29).
  expect('klasör yoksa okunamadı', t.read(missing).state, 'okunamadi');
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'snn-bos-'));
  expect('klasör var günlük yoksa yok', t.read(empty).state, 'yok');
  fs.writeFileSync(path.join(empty, t.LOG_FILE), '{"at":"2026-09-19T00:00:00Z","project":"A"}\n');
  expect('günlük varsa var', [t.read(empty).state, t.read(empty).rows.length], ['var', 1]);
  fs.rmSync(empty, { recursive: true, force: true });
  const r = t.report(t.summarize([], NOW, 7), 'okunamadi');
  expect('okunamadı raporu "yok" demez', /OKUNAMADI/.test(r) && !/kaydedilmedi/.test(r), true);
}

console.log('— rapor kararı dayatmaz, sonraki ölçümü gösterir');
const same = t.report(t.summarize([{ at: daysAgo(1), project: 'A', sameBranch: true }], NOW, 7));
expect('aynı dal varsa dosya örtüşme ölçümüne yönlendirir', same.includes('file-overlap.js'), true);
expect('aynı dal tek başına kilit gerekçesi sayılmaz', /kilit gerekçesi DEĞİLDİR/.test(same), true);
const diff = t.report(t.summarize([{ at: daysAgo(1), project: 'A', sameBranch: false }], NOW, 7));
expect('aynı dal yoksa yettiği söylenir', diff.includes('yetiyor'), true);
expect('veri yoksa bu da söylenir', t.report(t.summarize([], NOW, 7), 'yok').includes('kaydedilmedi'), true);

console.log('— gerçekten yazıyor mu (uçtan uca)');
{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'snn-bulusma-'));
  registry.announce({ dir, root: 'C:/x/P', sessionId: 'bir', branch: 'main', now: NOW });
  expect('tek oturumda günlük yazılmaz', fs.existsSync(path.join(dir, registry.MEETING_LOG)), false);
  registry.announce({ dir, root: 'C:/x/P', sessionId: 'iki', branch: 'main', now: NOW + 1000 });
  const written = t.read(dir);
  expect('buluşma günlüğe yazılır ve okunur', [written.state, written.rows.length], ['var', 1]);
  expect('yazılan kayıt aynı dalı bildirir', written.rows[0].sameBranch, true);
  fs.rmSync(dir, { recursive: true, force: true });
}

console.log(fail ? `\n${fail} test başarısız` : '\nTüm testler geçti');
process.exit(fail ? 1 : 0);
