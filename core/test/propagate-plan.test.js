// Çekirdek yayılım planı testleri (saf). Çalıştır: node core/test/propagate-plan.test.js
'use strict';
const P = require('../lib/propagate-plan');
const { parseDebts } = require('../../debt-sync/lib/debt');

let fail = 0;
const expect = (name, actual, wanted) => {
  const ok = JSON.stringify(actual) === JSON.stringify(wanted);
  if (!ok) fail += 1;
  console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : `\n    gelen: ${JSON.stringify(actual)}\n    beklenen: ${JSON.stringify(wanted)}`}`);
};

console.log('— sürüm');
expect('karşılaştırma', [P.compare('3.0.0', '3.2.0'), P.compare('v3.2.0', '3.2.0'), P.compare('3.10.0', '3.9.9')], [-1, 0, 1]);

console.log('— karar (bugünkü gerçek tüketiciler, hedef 3.2.0)');
const d = (locked, extra = {}) => P.decide({ locked, target: 'v3.2.0', hasOpenPr: false, ...extra });
expect('trade-kasa 3.2.0 → atla (güncel)', d('3.2.0').action, 'atla');
expect('Yönetici Özeti 3.0.0 → PR, ana sürüm değil', [d('3.0.0').action, d('3.0.0').major], ['pr', false]);
expect('GHS 2.8.0 → PR, ANA sürüm', [d('2.8.0').action, d('2.8.0').major], ['pr', true]);
expect('açık PR varsa → atla (aynı PR iki kez açılmaz)', d('3.0.0', { hasOpenPr: true }).action, 'atla');
expect('kilit okunamadı → atla', d(null).action, 'atla');
expect('bozuk hedef → hata', P.decide({ locked: '3.0.0', target: 'son', hasOpenPr: false }).action, 'hata');

console.log('— bağımlılık tanımı');
expect('sabit sürüm korunur (Gunum-Var)', P.rewriteSpec('github:sinanbocek/SNN-Abacus-Core#v2.7.0', '3.2.0'), 'github:sinanbocek/SNN-Abacus-Core#v3.2.0');
expect('semver aralığı güncellenir', P.rewriteSpec('github:sinanbocek/SNN-Abacus-Core#semver:^3.0.0', 'v3.2.0'), 'github:sinanbocek/SNN-Abacus-Core#semver:^3.2.0');
expect('depo yazımı korunur (Ihale küçük harf)', P.rewriteSpec('github:sinanbocek/snn-abacus-core#semver:^3.1.0', '3.2.0'), 'github:sinanbocek/snn-abacus-core#semver:^3.2.0');

console.log('— değişiklik günlüğü');
const log = '# Günlük\n\n## [3.2.0] - 2026-09-15\n\nC\n\n## [3.1.0] - 2026-09-10\n\nB\n\n## [3.0.1] - 2026-09-05\n\nA1\n\n## [3.0.0] - 2026-09-01\n\nA\n';
const bol = P.changelogBetween(log, '3.0.0', '3.2.0');
expect('(from, to] aralığı: 3.0.0 hariç, 3.2.0 dahil', [bol.includes('[3.2.0]'), bol.includes('[3.1.0]'), bol.includes('[3.0.1]'), bol.includes('[3.0.0]')], [true, true, true, false]);
expect('aralık dışı boş', P.changelogBetween(log, '3.2.0', '3.2.0'), '');

console.log('— kütük kaydı');
expect('sonraki numara arşivi de sayar', P.nextDebtId(['### TB-041 — a', '- **Kapanış:** TB-088']), 'TB-089');
expect('3 hane doldurma', P.nextDebtId(['### TB-7']), 'TB-008');
const rec = P.majorDebtRecord({ id: 'TB-050', from: '2.8.0', to: '3.2.0', date: '2026-09-15', usage: '17 import' });
const ledger = '# Kütük\n\n### TB-001 — acil\n- **Öncelik:** P1 (Acil)\n\n---\n\n### TB-002 — plan\n- **Öncelik:** P2 (Planlı)\n\n---\n\n### TB-003 — fırsat\n- **Öncelik:** P3 (Fırsatta)\n';
const yeni = P.insertRecord(ledger, rec);
const records = parseDebts(yeni);
expect('kayıt standart ayrıştırıcıyla okunur (P2, sade anlatımlı)', (() => { const r = records.find((x) => x.id === 'TB-050'); return [r.priority, r.sade.includes('Sorun ne?')]; })(), ['P2', true]);
expect('P2 grubunun sonuna, P3\'ün önüne yerleşir', records.map((x) => x.id), ['TB-001', 'TB-002', 'TB-050', 'TB-003']);
expect('P3 yoksa sona eklenir', parseDebts(P.insertRecord('# K\n\n### TB-001 — a\n- **Öncelik:** P1 (Acil)\n', rec)).map((x) => x.id), ['TB-001', 'TB-050']);

console.log('— çekirdek listesi (SNN-Piyasa-Core talebi #103, 2026-09-24)');
// VAKA: Piyasa-Core v0.4.0 etiketini attı; hiçbir tüketicide PR açılmadı, çünkü paket kimliği
// araçta sabit yazılıydı ('@snn/abacus-core'). Yayılım kopyalanmaz, ortak araç listeyle çalışır.
const abacus = P.coreOf('sinanbocek/SNN-Abacus-Core');
const piyasa = P.coreOf('sinanbocek/SNN-Piyasa-Core');
expect('Piyasa-Core listede', piyasa && piyasa.package, '@snn/piyasa-core');
expect('depo adı büyük/küçük harf duyarsız', P.coreOf('sinanbocek/snn-piyasa-core') === piyasa, true);
expect('paket adıyla da bulunur', P.coreOf('@snn/abacus-core') === abacus, true);
// Listede olmayan depo SESSİZCE Abacus sayılmaz: yanlış çekirdeğin sürümü yayılırdı.
expect('bilinmeyen depo → null', P.coreOf('sinanbocek/Gunum-Var'), null);
expect('Abacus dal adı değişmez', P.branchFor(abacus, 'v4.1.1'), 'core/abacus-core-v4.1.1');
expect('Piyasa dal adı', P.branchFor(piyasa, 'v0.4.0'), 'core/piyasa-core-v0.4.0');
expect('bozuk tanımda Piyasa deposuna düşer', P.rewriteSpec('*', '0.4.0', piyasa), 'github:sinanbocek/SNN-Piyasa-Core#semver:^0.4.0');
expect('bozuk tanımda varsayılan Abacus', P.rewriteSpec('*', '4.2.0'), 'github:sinanbocek/SNN-Abacus-Core#semver:^4.2.0');
const recP = P.majorDebtRecord({ id: 'TB-051', from: '0.3.0', to: '0.4.0', date: '2026-09-24', usage: '3 import', core: piyasa });
expect('kütük kaydı Piyasa paketini yazar', [recP.includes('@snn/piyasa-core'), recP.includes('SNN-Piyasa-Core'), /abacus/i.test(recP)], [true, true, false]);
expect('kütük kaydı varsayılanı Abacus', rec.includes('@snn/abacus-core') && rec.includes('SNN-Abacus-Core'), true);
expect('Piyasa kaydı da standart ayrıştırıcıyla okunur', parseDebts(P.insertRecord(ledger, recP)).some((x) => x.id === 'TB-051' && x.priority === 'P2'), true);

console.log('— 0.x sürümlerde ana sürüm (#103 değerlendirmesi)');
// semver: ilk rakam 0 iken ikinci rakamın değişmesi kırıcıdır. Araç yalnız ilk rakama bakıyordu;
// 0.3 → 0.4 geçişinde uyarı ve kütük kaydı hiç çıkmayacaktı.
const d0 = (locked, target) => P.decide({ locked, target, hasOpenPr: false }).major;
expect('0.3.0 → 0.4.0 ana sürüm', d0('0.3.0', 'v0.4.0'), true);
expect('0.4.0 → 0.4.1 ana sürüm değil', d0('0.4.0', 'v0.4.1'), false);
expect('0.4.0 → 1.0.0 ana sürüm', d0('0.4.0', 'v1.0.0'), true);
expect('4.1.0 → 4.2.0 ana sürüm değil (değişmedi)', d0('4.1.0', 'v4.2.0'), false);

console.log(fail ? `\n✗ ${fail} test başarısız` : '\n✓ tümü geçti');
process.exit(fail ? 1 : 0);
