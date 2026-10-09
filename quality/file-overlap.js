// DOSYA ÖRTÜŞME ÖLÇÜMÜ: iki oturum aynı projede aynı dosyaya kısa arayla yazdı mı?
// TB-008'in gerçek sorusu budur; "aynı dalda buluşma" sayısı bunu ölçmez.
//
// NEDEN (2026-10-09): TB-008 "7 günde 98 aynı dal buluşması" diye dosya kilidi istiyordu. Bu betik
// yazılıp 1 Eylül'den beri oturum kayıtları (yalnız yol ve zaman; içerik okunmaz) tarandı:
//   6.457 yazma çağrısı · 79 oturum · 2 saatlik iddiayla engellenecek 109 çağrı
//   103'ü aynı oturumun KOPYASI (masaüstü çatal/yeniden açma: iki kayıt dosyası yüzlerce ortak mesaj
//   kimliği taşır) · 2'si sıralı (önceki oturum bitmiş) · 2'si farklı dal · GERÇEK: 2 (GHS-Panel, 25 Eylül,
//   aynı karar belgesine 21 ve 35 dk arayla).
// Kilit kurulsaydı 109 engelin 104'ü yanlış alarm olurdu. Kilit kurulmadı; bu ölçüm kaldı.
//
// Kullanım: node quality/file-overlap.js [--baslangic 2026-09-01] [--iddia-dk 120]
// Bu bir KAPI DEĞİLDİR: hiçbir şeyi kırmaz, yalnız sayıyı verir.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

const PROJECTS_DIR = path.join(os.homedir(), '.claude', 'projects');
const EDIT_TOOLS = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit']);
const DEFAULT_TTL_MS = 2 * 60 * 60 * 1000;
const BACKSLASH = String.fromCharCode(92);

const normalize = (p) => String(p || '').split(BACKSLASH).join('/').toLowerCase();

// SAF: zaman sırasına dizilmiş olaylardan ({ project, session, t, file, branch, cwd }) "iddia çakışması" üretir:
// aynı proje + aynı dosya, farklı oturum, önceki yazmadan ttl içinde.
function overlaps(events, ttlMs = DEFAULT_TTL_MS) {
  const sorted = [...events].sort((a, b) => a.t - b.t);
  const last = new Map();
  const out = [];
  for (const e of sorted) {
    const key = `${e.project}|${e.file}`;
    const prev = last.get(key);
    if (prev && prev.session !== e.session && e.t - prev.t < ttlMs) {
      out.push({ ...e, by: prev.session, gap: e.t - prev.t, sameBranch: prev.branch === e.branch, sameCwd: prev.cwd === e.cwd });
    }
    last.set(key, e);
  }
  return out;
}

// SAF: bir çakışmayı sınıflar.
//   kopya   — iki oturum aynı geçmişi taşıyor (çatal / yeniden açma); iki usta değil, tek usta
//   sirali  — önceki oturum bu yazmadan önce bitmişti (son etkinliği daha eski); Stop'ta düşen iddia yakalamazdı
//   dal     — farklı dalda; standardın 2. maddesi kapsar
//   gercek  — aynı dal, aynı klasör, ikisi de canlı
// lineage(a, b): iki oturum ortak geçmiş taşıyor mu? · lastSeen(session): oturumun son etkinlik zamanı
function classify(o, { lineage, lastSeen }) {
  if (lineage && lineage(o.by, o.session)) return 'copy';
  const prevLast = lastSeen ? lastSeen(o.by) : null;
  if (prevLast !== null && prevLast !== undefined && prevLast <= o.t) return 'sequential';
  if (!o.sameBranch) return 'branch';
  return 'real';
}

// SAF: sayım özeti
function summarize(list, ctx) {
  const counts = { copy: 0, sequential: 0, branch: 0, real: 0 };
  const real = [];
  for (const o of list) {
    const k = classify(o, ctx);
    counts[k] += 1;
    if (k === 'real') real.push(o);
  }
  return { total: list.length, counts, real };
}

// SAF: rapor metni
function report(s, meta) {
  const lines = [
    `Yazma çağrısı: ${meta.edits} · düzenleyen oturum: ${meta.sessions} · ${Math.round(meta.ttlMs / 60000)} dk iddiayla engellenecek: ${s.total}`,
    `  kopya (çatal/yeniden açma, tek usta): ${s.counts.copy}`,
    `  sıralı (önceki oturum bitmişti):      ${s.counts.sequential}`,
    `  farklı dal (standart madde 2 kapsar): ${s.counts.branch}`,
    `  GERÇEK (aynı dal, ikisi de canlı):    ${s.counts.real}`,
  ];
  for (const r of s.real) lines.push(`    ${path.basename(r.file)} · ${Math.round(r.gap / 60000)} dk · ${r.project.slice(-24)} · ${new Date(r.t).toISOString().slice(0, 16)}`);
  lines.push('');
  lines.push(s.counts.real
    ? 'Gerçek vaka var. Kilit kararı için: kaç tanesinde iş kaybı oldu? (elle bak; bu betik ölçmez)'
    : 'Gerçek vaka yok → dosya kilidi gerekmez.');
  return lines.join('\n');
}

// IO: oturum kayıtlarını okur. Yalnız yol, zaman, dal, klasör ve mesaj kimliği; içerik okunmaz.
function scan({ dir = PROJECTS_DIR, since = 0 } = {}) {
  const events = [];
  const uuids = new Map();   // session → Set(uuid)
  const lastSeen = new Map(); // session → son zaman
  let sessions = 0;
  if (!fs.existsSync(dir)) return { state: 'okunamadi', events, uuids, lastSeen, sessions };
  for (const project of fs.readdirSync(dir)) {
    const pdir = path.join(dir, project);
    let files;
    try { files = fs.readdirSync(pdir).filter((f) => f.endsWith('.jsonl')); } catch { continue; }
    for (const f of files) {
      const file = path.join(pdir, f);
      let text;
      try { if (fs.statSync(file).mtimeMs < since) continue; text = fs.readFileSync(file, 'utf8'); } catch { continue; }
      const session = f.replace('.jsonl', '');
      const ids = new Set();
      let any = false;
      for (const line of text.split('\n')) {
        if (!line.includes('"uuid"')) continue;
        let j;
        try { j = JSON.parse(line); } catch { continue; }
        if (j.uuid) ids.add(j.uuid);
        const t = Date.parse(j.timestamp || '');
        if (t) lastSeen.set(session, Math.max(lastSeen.get(session) || 0, t));
        const blocks = (j.message && Array.isArray(j.message.content)) ? j.message.content : [];
        for (const b of blocks) {
          if (b.type !== 'tool_use' || !EDIT_TOOLS.has(b.name)) continue;
          const fp = (b.input || {}).file_path || (b.input || {}).notebook_path;
          if (!fp || !t || t < since) continue;
          events.push({ project, session, t, file: normalize(fp), branch: j.gitBranch || '?', cwd: normalize(j.cwd) });
          any = true;
        }
      }
      uuids.set(session, ids);
      if (any) sessions += 1;
    }
  }
  return { state: 'var', events, uuids, lastSeen, sessions };
}

// SAF: iki oturum ortak geçmiş taşıyor mu? (ortak mesaj kimliği sayısı eşikten fazlaysa)
const sharedCount = (a, b) => { let n = 0; for (const u of a || []) if (b && b.has(u)) n += 1; return n; };
const LINEAGE_MIN = 20;

module.exports = { overlaps, classify, summarize, report, scan, sharedCount, normalize, LINEAGE_MIN, DEFAULT_TTL_MS };

if (require.main === module) {
  const argv = process.argv.slice(2);
  const arg = (name, dflt) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : dflt; };
  const since = Date.parse(arg('--baslangic', '2026-09-01'));
  const ttlMs = Number(arg('--iddia-dk', 120)) * 60000;
  const sc = scan({ since });
  if (sc.state !== 'var') { console.log(`Oturum kayıtları OKUNAMADI (${PROJECTS_DIR}). Bu "örtüşme yok" demek değildir.`); process.exit(0); }
  const list = overlaps(sc.events, ttlMs);
  const ctx = {
    lineage: (a, b) => sharedCount(sc.uuids.get(a), sc.uuids.get(b)) >= LINEAGE_MIN,
    lastSeen: (s) => sc.lastSeen.get(s) ?? null,
  };
  console.log(report(summarize(list, ctx), { edits: sc.events.length, sessions: sc.sessions, ttlMs }));
}
