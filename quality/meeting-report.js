// TB-002'nin sorusunu cevaplar: aynı projede aynı anda kaç kez çalışıldı, kaçında AYNI DAL?
//
// NEDEN VAR (2026-09-19): TB-002 "bir hafta defter verisi toplansın" diyordu. Ölçüldü ve görüldü
// ki defter yalnız ŞU ANKİ oturumları tutuyor — 2 saatten eski kayıt siliniyor. Beklenen veri
// hiçbir zaman gelmeyecekti. Proje sahibi "TB-002 neyi bekliyor?" diye sorunca ortaya çıktı.
// Artık `quality/session-registry.js` her buluşmayı günlüğe yazıyor; bu dosya onu okur.
//
// İKİ DÜZELTME (2026-10-09, TB-008 ölçümü):
//   1. Okunamadı ≠ yok. Klasör yoksa (CI'da hiç yok) "okunamadı" denir; eskiden "buluşma yok" diyordu
//      ve OLC-001 CI'da yanlış sonuç verdi (olcum-standardi.md Kural 3).
//   2. Çatal şişmesi. Masaüstü uygulaması bir oturumu çatallayınca/yeniden açınca yeni oturum kimliği
//      üretir; defter bunu ikinci usta sanır. 2026-09-23 Portföy: 7 saniyede 5 kayıt. Aynı projede
//      60 sn içinde gelen kayıtlar TEK buluşma sayılır (ham sayı da raporda kalır).
//   Buluşma sayısı kilit kararı için yetmez: aynı dalda olmak dosyaya birlikte dokunmak değildir.
//   Kilit kararı `quality/file-overlap.js` ölçümüyle verilir (2026-10-09: 6 haftada 2 gerçek vaka).
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
const BURST_MS = 60 * 1000; // aynı projede bu kadar kısa arayla gelen kayıtlar tek buluşmadır (çatal şişmesi)

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

// SAF: aynı projede BURST_MS içinde art arda gelen kayıtları tek buluşmaya indirger.
// Aynı dal işareti: gruptaki herhangi bir kayıt aynı dal diyorsa buluşma aynı daldadır.
function collapse(rows, burstMs = BURST_MS) {
  const sorted = [...rows].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const out = [];
  const lastByProject = new Map();
  for (const row of sorted) {
    const key = row.project || '?';
    const t = Date.parse(row.at);
    const prev = lastByProject.get(key);
    if (prev && t - prev.t < burstMs) {
      prev.row.sameBranch = prev.row.sameBranch || !!row.sameBranch;
      prev.row.collapsed = (prev.row.collapsed || 1) + 1;
      prev.t = t;
      continue;
    }
    const copy = { ...row };
    out.push(copy);
    lastByProject.set(key, { t, row: copy });
  }
  return out;
}

// SAF: son N gündeki buluşmaları özetler.
//
// AYIRIM ÖNEMLİ: "aynı proje, aynı anda" tek başına sorun değildir — eş zamanlı çalışma
// standardının 2. maddesi (ayrı dal / ayrı worktree) bunu zaten yönetiyor. Aynı dal daha risklidir,
// ama kilit kararı için o da yetmez: aynı DOSYAYA dokunulup dokunulmadığı file-overlap.js ile ölçülür.
function summarize(rows, now = Date.now(), days = 7) {
  const since = now - days * DAY_MS;
  const recentRaw = rows.filter((r) => Date.parse(r.at) >= since);
  const recent = collapse(recentRaw);
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
  return { days, raw: recentRaw.length, total: recent.length, sameBranch, projects: [...byProject.entries()].sort((a, b) => b[1].meetings - a[1].meetings) };
}

// SAF: rapor metni. Kararı DAYATMAZ; sayıyı ve sonraki ölçümü gösterir.
// state: 'var' | 'yok' | 'okunamadi' (olcum-standardi.md Kural 3)
function report(s, state = 'var') {
  if (state === 'okunamadi') {
    return `Buluşma günlüğü OKUNAMADI (${LOG_DIR}). Bu "buluşma yok" demek DEĞİLDİR: veri yalnız oturumların `
      + 'açıldığı bilgisayarda birikir (CI\'da hiç yoktur). Ölçümü o bilgisayarda çalıştır.';
  }
  if (!s.total) {
    return `Son ${s.days} günde eş zamanlı oturum buluşması kaydedilmedi.\n`
      + 'Günlük yeni kurulduysa veri birikmesi için zaman gerekir (kayıt oturum açılışında yazılır).';
  }
  const burst = s.raw - s.total;
  const lines = [`Son ${s.days} gün: ${s.total} buluşma, ${s.sameBranch}'i AYNI DALDA${burst ? ` (ham ${s.raw}; ${burst} kayıt 60 sn içinde tekrar — çatal/yeniden açma, tek sayıldı)` : ''}.`];
  for (const [name, v] of s.projects) lines.push(`  ${name.padEnd(36)} ${v.meetings} buluşma · ${v.sameBranch} aynı dal`);
  lines.push('');
  lines.push(s.sameBranch
    ? 'Aynı dalda buluşma var. Bu tek başına kilit gerekçesi DEĞİLDİR: aynı dosyaya dokunuldu mu, `node quality/file-overlap.js` ölçer.'
    : 'Aynı dalda buluşma YOK → standardın 2. maddesi (ayrı dal / ayrı worktree) yetiyor.');
  return lines.join('\n');
}

// IO: günlüğü okur. Üç sonuç: var / yok / okunamadı. Klasörün kendisi yoksa veri BAŞKA YERDEDİR → okunamadı.
function read(dir = LOG_DIR) {
  if (!fs.existsSync(dir)) return { state: 'okunamadi', rows: [] };
  const file = path.join(dir, LOG_FILE);
  if (!fs.existsSync(file)) return { state: 'yok', rows: [] };
  try {
    return { state: 'var', rows: parse(fs.readFileSync(file, 'utf8')) };
  } catch {
    return { state: 'okunamadi', rows: [] };
  }
}

module.exports = { parse, collapse, summarize, report, read, LOG_FILE, BURST_MS };

if (require.main === module) {
  const argv = process.argv.slice(2);
  const idx = argv.indexOf('--gun');
  const days = idx >= 0 ? Number(argv[idx + 1]) || 7 : 7;
  const { state, rows } = read();
  console.log(report(summarize(rows, Date.now(), days), state));
}
