// Birleştirme kapısı: GitHub kontrolleri yeşil değilken "gh pr merge" çalıştırılmaz.
// Neden: gizli depolarda GitHub'ın "zorunlu kontrol" dal koruması ücretli plan istiyor (2026-09-15: Portföy'de 403 ölçüldü).
// Ücretsiz karşılığı: yapay zekânın birleştirme komutu bilgisayarda, çalışmadan önce denetlenir.
'use strict';
const { execFileSync } = require('child_process');

// SAF: komuttaki "gh pr merge" çağrılarını çözer. Numara/depo değişkenle verilmişse (ör. $n) çözülemez → null alanlar.
function parseMerges(cmd) {
  const out = [];
  for (const m of cmd.matchAll(/\bgh\s+pr\s+merge\b([^\n;|&]*)/g)) {
    // Komut tırnak içinde gelebilir (bash -c "…", JSON): baştaki/sondaki tırnaklar argümana karışmasın
    const args = m[1].trim().split(/\s+/).map((a) => a.replace(/^['"]+|['"]+$/g, '')).filter(Boolean);
    let number = null;
    let repo = null;
    for (let i = 0; i < args.length; i += 1) {
      const a = args[i];
      if (a === '-R' || a === '--repo') { repo = args[i + 1] || null; i += 1; continue; }
      if (a.startsWith('--repo=')) { repo = a.slice(7); continue; }
      if (a.startsWith('-')) continue;
      const url = a.match(/github\.com\/([^/]+\/[^/]+)\/pull\/(\d+)/);
      if (url) { repo = url[1]; number = Number(url[2]); continue; }
      if (/^\d+$/.test(a) && number === null) number = Number(a);
    }
    if (repo && /\$/.test(repo)) repo = null;
    out.push({ number, repo, raw: m[0].trim() });
  }
  return out;
}

// SAF: kontrol listesine göre karar. checks = [{ name, bucket }] (bucket: pass|fail|pending|skipping|cancel), null = kontrol tanımlı değil
function decide(merge, checks) {
  if (!merge.number) {
    return { allow: false, reason: `Birleştirme komutunda PR numarası açık yazılmalı ("${merge.raw}"); kontroller ancak numarayla denetlenebilir.` };
  }
  const where = `${merge.repo || 'bu depo'} #${merge.number}`;
  if (checks === null) return { allow: true, note: `${where}: tanımlı kontrol yok` };
  const bad = checks.filter((c) => c.bucket === 'fail' || c.bucket === 'cancel');
  const pending = checks.filter((c) => c.bucket === 'pending');
  if (bad.length) return { allow: false, reason: `${where} birleştirilemez: kırmızı kontrol var (${bad.map((c) => c.name).join(', ')}). Önce düzelt.` };
  if (pending.length) return { allow: false, reason: `${where} birleştirilemez: kontroller sürüyor (${pending.map((c) => c.name).join(', ')}). "gh pr checks ${merge.number} --watch" ile bekle.` };
  return { allow: true };
}

// GitHub'dan kontrol durumunu okur. "no checks reported" → null (kontrol tanımlı değil). Başka hata → fırlatır (kapı kapalı kalır).
function readChecks(merge, cwd) {
  const args = ['pr', 'checks', String(merge.number), '--json', 'name,bucket'];
  if (merge.repo) args.push('-R', merge.repo);
  try {
    return JSON.parse(execFileSync('gh', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) || '[]');
  } catch (e) {
    const msg = `${e.stderr || ''}${e.stdout || ''}`;
    if (/no checks reported/i.test(msg)) return null;
    // gh, kontrol sürerken 8 ile çıkar ama JSON'u yine yazar
    if (e.stdout && e.stdout.trim().startsWith('[')) return JSON.parse(e.stdout);
    throw new Error(`kontroller okunamadı: ${msg.trim() || e.message}`);
  }
}

// Komuttaki tüm birleştirmeler için ilk ret gerekçesi ya da null
function gate(cmd, cwd) {
  for (const merge of parseMerges(cmd)) {
    let checks;
    try {
      checks = merge.number ? readChecks(merge, cwd) : [];
    } catch (e) {
      return `Birleştirme kapısı ${merge.repo || ''} #${merge.number} kontrollerini okuyamadı (${e.message}); emin olunamadığı için engellendi.`;
    }
    const d = decide(merge, checks);
    if (!d.allow) return d.reason;
  }
  return null;
}

module.exports = { parseMerges, decide, gate };
