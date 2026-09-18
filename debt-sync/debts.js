// Tüm projelerin durum/borç özetini yazdırır. Kullanım: node borclar.js [--detay]
'use strict';
const { listProjects, projectStatus, debtLabel } = require('./lib/debt');

const detail = process.argv.includes('--detay');
const rows = listProjects().map(projectStatus)
  .sort((a, b) => (b.lastDate || '').localeCompare(a.lastDate || ''));

const pad = (s, n) => String(s).padEnd(n);
console.log(pad('Proje', 36) + pad('Sürüm', 9) + pad('Son commit', 12) + pad('Commit\'siz', 14) + 'Teknik borç');
for (const p of rows) {
  const dirty = p.dirty.count ? `${p.dirty.count} (${p.dirty.ageDays}g)` : '-';
  console.log(pad(p.name, 36) + pad(p.version || '-', 9) + pad(p.lastDate || '-', 12) + pad(dirty, 14) + debtLabel(p.debts));
  if (detail) {
    p.debts.items
      .filter((i) => i.priority === 'P1' || i.priority === 'P2')
      .forEach((i) => console.log(`    ${i.priority} ${i.id} — ${i.title}`));
  }
}
