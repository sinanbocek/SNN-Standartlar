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

// AÇIK TALEPLER DE İŞ LİSTESİDİR (standartlar/teknik-borc-standardi.md).
//
// NEDEN BURADA (2026-09-19): "iş kaldı mı?" sorusu bu araçla cevaplanıyor. O gün kütükteki son
// kayıt kapandı, oturum "borç kalmadı" dedi — ve aynı anda dört açık talep duruyordu. Kütük bir
// deponun iş listesinin TAMAMI değildir. Bu blok, o soruyu cevaplayan yerde ikinci kaynağı da
// gösterir; unutmaya bırakılmaz.
//
// Ağ yoksa ya da `gh` oturumu yoksa SESSİZCE atlanır: bu bir özet aracıdır, kapı değildir.
// Kapı ayrıdır ve CI'da çalışır (`quality/open-requests.js`, haftalık).
try {
  const requests = require('../quality/open-requests.js');
  const open = requests.classify(
    JSON.parse(require('child_process').execFileSync('gh', [
      'issue', 'list', '-R', 'sinanbocek/SNN-Standartlar', '--label', 'talep', '--state', 'open',
      '--limit', '200', '--json', 'number,title,createdAt,state,comments',
    ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 10000 }))
      .map((i) => ({ ...i, comments: Array.isArray(i.comments) ? i.comments.length : i.comments })),
  );
  const total = open.silent.length + open.waiting.length + open.answered.length;
  if (total) {
    const silent = open.silent.length ? ` — ${open.silent.length}'i YANITSIZ` : '';
    console.log('');
    console.log(`Açık talep (SNN-Standartlar): ${total}${silent}`);
    for (const i of [...open.silent, ...open.waiting, ...open.answered]) {
      console.log(`  ${open.silent.includes(i) ? '✗' : '•'} #${i.number} (${i.age}g) ${i.title}`);
    }
  }
} catch { /* ağ/gh yoksa özet yine de tamdır */ }
