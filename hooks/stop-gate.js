// Stop: TS dosyası değiştiyse "bitti" demeden önce tip kontrolünü çalıştırır; kırmızıysa durmayı engeller.
//
// Karar mantığı `lib/stop-gate-plan.js` içindedir (saf, testli). Burada yalnız IO var:
// git okuma, komut çalıştırma, önbellek dosyası, stdout.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync, execFileSync } = require('child_process');
const plan = require('./lib/stop-gate-plan');

const CHECK_TIMEOUT_MS = 170000;
const CACHE_DIR = path.join(os.tmpdir(), 'claude-stop-gate');

function git(cwd, args) {
  try {
    return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return null;
  }
}

function readScripts(root) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).scripts || {};
  } catch {
    return null;
  }
}

function main() {
  const input = JSON.parse(fs.readFileSync(0, 'utf8').replace(/^﻿/, '') || '{}');
  const top = git(input.cwd || process.cwd(), ['rev-parse', '--show-toplevel']);
  if (!top) return;
  const root = path.resolve(top.trim());

  // -uall ŞART: git yeni bir klasörü varsayılan olarak TEK SATIRDA (`?? src/`) bildirir,
  // içindeki dosyaları göstermez. O hâlde yeni bir klasöre yazılan TS dosyaları kapıyı hiç
  // tetiklemez. 2026-09-19'da uçtan uca denemede ölçüldü; testi: "yeni klasör kaçmaz".
  const status = git(root, ['status', '--porcelain', '-uall']) || '';
  if (!plan.changedTsLines(status).length) return;

  const scripts = readScripts(root);
  if (scripts === null) return; // package.json yok/bozuk: bu bir düğüm projesi değil
  const command = plan.pickCommand(scripts, fs.existsSync(path.join(root, 'tsconfig.json')));
  if (!command) return;

  const cacheFile = path.join(CACHE_DIR, plan.fingerprint(root, status, git(root, ['diff', 'HEAD']) || ''));
  if (fs.existsSync(cacheFile)) return;

  let error = null;
  try {
    execSync(command, { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], timeout: CHECK_TIMEOUT_MS, encoding: 'utf8' });
  } catch (e) {
    error = (e.code === 'ETIMEDOUT' || e.signal) ? { timedOut: true } : { text: `${e.stdout || ''}${e.stderr || ''}` };
  }

  const { cache, output } = plan.decide({ command, error, stopHookActive: input.stop_hook_active });
  if (cache) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(cacheFile, new Date().toISOString());
  }
  if (output) process.stdout.write(JSON.stringify(output));
}

try {
  main();
} catch (e) {
  process.stderr.write(`stop-gate hook hatası: ${e.message}\n`);
}
process.exit(0);
