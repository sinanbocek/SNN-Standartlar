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

// SAF: işlenmiş notları ayırır. Derleme görevi notu emekliye ayırınca dosya adı `_emekli-` ile başlar;
// yönlendirmeye indirince açıklamaya "(yönlendirme)" ekler (docs/bellek-derleme/README.md).
// NEDEN (#142, 2026-10-12): ikisi de kümelemeye giriyordu; 14 adayın 11'inde emekli not vardı, yönlendirme
// notları ortak "Bkz. …" kalıbıyla farklı dersleri tek kümede topluyordu. İşlenmiş not her hafta geri geliyordu.
const isRetired = (n) => /^_emekli-/.test(n.file || '');
const isRedirect = (n) => /\(yönlendirme\)/i.test(n.description || '');
function partition(notes) {
  const out = { active: [], retired: [], redirects: [] };
  for (const n of notes) {
    if (isRetired(n)) out.retired.push(n);
    else if (isRedirect(n)) out.redirects.push(n);
    else out.active.push(n);
  }
  return out;
}

// Kopya: proje bölününce notlar yeni klasörlere kopyalandı (SNN-Games → Pulmaca + Umi, #137). Aynı dosya adı,
// neredeyse aynı gövde; bağımsız gözlem değil. Ölçüm (2026-10-12): bölünme kopyaları 0.99–1.00 benzerlikte.
const COPY_THRESHOLD = 0.95;

// SAF: farklı projelerde aynı adı ve neredeyse aynı içeriği taşıyan notlar → kopya grupları (dosya adına göre)
function copies(notes) {
  const toks = notes.map((n) => tokens(`${n.name} ${n.description} ${n.body || ''}`));
  const byFile = new Map();
  for (let i = 0; i < notes.length; i += 1) {
    for (let j = i + 1; j < notes.length; j += 1) {
      if (!isCopy(notes[i], notes[j], toks[i], toks[j])) continue;
      const g = byFile.get(notes[i].file) || new Set();
      g.add(notes[i]); g.add(notes[j]);
      byFile.set(notes[i].file, g);
    }
  }
  return [...byFile.entries()].map(([file, g]) => ({ file, notes: [...g], projects: [...new Set([...g].map((n) => n.project))] }));
}
const isCopy = (a, b, ta, tb) => a.project !== b.project && a.file === b.file && similarity(ta, tb) >= COPY_THRESHOLD;

// SAF: notlar → projeler arası tekrar kümeleri. Aynı projedeki iki not küme kurmaz (o derleme değil, düzen işi).
// Kopya çifti de küme kurmaz: tekrar değil, ayrı bölümde gösterilir.
function clusters(notes, threshold = DEFAULT_THRESHOLD) {
  // Gövde de sayılır: yalnız açıklama ile 8 bilinen kümenin 4'ü bulunuyordu (2026-10-09 ölçümü).
  const toks = notes.map((n) => tokens(`${n.name} ${n.description} ${n.body || ''}`));
  const parent = notes.map((_, i) => i);
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const pairs = [];
  for (let i = 0; i < notes.length; i += 1) {
    for (let j = i + 1; j < notes.length; j += 1) {
      if (notes[i].project === notes[j].project) continue;
      if (isCopy(notes[i], notes[j], toks[i], toks[j])) continue;
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
// `notes` yalnız işlenmemiş notlardır; emekli ve yönlendirme ayrı sayılır (#142).
function report({ notes, groups, fresh, old, days, now = Date.now(), retired = [], redirects = [], copyGroups = [] }) {
  const byProject = {};
  for (const n of notes) byProject[n.project] = (byProject[n.project] || 0) + 1;
  const lines = [
    `# Bellek envanteri — ${new Date(now).toISOString().slice(0, 10)}`,
    '',
    `Not: ${notes.length} · proje: ${Object.keys(byProject).length} · son ${days} günde yeni/değişen: ${fresh.length} · projeler arası tekrar kümesi: ${groups.length} · tarihi geçmiş olabilir: ${old.length}`,
    `İşlenmiş (sayıya ve kümelemeye girmez): emekli: ${retired.length} · yönlendirme: ${redirects.length} · kopya grubu: ${copyGroups.length}`,
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
  lines.push('', `## Kopyalar (${copyGroups.length})`, 'Aynı ad, neredeyse aynı içerik, farklı proje (ör. bölünen projenin kopyaları). Bağımsız gözlem değildir; tekrar sayısına katılmaz.');
  for (const c of copyGroups) lines.push(`- \`${c.file}\` · ${c.projects.join(', ')}`);
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

module.exports = { frontmatter, tokens, similarity, partition, copies, clusters, recent, stale, report, scan, DEFAULT_THRESHOLD, COPY_THRESHOLD };

if (require.main === module) {
  const argv = process.argv.slice(2);
  const arg = (name, dflt) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : dflt; };
  const days = Number(arg('--son', 7));
  const threshold = Number(arg('--esik', DEFAULT_THRESHOLD));
  const { state, notes } = scan();
  if (state !== 'var') { console.log(`Bellek klasörü OKUNAMADI (${PROJECTS_DIR}). Bu "not yok" demek değildir.`); process.exit(0); }
  const now = Date.now();
  const { active, retired, redirects } = partition(notes);
  const out = { notes: active, groups: clusters(active, threshold), copyGroups: copies(active), fresh: recent(active, now, days), old: stale(active, now), retired, redirects, days, now };
  if (argv.includes('--json')) {
    const strip = (list) => list.map((n) => ({ ...n, dir: undefined }));
    console.log(JSON.stringify({ ...out, notes: strip(active), retired: strip(retired), redirects: strip(redirects) }, null, 1));
  } else {
    console.log(report(out));
  }
}
