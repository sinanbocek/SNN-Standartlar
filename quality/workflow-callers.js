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
const { execFileSync } = require('child_process');

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

// SAF: ölçüm sonucundan rapor
function report(bridges, usage) {
  const lines = [];
  const ready = [];
  for (const name of bridges) {
    const callers = usage.get(name) || [];
    lines.push(`${callers.length ? '•' : '✓'} ${name.padEnd(26)} ${callers.length} çağıran${callers.length ? ': ' + callers.join(', ') : ' — SİLİNEBİLİR'}`);
    if (!callers.length) ready.push(name);
  }
  if (ready.length) {
    lines.push('');
    lines.push(`${ready.length} köprünün çağıranı kalmadı; silinebilir: ${ready.join(', ')}`);
    lines.push('Silmeden önce: bu ölçüm ANA DALLARI okur, açık PR\'ları okumaz.');
  }
  return { text: lines.join('\n'), ready };
}

const gh = (args) => {
  try {
    return execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 1e8, stdio: ['ignore', 'pipe', 'ignore'] });
  } catch { return null; }
};

function measure() {
  const list = JSON.parse(fs.readFileSync(PROJECTS, 'utf8')).projects.filter((p) => !p.repo.endsWith(REPO));
  const usage = new Map();
  for (const { repo } of list) {
    const names = gh(['api', `repos/${repo}/contents/.github/workflows`, '--jq', '.[].name']);
    if (!names) continue;
    for (const file of names.trim().split('\n').filter(Boolean)) {
      const encoded = gh(['api', `repos/${repo}/contents/.github/workflows/${file}`, '--jq', '.content']);
      if (!encoded) continue;
      for (const called of callsIn(Buffer.from(encoded, 'base64').toString('utf8'))) {
        if (!usage.has(called)) usage.set(called, []);
        if (!usage.get(called).includes(repo)) usage.get(called).push(repo);
      }
    }
  }
  return usage;
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
  const { text, ready } = report(bridges, measure());
  console.log(text);
  process.exit(ready.length ? 1 : 0);
}
