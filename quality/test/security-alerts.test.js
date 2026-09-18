// Güvenlik uyarıları testleri (saf; GitHub'a istek atmaz). Çalıştır: node quality/test/security-alerts.test.js
'use strict';
const { summarize, message, CACHE_MS } = require('../security-alerts');

let fail = 0;
const expect = (name, actual, wanted) => {
  const ok = JSON.stringify(actual) === JSON.stringify(wanted);
  if (!ok) fail += 1;
  console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : `\n    gelen: ${JSON.stringify(actual)}\n    beklenen: ${JSON.stringify(wanted)}`}`);
};
const a = (severity, scope = 'runtime') => ({ severity, scope, pkg: 'x' });

console.log('— sayım');
expect('önem × kapsam ayrımı', summarize([a('critical'), a('high', 'development'), a('high'), a('medium', 'development')]),
  { runtime: { critical: 1, high: 1 }, dev: { high: 1, medium: 1 }, total: 4 });

console.log('— mesaj');
expect('uyarı yok → mesaj yok', message(summarize([]), ''), null);
const m1 = message(summarize([a('critical'), a('high'), a('medium', 'development')]), '# kütük');
expect('çalışan uygulamada ciddi + kütükte yok → P1 önerisi', [m1.includes('çalışan uygulamada 1 kritik, 1 yüksek'), m1.includes('yalnız geliştirme araçlarında 1 orta'), m1.includes('P1 kayıt öner')], [true, true, true]);
const m2 = message(summarize([a('high', 'development')]), '');
expect('yalnız geliştirmede ciddi → P2/P3 önerisi (P1 değil)', [m2.includes('P2/P3'), m2.includes('P1')], [true, false]);
expect('yalnız orta/düşük → öneri yok, bilgi var', message(summarize([a('medium')]), '').includes('öner'), false);
expect('kütükte Dependabot kaydı varsa öneri yok', message(summarize([a('critical')]), '### TB-9 — Dependabot uyarıları').includes('öner'), false);
expect('önem sırası kritik → düşük', message(summarize([a('low'), a('critical'), a('medium')]), 'dependabot').includes('1 kritik, 1 orta, 1 düşük'), true);

expect('npm audit kaydı karşılık sayılır', message(summarize([a('critical')]), '`npm audit` (2026-09-15): 4 paket').includes('öner'), false);
expect('genel "güvenlik açığı" ifadesi karşılık sayılmaz', message(summarize([a('critical')]), 'Fonksiyonun govdesi okununca guvenlik acigi cikti.').includes('P1 kayıt öner'), true);

console.log('— önbellek');
expect('önbellek süresi yarım gün', CACHE_MS, 12 * 60 * 60 * 1000);

console.log(fail ? `\n✗ ${fail} test başarısız` : '\n✓ tümü geçti');
process.exit(fail ? 1 : 0);
