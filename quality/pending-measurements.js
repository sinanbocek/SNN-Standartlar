// Bekleyen ölçümler: vadesi gelince MAKİNE çalıştırır. "Sonra ölçeriz" diye bekleyen kayıt olmaz.
//
// NEDEN VAR (2026-09-19): TB-002 "bir hafta defter verisi beklensin" diyordu. Ölçüldü: defter
// geçmiş tutmuyordu, beklenen veri HİÇ gelmeyecekti. Proje sahibi:
//   "bu ve benzeri işlemler tamamen makine zorlamasıyla kontrol edilerek otomatik tetiklenen
//    bir makine kuralı olmalı; aksi asla kabul edilemez."
//
// Bu dosya o kuraldır. Üç şeyi zorlar:
//   1. Her bekleyen ölçümün ÇALIŞTIRILABİLİR bir komutu olacak (dosya gerçekten var mı?).
//   2. Her bekleyen ölçümün bir VADESİ olacak.
//   3. Vade gelince komut ÇALIŞIR ve karar verilene kadar kırmızı kalır — unutulamaz.
//
// Kullanım:
//   node quality/pending-measurements.js            -> denetle (vadesi gelen varsa çalıştırır)
//   node quality/pending-measurements.js --liste    -> yalnız listele, çalıştırma
// Çıkış: 1 = geçersiz kayıt ya da vadesi gelmiş karar var.
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DATA_FILE = path.join(__dirname, 'data', 'pending-measurements.json');
const LEDGER = path.join(__dirname, '..', 'docs', 'teknik-borc.md');

// Komut YALNIZ bu deponun kendi ölçerlerini çağırabilir. Veri dosyasından gelen serbest metin
// çalıştırılmaz; izin listesi olmadan bu dosya bir uzaktan çalıştırma yüzeyine dönerdi.
const ALLOWED = /^node quality\/[A-Za-z0-9._-]+\.js(\s+--[A-Za-z0-9-]+(\s+[A-Za-z0-9._-]+)?)*$/;

// SAF: komutun çağırdığı betik yolu → 'node quality/x.js --gun 7' → 'quality/x.js'
const scriptOf = (command) => (String(command || '').match(/^node\s+(quality\/[A-Za-z0-9._-]+\.js)/) || [])[1] || null;

// SAF: bir kaydın kusurları → mesaj listesi (boşsa kayıt geçerli)
function problems(row, exists, today) {
  const out = [];
  const id = (row && row.id) || '(kimliksiz)';
  if (!row || !row.id) out.push('kayıtta `id` yok');
  if (!row || !row.question) out.push(`${id}: \`question\` yok — neyin ölçüldüğü yazılmadan bekleme olmaz`);
  if (!row || !row.decision) out.push(`${id}: \`decision\` yok — sayı gelince NE YAPILACAĞI önceden yazılır, sonra değil`);
  const command = row && row.command;
  if (!command) out.push(`${id}: \`command\` yok — çalıştırılamayan ölçüm, ölçüm değildir`);
  else if (!ALLOWED.test(command)) out.push(`${id}: komut izin listesinde değil → "${command}"`);
  else if (!exists(scriptOf(command))) out.push(`${id}: komutun betiği YOK → "${scriptOf(command)}" (TB-002 kusuru: olmayan veriyi beklemek)`);
  const due = row && row.due;
  if (!due) out.push(`${id}: \`due\` yok — vadesiz bekleme, unutulmuş beklemedir`);
  else if (Number.isNaN(Date.parse(due))) out.push(`${id}: \`due\` geçersiz tarih → "${due}"`);
  else if (today && Date.parse(due) <= Date.parse(today)) out.push(`${id}: VADESİ GELDİ (${due}) — ölçümü çalıştır, kararı ver, kaydı kapat`);
  return out;
}

// SAF: tüm kayıtlar → { invalid, due, ok }
function review(rows, exists, today) {
  const invalid = [];
  const due = [];
  const ok = [];
  for (const row of rows || []) {
    const list = problems(row, exists, today);
    const overdue = list.filter((m) => m.includes('VADESİ GELDİ'));
    const broken = list.filter((m) => !m.includes('VADESİ GELDİ'));
    if (broken.length) invalid.push({ row, messages: broken });
    else if (overdue.length) due.push({ row, messages: overdue });
    else ok.push({ row });
  }
  return { invalid, due, ok };
}

// SAF: kütükte "sonra ölçeriz" diye bekleyen kayıt var mı?
//
// AÇIK: bu ölçüt metne bakar, bu yüzden dar tutuldu — yalnız kütüğün kendi alan başlığı olan
// "Neden Şimdi Çözülmüyor" satırındaki bekleme ifadeleri sayılır. Geniş tutulursa her kayıt
// yanlış alarm verir ve kapı gürültüye döner.
const WAITING = /(ölç[üu]m bekl|veri bekl|bir hafta|ölçmeden|ölçülene kadar|sonra ölç)/i;
function waitingWithoutMeasurement(ledgerText, pendingIds) {
  const out = [];
  const blocks = String(ledgerText || '').split(/^### /m).slice(1);
  for (const block of blocks) {
    const id = (block.match(/^(TB-\d+)/) || [])[1];
    if (!id) continue;
    const line = (block.match(/^- \*\*Neden [^\n]*\*\*[^\n]*/m) || [''])[0];
    if (!WAITING.test(line)) continue;
    if (pendingIds.some((p) => String(p).includes(id))) continue;
    out.push(`${id} ölçüm bekliyor ama kayıtlı bekleyen ölçümü yok → quality/data/pending-measurements.json`);
  }
  return out;
}

// SAF: rapor
function report({ invalid, due, ok }, ledgerProblems = []) {
  const lines = [];
  ok.forEach(({ row }) => lines.push(`  • ${row.id} — vade ${row.due} · ${row.question}`));
  due.forEach(({ row, messages }) => { lines.push(`  ⏰ ${row.id} — ${row.question}`); messages.forEach((m) => lines.push(`      ${m}`)); });
  invalid.forEach(({ messages }) => messages.forEach((m) => lines.push(`  ✗ ${m}`)));
  ledgerProblems.forEach((m) => lines.push(`  ✗ ${m}`));
  if (!lines.length) return '✓ Bekleyen ölçüm yok.';
  const head = `Bekleyen ölçüm: ${ok.length + due.length}${due.length ? ` · ${due.length}'inin VADESİ GELDİ` : ''}`;
  return [head, ...lines].join('\n');
}

module.exports = { problems, review, report, waitingWithoutMeasurement, scriptOf, ALLOWED };

if (require.main === module) {
  const root = path.join(__dirname, '..');
  const exists = (rel) => !!rel && fs.existsSync(path.join(root, rel));
  const today = new Date().toISOString().slice(0, 10);
  let rows = [];
  try { rows = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')).pending || []; } catch { rows = []; }

  const result = review(rows, exists, today);
  let ledgerText = '';
  try { ledgerText = fs.readFileSync(LEDGER, 'utf8'); } catch { /* kütük yoksa o denetim atlanır */ }
  const ledgerProblems = waitingWithoutMeasurement(ledgerText, rows.map((r) => r.source || ''));

  console.log(report(result, ledgerProblems));

  // VADESİ GELENİ MAKİNE ÇALIŞTIRIR. Unutmaya, hatırlamaya, iyi niyete bırakılmaz.
  if (!process.argv.includes('--liste')) {
    for (const { row } of result.due) {
      console.log(`\n── ${row.id} ölçümü çalıştırılıyor: ${row.command}`);
      try {
        console.log(execSync(row.command, { cwd: root, encoding: 'utf8', timeout: 120000 }).trim());
      } catch (e) {
        console.log(`${(e.stdout || '').trim()}\n${(e.stderr || '').trim()}`.trim());
      }
      console.log(`── karar kuralı: ${row.decision}`);
    }
  }
  process.exit(result.invalid.length || result.due.length || ledgerProblems.length ? 1 : 0);
}
