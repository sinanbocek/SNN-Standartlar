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
  add('anahtar-tarama-akisi', 'agent', o.workflows['anahtar-tarama.yml'] ? 'present' : 'toAdd', 'Her PR\'da eklenen satırlarda gizli anahtar ve kod dili taraması (.github/workflows/aile-kontrol.yml).');
  // Satır sonu kuralı (#147, 2026-10-14): yoksa Windows ve Node araçları aynı dosyayı farklı satır
  // sonuyla yazar, fark bütün dosyayı değişmiş gösterir. Var olan dosyanın içeriği burada
  // denetlenmez; zayıfsa uyum ölçeri oturum açılışında uyarır (quality/compliance.js → satir-sonu).
  add('satir-sonu', 'agent', o.gitattributes ? 'present' : 'toAdd', 'Satır sonu kuralı: depo ve çalışma kopyası LF (.gitattributes, ornek/.gitattributes).');

  // GitHub ayarları
  add('board', 'agent', o.board ? 'present' : 'toAdd', `"${BOARD_TITLE(o.repo.name)}" board'u (Açık / Devam / Kapandı), depoya bağlı.`);
  // Aile listesi (quality/data/family-projects.json): haftalık uyum issue'ları ve toplu ölçüm
  // BU LİSTEYE göre çalışır. Liste elle tutuluyordu; yeni proje eklenince yazılması unutulursa
  // kapılar ve açılış listesi yine çalışır ama posta kutusuna hiç mektup düşmez (2026-09-19).
  if (o.inFamily === true) add('aile-listesi', 'agent', 'present', 'Proje aile listesinde (quality/data/family-projects.json).');
  else if (o.inFamily === 'excluded') add('aile-listesi', 'agent', 'present', 'Proje aile listesinde gerekçeli olarak DIŞLANMIŞ; ölçülmez.');
  else if (o.inFamily === 'renamed') add('aile-listesi', 'agent', 'toAdd', `Listedeki ${o.familyRenamedFrom || 'bir kayıt'} deposu yeniden adlandırılmış; yeni kayıt eklenmez, kaydın adı güncel adla değiştirilir (SNN-Standartlar'a ayrı PR).`);
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

// SAF: liste içeriği + depo adı (+ güncel ad eşlemi) → true | false | 'excluded' | 'renamed'
// currentNames: { "<listedeki ad, küçük harf>": "<GitHub'daki güncel ad>" }. Depo yeniden adlandırılınca
// GitHub kimliği aynı kalır ama liste eski adı taşır; yalnız adla bakmak aynı projeyi ikinci kez
// ekletiyordu (2026-11-13, SNN-Kosgeb → SNN-Destek-Gundemi). Eşlemi IO tarafı kurar; okunamayan kayıt
// eşlemde yoktur ve eşleşme sayılmaz (yok varsayılmaz, uyarı IO tarafında yazılır).
function familyLookup(raw, full, currentNames = {}) {
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  const want = full.toLowerCase();
  const eq = (a) => String(a || '').toLowerCase() === want;
  const renamed = (a) => String(currentNames[String(a || '').toLowerCase()] || '').toLowerCase() === want;
  if ((parsed.excluded || []).some((x) => x && (eq(x.repo) || renamed(x.repo)))) return 'excluded';
  const projects = (parsed.projects || []).filter(Boolean);
  if (projects.some((p) => eq(p.repo))) return true;
  return projects.some((p) => renamed(p.repo)) ? 'renamed' : false;
}

// SAF: listede eski adla duran kaydın adı (güncel ad `full` ise); yoksa null.
function familyRenamedFrom(raw, full, currentNames = {}) {
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  const want = full.toLowerCase();
  const hit = (parsed.projects || []).find((p) => p && String(p.repo).toLowerCase() !== want
    && String(currentNames[String(p.repo).toLowerCase()] || '').toLowerCase() === want);
  return hit ? hit.repo : null;
}

// SAF: liste PR'ının başlığı, gövdesi ve commit iletisi. renamedFrom doluysa yeni kayıt eklenmez, eski kaydın adı güncellenir.
function familyPrText(repo, renamedFrom) {
  const autoNote = 'Denetimler yeşil olunca kendiliğinden birleşir (otomatik birleştirme açılır); elle birleştirme gerekmez.';
  if (renamedFrom) {
    return {
      title: `chore(aile): ${renamedFrom} kaydı yeni adla güncellensin (${repo.full})`,
      message: `chore(aile): ${renamedFrom} kaydı ${repo.full} olarak güncellendi\n\nSNN-Standartlar/setup/setup-project.js`,
      body: [
        `\`${renamedFrom}\` deposu GitHub'da \`${repo.full}\` olarak yeniden adlandırılmış (eski ad yönlendiriliyor).`,
        'Listedeki kaydın `repo` alanı güncel adla değiştirilir; yeni kayıt eklenmedi, diğer alanlar korunur.',
        '',
        autoNote,
        '',
        '🤖 SNN-Standartlar proje kurulum betiği',
      ].join('\n'),
    };
  }
  return {
    title: `chore(aile): ${repo.name} aile listesine eklensin`,
    message: `chore(aile): ${repo.name} aile listesine eklendi\n\nSNN-Standartlar/setup/setup-project.js`,
    body: [
      `\`${repo.full}\` aile listesine eklenir.`,
      '',
      'Bu liste **haftalık uyum issue\'larının** ve **toplu ölçümün** kaynağıdır; proje listede',
      'değilken kapılar ve oturum açılışı yine çalışır, ama eksikleri issue olarak düşmez.',
      '',
      autoNote,
      '',
      '🤖 SNN-Standartlar proje kurulum betiği',
    ].join('\n'),
  };
}

// SAF: PR'ı kendiliğinden birleştirme komutunun bağımsız değişkenleri (yöntem deponun alışkanlığı: birleştirme commit'i).
function autoMergeArgs(prUrl, standardsRepo) {
  const m = /\/(\d+)\/?$/.exec(String(prUrl));
  return m ? ['pr', 'merge', m[1], '--repo', standardsRepo, '--auto', '--merge', '--delete-branch'] : null;
}

// SAF: komut sonucu → sonuç satırı metni. Başarısızlık kurulumu düşürmez; PR açık kalır.
function autoMergeNote(result) {
  if (result.ok) return 'otomatik birleştirme açıldı';
  const first = String(result.err || '').trim().split('\n')[0] || 'bilinmeyen hata';
  return `otomatik birleştirme açılamadı: ${first}`;
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

// SAF: eski adlı kaydın "repo" alanını metin düzeyinde değiştirir; diğer her bayt korunur. Bozuk sonuç yazılmaz.
function renameEntry(raw, parsed, oldName, newName) {
  const span = projectsArraySpan(raw);
  const re = new RegExp(`("repo"\\s*:\\s*)${JSON.stringify(oldName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
  const m = span && re.exec(raw.slice(span.open, span.close));
  if (!m) throw new Error('Aile listesinde eski adlı kayıt metinde bulunamadı: dosya beklenmeyen biçimde.');
  const at = span.open + m.index;
  const next = `${raw.slice(0, at)}${m[1]}${JSON.stringify(newName)}${raw.slice(at + m[0].length)}`;
  const expected = { ...parsed, projects: parsed.projects.map((p) => (p && p.repo === oldName ? { ...p, repo: newName } : p)) };
  if (JSON.stringify(JSON.parse(next)) !== JSON.stringify(expected)) {
    throw new Error('Aile listesinde kayıt adı güncellenemedi: dosya beklenmeyen biçimde.');
  }
  return next;
}

// SAF: listeye yeni kayıt ekler, sırayı korur, yinelemez. Döner: yeni metin ya da null.
// Yalnız yeni kayıt satırı eklenir; dosyanın geri kalanı bayt bayt korunur. Tüm dosyayı
// yeniden yazmak her tek satırlık kaydı dört satıra açıyordu (#109, 2026-09-25).
// isPublic true ise kayda "public": true yazılır; gizli depoda alan hiç eklenmez (#153, 2026-10-14).
function familyWithEntry(raw, repo, dir, isPublic = false, currentNames = {}) {
  const parsed = JSON.parse(raw);
  if ((parsed.projects || []).some((p) => p && String(p.repo).toLowerCase() === repo.toLowerCase())) return null;
  // Yeniden adlandırılmış depo: yeni kayıt eklenmez, eski kaydın repo alanı güncel adla değişir.
  const oldName = familyRenamedFrom(parsed, repo, currentNames);
  if (oldName) return renameEntry(raw, parsed, oldName, repo);
  const entryObj = isPublic ? { repo, dir, public: true } : { repo, dir };
  const expected = { ...parsed, projects: [...(parsed.projects || []), entryObj] };
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
    const line = `{ "repo": ${JSON.stringify(repo)}, "dir": ${JSON.stringify(dir)}${isPublic ? ', "public": true' : ''} }`;
    next = `${raw.slice(0, lastEnd)},${eol}${indent}${line}${raw.slice(lastEnd)}`;
  } else {
    const entry = JSON.stringify(entryObj);
    next = `${raw.slice(0, lastEnd)}${isEmpty ? '' : ','}${entry}${raw.slice(lastEnd)}`;
  }
  // Metin düzeyinde ekleme bozuk JSON üretmemeli; üretirse yazılmaz, hata verilir.
  if (JSON.stringify(JSON.parse(next)) !== JSON.stringify(expected)) {
    throw new Error('Aile listesine kayıt eklenemedi: dosya beklenmeyen biçimde.');
  }
  return next;
}


module.exports = { familyLookup, familyRenamedFrom, familyPrText, autoMergeArgs, autoMergeNote, familyWithEntry, BOARD_TITLE, debtFileTemplate, archiveFileTemplate, plan, pending, userTasks };
