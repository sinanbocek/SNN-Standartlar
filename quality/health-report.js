// Haftalık sağlık raporunun SAYILAR bölümü. Ölçer, yorumlamaz.
//
// NEDEN VAR (2026-09-23, proje sahibi kararı):
// Haftalık e-posta raporu 7 sütunlu bir tablo basıyordu; iki sütun 10 projenin 10'unda da
// "okunamadı" diyordu, maddeler paragraf hâlindeydi ve önem derecesi yoktu. Proje sahibi:
// "uzun uzun cümleler yerine önem derecesi ve kısa gerekçe · özet hap bilgi".
//
// AYRIMI ŞU: bu dosya SAYIYI üretir (makine ölçer), e-posta rutini YORUMU yapar (hangi üç şey
// bu hafta önemli). Böylece sayılar tek kaynaktan gelir. Eski raporda kütük BAŞLIĞINDAKİ özet
// kullanılıyordu ve üç projede dosyanın içeriğiyle uyuşmuyordu (16 ve 23 Eylül raporlarında
// "Ölçülemeyenler" bölümünde yazılı); burada başlık değil, KAYITLAR sayılır.
//
// Kullanım: node quality/health-report.js
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const PROJECTS = path.join(__dirname, 'data', 'family-projects.json');
const STALE_DAYS = 7;

const gh = (args) => execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 1e8, stdio: ['ignore', 'pipe', 'pipe'] });
const ghJson = (args) => JSON.parse(gh(args));

// SAF: bir satır → "  etiket   değer"
const line = (label, value) => `  ${label.padEnd(16)} ${value}`;

// SAF: projelerin ölçümünden SAYILAR bloğu.
//
// rows: [{ name, p1, open, ci, stalePrs, unreadable }]
// quota: { billable, threshold, top } | null
function numbersBlock(rows, quota, extra = {}) {
  const out = ['SAYILAR'];

  if (quota) {
    const mark = quota.billable >= quota.threshold ? '⚠ aşıldı' : '✓';
    const top = quota.top ? `  (${quota.top[1]}'i ${quota.top[0]})` : '';
    out.push(line('Actions kotası', `${quota.billable} / ${quota.threshold} dk  ${mark}${top}`));
  } else {
    out.push(line('Actions kotası', 'ölçülemedi'));
  }

  // ACİL BORÇ: yalnız P1'i olan projeler yazılır. "P1:0" satırları, 10 satırlık tablonun
  // 7 satırını dolduruyordu ve hiçbir şey söylemiyordu.
  const withP1 = rows.filter((r) => r.p1 > 0).sort((a, b) => b.p1 - a.p1);
  const zero = rows.filter((r) => r.p1 === 0 && !r.unreadable).length;
  out.push(line('Acil borç', withP1.length
    ? `${withP1.map((r) => `${r.name} ${r.p1}`).join(' · ')}${zero ? ` · diğer ${zero} proje 0` : ''}`
    : `hiç yok (${rows.length} proje)`));

  const red = rows.filter((r) => r.ci === 'red');
  const green = rows.filter((r) => r.ci === 'green').length;
  out.push(line('main CI', red.length ? red.map((r) => `${r.name} KIRMIZI${r.ciName ? ` (${r.ciName})` : ''}`).join(' · ') : `${green}/${rows.length} yeşil`));

  const stale = rows.filter((r) => r.stalePrs > 0).sort((a, b) => b.stalePrs - a.stalePrs);
  const total = stale.reduce((s, r) => s + r.stalePrs, 0);
  out.push(line('Bekleyen PR', stale.length
    ? `${total} tanesi ${STALE_DAYS} günden eski — ${stale.map((r) => `${r.name} ${r.stalePrs}`).join(' · ')}`
    : `${STALE_DAYS} günden eski yok`));

  if (extra.requests !== undefined) out.push(line('Açık talep', extra.requests ? `${extra.requests}` : 'yok'));
  if (extra.pending) out.push(line('Bekleyen ölçüm', extra.pending));

  // ÖLÇEMEDİĞİM: her satırda tekrar eden "okunamadı" yerine TEK yerde, bir kez.
  const unreadable = rows.filter((r) => r.unreadable).map((r) => r.name);
  if (unreadable.length) {
    out.push('');
    out.push(`ÖLÇEMEDİĞİM   ${unreadable.join(' · ')} — kütük ya da CI okunamadı`);
  }
  return out.join('\n');
}

// SAF: ana daldan okunan kütük metninden sayılar. BAŞLIKTAKİ özet değil, KAYITLAR sayılır.
function countDebts(text, parseDebts) {
  const items = parseDebts(String(text || ''));
  return { open: items.length, p1: items.filter((i) => i.priority === 'P1').length };
}

const daysSince = (iso) => Math.floor((Date.now() - Date.parse(iso)) / 86400000);

function measure() {
  const { parseDebts } = require('../debt-sync/lib/debt');
  const list = JSON.parse(fs.readFileSync(PROJECTS, 'utf8')).projects;
  const rows = [];
  for (const { repo, dir } of list) {
    const name = dir;
    let debts = null;
    try {
      const raw = ghJson(['api', `repos/${repo}/contents/docs/teknik-borc.md`]).content;
      debts = countDebts(Buffer.from(raw, 'base64').toString('utf8'), parseDebts);
    } catch { /* kütüğü olmayan proje: borç 0 değil, ÖLÇÜLEMEDİ */ }

    // HANGİ akışın kırmızı olduğu yazılır. "KIRMIZI" tek başına yanıltır: kota kapısının
    // eşiği aşması ile derlemenin bozulması aynı şey değildir (2026-09-23'te ilk çalıştırmada
    // tam bu karışıklık çıktı).
    let ci = 'yok';
    let ciName = null;
    try {
      const runs = ghJson(['api', `repos/${repo}/actions/runs?branch=main&per_page=1&status=completed`]).workflow_runs || [];
      if (runs.length) {
        ci = runs[0].conclusion === 'success' ? 'green' : 'red';
        ciName = runs[0].name;
      }
    } catch { ci = 'yok'; }

    let stalePrs = 0;
    try {
      stalePrs = ghJson(['pr', 'list', '-R', repo, '-s', 'open', '--limit', '100', '--json', 'createdAt'])
        .filter((pr) => daysSince(pr.createdAt) >= STALE_DAYS).length;
    } catch { /* okunamadı */ }

    rows.push({ name, p1: debts ? debts.p1 : 0, open: debts ? debts.open : 0, ci, ciName, stalePrs, unreadable: !debts });
  }
  return rows;
}

module.exports = { numbersBlock, countDebts, line, STALE_DAYS };

if (require.main === module) {
  const rows = measure();

  // Kota TEK KAYNAKTAN gelir: kapının kullandığı ölçümün aynısı. İki ayrı hesap, iki farklı sayı
  // demektir — eski haftalık raporun "kütük başlığı dosyayla uyuşmuyor" sorunu tam buydu.
  let quota = null;
  try {
    const s = require('./actions-quota').measureMonth({});
    quota = { billable: s.billable, threshold: s.threshold, top: s.byRepo[0] || null };
  } catch { /* kota okunamadı: satır "ölçülemedi" der, rapor yine çıkar */ }

  let requests;
  try {
    requests = ghJson(['issue', 'list', '-R', 'sinanbocek/SNN-Standartlar', '--label', 'talep', '-s', 'open', '--json', 'number']).length;
  } catch { /* atlanır */ }

  let pending;
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'pending-measurements.json'), 'utf8')).pending || [];
    pending = raw.length ? raw.map((p) => `${p.id} (vade ${p.due})`).join(' · ') : 'yok';
  } catch { /* atlanır */ }

  console.log(numbersBlock(rows, quota, { requests, pending }));
}
