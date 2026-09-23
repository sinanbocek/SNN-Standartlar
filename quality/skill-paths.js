// BECERİ ADRES KAPISI: becerilerde yazan makine adresleri depoda gerçekten var mı?
//
// NEDEN (2026-09-19): `borclar` ve `proje-kur` becerileri yeniden adlandırılmış betikleri
// çağırıyordu. İkisi de çalışmıyordu ve kimse fark etmemişti, çünkü beceriler hiçbir testin,
// hiçbir kapının kapsamında değildi (docs/makine-kurulumu.md). Bozuk beceri hata vermez;
// ajan boş rafa gidip yakındaki başka bir şeyle doğaçlama yapar.
//
// İKİNCİ VAKA (2026-09-23): `borc-ekle` ve `borclar`, `<ev>/.claude/standartlar/` altını
// gösteriyordu. O yeri hiçbir betik kurmuyor; bu makinede yalnız elle yazılmış bir yönlendirme
// notu duruyor. Yeni bir makinede adres boş çıkar.
//
// Eşleme setup/setup-machine.js ile AYNIDIR: makineye yalnız bu üç yer kurulur. Dördüncü bir yer
// eklenirse önce kurulum betiğine, sonra buraya eklenir.
//
// Kullanım: node quality/skill-paths.js [--beceriler <klasor>]
// Çıkış: 1 = kırık adres var.
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');

// Makinedeki yer (ev/.claude/ altına göre) → depodaki yer
const MACHINE_ROOTS = [
  { machine: 'standartlar-canli/', repo: '' },
  { machine: 'hooks/', repo: 'hooks/' },
  { machine: 'skills/', repo: 'skills/' },
];

// <ev>/.claude/…  ·  ~/.claude/…  ·  homedir()+'/.claude/…
const REF = /(<ev>\/|~\/|homedir\(\)\s*\+\s*['"`]\/)\.claude\/([A-Za-z0-9._\/-]*)(.?)/g;

// SAF: bir metindeki makine adresleri. Adresin içinde yer tutucu varsa (`skills/<ad>/…`)
// adres bir kalıptır, gerçek bir dosya değil — atlanır.
function extractRefs(text) {
  const out = [];
  String(text).split(/\r?\n/).forEach((lineText, i) => {
    for (const m of lineText.matchAll(REF)) {
      if (/[<{$]/.test(m[3])) continue;
      const rel = m[2].replace(/\.+$/, '');
      if (!rel) continue;
      const lead = m[1].startsWith('homedir') ? '<ev>/' : m[1];
      out.push({ line: i + 1, raw: `${lead}.claude/${rel}`, rel });
    }
  });
  return out;
}

// SAF: makine adresi → depo yolu (kurulmayan yerse null)
function mapToRepo(rel) {
  const root = MACHINE_ROOTS.find((r) => rel.startsWith(r.machine));
  return { repoPath: root ? root.repo + rel.slice(root.machine.length) : null };
}

// SAF: beceri dosyaları + depo dosya listesi → sorunlar
function check(skillFiles, repoFileList) {
  const files = new Set(repoFileList);
  const exists = (p) => (p.endsWith('/') ? repoFileList.some((f) => f.startsWith(p)) : files.has(p));
  const problems = [];
  for (const { file, text } of skillFiles) {
    for (const ref of extractRefs(text)) {
      const { repoPath } = mapToRepo(ref.rel);
      if (repoPath === null) problems.push({ file, line: ref.line, raw: ref.raw, kind: 'kurulmayan-yer' });
      else if (!exists(repoPath)) problems.push({ file, line: ref.line, raw: ref.raw, kind: 'yok', repoPath });
    }
  }
  return problems;
}

// SAF: rapor
function report(problems, scanned) {
  if (!problems.length) return `✓ ${scanned} beceri dosyasındaki bütün makine adresleri depoda var.`;
  const lines = [];
  for (const p of problems) {
    lines.push(`✗ ${p.file}:${p.line}`);
    lines.push(`    adres : ${p.raw}`);
    if (p.kind === 'yok') lines.push(`    depoda: ${p.repoPath}  → YOK`);
    else lines.push(`    sorun : bu yeri makineye hiçbir betik kurmuyor (kurulan yerler: ${MACHINE_ROOTS.map((r) => r.machine).join(', ')})`);
  }
  lines.push('');
  lines.push(`${problems.length} kırık adres. Dosyayı taşıdıysan ya da adını değiştirdiysen beceriyi de güncelle.`);
  lines.push('Eşleme: setup/setup-machine.js — makineye yalnız bu yerler kurulur.');
  return lines.join('\n');
}

// IO: depodaki dosyalar. İzlenmeyen yeni dosya AÇIKÇA istenir (CLAUDE.md §3: git'in
// varsayılanları izlenmeyen dosyayı gizler); git dışı dosya canlı kopyaya gitmediği için sayılmaz;
// diskten silinmiş ama hâlâ kayıtlı dosya da sayılmaz.
function repoFiles(root = ROOT) {
  const out = execFileSync('git', ['-C', root, 'ls-files', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8', maxBuffer: 1e8 });
  return [...new Set(out.split('\n').filter(Boolean))].filter((f) => fs.existsSync(path.join(root, f)));
}

// IO: bir klasördeki beceri dosyaları (metin)
function skillFiles(dir, base = ROOT) {
  const out = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(md|txt|js|sh|json)$/.test(e.name)) out.push({ file: path.relative(base, p).split(path.sep).join('/'), text: fs.readFileSync(p, 'utf8') });
    }
  };
  if (fs.existsSync(dir)) walk(dir);
  return out;
}

module.exports = { MACHINE_ROOTS, extractRefs, mapToRepo, check, report, repoFiles, skillFiles };

if (require.main === module) {
  const i = process.argv.indexOf('--beceriler');
  const dir = i > 0 ? path.resolve(process.argv[i + 1]) : path.join(ROOT, 'skills');
  const files = skillFiles(dir, i > 0 ? path.dirname(dir) : ROOT);
  const problems = check(files, repoFiles(ROOT));
  console.log(report(problems, files.length));
  process.exit(problems.length ? 1 : 0);
}
