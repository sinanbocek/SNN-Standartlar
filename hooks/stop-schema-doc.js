// Stop: yapısal veritabanı değişikliği yapılıp şema belgesi güncellenmediyse işi bitirtmez.
// Yönlendirme: kural ortak depoda (snn-standartlar/quality/schema-doc.js). Bkz. ./lib/shared.js
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function main() {
  let input = {};
  try {
    input = JSON.parse(fs.readFileSync(0, 'utf8').replace(/^﻿/, '') || '{}');
  } catch {
    return;
  }
  let top;
  try {
    top = execFileSync('git', ['-C', input.cwd || process.cwd(), 'rev-parse', '--show-toplevel'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return;
  }
  const { measure, decide } = require(require('./lib/shared').shared('quality/schema-doc.js'));
  const m = measure(path.resolve(top));
  if (!m) return;
  const out = decide({ ...m, hookActive: !!input.stop_hook_active });
  if (out) process.stdout.write(JSON.stringify(out));
}

try {
  main();
} catch (e) {
  process.stderr.write(`stop-schema-doc hook hatası: ${e.message}\n`);
}
process.exit(0);
