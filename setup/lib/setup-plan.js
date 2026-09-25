// Yeni projeyi SNN standart sistemine bağlama planı. SAF: ağa ve diske dokunmaz.
// Ölçüm (olcum) → adımlar: her adım kim yapar (ben = betik, sen = proje sahibi), neden, durum.
'use strict';

const BOARD_TITLE = (name) => `${name} · Teknik Borç`;

// SAF: kütük dosyası başlığı (standart "Dosya başlığı ve sözlük" bölümü)
function debtFileTemplate() {
  return [
    '# Teknik Borç Kütüğü',
    '',
    'Fark edilen ama şimdi çözülmeyen sorunlar. **Açık borçlar için tek kaynak burasıdır.**',
    'Kapanan kayıtlar: `docs/teknik-borc-arsiv.md`',
    '',
    '> **Teknik borç nedir?** Bir işi hızlı bitirmek için kestirme yol kullanmak, sonradan',
    '> ödenecek bir borç almak gibidir. Borç ödenmedikçe faizi (bakım zorluğu, hata riski) büyür.',
    '',
    '> **Standart:** `~/.claude/standartlar-canli/standartlar/teknik-borc-standardi.md` (tek kaynak: SNN-Standartlar)',
    '',
    '## Sözlük',
    '| Terim | Türkçe karşılığı |',
    '|---|---|',
    '| Kütük | Bu dosya: açık teknik borçların tek listesi |',
    '',
    '---',
    '',
  ].join('\n');
}

function archiveFileTemplate() {
  return [
    '# Teknik Borç Kütüğü — Arşiv (kapanan kalemler)',
    '',
    '> Kapanan kayıtlar silinmez; ders ve uyarı taşır. Biçim: standarttaki "Kapanış" bölümü.',
    '',
    '---',
    '',
    '## Kapanan Kalemler',
    '',
    '_Henüz kapanmış kayıt yok._',
    '',
  ].join('\n');
}

// SAF: ölçümden adım listesi
// olcum = { repo:{owner,name,full,isPublic,isOrg}, admin, debt:'standart'|'yok'|'standart-disi (<dosya>)', archive:bool,
//   workflows:{ 'teknik-borc.yml':bool, 'anahtar-tarama.yml':bool }, board:bool, secret:bool|null,
//   deleteBranchOnMerge:bool|null, vulnAlerts:bool|null, securityFixes:bool|null }
function plan(o) {
  const steps = [];
  const add = (id, who, status, why) => steps.push({ id, who, status, why });
  if (!o.repo) {
    add('github-deposu', 'owner', 'missing', 'Projenin GitHub deposu (origin) yok. Önce GitHub\'da depo aç ve bağla; kurulum ondan sonra.');
    return steps;
  }

  // Dosyalar (tek PR ile gelir)
  if (o.debt === 'standart') add('kutuk', 'agent', 'present', 'docs/teknik-borc.md zaten standart biçimde.');
  else if (o.debt === 'yok') add('kutuk', 'agent', 'toAdd', 'docs/teknik-borc.md boş kütük olarak eklenir (PR içinde).');
  else add('kutuk', 'owner', 'decide', `Eski biçimli kütük var (${o.debt.replace(/^standart-disi \((.*)\)$/, '$1')}). Kayıtlar standarda elle taşınmalı; betik yeni kütük açmaz (iki kütük olmasın).`);
  if (o.debt !== 'standart-disi' && !String(o.debt).startsWith('standart-disi')) {
    add('arsiv', 'agent', o.archive ? 'present' : 'toAdd', o.archive ? 'docs/teknik-borc-arsiv.md var.' : 'docs/teknik-borc-arsiv.md boş arşiv olarak eklenir (PR içinde).');
  }
  add('teknik-borc-akisi', 'agent', o.workflows['teknik-borc.yml'] ? 'present' : 'toAdd', 'Kütük → GitHub issue ve board senkron görevlisi (.github/workflows/teknik-borc.yml).');
  add('anahtar-tarama-akisi', 'agent', o.workflows['anahtar-tarama.yml'] ? 'present' : 'toAdd', 'Her PR\'da eklenen satırlarda gizli anahtar taraması (.github/workflows/anahtar-tarama.yml).');

  // GitHub ayarları
  add('board', 'agent', o.board ? 'present' : 'toAdd', `"${BOARD_TITLE(o.repo.name)}" board'u (Açık / Devam / Kapandı), depoya bağlı.`);
  // Aile listesi (quality/data/family-projects.json): haftalık uyum issue'ları ve toplu ölçüm
  // BU LİSTEYE göre çalışır. Liste elle tutuluyordu; yeni proje eklenince yazılması unutulursa
  // kapılar ve açılış listesi yine çalışır ama posta kutusuna hiç mektup düşmez (2026-09-19).
  if (o.inFamily === true) add('aile-listesi', 'agent', 'present', 'Proje aile listesinde (quality/data/family-projects.json).');
  else if (o.inFamily === 'excluded') add('aile-listesi', 'agent', 'present', 'Proje aile listesinde gerekçeli olarak DIŞLANMIŞ; ölçülmez.');
  else if (o.inFamily === null) add('aile-listesi', 'owner', 'unmeasured', 'Aile listesi okunamadı; projenin listede olup olmadığı ölçülemedi.');
  else add('aile-listesi', 'agent', 'toAdd', 'Proje aile listesine eklenir (SNN-Standartlar\'a ayrı PR) — haftalık uyum issue\'ları bu listeye göre açılır.');
  if (o.secret === true) add('anahtar', 'owner', 'present', 'PROJECT_TOKEN depoda tanımlı.');
  else add('anahtar', 'owner', o.secret === null ? 'unmeasured' : 'missing', `PROJECT_TOKEN depoya eklenmeli (board senkronu için): https://github.com/${o.repo.full}/settings/secrets/actions — değer sohbete yazılmaz.`);

  const setting = (id, value, label) => {
    if (value === true) add(id, 'agent', 'present', `${label} açık.`);
    else if (o.admin) add(id, 'agent', 'toAdd', `${label} açılır.`);
    else if (value === null) add(id, 'owner', 'unmeasured', `${label}: hesabın bu depoda yönetici olmadığı için ölçülemedi. Depo sahibi hesapla açtıysan bu adımı atla; açmadıysan Settings'ten aç.`);
    else add(id, 'owner', 'missing', `${label}: kapalı; hesabın bu depoda yönetici değil, depo sahibi hesapla açılmalı (Settings).`);
  };
  setting('dal-silme', o.deleteBranchOnMerge, 'Birleşince dalı otomatik sil');
  setting('guvenlik-uyarilari', o.vulnAlerts, 'Dependabot güvenlik uyarıları');
  setting('guvenlik-duzeltme', o.securityFixes, 'Dependabot güvenlik düzeltme PR\'ları');
  return steps;
}

// SAF: betiğin yapacağı iş var mı / kullanıcıya kalan iş
const pending = (steps) => steps.filter((s) => s.who === 'agent' && s.status === 'toAdd');
const userTasks = (steps) => steps.filter((s) => s.who === 'owner' && s.status !== 'present');

// SAF: liste içeriği + depo adı → true | false | 'excluded'
function familyLookup(raw, full) {
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  const eq = (a) => String(a || '').toLowerCase() === full.toLowerCase();
  if ((parsed.excluded || []).some((x) => x && eq(x.repo))) return 'excluded';
  return (parsed.projects || []).some((p) => p && eq(p.repo));
}

// SAF: metindeki `"projects": [ … ]` dizisinin açılış ve kapanış konumu; bulunamazsa null.
// Dize içindeki köşeli ayraçlar sayılmaz.
function projectsArraySpan(raw) {
  const m = /"projects"\s*:\s*\[/.exec(raw);
  if (!m) return null;
  const open = m.index + m[0].length - 1;
  let depth = 0;
  let inString = false;
  for (let i = open; i < raw.length; i += 1) {
    const c = raw[i];
    if (inString) {
      if (c === '\\') i += 1;
      else if (c === '"') inString = false;
    } else if (c === '"') inString = true;
    else if (c === '[') depth += 1;
    else if (c === ']') {
      depth -= 1;
      if (depth === 0) return { open, close: i };
    }
  }
  return null;
}

// SAF: listeye yeni kayıt ekler, sırayı korur, yinelemez. Döner: yeni metin ya da null.
// Yalnız yeni kayıt satırı eklenir; dosyanın geri kalanı bayt bayt korunur. Tüm dosyayı
// yeniden yazmak her tek satırlık kaydı dört satıra açıyordu (#109, 2026-09-25).
function familyWithEntry(raw, repo, dir) {
  const parsed = JSON.parse(raw);
  if ((parsed.projects || []).some((p) => p && String(p.repo).toLowerCase() === repo.toLowerCase())) return null;
  const expected = { ...parsed, projects: [...(parsed.projects || []), { repo, dir }] };
  const span = projectsArraySpan(raw);
  if (!span) return `${JSON.stringify(expected, null, 2)}\n`;

  const body = raw.slice(span.open + 1, span.close);
  const lastEnd = span.open + 1 + body.trimEnd().length;
  const isEmpty = body.trim() === '';
  let next;
  if (body.includes('\n') && !isEmpty) {
    // Çok satırlı liste: son kaydın girintisiyle, dosyanın satır sonuyla tek satır.
    const eol = raw.includes('\r\n') ? '\r\n' : '\n';
    const lineStart = raw.lastIndexOf('\n', lastEnd - 1) + 1;
    const indent = /^[ \t]*/.exec(raw.slice(lineStart))[0];
    const line = `{ "repo": ${JSON.stringify(repo)}, "dir": ${JSON.stringify(dir)} }`;
    next = `${raw.slice(0, lastEnd)},${eol}${indent}${line}${raw.slice(lastEnd)}`;
  } else {
    const entry = JSON.stringify({ repo, dir });
    next = `${raw.slice(0, lastEnd)}${isEmpty ? '' : ','}${entry}${raw.slice(lastEnd)}`;
  }
  // Metin düzeyinde ekleme bozuk JSON üretmemeli; üretirse yazılmaz, hata verilir.
  if (JSON.stringify(JSON.parse(next)) !== JSON.stringify(expected)) {
    throw new Error('Aile listesine kayıt eklenemedi: dosya beklenmeyen biçimde.');
  }
  return next;
}


module.exports = { familyLookup, familyWithEntry, BOARD_TITLE, debtFileTemplate, archiveFileTemplate, plan, pending, userTasks };
