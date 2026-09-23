// GitHub Actions dakika kotası: aylık kullanım eşiği aşıyor mu?
//
// NEDEN VAR (ölçüldü, 2026-09-23):
//   Temmuz 53 dk · Ağustos 972 dk · Eylül (23 günde) 2.527 dk — üç ayda 50 kat.
//   Sınıra dayanınca FATURA GELMİYOR, İŞ HİÇ BAŞLAMIYOR. Bu yaşandı: 2026-09-19'da
//   trade-kasa'da bir iş "spending limit" gerekçesiyle başlatılmadı (SNN-Abacus-Core
//   bildirimi #79'un eki). Kimse bakmadığı için de kimse bilmedi.
//
// Bu, bu oturumda kovalanan desenin bir örneği daha: kural vardı, ölçen yoktu, arıza SESSİZDİ.
//
// KOTAYI NE YAKAR: yalnız GİZLİ depolar. Herkese açık depoda standart makine ücretsizdir ve
// faturalama raporunda tam indirimli görünür (ölçüldü: brüt $0.252 · indirim $0.252 · ödenen $0).
// Bu yüzden zamanlanmış işlerimiz SNN-Standartlar'da (herkese açık) durur — kendileri kota yakmaz.
//
// Kullanım:
//   node quality/actions-quota.js              -> bu ayı ölçer
//   node quality/actions-quota.js --esik 2000  -> eşiği değiştirir
//   node quality/actions-quota.js --ay 2026-08 -> başka ay
// Çıkış: 1 = eşik aşıldı.
'use strict';
const { execFileSync } = require('child_process');

const DEFAULT_THRESHOLD = 1500;
const OWNER = 'sinanbocek';

// SAF: faturalama satırlarından Actions DAKİKA satırları
const minuteRows = (items) => (items || []).filter((r) => r && r.product === 'actions' && r.unitType === 'Minutes');

// SAF: aylık özet.
//
// freeRepos: herkese açık depolar — kotadan yanmaz. Boş verilirse HEPSİ sayılır (temkinli taraf:
// eşiği erken çalar, geç değil).
//
// day: ayın kaçıncı günündeyiz (izdüşüm için). Verilmezse izdüşüm hesaplanmaz — "ay sonunda
// şu kadar olur" demek, ölçmeden iddia etmektir (olcum-standardi.md kural 1).
function summarize(items, { threshold = DEFAULT_THRESHOLD, freeRepos = [], day = null, daysInMonth = 30 } = {}) {
  const free = new Set(freeRepos);
  const rows = minuteRows(items);
  const byRepo = new Map();
  let billable = 0;
  let freeMinutes = 0;
  for (const row of rows) {
    const name = row.repositoryName || '(bilinmeyen)';
    if (free.has(name)) { freeMinutes += row.quantity; continue; }
    billable += row.quantity;
    byRepo.set(name, (byRepo.get(name) || 0) + row.quantity);
  }
  const projected = day && day > 0 ? Math.round((billable / day) * daysInMonth) : null;
  return {
    billable: Math.round(billable),
    free: Math.round(freeMinutes),
    threshold,
    over: billable >= threshold,
    projectedOver: projected !== null && projected >= threshold,
    projected,
    byRepo: [...byRepo.entries()].map(([name, minutes]) => [name, Math.round(minutes)]).sort((a, b) => b[1] - a[1]),
  };
}

// SAF: rapor metni
function report(s, month = '') {
  const lines = [];
  lines.push(`${month} Actions dakikası (kotadan yanan): ${s.billable} / eşik ${s.threshold}`);
  if (s.free) lines.push(`  (ayrıca ${s.free} dk herkese açık depolarda — ücretsiz, sayılmadı)`);
  s.byRepo.slice(0, 8).forEach(([name, minutes]) => lines.push(`  ${String(minutes).padStart(5)} dk  ${name}`));
  if (s.projected !== null) lines.push(`  bu hızla ay sonu: ~${s.projected} dk`);
  lines.push('');
  if (s.over) {
    lines.push(`✗ EŞİK AŞILDI (${s.billable} ≥ ${s.threshold}).`);
    lines.push('Sınıra dayanınca iş FATURALANMAZ, HİÇ BAŞLAMAZ — 2026-09-19\'da trade-kasa\'da yaşandı.');
    lines.push('Yapılabilecekler: en çok yakan depoda `concurrency` + `paths-ignore`, seyrek çalışan');
    lines.push('cron\'ları haftalığa çekmek, ya da harcama sınırını yükseltmek.');
  } else if (s.projectedOver) {
    lines.push(`⚠ Eşik henüz aşılmadı ama bu hızla ay sonunda aşılır (~${s.projected} dk).`);
  } else {
    lines.push('✓ Eşiğin altında.');
  }
  return lines.join('\n');
}

const gh = (args) => execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 1e8, stdio: ['ignore', 'pipe', 'pipe'] });

// Herkese açık depolar okunur; okunamazsa BOŞ döner — o zaman hepsi sayılır ve eşik erken çalar.
function publicRepos(names) {
  const out = [];
  for (const name of names) {
    try {
      if (JSON.parse(gh(['repo', 'view', `${OWNER}/${name}`, '--json', 'visibility'])).visibility === 'PUBLIC') out.push(name);
    } catch { /* okunamayan depo GİZLİ sayılır: temkinli taraf */ }
  }
  return out;
}

// Ayın ölçümünü TEK YERDEN üretir: hem kapı hem haftalık rapor bunu çağırır.
// İki ayrı yerde iki ayrı hesap, iki farklı sayı demektir — eski haftalık rapor tam bu yüzden
// kütük başlığıyla dosya içeriğini karıştırmıştı.
function measureMonth({ threshold = DEFAULT_THRESHOLD, year, month, day = null } = {}) {
  const now = new Date();
  const y = year || now.getUTCFullYear();
  const m = month || now.getUTCMonth() + 1;
  const items = JSON.parse(gh(['api', `users/${OWNER}/settings/billing/usage?year=${y}&month=${m}`])).usageItems || [];
  const names = [...new Set(minuteRows(items).map((r) => r.repositoryName).filter(Boolean))];
  return summarize(items, {
    threshold,
    freeRepos: publicRepos(names),
    day: day === null && y === now.getUTCFullYear() && m === now.getUTCMonth() + 1 ? now.getUTCDate() : day,
    daysInMonth: new Date(Date.UTC(y, m, 0)).getUTCDate(),
  });
}

module.exports = { summarize, report, minuteRows, measureMonth, DEFAULT_THRESHOLD };

if (require.main === module) {
  const argv = process.argv.slice(2);
  const arg = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : null; };
  const threshold = Number(arg('--esik')) || DEFAULT_THRESHOLD;
  const now = new Date();
  const [year, month] = (arg('--ay') || `${now.getUTCFullYear()}-${now.getUTCMonth() + 1}`).split('-').map(Number);
  const thisMonth = year === now.getUTCFullYear() && month === now.getUTCMonth() + 1;

  try {
    gh(['api', `users/${OWNER}/settings/billing/usage?year=${year}&month=${month}`]);
  } catch (e) {
    // SESSİZ GEÇME YOK: okunamayan kota, "kota iyi" demek değildir.
    console.log(`✗ Kota okunamadı: ${(e.stderr || e.message || '').toString().trim().split('\n').pop()}`);
    console.log('Faturalama API\'si `user` yetkisi ister: gh auth refresh -h github.com -s user');
    // ÇIKIŞ 2 = ÖLÇEMEDİM (eşik aşıldı DEĞİL). İkisini aynı koda bağlamak yetki sorununu kota
    // sorunu gibi gösterirdi; okuyan yanlış yere bakar.
    process.exit(2);
  }

  const summary = measureMonth({ threshold, year, month, day: thisMonth ? now.getUTCDate() : null });
  console.log(report(summary, `${year}-${String(month).padStart(2, '0')}`));
  process.exit(summary.over ? 1 : 0);
}
