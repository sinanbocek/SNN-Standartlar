// Açık talepler cevapsız mı? "iş kaldı mı?" sorusunun ikinci kaynağı.
//
// NEDEN VAR (gerçek olay, 2026-09-19): kütükteki son kayıt kapandı ve oturum "eyleme
// geçirilebilir borç kalmadı" dedi. Aynı anda DÖRT AÇIK TALEP duruyordu; biri kapıyı sessizce
// bozan bir kusuru bildiriyordu. Talepler kütükte görünmüyordu, oturum açılışında görünmüyordu,
// hiçbir kapı onları saymıyordu. Proje sahibi ekran görüntüsüyle gösterdi ve şunu söyledi:
// "bu tek başına yetmez, sadece iyi niyet göstergesidir; kurala girmeli ve makine zorlaması olmalı."
//
// Bu dosya o zorlamadır. Kural: standartlar/teknik-borc-standardi.md
//
// Kullanım:
//   node quality/open-requests.js            -> açık talepleri listeler
//   node quality/open-requests.js --gun 14   -> eşiği değiştirir (varsayılan 7)
// Çıkış: 1 = eşiği aşmış CEVAPSIZ talep var.
'use strict';
const { execFileSync } = require('child_process');

const REPO = 'sinanbocek/SNN-Standartlar';
const LABEL = 'talep';
const DEFAULT_DAYS = 7;
const DAY_MS = 86400000;

// SAF: bir talep "cevapsız" mı?
//
// CEVAP SAYILAN ŞEY DAR TUTULDU: yorum, karar ya da kapanış. Talebi yalnız OKUMAK cevap
// değildir; etiket eklemek de değildir. Kapı ancak gerçekten sessiz kalan talebi yakalarsa
// işe yarar — gevşek ölçüt, kapının kendisini gürültü yapar.
const isUnanswered = (issue) => issue.state === 'OPEN' && (issue.comments || 0) === 0;

// SAF: kaç gündür açık?
const ageInDays = (issue, now) => Math.floor((now - new Date(issue.createdAt).getTime()) / DAY_MS);

// SAF: taleplerden karar → { silent, waiting, answered }
//   silent   : eşiği aşmış ve hiç yanıtlanmamış  → KIRMIZI
//   waiting  : yanıtsız ama eşiğin altında       → bilgi
//   answered : yanıt almış                       → bilgi
function classify(issues, now = Date.now(), days = DEFAULT_DAYS) {
  const silent = [];
  const waiting = [];
  const answered = [];
  for (const issue of issues) {
    if (issue.state !== 'OPEN') continue;
    const age = ageInDays(issue, now);
    if (!isUnanswered(issue)) answered.push({ ...issue, age });
    else if (age >= days) silent.push({ ...issue, age });
    else waiting.push({ ...issue, age });
  }
  return { silent, waiting, answered };
}

// SAF: rapor metni
function report({ silent, waiting, answered }, days = DEFAULT_DAYS) {
  const lines = [];
  const total = silent.length + waiting.length + answered.length;
  if (!total) return '✓ Açık talep yok.';
  lines.push(`Açık talep: ${total}`);
  for (const i of answered) lines.push(`  • #${i.number} (${i.age} gün) yanıt aldı — ${i.title}`);
  for (const i of waiting) lines.push(`  • #${i.number} (${i.age} gün) yanıt bekliyor — ${i.title}`);
  for (const i of silent) lines.push(`  ✗ #${i.number} (${i.age} gün) HİÇ YANITLANMADI — ${i.title}`);
  if (silent.length) {
    lines.push('');
    lines.push(`${silent.length} talep ${days} günden uzun süredir yanıtsız.`);
    lines.push('Talep cevapsız bırakılmaz: karar ver, gerekçesini GERI-BILDIRIM-KAYDI.md\'ye yaz, issue\'yu kapat.');
    lines.push('Reddetmek de bir cevaptır — gerekçesiyle yazılır.');
  }
  return lines.join('\n');
}

function fetchRequests(repo = REPO) {
  const out = execFileSync('gh', [
    'issue', 'list', '-R', repo, '--label', LABEL, '--state', 'open',
    '--limit', '200', '--json', 'number,title,createdAt,state,comments',
  ], { encoding: 'utf8', maxBuffer: 1e8, stdio: ['ignore', 'pipe', 'pipe'] });
  return JSON.parse(out).map((i) => ({ ...i, comments: Array.isArray(i.comments) ? i.comments.length : i.comments }));
}

module.exports = { classify, report, isUnanswered, ageInDays, DEFAULT_DAYS };

if (require.main === module) {
  const argv = process.argv.slice(2);
  const idx = argv.indexOf('--gun');
  const days = idx >= 0 ? Number(argv[idx + 1]) || DEFAULT_DAYS : DEFAULT_DAYS;
  const result = classify(fetchRequests(), Date.now(), days);
  console.log(report(result, days));
  process.exit(result.silent.length ? 1 : 0);
}
