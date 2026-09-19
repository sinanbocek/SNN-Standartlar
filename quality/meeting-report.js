// TB-002'nin sorusunu cevaplar: aynı projede aynı anda kaç kez çalışıldı, kaçında AYNI DAL?
//
// NEDEN VAR (2026-09-19): TB-002 "bir hafta defter verisi toplansın" diyordu. Ölçüldü ve görüldü
// ki defter yalnız ŞU ANKİ oturumları tutuyor — 2 saatten eski kayıt siliniyor. Beklenen veri
// hiçbir zaman gelmeyecekti. Proje sahibi "TB-002 neyi bekliyor?" diye sorunca ortaya çıktı.
// Artık `quality/session-registry.js` her buluşmayı günlüğe yazıyor; bu dosya onu okur.
//
// Kullanım: node quality/meeting-report.js [--gun 7]
// Bu bir KAPI DEĞİLDİR: hiçbir şeyi kırmaz, yalnız sayıyı verir. Karar sayıyı görünce verilir.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

const LOG_DIR = path.join(os.homedir(), '.claude', 'oturumlar');
const LOG_FILE = '_cakisma-gunlugu.jsonl';
const DAY_MS = 86400000;

// SAF: günlük satırlarını ayrıştırır; bozuk satır sessizce atlanır (günlük elle düzenlenebilir).
function parse(text) {
  const out = [];
  for (const line of String(text || '').split('\n')) {
    if (!line.trim()) continue;
    try {
      const row = JSON.parse(line);
      if (row && row.at) out.push(row);
    } catch { /* bozuk satır ölçümü durdurmaz */ }
  }
  return out;
}

// SAF: son N gündeki buluşmaları özetler.
//
// AYIRIM ÖNEMLİ: "aynı proje, aynı anda" tek başına sorun değildir — eş zamanlı çalışma
// standardının 2. maddesi (ayrı dal / ayrı worktree) bunu zaten yönetiyor. Asıl riskli olan
// AYNI DAL'da buluşmaktır; TB-002'nin kararı o sayıya bakar.
function summarize(rows, now = Date.now(), days = 7) {
  const since = now - days * DAY_MS;
  const recent = rows.filter((r) => Date.parse(r.at) >= since);
  const byProject = new Map();
  let sameBranch = 0;
  for (const row of recent) {
    if (row.sameBranch) sameBranch += 1;
    const key = row.project || '?';
    const entry = byProject.get(key) || { meetings: 0, sameBranch: 0 };
    entry.meetings += 1;
    if (row.sameBranch) entry.sameBranch += 1;
    byProject.set(key, entry);
  }
  return { days, total: recent.length, sameBranch, projects: [...byProject.entries()].sort((a, b) => b[1].meetings - a[1].meetings) };
}

// SAF: rapor metni. Kararı DAYATMAZ; sayıyı ve iki yolu gösterir.
function report(s) {
  if (!s.total) {
    return `Son ${s.days} günde eş zamanlı oturum buluşması kaydedilmedi.\n`
      + 'Günlük yeni kurulduysa veri birikmesi için zaman gerekir (kayıt oturum açılışında yazılır).';
  }
  const lines = [`Son ${s.days} gün: ${s.total} buluşma, ${s.sameBranch}'i AYNI DALDA.`];
  for (const [name, v] of s.projects) lines.push(`  ${name.padEnd(36)} ${v.meetings} buluşma · ${v.sameBranch} aynı dal`);
  lines.push('');
  lines.push(s.sameBranch
    ? 'Aynı dalda buluşma var → TB-002 P2\'ye çıkar: guard-files bekçisine dosya iddiası eklenir.'
    : 'Aynı dalda buluşma YOK → standardın 2. maddesi (ayrı dal / ayrı worktree) yetiyor; TB-002 kapatılabilir.');
  return lines.join('\n');
}

function read(dir = LOG_DIR) {
  try {
    return parse(fs.readFileSync(path.join(dir, LOG_FILE), 'utf8'));
  } catch {
    return [];
  }
}

module.exports = { parse, summarize, report, read, LOG_FILE };

if (require.main === module) {
  const argv = process.argv.slice(2);
  const idx = argv.indexOf('--gun');
  const days = idx >= 0 ? Number(argv[idx + 1]) || 7 : 7;
  console.log(report(summarize(read(), Date.now(), days)));
}
