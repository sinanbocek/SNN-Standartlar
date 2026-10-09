// BELLEK ENVANTERİ: bu bilgisayardaki tüm projelerin Claude bellek notlarını tarar, projeler arası
// tekrar eden dersleri kümeler, yeni ve tarihi geçmiş notları işaretler.
//
// NEDEN (2026-10-09): 11 projede 109 bellek notu vardı; aynı ders sekiz kümede birden çok projede ayrı
// ayrı yazılmıştı. En pahalısı: GHS-Panel 2026-09-28'de "Haiku yalnız mekanik iş, ajan raporuna güvenme"
// diye not düşmüştü; 2026-10-09'da Pulmaca aynı dersi 20 ajanlık deneyle (~1M parça) yeniden buldu.
// Proje belleği projeye özeldir; başka projenin notu okunmaz. Bu betik o duvarın üstünden bakar.
//
// Bu bir KAPI DEĞİLDİR: hiçbir notu silmez, taşımaz, değiştirmez. Yalnız sayar ve rapor yazar.
// Derleme (birleştirme, yönlendirme satırı, emekliye ayırma) ayrı iştir; haftalık görev yapar,
// proje sahibi onaylar (docs/bellek-derleme/README.md).
//
// Kullanım: node quality/memory-inventory.js [--son 7] [--esik 0.3] [--json]
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

const PROJECTS_DIR = path.join(os.homedir(), '.claude', 'projects');
const DAY_MS = 86400000;
// Eşik ölçümü (2026-10-09, 109 not, elle bilinen 8 küme): 0.13'te 6 aday çıktı — 3'ü gerçek, 3'ü gevşek
// akraba; bilinen 8 kümenin 3'ü bulundu. 0.2'de 0 aday. Kelime torbası kaba elektir: adayları model okur,
// kaçanları açıklama listesinden kendisi bulur (docs/bellek-derleme/README.md).
const DEFAULT_THRESHOLD = 0.13;
// Kümelemede sayılmayan kelimeler: her notta geçen bağlaç ve genel sözler.
const STOP = new Set(['için', 'ile', 'olarak', 'değil', 'yalnız', 'sonra', 'önce', 'artık', 'kural', 'proje',
  'projede', 'sahip', 'sinan', 'kullanıcı', 'claude', 'oturum', 'oturumda', 'her', 'tek', 'bir', 'olan', 'olur',
  'yok', 'var', 'the', 'and', 'bkz', 'genel', 'tüm', 'projeler', 'yazılır', 'kullanılmaz', 'kullan']);

// SAF: ön madde (frontmatter) alanları
function frontmatter(text) {
  const t = String(text || '').replace(/\r\n/g, '\n');
  const m = t.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { name: '', description: '', type: '', body: t };
  const head = m[1];
  const field = (k) => {
    const r = head.match(new RegExp(`^\\s*${k}:\\s*(.*)$`, 'm'));
    return r ? r[1].trim().replace(/^["']|["']$/g, '') : '';
  };
  return { name: field('name'), description: field('description'), type: field('type'), body: m[2] };
}

// SAF: metin → anlamlı kelime kümesi (Türkçe harfler dahil, 4+ harf, durak sözler hariç)
function tokens(text) {
  const out = new Set();
  for (const w of String(text || '').toLowerCase().split(/[^a-zçğıöşü0-9]+/)) {
    if (w.length >= 4 && !STOP.has(w)) out.add(w.replace(/(ler|lar|leri|ları|de|da|te|ta|nde|nda|nin|nın|ın|in|i|ı)$/, ''));
  }
  return out;
}

// SAF: iki kümenin Jaccard benzerliği
function similarity(a, b) {
  if (!a.size || !b.size) return 0;
  let n = 0;
  for (const x of a) if (b.has(x)) n += 1;
  return n / (a.size + b.size - n);
}

// SAF: notlar → projeler arası tekrar kümeleri. Aynı projedeki iki not küme kurmaz (o derleme değil, düzen işi).
function clusters(notes, threshold = DEFAULT_THRESHOLD) {
  // Gövde de sayılır: yalnız açıklama ile 8 bilinen kümenin 4'ü bulunuyordu (2026-10-09 ölçümü).
  const toks = notes.map((n) => tokens(`${n.name} ${n.description} ${n.body || ''}`));
  const parent = notes.map((_, i) => i);
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const pairs = [];
  for (let i = 0; i < notes.length; i += 1) {
    for (let j = i + 1; j < notes.length; j += 1) {
      if (notes[i].project === notes[j].project) continue;
      const s = similarity(toks[i], toks[j]);
      if (s >= threshold) { pairs.push({ i, j, s }); parent[find(i)] = find(j); }
    }
  }
  const groups = new Map();
  for (let i = 0; i < notes.length; i += 1) {
    const r = find(i);
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r).push(notes[i]);
  }
  return [...groups.values()]
    .filter((g) => g.length >= 2 && new Set(g.map((n) => n.project)).size >= 2)
    .map((g) => ({ notes: g, projects: [...new Set(g.map((n) => n.project))], score: Math.max(...pairs.filter((p) => g.includes(notes[p.i])).map((p) => p.s)) }))
    .sort((a, b) => b.notes.length - a.notes.length || b.score - a.score);
}

// SAF: son N günde yazılan ya da değişen notlar
const recent = (notes, now, days) => notes.filter((n) => now - n.modified < days * DAY_MS);

// SAF: tarihi geçmiş görünen notlar: "project" tipli ve 45 günden eski (iş bitmiş olabilir)
const stale = (notes, now, days = 45) => notes.filter((n) => n.type === 'project' && now - n.modified > days * DAY_MS);

// SAF: rapor metni
function report({ notes, groups, fresh, old, days, now = Date.now() }) {
  const byProject = {};
  for (const n of notes) byProject[n.project] = (byProject[n.project] || 0) + 1;
  const lines = [
    `# Bellek envanteri — ${new Date(now).toISOString().slice(0, 10)}`,
    '',
    `Not: ${notes.length} · proje: ${Object.keys(byProject).length} · son ${days} günde yeni/değişen: ${fresh.length} · projeler arası tekrar kümesi: ${groups.length} · tarihi geçmiş olabilir: ${old.length}`,
    '',
    '## Projeye göre',
    ...Object.entries(byProject).sort((a, b) => b[1] - a[1]).map(([p, c]) => `- ${p}: ${c}`),
    '',
    `## Projeler arası tekrar kümeleri (${groups.length})`,
    'Aynı ders birden çok projede ayrı yazılmış. Derleme adayı: tek yere indir, diğerlerine yönlendirme satırı bırak.',
  ];
  groups.forEach((g, i) => {
    lines.push('', `### Küme ${i + 1} — ${g.projects.length} proje, ${g.notes.length} not (benzerlik ${g.score.toFixed(2)})`);
    for (const n of g.notes) lines.push(`- **${n.project}** · \`${n.file}\` · ${n.modified.toISOString().slice(0, 10)} · ${n.description.slice(0, 110)}`);
  });
  lines.push('', `## Son ${days} günde yeni ya da değişen (${fresh.length})`);
  for (const n of fresh.sort((a, b) => b.modified - a.modified)) lines.push(`- ${n.modified.toISOString().slice(0, 10)} · **${n.project}** · \`${n.file}\` · ${n.description.slice(0, 110)}`);
  lines.push('', `## Tarihi geçmiş olabilir — "project" tipli, 45+ gün (${old.length})`);
  for (const n of old.sort((a, b) => a.modified - b.modified)) lines.push(`- ${n.modified.toISOString().slice(0, 10)} · **${n.project}** · \`${n.file}\` · ${n.description.slice(0, 110)}`);
  return lines.join('\n');
}

// IO: bellek klasörlerini okur. İçerik rapora yazılmaz; yalnız ad, açıklama, tip, tarih, boyut.
function scan(dir = PROJECTS_DIR) {
  if (!fs.existsSync(dir)) return { state: 'okunamadi', notes: [] };
  const notes = [];
  for (const d of fs.readdirSync(dir)) {
    const mem = path.join(dir, d, 'memory');
    if (!fs.existsSync(mem)) continue;
    const project = d.replace(/^[A-Za-z]--Users-[^-]+-Documents-SNN-AI-Asus-Z14-/, '').replace(/^[A-Za-z]--Users-[^-]+-Documents-/, '');
    for (const f of fs.readdirSync(mem)) {
      if (!f.endsWith('.md') || f === 'MEMORY.md') continue;
      try {
        const file = path.join(mem, f);
        const st = fs.statSync(file);
        const fm = frontmatter(fs.readFileSync(file, 'utf8'));
        notes.push({ project, dir: mem, file: f, name: fm.name || f.replace(/\.md$/, ''), description: fm.description, type: fm.type, modified: st.mtime, bytes: st.size, body: fm.body });
      } catch { /* okunamayan not sayılmaz; rapor "okunamadı" demez çünkü klasör okunabildi */ }
    }
  }
  return { state: 'var', notes };
}

module.exports = { frontmatter, tokens, similarity, clusters, recent, stale, report, scan, DEFAULT_THRESHOLD };

if (require.main === module) {
  const argv = process.argv.slice(2);
  const arg = (name, dflt) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : dflt; };
  const days = Number(arg('--son', 7));
  const threshold = Number(arg('--esik', DEFAULT_THRESHOLD));
  const { state, notes } = scan();
  if (state !== 'var') { console.log(`Bellek klasörü OKUNAMADI (${PROJECTS_DIR}). Bu "not yok" demek değildir.`); process.exit(0); }
  const now = Date.now();
  const out = { notes, groups: clusters(notes, threshold), fresh: recent(notes, now, days), old: stale(notes, now), days, now };
  if (argv.includes('--json')) {
    console.log(JSON.stringify({ ...out, notes: notes.map((n) => ({ ...n, dir: undefined })) }, null, 1));
  } else {
    console.log(report(out));
  }
}
