// Sosyal medya ölçü dosyasını denetler ve her ölçüyü kanıtı ve yaşıyla listeler.
//
// NEDEN VAR (2026-11-03, #175): Pulmaca'da ölçüler arayüzsüz karelerle denetlendi. Ölçüler platforma
// bağlıdır, zamanla değişir. Kanıtı yazılmayan sayı, reklam kuralı ile canlı ölçümü birbirine karıştırır.
// Yenileme vadesi quality/data/pending-measurements.json kaydındadır; vade gelince makine bunu çalıştırır.
//
// Kullanım: node quality/social-media-sizes.js
// Çıkış: 1 = ölçü dosyasında ya da standart tablosunda kusur var.
'use strict';
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data', 'social-media-sizes.json');
const STANDARD_FILE = path.join(__dirname, '..', 'standartlar', 'sosyal-medya-olcu-standardi.md');
const EVIDENCE = ['meta', 'canli-olcum', 'ikincil', 'turetilmis'];
const KINDS = ['reserved', 'live', 'crop'];

const zonesOf = (data) => (data.canvases || []).flatMap((canvas) => (canvas.zones || []).map((zone) => ({ canvas, zone })));

// SAF: ölçü dosyasının kusurları → mesaj listesi
function problems(data) {
  const out = [];
  const seen = new Set();
  for (const { canvas, zone } of zonesOf(data)) {
    const id = zone.id || '(kimliksiz)';
    if (seen.has(id)) out.push(`${id}: kimlik iki kez geçiyor`);
    seen.add(id);
    if (!KINDS.includes(zone.kind)) out.push(`${id}: bilinmeyen tür "${zone.kind}"`);
    if (!EVIDENCE.includes(zone.evidence)) out.push(`${id}: kanıt türü yok ya da bilinmiyor "${zone.evidence}"`);
    if (!(data.sources || {})[zone.source]) out.push(`${id}: kaynak tanımsız "${zone.source}"`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(zone.date || '') || Number.isNaN(Date.parse(zone.date))) out.push(`${id}: tarih geçersiz "${zone.date}"`);
    const [left, top, right, bottom] = zone.box || [];
    const inside = left >= 0 && top >= 0 && right <= canvas.width && bottom <= canvas.height && left < right && top < bottom;
    if (!inside) out.push(`${id}: kutu tuvalin dışında ya da boş ${JSON.stringify(zone.box)}`);
  }
  return out;
}

// SAF: standart tablosu veriyle aynı mı? Kimlik, kutu ve kanıt aynı satırda geçmek zorunda.
function standardProblems(data, standardText) {
  const lines = String(standardText).split(/\r?\n/);
  const out = [];
  for (const { zone } of zonesOf(data)) {
    const box = `[${(zone.box || []).join(', ')}]`;
    const line = lines.find((text) => text.includes(`\`${zone.id}\``));
    if (!line) out.push(`${zone.id}: standart tablosunda yok`);
    else if (!line.includes(box)) out.push(`${zone.id}: standarttaki kutu veriyle farklı, beklenen ${box}`);
    else if (!line.includes(`\`${zone.evidence}\``)) out.push(`${zone.id}: standarttaki kanıt türü veriyle farklı, beklenen ${zone.evidence}`);
  }
  return out;
}

// SAF: ölçü listesi → yazdırılacak satırlar
function listing(data, today) {
  return zonesOf(data).map(({ zone }) => {
    const days = Math.floor((Date.parse(today) - Date.parse(zone.date)) / 86400000);
    return `${zone.id}  ${JSON.stringify(zone.box)}  ${zone.evidence}  ${zone.date} (${days} gün önce)`;
  });
}

if (require.main === module) {
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  const found = [...problems(data), ...standardProblems(data, fs.readFileSync(STANDARD_FILE, 'utf8'))];
  console.log(listing(data, new Date().toISOString().slice(0, 10)).join('\n'));
  if (found.length) {
    console.error(`\nKusur:\n- ${found.join('\n- ')}`);
    process.exit(1);
  }
  console.log(`\nYenileme: her ${data.renewMonths} ayda bir. Kural: standartlar/sosyal-medya-olcu-standardi.md`);
}

module.exports = { problems, standardProblems, listing };
