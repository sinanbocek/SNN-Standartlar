// Stop: TS dosyası değiştiyse "bitti" demeden önce tip kontrolünü çalıştırır; kırmızıysa durmayı engeller.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execSync, execFileSync } = require('child_process');

const TS_FILE = /\.(ts|tsx|mts|cts)$/;
const CHECK_TIMEOUT_MS = 170000;
const MAX_OUTPUT_CHARS = 3000;
const CACHE_DIR = path.join(os.tmpdir(), 'claude-stop-gate');

function git(cwd, args) {
  try {
    return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return null;
  }
}

function pickCommand(root) {
  let scripts = {};
  try {
    scripts = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).scripts || {};
  } catch {
    return null;
  }
  if (scripts.typecheck) return 'npm run typecheck --silent';
  if (fs.existsSync(path.join(root, 'tsconfig.json'))) return 'npx --no-install tsc --noEmit';
  return null;
}

function main() {
  const input = JSON.parse(fs.readFileSync(0, 'utf8').replace(/^\uFEFF/, '') || '{}');
  const top = git(input.cwd || process.cwd(), ['rev-parse', '--show-toplevel']);
  if (!top) return;
  const root = path.resolve(top.trim());

  const status = git(root, ['status', '--porcelain']) || '';
  const changedTs = status.split('\n').filter((l) => l && TS_FILE.test(l.trim()) && !l.startsWith(' D') && !l.startsWith('D '));
  if (!changedTs.length) return;

  const command = pickCommand(root);
  if (!command) return;

  const fingerprint = crypto.createHash('sha1')
    .update(root).update(status).update(git(root, ['diff', 'HEAD']) || '').digest('hex');
  const cacheFile = path.join(CACHE_DIR, fingerprint);
  if (fs.existsSync(cacheFile)) return;

  try {
    execSync(command, { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], timeout: CHECK_TIMEOUT_MS, encoding: 'utf8' });
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(cacheFile, new Date().toISOString());
  } catch (e) {
    if (e.code === 'ETIMEDOUT' || e.signal) {
      process.stdout.write(JSON.stringify({ systemMessage: `stop-gate: "${command}" zaman aşımına uğradı; tip kontrolü yapılamadı.` }));
      return;
    }
    const out = `${e.stdout || ''}${e.stderr || ''}`.slice(-MAX_OUTPUT_CHARS);
    if (input.stop_hook_active) {
      process.stdout.write(JSON.stringify({ systemMessage: `⚠ Tip kontrolü hâlâ KIRMIZI (${command}). İş bitmiş sayılmaz.` }));
      return;
    }
    process.stdout.write(JSON.stringify({
      decision: 'block',
      reason: `[global kural] Değişen TS dosyaları var ve "${command}" başarısız. İşi bitirmeden önce düzelt (any/ignore ile susturmak yasak):\n${out}`,
    }));
  }
}

try {
  main();
} catch (e) {
  process.stderr.write(`stop-gate hook hatası: ${e.message}\n`);
}
process.exit(0);
