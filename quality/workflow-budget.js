// AKIŞ BÜTÇESİ KAPISI: projenin akış dosyaları Actions dakikasını boşa yakan bir iskelet taşıyor mu?
//
// NEDEN VAR (ölçüldü 2026-09-29; eylül faturası + 1.761 koşumun iş süreleri):
//   Gizli depolar eylülde 2.848 dk yaktı (Temmuz 53 · Ağustos 972). Gerçek makine süresi yalnız
//   1.733 dk idi. Fark üç yapısal sebepten geliyordu, hiçbiri test sayısı değildi:
//     1. main'e gönderimde CI baştan koşuyordu: 1.214 dk. PR'da test edilen kod ikinci kez.
//     2. anahtar-tarama ve kod-dili AYRI akıştı: 769 dk. ~15 saniyelik iş, ayrı makine,
//        1 dakikaya yuvarlanıyor.
//     3. Dependabot güncellemeleri paket başına ayrı PR: 179 dk.
//   20 Eylül'de CI'lara "iptal" ayarı eklenmişti; ölçülmeden eklendi ve ayda 4 koşum iptal etti
//   (PR başına 1,2 CI koşumu var — sorun yığılma değildi). Bu kapı ölçülen sebeplere bakar.
//
// Kural: docs/actions-kotasi.md · İskelet: ornek/ci-duzeni.yml, ornek/aile-kontrol.yml,
// ornek/dependabot.yml · Uyum ölçeri bu modülü dört ölçüt olarak kullanır (quality/compliance.js).
'use strict';

// SAF: akış dosyasının tetik bölümü (jobs:'dan önceki kısım, yorumsuz).
function header(text) {
  return String(text || '').replace(/\r/g, '').split(/^jobs:/m)[0]
    .split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');
}

// SAF: yorum satırları atılmış metin (yorumda geçen "npm test" ağır iş sayılmasın).
const code = (text) => String(text || '').replace(/\r/g, '').split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');

const triggeredBy = (text, event) => new RegExp(`^\\s*${event}\\s*:`, 'm').test(header(text))
  || new RegExp(`^on:\\s*\\[?[^\\n]*\\b${event}\\b`, 'm').test(header(text));

// SAF: push tetiği yalnız etiket (tag) için mi? Sürüm etiketi akışı main'e gönderimde CI koşturmaz.
function pushOnlyTags(text) {
  const h = header(text);
  const m = h.match(/^\s*push\s*:\s*\n((?:\s{4,}.*\n?)*)/m);
  if (!m) return false;
  return /^\s*tags\s*:/m.test(m[1]) && !/^\s*branches\s*:/m.test(m[1]);
}

// SAF: bu akış bağımlılık kurup test/derleme koşan AĞIR bir iş mi?
const HEAVY = /\b(npm|pnpm|yarn)\s+(ci|install|test|run\s+(test|build|lint|typecheck|type-check))\b|\bnpx\s+(vitest|jest|tsc|playwright)\b|\bdeno\s+test\b|\bpytest\b/;
const isHeavy = (text) => HEAVY.test(code(text));

// SAF: ayrı akış olarak çağrılan ortak tarama (eski biçim).
const SEPARATE_SCAN = /SNN-Standartlar\/\.github\/workflows\/(anahtar-tarama|kod-dili|secret-scan|code-language)\.yml@/;

// SAF: aynı dala art arda gönderimde eski koşum iptal ediliyor mu? (true ya da koşullu ifade)
const cancels = (text) => /cancel-in-progress:\s*(true|\$\{\{)/.test(code(text));

// SAF: dosyalar → bulgular. files = [{ name, text }]
function analyzeWorkflows(files) {
  const out = { mainRuns: [], separateScans: [], noCancel: [] };
  for (const { name, text } of files || []) {
    const pr = triggeredBy(text, 'pull_request');
    const push = triggeredBy(text, 'push') && !pushOnlyTags(text);
    const heavy = isHeavy(text);
    if (heavy && push) out.mainRuns.push(name);
    if ((pr || push) && SEPARATE_SCAN.test(code(text))) out.separateScans.push(name);
    if (heavy && pr && !cancels(text)) out.noCancel.push(name);
  }
  return out;
}

// SAF: dependabot.yml durumu → 'ok' | 'yok' | 'haftalik' | 'grupsuz'
// Aylık aralık + güvenlik güncellemelerini toplayan grup istenir.
function dependabotState(text) {
  if (!text) return 'yok';
  const t = code(text);
  if (/interval:\s*['"]?(daily|weekly)/.test(t)) return 'haftalik';
  if (!/applies-to:\s*security-updates/.test(t)) return 'grupsuz';
  return 'ok';
}

module.exports = { header, isHeavy, pushOnlyTags, triggeredBy, cancels, analyzeWorkflows, dependabotState, SEPARATE_SCAN };
