// Stop: projede teknik borç kütüğünde GitHub'a ulaşmamış değişiklik varsa işi bitirtmez.
// Amaç: proje sahibi ekranı kapattığında kütük değişikliği bilgisayarda kalmasın; GitHub'a ulaşınca
// oradaki görevli (snn-standartlar/debt-sync) issue ve board'u kendisi günceller.
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const LEDGER = ['docs/teknik-debt.md', 'docs/teknik-debt-arsiv.md'];

function git(cwd, args) {
  try {
    return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

// Saf karar: test edilebilir
function decide({ uncommitted, unpushed, hookActive }) {
  if (!uncommitted.length && !unpushed.length) return null;
  const parts = [];
  if (uncommitted.length) parts.push(`commit'lenmemiş: ${uncommitted.join(', ')}`);
  if (unpushed.length) parts.push(`hiçbir uzak dala gönderilmemiş commit: ${unpushed.join(', ')}`);
  const msg = `Teknik borç kütüğünde GitHub'a ulaşmamış değişiklik var (${parts.join(' · ')}). `
    + 'Kütük değişikliğini ayrı bir commit olarak kaydedip bir dala gönder (push) ve PR aç; '
    + 'aksi halde proje sahibi ekranı kapattığında değişiklik bilgisayarda kalır ve GitHub panosu güncellenmez.';
  if (hookActive) return { systemMessage: `⚠ ${msg}` };
  return { decision: 'block', reason: `[global kural] ${msg}` };
}

function measure(root) {
  const present = LEDGER.filter((f) => fs.existsSync(path.join(root, f)));
  if (!present.length) return null;
  const status = git(root, ['status', '--porcelain', '--', ...LEDGER]) || '';
  const uncommitted = status.split('\n').filter(Boolean).map((l) => l.replace(/^\s*\S{1,2}\s+/, '').trim()); // ilk satır kırpılmış olabilir (" M yol" → "M yol")
  const hasRemote = !!git(root, ['remote']);
  const unpushedOut = hasRemote ? (git(root, ['rev-list', 'HEAD', '--not', '--remotes', '--', ...LEDGER]) || '') : '';
  const unpushed = unpushedOut.split('\n').filter(Boolean).map((s) => s.slice(0, 7));
  return { uncommitted, unpushed };
}

function main() {
  let input = {};
  try {
    input = JSON.parse(fs.readFileSync(0, 'utf8').replace(/^﻿/, '') || '{}');
  } catch {
    return;
  }
  const top = git(input.cwd || process.cwd(), ['rev-parse', '--show-toplevel']);
  if (!top) return;
  const m = measure(path.resolve(top));
  if (!m) return;
  const out = decide({ ...m, hookActive: !!input.stop_hook_active });
  if (out) process.stdout.write(JSON.stringify(out));
}

if (require.main === module) {
  try {
    main();
  } catch (e) {
    process.stderr.write(`stop-debt-push hook hatası: ${e.message}\n`);
  }
  process.exit(0);
}
module.exports = { decide, measure };
