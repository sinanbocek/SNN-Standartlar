// UZAK OKUMA: bir dosyayı aile projelerinin ana dalından okur ve her projeyi
// ÜÇ durumdan biriyle bildirir: var · yok · okunamadı (standartlar/olcum-standardi.md, Kural 3).
//
// NEDEN (2026-09-23): aile ölçümü elle kurulan bir döngüyle yapıldı ve iki kez yanlış sonuç verdi.
//   1. GHS-Panel yanlış depo adıyla sorgulandı. gh 404 döndü ve "adres yok" diye okundu; adres
//      oradaydı. gh'nin hata metni, yanlış depo adında da var olan depodaki olmayan dosyada da
//      birebir aynı: `gh: Not Found (HTTP 404)`. Metne bakarak ikisi AYRILAMAZ.
//   2. ihale-mcp yerel klasörde durduğu için aile projesi sayıldı; aile listesinde dışlanmıştı.
// Bu modül ikisini de yapısal olarak önler: liste quality/data/family-projects.json'dan gelir ve
// "yok" yalnız depo OKUNABİLİYORSA söylenir.
//
// Kullanım: node quality/remote-read.js <yol> [--ara <desen>]
// Çıkış: 1 = en az bir proje okunamadı (sonuç eksik; "yok" diye yorumlanamaz).
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const FAMILY_FILE = path.join(__dirname, 'data', 'family-projects.json');

// SAF: okuma sonucu → durum. "yok" için İKİ şart: 404 VE deponun kendisi okunuyor.
function classify({ fileOk, notFound = false, repoOk = false }) {
  if (fileOk) return 'var';
  if (notFound && repoOk) return 'yok';
  return 'okunamadi';
}

// IO: gh çağrısı → { ok, out } | { ok:false, err }
function realGh(args) {
  try {
    return { ok: true, out: execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 1e8, stdio: ['ignore', 'pipe', 'pipe'] }) };
  } catch (e) {
    return { ok: false, err: String(e.stderr || e.message || '').trim().split('\n')[0] };
  }
}

const isNotFound = (err) => /HTTP 404/.test(String(err));

// IO (gh enjekte edilebilir): bir depodan dosya ya da klasör okur.
// Döner: { state:'var', text } | { state:'var', entries } | { state:'yok' } | { state:'okunamadi', reason }
function readRemote(repo, file, gh = realGh) {
  const res = gh(['api', `repos/${repo}/contents/${file}`]);
  if (res.ok) {
    let parsed;
    try { parsed = JSON.parse(res.out); } catch { return { state: 'okunamadi', reason: 'yanıt çözülemedi' }; }
    if (Array.isArray(parsed)) return { state: 'var', entries: parsed.map((e) => e.name) };
    return { state: 'var', text: Buffer.from(parsed.content || '', 'base64').toString('utf8') };
  }
  const notFound = isNotFound(res.err);
  const repoOk = notFound ? gh(['api', `repos/${repo}`, '--jq', '.full_name']).ok : false;
  const state = classify({ fileOk: false, notFound, repoOk });
  if (state === 'yok') return { state };
  return { state, reason: notFound ? `depo okunamadı (${res.err})` : res.err };
}

// IO: aile listesi. Dışlananlar (excluded) ölçülmez.
function familyRepos(file = FAMILY_FILE) {
  return JSON.parse(fs.readFileSync(file, 'utf8')).projects.map((p) => p.repo);
}

// SAF: rapor
const LABEL = { var: '✓ var', yok: '· yok', okunamadi: '? okunamadı' };
function report(file, rows) {
  const count = (s) => rows.filter((r) => r.state === s).length;
  const lines = [`${file} — ${rows.length} aile projesi, ana daldan: ${count('var')} var · ${count('yok')} yok · ${count('okunamadi')} okunamadı`];
  for (const r of rows) {
    const extra = r.state === 'okunamadi' ? `  (${r.reason})` : (r.match !== undefined ? `  ${r.match || '— desen yok'}` : '');
    lines.push(`  ${LABEL[r.state].padEnd(12)} ${r.repo}${extra}`);
  }
  if (count('okunamadi')) lines.push('\nOkunamayan projeler için sonuç BİLİNMİYOR; "yok" diye yorumlanamaz (olcum-standardi.md, Kural 3).');
  return lines.join('\n');
}

module.exports = { classify, readRemote, familyRepos, report, isNotFound };

if (require.main === module) {
  const file = process.argv[2];
  if (!file || file.startsWith('--')) {
    console.error('Kullanım: node quality/remote-read.js <yol> [--ara <desen>]');
    process.exit(2);
  }
  const i = process.argv.indexOf('--ara');
  const pattern = i > 0 ? new RegExp(process.argv[i + 1]) : null;
  const rows = familyRepos().map((repo) => {
    const r = readRemote(repo, file);
    const row = { repo, ...r };
    if (pattern && r.state === 'var' && r.text !== undefined) row.match = (r.text.split(/\r?\n/).find((l) => pattern.test(l)) || '').trim();
    return row;
  });
  console.log(report(file, rows));
  process.exit(rows.some((r) => r.state === 'okunamadi') ? 1 : 0);
}
