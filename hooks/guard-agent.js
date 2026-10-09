// PreToolUse (Agent): alt ajan çağrısı UYARI kipi — model ve düşünme seviyesi yazılmış mı?
// Yönlendirme: kural ortak depoda (snn-standartlar/quality/agent-call.js). Bkz. ./lib/shared.js
//
// BU BEKÇİ ASLA ENGELLEMEZ ve asla 'allow' döndürmez (guard-code-language ile aynı gerekçe):
//   - engel: açılmak üzere olan ajan durur, koordinatör yarım kalır;
//   - 'allow': normalde onay soracak çağrıyı sessizce onaylar, güvenliği gevşetir.
// Uyarı önce ölçülür (yanlış alarm sayısı), sonra engele çevrilip çevrilmeyeceğine bakılır.
//
// NEDEN (2026-10-09, #121): 2026-09-01 sonrası 522 Agent çağrısının 347'si modelsiz, 497'si seviyesizdi.
'use strict';
const fs = require('fs');

let input = {};
try {
  input = JSON.parse(fs.readFileSync(0, 'utf8').replace(/^﻿/, '') || '{}');
} catch {
  process.exit(0);
}

try {
  if (input.tool_name && input.tool_name !== 'Agent') process.exit(0);
  const shared = require('./lib/shared');
  const rule = require(shared.shared('quality/agent-call.js'));

  const ti = input.tool_input || {};
  const list = rule.findings(ti);
  if (!list.length) process.exit(0);

  const mesaj = rule.message(list, ti.description);
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'PreToolUse', additionalContext: mesaj },
  }));
  process.stderr.write(mesaj + '\n');
} catch {
  // Kural dosyası yüklenemezse iş DURMAZ: bu yalnızca bir uyarı katmanıdır.
}
process.exit(0);
