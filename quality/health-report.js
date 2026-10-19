// Haftalık sağlık raporunun SAYILAR bölümü. Ölçer, yorumlamaz.
//
// NEDEN VAR (2026-09-23, proje sahibi kararı):
// Haftalık e-posta raporu 7 sütunlu bir tablo basıyordu; iki sütun 10 projenin 10'unda da
// "okunamadı" diyordu, maddeler paragraf hâlindeydi ve önem derecesi yoktu. Proje sahibi:
// "uzun uzun cümleler yerine önem derecesi ve kısa gerekçe · özet hap bilgi".
//
// AYRIMI ŞU: bu dosya SAYIYI üretir (makine ölçer), e-posta rutini YORUMU yapar (hangi üç şey
// bu hafta önemli). Böylece sayılar tek kaynaktan gelir. Eski raporda kütük BAŞLIĞINDAKİ özet
// kullanılıyordu ve üç projede dosyanın içeriğiyle uyuşmuyordu (16 ve 23 Eylül raporlarında
// "Ölçülemeyenler" bölümünde yazılı); burada başlık değil, KAYITLAR sayılır.
//
// Kullanım: node quality/health-report.js
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const PROJECTS = path.join(__dirname, 'data', 'family-projects.json');
const STALE_DAYS = 7;

const gh = (args) => execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 1e8, stdio: ['ignore', 'pipe', 'pipe'] });
const ghJson = (args) => JSON.parse(gh(args));

// SAF: bir satır → "  etiket   değer"
const line = (label, value) => `  ${label.padEnd(16)} ${value}`;

// SAF: uzun akış adını kısaltır. Dependabot akışlarının adı paket listesinin tamamını taşıyor
// ve satırı okunmaz hâle getiriyor (2026-09-23 ölçümü: 100+ karakterlik tek ad).
const shortName = (name, max = 32) => (String(name || '').length > max ? `${String(name).slice(0, max - 1)}…` : String(name || ''));

// SAF: projelerin ölçümünden SAYILAR bloğu.
//
// rows: [{ name, p1, open, ci, stalePrs, unreadable }]
// quota: { billable, threshold, top } | null
function numbersBlock(rows, quota, extra = {}) {
  const out = ['SAYILAR'];

  // AİLE DURUMU makineden gelir. İlk raporda rutin bunu kendisi saymış ve yanılmıştı:
  // "7 proje sakin" yazmış, oysa ailede 11 proje var ve 4'ünde acil borç vardı (biri 5 acil
  // borçla "sakin" sayılmıştı). Rutinin hesaplayabileceği hiçbir sayı bırakılmaz.
  const withDebt = rows.filter((r) => r.p1 > 0).length;
  const redCount = rows.filter((r) => r.ci === 'red').length;
  out.push(line('Aile durumu', `${rows.length} proje · ${withDebt} projede acil borç · ${redCount ? `${redCount} projede CI kırmızı` : 'CI hepsi yeşil'}`));

  if (quota) {
    const mark = quota.billable >= quota.threshold ? '⚠ aşıldı' : '✓';
    const top = quota.top ? `  (${quota.top[1]}'i ${quota.top[0]})` : '';
    out.push(line('Actions kotası', `${quota.billable} / ${quota.threshold} dk  ${mark}${top}`));
  } else {
    out.push(line('Actions kotası', 'ölçülemedi'));
  }

  // ACİL BORÇ: yalnız P1'i olan projeler yazılır. "P1:0" satırları, 10 satırlık tablonun
  // 7 satırını dolduruyordu ve hiçbir şey söylemiyordu.
  const withP1 = rows.filter((r) => r.p1 > 0).sort((a, b) => b.p1 - a.p1);
  const zero = rows.filter((r) => r.p1 === 0 && !r.unreadable).length;
  out.push(line('Acil borç', withP1.length
    ? `${withP1.map((r) => `${r.name} ${r.p1}`).join(' · ')}${zero ? ` · diğer ${zero} proje 0` : ''}`
    : `hiç yok (${rows.length} proje)`));

  const red = rows.filter((r) => r.ci === 'red');
  const green = rows.filter((r) => r.ci === 'green').length;
  out.push(line('main CI', red.length ? red.map((r) => `${r.name} KIRMIZI${r.ciName ? ` (${shortName(r.ciName)})` : ''}`).join(' · ') : `${green}/${rows.length} yeşil`));

  const stale = rows.filter((r) => r.stalePrs > 0).sort((a, b) => b.stalePrs - a.stalePrs);
  const total = stale.reduce((s, r) => s + r.stalePrs, 0);
  out.push(line('Bekleyen PR', stale.length
    ? `${total} tanesi ${STALE_DAYS} günden eski — ${stale.map((r) => `${r.name} ${r.stalePrs}`).join(' · ')}`
    : `${STALE_DAYS} günden eski yok`));

  if (extra.requests !== undefined) out.push(line('Açık talep', extra.requests ? `${extra.requests}` : 'yok'));
  if (extra.pending) out.push(line('Bekleyen ölçüm', extra.pending));

  // YENİ DEPO: hesapta olup aile listesinde yazılı olmayan. Ölçülür ama listeye de yazılmalı:
  // uyum ölçeri ve toplu ölçüm hâlâ listeyi okur. null = hesap okunamadı (yok demek değil).
  if (extra.discovered === null) out.push(line('Yeni depo', 'hesap okunamadı — listedekiler ölçüldü'));
  else if (extra.discovered && extra.discovered.length) out.push(line('Yeni depo', `${extra.discovered.join(' · ')} — ölçüldü; aile listesine eklenmeli`));

  // ÖLÇEMEDİĞİM: her satırda tekrar eden "okunamadı" yerine TEK yerde, bir kez.
  const unreadable = rows.filter((r) => r.unreadable).map((r) => r.name);
  if (unreadable.length) {
    out.push('');
    out.push(`ÖLÇEMEDİĞİM   ${unreadable.join(' · ')} — kütük ya da CI okunamadı`);
  }
  return out.join('\n');
}

// SAF: ana daldan okunan kütük metninden sayılar. BAŞLIKTAKİ özet değil, KAYITLAR sayılır.
function countDebts(text, parseDebts) {
  const items = parseDebts(String(text || ''));
  return { open: items.length, p1: items.filter((i) => i.priority === 'P1').length };
}

// SAF: aile listesi + hesaptaki depolar → ölçülecek liste.
//
// NEDEN (2026-10-19, proje sahibi): "bugün ilk çalışan süreçte eksik repolar vardı ... hesabıma
// yeni repolar eklendikçe tarama otomatik olarak hepsini kontrol edecek". Liste elle tutuluyordu;
// hesaba açılan depo listeye yazılana kadar raporda görünmüyordu.
//
// Listede olanlar aynen kalır (klasör adı depo adından farklı olabilir: GHS-Panel). Gerekçeli
// dışlananlar (excluded), çatallar (başkasının kodu) ve arşivlenmiş depolar eklenmez.
// accountRepos null ise (hesap okunamadı) liste aynen döner; discovered da null olur.
function mergeFamily(list, accountRepos) {
  const projects = [...(list.projects || [])];
  if (!Array.isArray(accountRepos)) return { projects, discovered: null };
  const key = (r) => String(r || '').toLowerCase();
  const known = new Set([...projects, ...(list.excluded || [])].map((x) => key(x.repo)));
  const discovered = [];
  for (const r of accountRepos) {
    if (!r || r.isFork || r.isArchived || known.has(key(r.nameWithOwner))) continue;
    const dir = String(r.nameWithOwner).split('/')[1];
    projects.push({ repo: r.nameWithOwner, dir, discovered: true });
    known.add(key(r.nameWithOwner));
    discovered.push(dir);
  }
  return { projects, discovered };
}

// IO: listedeki hesapların (accounts) bütün depoları. Biri okunamazsa null — "yeni depo yok"
// diye okunmasın (olcum-standardi.md, Kural 3: okunamadı ≠ yok).
function accountRepos(accounts) {
  try {
    return (accounts || []).flatMap((owner) => ghJson(['repo', 'list', owner, '--limit', '500', '--json', 'nameWithOwner,isFork,isArchived']));
  } catch { return null; }
}

const daysSince = (iso) => Math.floor((Date.now() - Date.parse(iso)) / 86400000);

// SAF: koşum listesinden AKIŞ BAŞINA son koşum → { state, failing }
//
// Tek "en son koşum"a bakmak yanıltır: hangi zamanlanmış işin en son çalıştığına göre sonuç
// değişir. 2026-09-23'te ölçüldü — kota kapısı kırmızıyken rapor "CI hepsi yeşil" dedi, çünkü
// araya başka bir akışın başarılı koşumu girmişti. Liste yeniden eskiye gelir.
function ciState(runs) {
  const latest = new Map();
  for (const run of runs || []) if (run && run.name && !latest.has(run.name)) latest.set(run.name, run);
  if (!latest.size) return { state: 'yok', failing: null };
  const failing = [...latest.values()].filter((run) => run.conclusion !== 'success').map((run) => run.name);
  return { state: failing.length ? 'red' : 'green', failing: failing.join(', ') || null };
}

function measure(list) {
  const { parseDebts } = require('../debt-sync/lib/debt');
  const rows = [];
  for (const { repo, dir } of list) {
    const name = dir;
    let debts = null;
    try {
      const raw = ghJson(['api', `repos/${repo}/contents/docs/teknik-borc.md`]).content;
      debts = countDebts(Buffer.from(raw, 'base64').toString('utf8'), parseDebts);
    } catch { /* kütüğü olmayan proje: borç 0 değil, ÖLÇÜLEMEDİ */ }

    // AKIŞ BAŞINA SON KOŞUM. Tek "en son koşum"a bakmak yanıltır: hangi zamanlanmış işin en
    // son çalıştığına göre sonuç değişir. 2026-09-23'te ölçüldü — kota kapısı kırmızıyken
    // rapor "CI hepsi yeşil" dedi, çünkü araya başka bir akışın başarılı koşumu girmişti.
    //
    // HANGİ akışın kırmızı olduğu da yazılır: kota kapısının eşiği aşması ile derlemenin
    // bozulması aynı şey değildir. İlk raporda rutin bunu "depo kendini doğrulayamıyor" diye
    // yorumlamıştı; oysa `test` akışı yeşildi.
    let ci = 'yok';
    let ciName = null;
    try {
      const state = ciState(ghJson(['api', `repos/${repo}/actions/runs?branch=main&per_page=50&status=completed`]).workflow_runs);
      ci = state.state;
      ciName = state.failing;
    } catch { ci = 'yok'; }

    let stalePrs = 0;
    try {
      stalePrs = ghJson(['pr', 'list', '-R', repo, '-s', 'open', '--limit', '100', '--json', 'createdAt'])
        .filter((pr) => daysSince(pr.createdAt) >= STALE_DAYS).length;
    } catch { /* okunamadı */ }

    rows.push({ name, p1: debts ? debts.p1 : 0, open: debts ? debts.open : 0, ci, ciName, stalePrs, unreadable: !debts });
  }
  return rows;
}

module.exports = { numbersBlock, countDebts, line, shortName, ciState, mergeFamily, STALE_DAYS };

if (require.main === module) {
  const family = JSON.parse(fs.readFileSync(PROJECTS, 'utf8'));
  const { projects, discovered } = mergeFamily(family, accountRepos(family.accounts));
  const rows = measure(projects);

  // Kota TEK KAYNAKTAN gelir: kapının kullandığı ölçümün aynısı. İki ayrı hesap, iki farklı sayı
  // demektir — eski haftalık raporun "kütük başlığı dosyayla uyuşmuyor" sorunu tam buydu.
  let quota = null;
  try {
    const s = require('./actions-quota').measureMonth({});
    quota = { billable: s.billable, threshold: s.threshold, top: s.byRepo[0] || null };
  } catch { /* kota okunamadı: satır "ölçülemedi" der, rapor yine çıkar */ }

  let requests;
  try {
    requests = ghJson(['issue', 'list', '-R', 'sinanbocek/SNN-Standartlar', '--label', 'talep', '-s', 'open', '--json', 'number']).length;
  } catch { /* atlanır */ }

  let pending;
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'pending-measurements.json'), 'utf8')).pending || [];
    pending = raw.length ? raw.map((p) => `${p.id} (vade ${p.due})`).join(' · ') : 'yok';
  } catch { /* atlanır */ }

  console.log(numbersBlock(rows, quota, { requests, pending, discovered }));
}
