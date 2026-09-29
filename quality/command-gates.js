// KOMUT KAPILARI: bekçinin (hooks/guard-bash.js) her komut için çağırdığı TEK giriş.
//
// NEDEN BÖYLE (2026-09-29): bekçi kodu makineye elle kurulur (setup/setup-machine.js) — kasıtlı,
// bkz. 2026-09-15 vakası. Her yeni komut kapısı için bekçiyi değiştirmek, her seferinde elle
// kurulum demekti. Bekçi artık yalnız bu modülü çağırır; yeni kapılar buraya eklenir ve canlı
// kopyadan kendiliğinden akar. Kuralı çalıştıran şey (bekçi) sabit kalır, kural akar.
//
// Döner: { decision: 'deny' | 'ask', reason } ya da null.
// Kapı modülü yüklenemez ya da çökerse null: bunlar KALİTE kapısıdır, güvenlik kapısı değil
// (birleştirme kapısı ayrı ve kapalı-kalır mantığıyla bekçide durur).
'use strict';
const path = require('path');

const PR_CREATE = /\bgh\s+pr\s+create\b/;
// git push (dal silme ve yalnız etiket gönderimi hariç)
// push, git'in ALT KOMUTU olmalı (commit mesajında geçen "push" sayılmaz); arada yalnız -C/-c seçenekleri.
const PUSH = /\bgit(?:\s+-[Cc]\s+("[^"]+"|'[^']+'|\S+))*\s+push\b([^\n;|&]*)/;

// SAF: komutun hangi klasörde çalışacağı. `git -C <yol>` ya da baştaki `cd <yol> &&`; yoksa cwd.
function targetDir(cmd, cwd) {
  const unq = (s) => s.replace(/^["']|["']$/g, '');
  const c = cmd.match(/\bgit\s+-C\s+("[^"]+"|'[^']+'|\S+)/);
  if (c) return path.resolve(cwd || '.', unq(c[1]));
  const d = cmd.match(/^\s*(?:cd|Set-Location)\s+("[^"]+"|'[^']+'|\S+)\s*(?:&&|;)/i);
  if (d) return path.resolve(cwd || '.', unq(d[1]));
  return cwd || process.cwd();
}

// SAF: komut yerel test kapısına tabi mi?
function needsLocalCheck(cmd) {
  if (PR_CREATE.test(cmd)) return !/\s(-R|--repo)[\s=]/.test(cmd); // başka depo: klasörü bilinmez
  const m = cmd.match(PUSH);
  if (!m) return false;
  const args = m[2] || '';
  if (/--delete\b|\s-d\s|\s:\S/.test(args)) return false; // dal silme
  if (/--tags\b/.test(args) && !/\s(origin|HEAD|-u)\b/.test(args)) return false; // yalnız etiket
  return true;
}

function check(cmd, cwd, deps = {}) {
  const local = deps.local || (() => require('./local-check'));
  const quota = deps.quota || (() => require('./actions-quota'));
  try {
    if (needsLocalCheck(cmd)) {
      const reason = local().gate(targetDir(cmd, cwd));
      if (reason) return { decision: 'deny', reason };
    }
  } catch { /* kalite kapısı çökerse iş durmaz */ }
  try {
    if (PR_CREATE.test(cmd)) {
      const q = quota();
      // Onay yalnız ölçülen hesabın projesinde sorulur (başka hesabın kotası bilinmiyor).
      const owner = deps.owner !== undefined ? deps.owner : q.repoOwner(targetDir(cmd, cwd));
      if (q.ownsQuota && !q.ownsQuota(owner)) return null;
      // Ağa çıkılmaz: yalnız oturum açılışının yazdığı önbellek okunur (bekçi hızlı kalsın).
      const reason = q.askBeforePr(q.cachedSummary({ allowNetwork: false }));
      if (reason) return { decision: 'ask', reason };
    }
  } catch { /* önbellek yoksa sorulmaz */ }
  return null;
}

module.exports = { targetDir, needsLocalCheck, check };
