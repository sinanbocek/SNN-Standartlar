// OTURUM ÖZETİ: bir Claude Code oturum kaydını (JSONL) okunabilir bir olay listesine indirir ve
// "burada bir şey ters gitmiş olabilir" işaretlerini SATIR NUMARASIYLA çıkarır.
// `oturum-teshis` becerisi bunu çalıştırır; hüküm vermez, nereye bakılacağını gösterir.
//
// NEDEN (2026-09-23): kapılar KODU denetliyor, ajanın DAVRANIŞINI denetleyen bir şey yoktu. Aynı
// oturumda dört tökezleme oldu; üçü kullanıcıya yanlış bilgi olarak ulaştı ve ancak kullanıcı
// düzeltince ya da ajan kendisi fark edince görüldü:
//   1. Hata çıktısı susturulmuş bir döngü, 404'ü "adres yok" diye bastı (GHS-Panel).
//   2. Ölçüm yerel klasörler gezilerek yapıldı; üçüncü tarafın deposu aileye sayıldı (ihale-mcp).
//   3. Sabotaj `git checkout --` ile geri alınırken asıl düzeltme de silindi.
//   4. Bir `sed` sabotajı sessizce hiç uygulanmadı.
// Dedektörler bu izlere göre yazıldı ve üç gerçek oturumda ölçüldü (docs/oturum-teshisi.md).
// 4. vakayı yakalayan dedektör yok: tur ortasındaki açıklamalar kayıtta her zaman düz metin
// olarak durmuyor. Bu sınır gizlenmez.
//
// Kayıt KİŞİSEL VERİDİR: yalnız yerelde okunur, hiçbir yere gönderilmez. Anahtar biçimli
// değerler çıktıda maskelenir (quality/secret-scan.js).
//
// Kullanım:
//   node quality/session-digest.js [--son | --oturum <id> | --dosya <yol>] [--klasor <proje>]
//   node quality/session-digest.js --satir 430-450 [--oturum <id>]
//   node quality/session-digest.js --liste
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

const MAX = 300;

// ─── SAF ────────────────────────────────────────────────────────────────────

// SAF: çalışma klasörü → ~/.claude/projects altındaki klasör adı
const projectDirName = (cwd) => String(cwd).replace(/[^A-Za-z0-9]/g, '-');

// SAF: metni kısaltır ve anahtar biçimli değer taşıyorsa maskeler
function safe(text, max = MAX) {
  const { scanLine } = require('./secret-scan');
  const s = String(text == null ? '' : text);
  if (s.split(/\r?\n/).some((l) => scanLine(l).length)) return '[anahtar biçimli değer içeriyor — maskelendi]';
  const flat = s.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}

const resultText = (c) => (typeof c === 'string' ? c : Array.isArray(c) ? c.map((x) => x.text || '').join(' ') : JSON.stringify(c || ''));

// SAF: JSONL metni → olaylar. Bozuk satır atlanır; satır numaraları dosyadakiyle aynı kalır.
function parseTranscript(text) {
  const out = [];
  String(text).split('\n').forEach((raw, i) => {
    if (!raw.trim()) return;
    let o;
    try { o = JSON.parse(raw); } catch { return; }
    const line = i + 1;
    const at = o.timestamp || null;
    const content = o.message && o.message.content;
    if (o.type === 'user' && typeof content === 'string' && (!o.origin || o.origin.kind === 'human')) out.push({ line, at, kind: 'user-text', text: content });
    if (o.type === 'user' && Array.isArray(content)) {
      for (const c of content) if (c.type === 'tool_result') out.push({ line, at, kind: 'tool-result', error: !!c.is_error, text: resultText(c.content) });
    }
    if (o.type === 'assistant' && Array.isArray(content)) {
      for (const c of content) {
        if (c.type === 'text') out.push({ line, at, kind: 'assistant-text', text: c.text });
        if (c.type === 'tool_use') {
          const input = c.input || {};
          if (c.name === 'Bash' || c.name === 'PowerShell') out.push({ line, at, kind: 'bash', tool: c.name, text: input.command || '' });
          else out.push({ line, at, kind: 'tool', tool: c.name, text: input.file_path || input.pattern || input.url || input.description || '' });
        }
      }
    }
    if (o.type === 'attachment' && o.attachment) {
      const a = o.attachment;
      if (a.type === 'edited_text_file') out.push({ line, at, kind: 'edited-file', text: a.filename || '' });
      if (a.type === 'silent_turn_reminder') out.push({ line, at, kind: 'silent-turn', text: '' });
      if (a.type === 'hook_additional_context') out.push({ line, at, kind: 'hook-context', text: resultText(a.content) });
    }
    if (o.type === 'pr-link') out.push({ line, at, kind: 'pr-link', pr: o.prNumber, text: o.prUrl || '' });
  });
  return out;
}

const NO_LETTER_BEFORE = '(?<!\\p{L})';
const NO_LETTER_AFTER = '(?!\\p{L})';
const CORRECTION = new RegExp(`${NO_LETTER_BEFORE}(değil|yanlış|hayır|olmaz|yapma|anlamadım|sapma\\p{L}*)${NO_LETTER_AFTER}|dikkate alma`, 'iu');
const SELF_ERROR = /(yanlıştı|benim hatam|hatamdı|yanlışlıkla|hata yaptım|yanlış (saydım|okudum|sorguladım|söyledim|yazdım)|düzeltmemi (de )?sildi|hiç uygulanmadı|sayım hatam)/iu;
const REVERT = /\bgit (checkout( -q)? --|restore (?!--staged)|reset --hard|clean -f)/;
const SILENCED = /\b(gh|git|curl)\b[^\n]*2>\s*(\/dev\/null|\$null)/;
const ABSENT_LABEL = /echo[^;\n]*(yok|YOK|none|bulunamad|gönderilmemi|gonderilmemi|absent|missing)/;
const UNKNOWN_LABEL = /okunamad|OKUNAMAD|bilinmiyor|ölçülemedi/;
const LOCAL_SWEEP = /SNN-AI-Asus-Z14\/?["']?\s*(&&|;)\s*for \w+ in \*\//;
const GUARD_BLOCK = /hook error[\s\S]*Engellendi: ([^—.\n]+)/;
const PASTED = 600; // bundan uzun kullanıcı mesajı yapıştırılmış metindir, düzeltme sayılmaz

// SAF: olaylar → işaretler. Her işaret bir SATIR gösterir; hüküm değil, okunacak yerdir.
function detect(events) {
  const found = [];
  const add = (kind, line, summary) => found.push({ kind, line, summary });
  for (const e of events) {
    if (e.kind === 'bash' && SILENCED.test(e.text) && ABSENT_LABEL.test(e.text) && !UNKNOWN_LABEL.test(e.text)) {
      add('hata-susturma', e.line, `hata çıktısı susturulmuş okuma, sonuç "yok" diye etiketleniyor (Kural 3): ${safe(e.text, 160)}`);
    }
    if (e.kind === 'bash' && LOCAL_SWEEP.test(e.text)) {
      add('yerel-klasor-olcumu', e.line, `ölçüm yerel klasörler gezilerek yapılıyor; liste family-projects.json'dan gelmeli: ${safe(e.text, 160)}`);
    }
    if (e.kind === 'bash' && REVERT.test(e.text)) {
      const after = events.find((x) => x.kind === 'edited-file' && x.line > e.line && x.line - e.line <= 20 && e.text.includes(path.basename(x.text.replace(/\\/g, '/'))));
      if (after) add('geri-alma-sonrasi-degisiklik', e.line, `geri alma komutundan sonra L${after.line}'de ${path.basename(after.text.replace(/\\/g, '/'))} diskte değişti; düzeltme de geri alınmış olabilir`);
      else add('geri-alma', e.line, `geri alma komutu: ${safe(e.text, 160)}`);
    }
    if (e.kind === 'user-text' && e.text.length <= PASTED && CORRECTION.test(e.text)) add('kullanici-duzeltmesi', e.line, safe(e.text, 200));
    if (e.kind === 'assistant-text' && SELF_ERROR.test(e.text)) {
      const m = e.text.match(new RegExp(`.{0,80}${SELF_ERROR.source}.{0,80}`, 'isu'));
      add('kendi-hatasi', e.line, safe(m ? m[0] : e.text, 200));
    }
  }
  const blocks = new Map();
  for (const e of events) {
    const m = e.kind === 'tool-result' && e.error && e.text.match(GUARD_BLOCK);
    if (!m) continue;
    const why = m[1].trim();
    if (!blocks.has(why)) blocks.set(why, []);
    blocks.get(why).push(e.line);
  }
  for (const [why, lines] of blocks) {
    if (lines.length >= 2) add('tekrarlanan-engel', lines[0], `aynı bekçi engeline ${lines.length} kez takıldı: "${why}" (satırlar ${lines.join(', ')})`);
  }
  return found.sort((a, b) => a.line - b.line);
}

// SAF: sayılar
function stats(events) {
  const times = events.map((e) => e.at).filter(Boolean).map((t) => Date.parse(t)).filter((n) => !Number.isNaN(n));
  const byTool = {};
  for (const e of events) if (e.kind === 'bash' || e.kind === 'tool') byTool[e.tool] = (byTool[e.tool] || 0) + 1;
  return {
    userTurns: events.filter((e) => e.kind === 'user-text').length,
    toolCalls: events.filter((e) => e.kind === 'bash' || e.kind === 'tool').length,
    byTool,
    toolErrors: events.filter((e) => e.kind === 'tool-result' && e.error).length,
    silentTurns: events.filter((e) => e.kind === 'silent-turn').length,
    prs: [...new Set(events.filter((e) => e.kind === 'pr-link').map((e) => e.pr))],
    minutes: times.length > 1 ? Math.round((Math.max(...times) - Math.min(...times)) / 60000) : 0,
  };
}

// SAF: satır aralığını okunabilir biçimde yazar (maskeli, kısaltılmış)
const LABEL = { 'user-text': 'kullanıcı', 'assistant-text': 'ajan', bash: 'komut', tool: 'araç', 'tool-result': 'sonuç', 'edited-file': 'diskte değişti', 'silent-turn': 'sessiz kalma uyarısı', 'hook-context': 'bekçi', 'pr-link': 'PR' };
function render(events, from, to) {
  return events.filter((e) => e.line >= from && e.line <= to).map((e) => {
    const tag = e.kind === 'tool-result' ? (e.error ? 'sonuç ✗' : 'sonuç') : (e.tool && e.kind === 'tool' ? `araç ${e.tool}` : LABEL[e.kind]);
    return `L${e.line} [${tag}] ${safe(e.text)}`;
  }).join('\n');
}

// SAF: özet raporu
function report(file, events) {
  const s = stats(events);
  const f = detect(events);
  const tools = Object.entries(s.byTool).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · ');
  const lines = [
    `Oturum: ${file}`,
    `Süre ~${s.minutes} dk · kullanıcı mesajı ${s.userTurns} · araç çağrısı ${s.toolCalls} (${tools || '-'}) · araç hatası ${s.toolErrors} · sessiz kalma uyarısı ${s.silentTurns} · PR ${s.prs.length ? s.prs.map((n) => `#${n}`).join(' ') : '-'}`,
    '',
    f.length ? `${f.length} işaret (hüküm değil; okunacak yer):` : 'İşaret yok. Bu "sorun yok" demek değildir; dedektörlerin kapsamı dardır (docs/oturum-teshisi.md).',
  ];
  for (const x of f) lines.push(`  L${String(x.line).padEnd(5)} ${x.kind.padEnd(29)} ${x.summary}`);
  if (f.length) lines.push('', 'Bir işaretin çevresini okumak için: --satir <başlangıç>-<bitiş>');
  return lines.join('\n');
}

// ─── IO ─────────────────────────────────────────────────────────────────────

const projectsRoot = () => path.join(os.homedir(), '.claude', 'projects');

function sessionFiles(cwd = process.cwd()) {
  const dir = path.join(projectsRoot(), projectDirName(cwd));
  if (!fs.existsSync(dir)) return { dir, files: [] };
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.jsonl'))
    .map((f) => ({ id: f.replace(/\.jsonl$/, ''), file: path.join(dir, f), mtime: fs.statSync(path.join(dir, f)).mtimeMs, size: fs.statSync(path.join(dir, f)).size }))
    .sort((a, b) => b.mtime - a.mtime);
  return { dir, files };
}

function resolveFile(args, cwd) {
  const val = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; };
  if (val('--dosya')) return val('--dosya');
  const { dir, files } = sessionFiles(cwd);
  if (val('--oturum')) return path.join(dir, `${val('--oturum')}.jsonl`);
  if (!files.length) throw new Error(`Oturum kaydı bulunamadı: ${dir}`);
  return files[0].file;
}

module.exports = { parseTranscript, detect, stats, render, report, safe, projectDirName, sessionFiles };

if (require.main === module) {
  const args = process.argv.slice(2);
  const val = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; };
  const cwd = val('--klasor') || process.cwd();
  if (args.includes('--liste')) {
    const { dir, files } = sessionFiles(cwd);
    console.log(`${files.length} oturum · ${dir}`);
    for (const f of files) {
      const first = parseTranscript(fs.readFileSync(f.file, 'utf8')).find((e) => e.kind === 'user-text');
      console.log(`  ${f.id}  ${new Date(f.mtime).toISOString().slice(0, 16)}  ${(f.size / 1024).toFixed(0).padStart(6)} KB  ${first ? safe(first.text, 80) : '-'}`);
    }
    process.exit(0);
  }
  let file;
  try { file = resolveFile(args, cwd); } catch (e) { console.error(e.message); process.exit(2); }
  if (!fs.existsSync(file)) { console.error(`Oturum kaydı okunamadı: ${file}`); process.exit(2); }
  const events = parseTranscript(fs.readFileSync(file, 'utf8'));
  const range = val('--satir');
  if (range) {
    const [a, b] = range.split('-').map(Number);
    console.log(render(events, a, b || a));
  } else {
    console.log(report(file, events));
  }
}
