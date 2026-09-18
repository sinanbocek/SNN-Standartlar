// Kütüphane güvenlik uyarıları (GitHub Dependabot) oturum başında görünür olsun; kütükte karşılığı yoksa kayıt önerilsin.
// Neden (2026-09-15 ölçümü): GHS'de 2 kritik + 45 yüksek, trade-kasa'da 2 yüksek, Naturapan'da 6 yüksek uyarı sessizce duruyordu.
// Kütüğe otomatik yazılmaz: kütük tek kaynak, kararı kullanıcı verir.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ORDER = ['critical', 'high', 'medium', 'low'];
const TR = { critical: 'kritik', high: 'yüksek', medium: 'orta', low: 'düşük' };
const CACHE_MS = 12 * 60 * 60 * 1000; // oturum başını yavaşlatmamak ve istek hakkını korumak için yarım gün
const CACHE_DIR = path.join(os.homedir(), '.claude', 'cache', 'guvenlik-uyarilari');

// SAF: uyarı listesini önem × kapsam (çalışan uygulama / yalnız geliştirme) sayımına indirger
function summarize(alerts) {
  const runtime = {};
  const dev = {};
  for (const a of alerts) {
    const sev = a.severity;
    const bucket = a.scope === 'development' ? dev : runtime;
    bucket[sev] = (bucket[sev] || 0) + 1;
  }
  return { runtime, dev, total: alerts.length };
}

const fmt = (counts) => ORDER.filter((s) => counts[s]).map((s) => `${counts[s]} ${TR[s]}`).join(', ');

// SAF: oturum başı mesajı. debtText = kütük metni (Dependabot/güvenlik açığı kaydı var mı diye bakılır)
function message(sum, debtText) {
  if (!sum || !sum.total) return null;
  const serious = (c) => (c.critical || 0) + (c.high || 0);
  const parts = [];
  if (Object.keys(sum.runtime).length) parts.push(`çalışan uygulamada ${fmt(sum.runtime)}`);
  if (Object.keys(sum.dev).length) parts.push(`yalnız geliştirme araçlarında ${fmt(sum.dev)}`);
  // Yalnız bağımlılık denetimine özgü ifadeler: "güvenlik açığı" genel ifadesi başka kayıtlarla karışıyordu (GHS arşivi, 2026-09-15)
  const recorded = /dependabot|\b(npm|pnpm|yarn) audit\b|bağımlılık güvenlik/i.test(debtText || '');
  let advice = '';
  if (serious(sum.runtime) && !recorded) {
    advice = ' Kütükte karşılığı yok: kullanıcıya P1 kayıt öner (önce etkilenen paketleri ölç).';
  } else if (serious(sum.dev) && !recorded) {
    advice = ' Kütükte karşılığı yok: kullanıcıya P2/P3 kayıt öner.';
  }
  return `Kütüphane güvenlik uyarıları (GitHub): ${parts.join(' · ')}.${advice}`;
}

function readCache(repo, now = Date.now()) {
  try {
    const c = JSON.parse(fs.readFileSync(path.join(CACHE_DIR, `${repo.replace('/', '__')}.json`), 'utf8'));
    return now - c.at < CACHE_MS ? c.alerts : null;
  } catch {
    return null;
  }
}

function writeCache(repo, alerts, now = Date.now()) {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(path.join(CACHE_DIR, `${repo.replace('/', '__')}.json`), JSON.stringify({ at: now, alerts }));
  } catch { /* önbellek yazılamazsa sonraki oturum yeniden sorar */ }
}

// Açık uyarıları GitHub'dan okur (önbellekli). Hata → null (oturum başı bozulmaz, sessizce atlanır)
function fetchAlerts(repo) {
  const cached = readCache(repo);
  if (cached) return cached;
  try {
    const out = execFileSync('gh', ['api', `repos/${repo}/dependabot/alerts?state=open&per_page=100`, '--paginate',
      '--jq', '.[] | {severity: .security_advisory.severity, scope: .dependency.scope, pkg: .dependency.package.name}'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 10000 });
    const alerts = out.split('\n').filter(Boolean).map((l) => JSON.parse(l));
    writeCache(repo, alerts);
    return alerts;
  } catch {
    return null;
  }
}

function repoOf(root) {
  try {
    const url = execFileSync('git', ['-C', root, 'remote', 'get-url', 'origin'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    const m = url.match(/github\.com[/:]([^/]+\/[^/]+?)(\.git)?$/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

function check(root) {
  const repo = repoOf(root);
  if (!repo) return null;
  const alerts = fetchAlerts(repo);
  if (!alerts) return null;
  let debtText = '';
  // Yalnız açık kayıtlar: arşivdeki kapanmış kayıt, bugünkü uyarıların karşılığı sayılmaz
  for (const f of ['docs/teknik-borc.md']) {
    try { debtText += fs.readFileSync(path.join(root, f), 'utf8'); } catch { /* yok */ }
  }
  return message(summarize(alerts), debtText);
}

module.exports = { summarize, message, readCache, writeCache, check, CACHE_MS };
