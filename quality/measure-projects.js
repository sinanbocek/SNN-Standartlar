// AILE OLCUMU: tarayici degistiginde 10 projenin sayilari ne oluyor?
//
// NEDEN VAR (2026-09-19):
// Bugunun en degerli bulgularinin hepsi "gercek projelerde olcmekten" cikti: eksik kelime
// kokleri, yanlis alarmlarin dort turu, aile istisnasinin gercek etkisi. Ama bu olcum bir
// ALISKANLIKTI, kapi degildi — unutuldugunda kimse hatirlatmiyordu. Tarayici degisikligi
// 10 projenin sayisini SESSIZCE degistirebiliyordu.
//
// Bu olcum PR'i KIRMAZ. Sayinin artmasi cogu zaman dogrudur (eksik bir kok eklenince artar).
// Amac karar vermek degil, degisimi GORUNUR kilmak.
//
// Kullanim:
//   node quality/measure-projects.js <projeler-klasoru>
//   node quality/measure-projects.js <projeler-klasoru> --base <eski-quality-klasoru>
'use strict';
const fs = require('fs');
const path = require('path');

const LIST_FILE = path.join(__dirname, 'data', 'family-projects.json');

// SAF: liste dosyasindan proje kayitlari.
function familyProjects(raw) {
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  return (parsed.projects || []).filter((p) => p && p.repo && p.dir);
}

function readList(file = LIST_FILE) {
  return familyProjects(fs.readFileSync(file, 'utf8'));
}

// IO: tek bir tarayici surumuyle tum projeleri olcer.
function measureAll(baseDir, scanner, projects = readList()) {
  const rows = [];
  for (const p of projects) {
    const dir = path.join(baseDir, p.dir);
    if (!fs.existsSync(path.join(dir, '.git'))) { rows.push({ dir: p.dir, missing: true }); continue; }
    try {
      const r = scanner.scanAll(dir);
      // SQL ayrı sayılır: veritabanı adları DIŞA AÇIK arayüzdür, kırıcı sürüm planı ister.
      // Kod içi adlar proje içinde kalır ve tek PR'da düzelebilir; planlama farkı buradan çıkar.
      const sql = r.findings.filter((f) => /\.sql$/i.test(f.file)).length;
      rows.push({ dir: p.dir, findings: r.findings.length, sql, names: new Set(r.findings.map((f) => f.name)).size });
    } catch (e) {
      rows.push({ dir: p.dir, error: e.message.split('\n')[0] });
    }
  }
  return rows;
}

// SAF: iki olcumu karsilastirir. before yoksa yalniz mevcut durum dondurulur.
//
// TUZAK (2026-09-19'da olculdu): "once" ile "sonra" AYNI proje kopyasi uzerinde, iki farkli
// TARAYICI surumuyle alinmalidir. Ayri zamanlarda olculurse aradaki fark tarayiciyi degil,
// projede calisan ajanin yeni kodunu gosterir. Gercek ornek: Gunum-Var'da iki olcum arasinda
// baska bir oturum PR #198'i birlestirdi ve sayi 1.833 -> 1.841 oldu; tarayicida hicbir sey
// degismemisti. measureAll() bu yuzden ayni baseDir'i iki kez tarar.
function compare(after, before = null) {
  const prev = new Map((before || []).map((r) => [r.dir, r]));
  return after.map((r) => {
    const b = prev.get(r.dir);
    const delta = b && typeof b.findings === 'number' && typeof r.findings === 'number' ? r.findings - b.findings : null;
    return { ...r, before: b && b.findings, delta };
  });
}

const fmt = (n) => (typeof n === 'number' ? n.toLocaleString('tr-TR') : '—');

// SAF: PR yorumu icin markdown.
function commentBody(rows, { changed = true } = {}) {
  const lines = [];
  lines.push('## Aile ölçümü — tarayıcı değişikliğinin 10 projedeki etkisi');
  lines.push('');
  if (!changed) {
    lines.push('Bu PR tarayıcıyı değiştirmedi; ölçüm yalnız mevcut durumu gösterir.');
    lines.push('');
  }
  const hasDelta = rows.some((r) => r.delta !== null && r.delta !== undefined);
  lines.push(hasDelta ? '| Proje | Önce | Sonra | Fark | Ayrı ad | SQL |' : '| Proje | Bulgu | Ayrı ad | SQL |');
  lines.push(hasDelta ? '|---|---:|---:|---:|---:|---:|' : '|---|---:|---:|---:|');
  let sumBefore = 0;
  let sumAfter = 0;
  for (const r of rows) {
    if (r.missing) { lines.push(`| ${r.dir} | — | **klonlanamadı** | | |`); continue; }
    if (r.error) { lines.push(`| ${r.dir} | — | **hata:** ${r.error} | | |`); continue; }
    sumAfter += r.findings;
    if (typeof r.before === 'number') sumBefore += r.before;
    const d = r.delta === null || r.delta === undefined ? '' : (r.delta === 0 ? '0' : (r.delta > 0 ? `+${fmt(r.delta)}` : fmt(r.delta)));
    lines.push(hasDelta
      ? `| ${r.dir} | ${fmt(r.before)} | ${fmt(r.findings)} | ${d} | ${fmt(r.names)} | ${r.sql ? fmt(r.sql) : '—'} |`
      : `| ${r.dir} | ${fmt(r.findings)} | ${fmt(r.names)} | ${r.sql ? fmt(r.sql) : '—'} |`);
  }
  if (hasDelta) {
    const total = sumAfter - sumBefore;
    lines.push(`| **Toplam** | **${fmt(sumBefore)}** | **${fmt(sumAfter)}** | **${total > 0 ? '+' : ''}${fmt(total)}** | | |`);
  }
  lines.push('');
  lines.push('Bu ölçüm **PR\'ı kırmaz**. Sayının artması çoğu zaman doğrudur (eksik bir kök eklenince artar).');
  lines.push('Beklemediğin bir değişim varsa tarayıcıda yanlış alarm ya da atlanan satır olabilir.');
  return lines.join('\n');
}

function main() {
  const args = process.argv.slice(2);
  const baseDir = args.find((a) => !a.startsWith('--'));
  if (!baseDir) { console.error('Kullanım: node quality/measure-projects.js <projeler-klasoru> [--base <eski-quality>]'); process.exit(1); }
  const scanner = require('./code-language-scan.js');
  const after = measureAll(baseDir, scanner);

  const baseIdx = args.indexOf('--base');
  let before = null;
  if (baseIdx >= 0 && args[baseIdx + 1]) {
    const oldScanner = require(path.resolve(args[baseIdx + 1], 'code-language-scan.js'));
    before = measureAll(baseDir, oldScanner);
  }
  console.log(commentBody(compare(after, before), { changed: !!before }));
}

if (require.main === module) main();

module.exports = { familyProjects, readList, measureAll, compare, commentBody, LIST_FILE };
