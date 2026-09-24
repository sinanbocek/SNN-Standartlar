// Stop: proje sahibine verilen kabuk komutu PowerShell 5.1'de çalışmayacaksa (`&&`, `export`, …) cevabı düzelttirir.
// Yönlendirme: kural ortak depoda (snn-standartlar/quality/shell-command.js). Bkz. ./lib/shared.js
'use strict';
const fs = require('fs');

function main() {
  let input = {};
  try {
    input = JSON.parse(fs.readFileSync(0, 'utf8').replace(/^﻿/, '') || '{}');
  } catch {
    return;
  }
  const { lastReplyText, decide } = require(require('./lib/shared').shared('quality/shell-command.js'));
  // Yeni sürümler son cevabı doğrudan verir; yoksa oturum kaydından okunur.
  let text = typeof input.last_assistant_message === 'string' ? input.last_assistant_message : '';
  if (!text && input.transcript_path) {
    try {
      text = lastReplyText(fs.readFileSync(input.transcript_path, 'utf8').split('\n').filter(Boolean));
    } catch {
      return;
    }
  }
  const out = decide({ text, hookActive: !!input.stop_hook_active });
  if (out) process.stdout.write(JSON.stringify(out));
}

try {
  main();
} catch (e) {
  process.stderr.write(`stop-shell-command hook hatası: ${e.message}\n`);
}
process.exit(0);
