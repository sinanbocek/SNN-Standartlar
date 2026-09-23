// Hangi proje hangi ortak akışı çağırıyor? Eski ad köprülerinin ne zaman silinebileceğini söyler.
//
// NEDEN (TB-001, 2026-09-19): akış dosyası adları İngilizceye taşındı, ama eski adlar 10 projenin
// çağırdığı DIŞA AÇIK arayüzdü. Eski adlar "köprü" olarak bırakıldı. Köprü ne zaman silinir?
// Tahminle değil, ÖLÇÜMLE: sıfır çağıranı kalınca.
//
// ANA DALDAN okur. Yerel klasör gerçeği göstermez — 2026-09-19'da yerel kopya iki projede
// yanlış cevap verdi (iki proje çağırıyordu, yerelde görünmüyordu).
//
// Kullanım: node quality/workflow-callers.js
// Çıkış: 1 = silinmeye hazır köprü var (bilgi amaçlı; kimseyi engellemez).
'use strict';
const fs = require('fs');
const path = require('path');

const REPO = 'SNN-Standartlar';
const WORKFLOW_DIR = path.join(__dirname, '..', '.github', 'workflows');
const PROJECTS = path.join(__dirname, 'data', 'family-projects.json');

// SAF: bir akış dosyası eski ad köprüsü mü? Köprüler başlıkta bunu yazar.
const isBridge = (text) => /ESKİ AD — UYUMLULUK KÖPRÜSÜ/.test(text);

// SAF: metindeki ortak akış çağrıları → dosya adları
function callsIn(text, repo = REPO) {
  const re = new RegExp(`${repo}/\\.github/workflows/([A-Za-z0-9._-]+\\.yml)@`, 'g');
  return [...new Set([...String(text).matchAll(re)].map((m) => m[1]))];
}

// SAF: ölçüm sonucundan rapor.
// unreadable: okunamayan projeler. Okunamayan bir proje köprüyü çağırıyor OLABİLİR; o zaman
// "0 çağıran" bilinmez ve hiçbir köprüye SİLİNEBİLİR denmez (olcum-standardi.md, Kural 3).
// İlk sürüm okunamayan projeyi sessizce atlıyordu: gh yetkisi bir projeyi okuyamasaydı, o projenin
// çağırdığı köprü silinmeye aday gösterilirdi (2026-09-23'te kod okunarak bulundu; gerçekleşmedi).
function report(bridges, usage, unreadable = []) {
  const lines = [];
  const ready = [];
  for (const name of bridges) {
    const callers = usage.get(name) || [];
    const verdict = callers.length ? ': ' + callers.join(', ') : (unreadable.length ? ' — bilinmiyor (okunamayan proje var)' : ' — SİLİNEBİLİR');
    lines.push(`${callers.length ? '•' : (unreadable.length ? '?' : '✓')} ${name.padEnd(26)} ${callers.length} çağıran${verdict}`);
    if (!callers.length && !unreadable.length) ready.push(name);
  }
  if (unreadable.length) {
    lines.push('');
    lines.push(`${unreadable.length} proje okunamadı: ${unreadable.join(', ')}`);
    lines.push('Bu projeler köprü çağırıyor olabilir; okunana kadar silme önerilmez.');
  }
  if (ready.length) {
    lines.push('');
    lines.push(`${ready.length} köprünün çağıranı kalmadı; silinebilir: ${ready.join(', ')}`);
    lines.push('Silmeden önce: bu ölçüm ANA DALLARI okur, açık PR\'ları okumaz.');
  }
  return { text: lines.join('\n'), ready };
}

// Okuma üç durumlu: var · yok · okunamadı (quality/remote-read.js). "yok" = projede akış
// klasörü gerçekten yok, yani hiçbir köprüyü çağırmıyor; "okunamadı" = bilinmiyor.
function measure() {
  const { readRemote } = require('./remote-read');
  const list = JSON.parse(fs.readFileSync(PROJECTS, 'utf8')).projects.filter((p) => !p.repo.endsWith(REPO));
  const usage = new Map();
  const unreadable = [];
  for (const { repo } of list) {
    const dirRead = readRemote(repo, '.github/workflows');
    if (dirRead.state === 'yok') continue;
    if (dirRead.state === 'okunamadi') { unreadable.push(repo); continue; }
    for (const file of dirRead.entries || []) {
      const fileRead = readRemote(repo, `.github/workflows/${file}`);
      if (fileRead.state !== 'var') { if (!unreadable.includes(repo)) unreadable.push(repo); continue; }
      for (const called of callsIn(fileRead.text)) {
        if (!usage.has(called)) usage.set(called, []);
        if (!usage.get(called).includes(repo)) usage.get(called).push(repo);
      }
    }
  }
  return { usage, unreadable };
}

module.exports = { callsIn, isBridge, report };

if (require.main === module) {
  const bridges = fs.readdirSync(WORKFLOW_DIR)
    .filter((f) => /\.yml$/.test(f) && isBridge(fs.readFileSync(path.join(WORKFLOW_DIR, f), 'utf8')))
    .sort();
  if (!bridges.length) {
    console.log('Köprü yok — eski adlar tamamen kalkmış.');
    process.exit(0);
  }
  const { usage, unreadable } = measure();
  const { text, ready } = report(bridges, usage, unreadable);
  console.log(text);
  process.exit(ready.length ? 1 : 0);
}
