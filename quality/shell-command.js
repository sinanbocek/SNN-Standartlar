// KOMUT BEKÇİSİ: asistanın proje sahibine verdiği kabuk komutu PowerShell 5.1'de çalışır mı?
//
// NEDEN (2026-09-24, SNN-Piyasa-Core talebi): asistan sahibe
//   cd "C:/…/SNN-Piyasa-Core" && npx supabase functions deploy …
// verdi. Sahibin terminali Windows PowerShell 5.1; `&&` orada yoktur. Sahip hata aldı ve komutu
// elle düzeltti. Tek vaka değil: 99 oturumda (2026-08-15 → 09-24) asistanın 334 `bash` etiketli
// bloğundan 38'i bash sözdizimi taşıyordu; iki kez sahip şikâyet etti (Portföy fcfefdd2 L112,
// PowerShell hatası "At line:1 char:12"). Kural: standartlar/iletisim-standardi.md.
//
// NE BAKILIR: yalnız KABUK ETİKETLİ bloklar (```bash, ```powershell …). Etiketsiz bloklara
// bakılmaz: ölçümde 1.407 etiketsiz bloğun çoğu kod örneği ya da başka bir ajana yazılmış görev
// metniydi (`usdRate || 1`, `LogicalExpression[operator='||']`) — bekçi onları komut sanırdı.
// Yalnız cevabın SON parçası okunur: sahibe verilen komut oradadır; araya giren araç çağrılarının
// arasındaki ara notlar sahibe verilen talimat değildir.
'use strict';

const SHELL_TAGS = new Set(['bash', 'sh', 'shell', 'zsh', 'console', 'powershell', 'ps1', 'pwsh', 'ps']);

// SAF: tırnak içini atar — `git commit -m "a && b"` komutu bash sözdizimi TAŞIMAZ.
const stripQuotes = (line) => String(line).replace(/'[^']*'|"(?:[^"\\`]|[\\`].)*"/g, '""');

// Her kural: ne arar, sahibe ne önerilir.
const RULES = [
  { id: '&&', re: /&&/, fix: 'adımları ayrı bloklara böl (zorunluysa `A; if ($?) { B }`)' },
  { id: '||', re: /\|\|/, fix: 'adımları ayrı bloklara böl (zorunluysa `A; if (-not $?) { B }`)' },
  { id: 'export', re: /(?:^|;)\s*export\s+[A-Za-z_]\w*=/, fix: "`$env:AD = 'değer'`" },
  { id: '/dev/null', re: /\/dev\/null/, fix: '`$null` (ör. `2>$null`)' },
  { id: 'AD=değer komut', re: /^\s*[A-Z_][A-Z0-9_]*=\S*\s+[A-Za-z.]/, fix: "önce `$env:AD = 'değer'`, sonra komut" },
  { id: 'satır sonu \\', re: /\s\\\s*$/, fix: 'komutu tek satıra yaz (PowerShell\'de devam işareti ters tırnaktır)' },
];

// SAF: metindeki kabuk etiketli kod blokları → [{ tag, code }]
function shellBlocks(text) {
  const out = [];
  for (const m of String(text || '').matchAll(/```([^\n`]*)\n([\s\S]*?)```/g)) {
    const tag = m[1].trim().toLowerCase();
    if (SHELL_TAGS.has(tag)) out.push({ tag, code: m[2] });
  }
  return out;
}

// SAF: tek bloktaki PowerShell 5.1'de çalışmayan sözdizimi → [{ id, fix, line }]
function bashisms(code) {
  const out = [];
  for (const raw of String(code).split(/\r?\n/)) {
    const line = stripQuotes(raw);
    if (/^\s*#/.test(line)) continue;                       // yorum satırı
    for (const r of RULES) {
      if (r.re.test(line) && !out.some((o) => o.id === r.id)) out.push({ id: r.id, fix: r.fix, line: raw.trim().slice(0, 120) });
    }
  }
  return out;
}

// SAF: metnin tamamındaki bulgular → [{ tag, issues }]
function findings(text) {
  return shellBlocks(text).map((b) => ({ tag: b.tag, issues: bashisms(b.code) })).filter((b) => b.issues.length);
}

// SAF: oturum kaydı satırlarından cevabın SON parçası (son kullanıcı/araç sonucu kaydından sonraki
// asistan metinleri). Bozuk satır atlanır.
function lastReplyText(transcriptLines) {
  const parts = [];
  for (let i = transcriptLines.length - 1; i >= 0; i -= 1) {
    let o;
    try { o = JSON.parse(transcriptLines[i]); } catch { continue; }
    if (o.type === 'user') break;
    if (o.type !== 'assistant') continue;
    const content = o.message && o.message.content;
    if (!Array.isArray(content)) continue;
    const texts = content.filter((c) => c.type === 'text').map((c) => c.text);
    if (content.some((c) => c.type === 'tool_use') && !texts.length) break;
    parts.unshift(...texts);
  }
  return parts.join('\n');
}

// SAF: karar. İkinci turda (bekçi zaten bir kez durdurduysa) yalnız uyarır: sonsuz döngü olmaz.
function decide({ text, hookActive }) {
  const found = findings(text);
  if (!found.length) return null;
  const lines = [];
  for (const b of found) for (const i of b.issues) lines.push(`  • \`${i.id}\` → ${i.fix}\n    ${i.line}`);
  const msg = 'Proje sahibine verilen komut PowerShell 5.1\'de çalışmaz (standartlar/iletisim-standardi.md, '
    + '"Proje sahibine komut verirken"):\n' + lines.join('\n')
    + '\nKomutu PowerShell sözdiziminde yeniden yaz; tek komut, tek blok. Bu blok senin kendi çalıştırdığın '
    + 'bir komutun GÖSTERİMİYSE kabuk etiketi yerine `text` etiketi kullan.';
  if (hookActive) return { systemMessage: `⚠ ${msg}` };
  return { decision: 'block', reason: `[aile kuralı] ${msg}` };
}

module.exports = { SHELL_TAGS, RULES, stripQuotes, shellBlocks, bashisms, findings, lastReplyText, decide };
