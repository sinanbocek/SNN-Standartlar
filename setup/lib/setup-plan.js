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
    '> **Standart:** `~/.claude/standartlar/teknik-borc-standardi.md` (tek kaynak: SNN-Standartlar)',
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

module.exports = { BOARD_TITLE, debtFileTemplate, archiveFileTemplate, plan, pending, userTasks };
