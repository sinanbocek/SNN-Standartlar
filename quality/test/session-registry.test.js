// Oturum defteri testleri. Çalıştır: node quality/test/session-registry.test.js
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const r = require('../session-registry');

let fail = 0;
const expect = (name, actual, wanted) => {
  const ok = JSON.stringify(actual) === JSON.stringify(wanted);
  if (!ok) fail += 1;
  console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : `\n    gelen: ${JSON.stringify(actual)}\n    beklenen: ${JSON.stringify(wanted)}`}`);
};

const NOW = 1_700_000_000_000;
const dk = (n) => n * 60 * 1000;

console.log('— defter dosyası');
expect('proje adından dosya', path.basename(r.registryFile('/d', 'C:/x/SNN-Standartlar')), 'SNN-Standartlar.json');
expect('sondaki ayraç sorun değil', path.basename(r.registryFile('/d', 'C:/x/GHS-Panel/')), 'GHS-Panel.json');

console.log('— kayıt tazeleme');
const eski = [
  { sessionId: 'a', branch: 'feat/a', lastSeen: NOW - dk(5) },
  { sessionId: 'b', branch: 'feat/b', lastSeen: NOW - dk(200) }, // eskimiş
];
const sonra = r.upsert(eski, { sessionId: 'c', branch: 'feat/c' }, NOW);
expect('kendi kaydı eklenir', sonra.some((e) => e.sessionId === 'c'), true);
expect('canlı kayıt korunur', sonra.some((e) => e.sessionId === 'a'), true);
expect('eskimiş kayıt düşer', sonra.some((e) => e.sessionId === 'b'), false);
expect('aynı oturum iki kez yazılmaz', r.upsert(sonra, { sessionId: 'c', branch: 'feat/c2' }, NOW).filter((e) => e.sessionId === 'c').length, 1);

console.log('— diğer oturumlar');
expect('kendini saymaz', r.others(sonra, 'c', NOW).map((e) => e.sessionId), ['a']);
expect('eskimişi saymaz', r.others(eski, 'a', NOW).length, 0);

console.log('— mesaj');
expect('kayıt yoksa mesaj yok', r.message([], NOW), null);
const m = r.message([{ sessionId: '8da3e54e-c112', branch: 'feat/x', lastSeen: NOW - dk(4) }], NOW);
expect('mesaj oturum ve dalı söyler', m.includes('8da3e54e') && m.includes('feat/x'), true);
expect('mesaj süreyi söyler', m.includes('4 dk önce'), true);
expect('mesaj kurala yönlendirir', m.includes('es-zamanli-calisma-standardi.md'), true);
expect('mesaj worktree önerir', m.includes('worktree'), true);

console.log('— dosyaya yazma ve okuma');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'snn-defter-'));
const kok = 'C:/x/Deneme-Proje';
expect('ilk oturum başkasını görmez', r.announce({ dir, root: kok, sessionId: 's1', branch: 'main', now: NOW }), []);
const ikinci = r.announce({ dir, root: kok, sessionId: 's2', branch: 'feat/y', now: NOW + dk(1) });
expect('ikinci oturum birinciyi görür', ikinci.map((e) => e.sessionId), ['s1']);
expect('ayrılan oturum defterden düşer', (r.leave({ dir, root: kok, sessionId: 's1' }), r.read(r.registryFile(dir, kok)).map((e) => e.sessionId)), ['s2']);
expect('eksik bilgiyle çağrı sessizce boş döner', r.announce({ dir, root: kok }), []);
expect('okunamayan defter boş liste', r.read(path.join(dir, 'yok.json')), []);
fs.rmSync(dir, { recursive: true, force: true });

console.log(fail ? `\n${fail} test başarısız` : '\nTüm testler geçti');
process.exit(fail ? 1 : 0);
