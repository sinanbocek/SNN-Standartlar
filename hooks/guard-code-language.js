// PreToolUse (Edit|Write|MultiEdit|NotebookEdit): kod dili UYARI kipi.
// Yonlendirme: kural ortak depoda (snn-standartlar/quality/code-language-warn.js). Bkz. ./lib/shared.js
//
// BU BEKCI ASLA ENGELLEMEZ ve asla 'allow' dondurmez:
//   - engel: aktif oturumlarin ortasinda acilan kapi, yarim kalmis isi iki dilli birakir;
//   - 'allow': normalde onay soracak yazmalari da sessizce onaylar, yani guvenligi gevsetir.
// Uyari once olculur (yanlis alarm sayisi), sonra engele cevrilir.
'use strict';
const fs = require('fs');

let input = {};
try {
  input = JSON.parse(fs.readFileSync(0, 'utf8').replace(/^\uFEFF/, '') || '{}');
} catch {
  process.exit(0);
}

try {
  const shared = require('./lib/shared');
  const warning = require(shared.shared('quality/code-language-warn.js'));
  const scan = require(shared.shared('quality/code-language-scan.js'));

  const ti = input.tool_input || {};
  const root = input.cwd || process.cwd();
  const file = warning.relativePath(ti.file_path || ti.notebook_path || '', root);
  const text = warning.writtenText(ti);
  if (!file || !text) process.exit(0);

  const findings = warning.warnFindings(text, file, scan.wordSet(), scan.readExceptions(root));
  if (!findings.length) process.exit(0);

  const mesaj = warning.warnMessage(findings, file);
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'PreToolUse', additionalContext: mesaj },
  }));
  process.stderr.write(mesaj + '\n');
} catch {
  // Kural dosyasi yuklenemezse is DURMAZ: bu yalnizca bir warning katmanidir.
}
process.exit(0);
