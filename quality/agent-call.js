// ALT AJAN ÇAĞRISI BEKÇİSİ — saf kural: Agent aracı çağrısında model ve seviye yazılmış mı?
//
// NEDEN (2026-10-09, SNN-Standartlar #121):
// Pulmaca'nın 6 açık kaydı için teşhis ajanları açıldı; model tahminle seçildi, seviye hiç
// verilmedi. Gerçek veri (bu makine, 2026-09-01 sonrası oturum kayıtları, 2026-10-09'da sayıldı):
// 522 Agent çağrısının 347'si modelsiz, 497'si seviyesiz. Modelsiz çağrı üst oturumun modeliyle
// (çoğu zaman en pahalısı) çalışır. Kural standartlar/alt-ajan-standardi.md Kural 1 ve 2'dir;
// burası o iki maddenin makineyle görülebilen kısmıdır. Tablonun kendisi ("bu iş teşhis mi,
// kod mu") makineyle zorlanamaz.
//
// Bu modül karar vermez, bulgu döndürür. Bekçi (hooks/guard-agent.js) UYARI kipindedir.
'use strict';

const MODELS = ['haiku', 'sonnet', 'opus', 'fable'];
const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'];
const HIGH = ['high', 'xhigh', 'max'];

// SAF: Agent aracı girdisi → bulgular [{ id, mesaj }]
// "fork" tipi üst oturumun modelini kasıtla miras alır; model ve seviye orada anlamsızdır, bakılmaz.
function findings(input) {
  const i = input || {};
  if (i.subagent_type === 'fork') return [];
  const out = [];
  const model = typeof i.model === 'string' ? i.model.trim().toLowerCase() : '';
  const effort = typeof i.effort === 'string' ? i.effort.trim().toLowerCase() : '';
  if (!model) out.push({ id: 'model-yok', mesaj: 'model yazılmamış; ajan üst oturumun modeliyle (en pahalısı olabilir) çalışır' });
  else if (!MODELS.includes(model)) out.push({ id: 'model-bilinmiyor', mesaj: `model "${i.model}" tabloda yok (${MODELS.join(', ')})` });
  else if (model === 'fable') out.push({ id: 'fable', mesaj: 'Fable alt ajanda kullanılmaz (Kural 1); Sonnet ya da Haiku seç' });
  if (!effort) out.push({ id: 'seviye-yok', mesaj: 'düşünme seviyesi (effort) yazılmamış; modelin varsayılanı iş için fazla ya da az olabilir' });
  else if (!EFFORTS.includes(effort)) out.push({ id: 'seviye-bilinmiyor', mesaj: `seviye "${i.effort}" tanınmıyor (${EFFORTS.join(', ')})` });
  else if (model === 'haiku' && HIGH.includes(effort)) out.push({ id: 'haiku-yuksek', mesaj: 'Haiku · yüksek alt ajanda kullanılmaz (Kural 1); Haiku · orta ya da Sonnet · orta seç' });
  return out;
}

// SAF: bulgular → kullanıcıya/ajana giden uyarı metni ('' ise bulgu yok)
function message(list, description) {
  if (!list || !list.length) return '';
  const head = description ? `"${String(description).slice(0, 60)}"` : 'bu çağrı';
  return [
    `[alt ajan · uyarı] ${head}:`,
    ...list.map((f) => `  - ${f.mesaj}`),
    '',
    'Aile standardı: her ajan çağrısında model ve seviye açıkça yazılır (standartlar/alt-ajan-standardi.md).',
    'Bul/say/listele → Haiku·low · salt okuma teşhis → Haiku·medium · kod yazma/düzeltme → Sonnet·medium ·',
    'dil/içerik kararı → Sonnet·high. Bu bir ENGEL değildir; çağrı sürdü. Sonraki çağrıda ikisini de yaz.',
  ].join('\n');
}

module.exports = { findings, message, MODELS, EFFORTS };
