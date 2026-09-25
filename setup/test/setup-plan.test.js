// Proje kurulum planı testleri (saf). Çalıştır: node setup/test/setup-plan.test.js
'use strict';
const K = require('../lib/setup-plan');
const { parseDebts, parseArchiveIds } = require('../../debt-sync/lib/debt');

let fail = 0;
const expect = (name, actual, wanted) => {
  const ok = JSON.stringify(actual) === JSON.stringify(wanted);
  if (!ok) fail += 1;
  console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : `\n    gelen: ${JSON.stringify(actual)}\n    beklenen: ${JSON.stringify(wanted)}`}`);
};
const base = (over = {}) => ({
  repo: { owner: 'sinanbocek', name: 'Yeni-Proje', full: 'sinanbocek/Yeni-Proje', isPublic: false },
  admin: true, debt: 'yok', archive: false,
  workflows: { 'teknik-borc.yml': false, 'anahtar-tarama.yml': false },
  board: false, inFamily: false, secret: false, deleteBranchOnMerge: false, vulnAlerts: false, securityFixes: false, ...over,
});
const ids = (steps, who, status) => steps.filter((s) => (!who || s.who === who) && (!status || s.status === status)).map((s) => s.id);

console.log('— sıfırdan yeni proje');
let s = K.plan(base());
expect('betiğin yapacakları', ids(K.pending(s)), ['kutuk', 'arsiv', 'teknik-borc-akisi', 'anahtar-tarama-akisi', 'board', 'aile-listesi', 'dal-silme', 'guvenlik-uyarilari', 'guvenlik-duzeltme']);
expect('kullanıcıya kalan yalnız anahtar', ids(K.userTasks(s)), ['anahtar']);
expect('anahtar adımı değeri istemez, bağlantı verir', s.find((x) => x.id === 'anahtar').why.includes('settings/secrets/actions') && s.find((x) => x.id === 'anahtar').why.includes('sohbete yazılmaz'), true);

console.log('— tamamen kurulu proje');
s = K.plan(base({ debt: 'standart', archive: true, workflows: { 'teknik-borc.yml': true, 'anahtar-tarama.yml': true }, board: true, inFamily: true, secret: true, deleteBranchOnMerge: true, vulnAlerts: true, securityFixes: true }));
expect('yapılacak iş yok', [K.pending(s).length, K.userTasks(s).length], [0, 0]);

console.log('— sınırlar');
s = K.plan(base({ admin: false, repo: { owner: 'globalhedef', name: 'x', full: 'globalhedef/x' } }));
expect('yönetici değilse ayarlar kullanıcıya', ids(K.userTasks(s)), ['anahtar', 'dal-silme', 'guvenlik-uyarilari', 'guvenlik-duzeltme']);
s = K.plan(base({ admin: false, deleteBranchOnMerge: null }));
expect('ölçülemeyen ayar "açtıysan atla" der', s.find((x) => x.id === 'dal-silme').why.includes('açtıysan bu adımı atla'), true);
s = K.plan(base({ debt: 'standart-disi (TECH_DEBT.md)' }));
expect('eski kütük varsa yeni kütük AÇILMAZ, karar kullanıcıda', [ids(K.pending(s)).includes('kutuk'), ids(K.userTasks(s)).includes('kutuk'), ids(s).includes('arsiv')], [false, true, false]);
expect('eski kütük dosya adı söylenir', s.find((x) => x.id === 'kutuk').why.includes('TECH_DEBT.md'), true);
expect('GitHub deposu yoksa tek adım: depo aç', ids(K.plan(base({ repo: null }))), ['github-deposu']);
expect('ölçülemeyen anahtar "unmeasured" olarak kullanıcıya', K.plan(base({ secret: null })).find((x) => x.id === 'anahtar').status, 'unmeasured');

console.log('— şablonlar standart ayrıştırıcıyla uyumlu');
expect('boş kütük: 0 kayıt, hata yok', parseDebts(K.debtFileTemplate()).length, 0);
expect('boş arşiv: 0 kapanış', parseArchiveIds(K.archiveFileTemplate()).length, 0);
expect('board adı', K.BOARD_TITLE('Yeni-Proje'), 'Yeni-Proje · Teknik Borç');

console.log('— aile listesi');
// Liste haftalık uyum issue'larının kaynağıdır. Elle tutulurken yeni proje yazılmayı
// unutulursa kapılar ve açılış listesi yine çalışır ama posta kutusuna mektup düşmez
// (2026-09-19). Bu yüzden kurulum adımına girdi.
const FAMILY_JSON = JSON.stringify({
  projects: [{ repo: 'sinanbocek/Var', dir: 'Var' }],
  excluded: [{ repo: 'baskasi/Dislanan', reason: 'üçüncü tarafın deposu' }],
});
expect('listedeki proje bulunur', K.familyLookup(FAMILY_JSON, 'sinanbocek/Var'), true);
expect('büyük/küçük harf duyarsız', K.familyLookup(FAMILY_JSON, 'SINANBOCEK/VAR'), true);
expect('listede olmayan', K.familyLookup(FAMILY_JSON, 'sinanbocek/Yeni'), false);
// Dışlanan depo "eksik" değildir: gerekçeli olarak ölçüm dışıdır.
expect('dışlanan ayırt edilir', K.familyLookup(FAMILY_JSON, 'baskasi/Dislanan'), 'excluded');

const added = K.familyWithEntry(FAMILY_JSON, 'sinanbocek/Yeni', 'Yeni');
expect('yeni kayıt eklenir', JSON.parse(added).projects.length, 2);
expect('kayıt doğru yazılır', JSON.parse(added).projects[1], { repo: 'sinanbocek/Yeni', dir: 'Yeni' });
expect('var olan kayıt korunur', JSON.parse(added).projects[0].repo, 'sinanbocek/Var');
expect('dışlananlar korunur', JSON.parse(added).excluded.length, 1);
// Aynı proje iki kez eklenmemeli: betik tekrar çalıştırılabilir olmalı.
expect('zaten varsa null döner', K.familyWithEntry(FAMILY_JSON, 'sinanbocek/Var', 'Var'), null);
expect('büyük harfle de yinelemez', K.familyWithEntry(FAMILY_JSON, 'SINANBOCEK/VAR', 'Var'), null);

// 2026-09-25 (#109): ekleme tüm dosyayı yeniden yazıyor, her tek satırlık kaydı dört satıra
// açıyordu; PR farkı 11 kaydın hepsini değişmiş gösterdi. Yalnız yeni satır eklenmeli.
const ONE_LINE = [
  '{',
  '  "_description": "Aile projeleri.",',
  '  "projects": [',
  '    { "repo": "sinanbocek/A", "dir": "A" },',
  '    { "repo": "sinanbocek/B", "dir": "B" }',
  '  ],',
  '  "excluded": [',
  '    {',
  '      "repo": "baskasi/Dislanan",',
  '      "reason": "üçüncü taraf [dizi değil]"',
  '    }',
  '  ]',
  '}',
  '',
];
const ONE_LINE_ADDED = [...ONE_LINE];
ONE_LINE_ADDED.splice(4, 1, '    { "repo": "sinanbocek/B", "dir": "B" },', '    { "repo": "sinanbocek/Yeni", "dir": "Yeni" }');
expect('tek satırlık biçim korunur, yalnız yeni satır eklenir',
  K.familyWithEntry(ONE_LINE.join('\n'), 'sinanbocek/Yeni', 'Yeni'), ONE_LINE_ADDED.join('\n'));
expect('CRLF satır sonu korunur',
  K.familyWithEntry(ONE_LINE.join('\r\n'), 'sinanbocek/Yeni', 'Yeni'), ONE_LINE_ADDED.join('\r\n'));
expect('boş listeye ekler', JSON.parse(K.familyWithEntry('{ "projects": [] }\n', 'sinanbocek/Yeni', 'Yeni')).projects, [{ repo: 'sinanbocek/Yeni', dir: 'Yeni' }]);

// Gerçek listeyle: satır sayısı bir artar, eski satırların hepsi aynen kalır.
{
  const real = require('fs').readFileSync(require('path').join(__dirname, '../../quality/data/family-projects.json'), 'utf8');
  // Depoda LF, Windows çalışma kopyasında CRLF olabilir; ikisinde de satır satır karşılaştırılır.
  const out = K.familyWithEntry(real, 'sinanbocek/Deneme-Proje', 'Deneme-Proje').split(/\r?\n/);
  const before = real.split(/\r?\n/);
  const rest = out.filter((l) => !l.includes('Deneme-Proje'));
  const changed = before.map((l, i) => [l, rest[i]]).filter(([a, b]) => a !== b);
  expect('gerçek liste: yalnız bir satır eklenir', out.length - before.length, 1);
  expect('gerçek liste: eski satırlardan yalnız son kayda virgül eklenir',
    changed.length === 1 && changed[0][1] === `${changed[0][0]},`, true);
}

const familyStep = (inFamily) => K.plan(base({ inFamily })).find((s) => s.id === 'aile-listesi');
expect('listede → yapılacak iş yok', familyStep(true).status, 'present');
expect('listede değil → eklenir', familyStep(false).status, 'toAdd');
expect('dışlanmış → iş yok', familyStep('excluded').status, 'present');
// Liste okunamadıysa "yok" VARSAYILMAZ: ölçülemedi denir, iş proje sahibine gider.
expect('okunamadı → ölçülemedi', familyStep(null).status, 'unmeasured');
expect('okunamadı → sahibine', familyStep(null).who, 'owner');

console.log('— kütük şablonundaki makine adresi');
// 2026-09-23: şablon `~/.claude/standartlar/…` yazıyordu; o yeri hiçbir betik kurmuyor ve 10 tüketici
// kütüğünün 10'u bu adresi taşıyor (uyum ölçütü `kutuk-adresi` onları izler). Şablondaki her makine adresi, beceri adres kapısıyla aynı kuralla denetlenir.
{
  const { check, repoFiles } = require('../../quality/skill-paths');
  const tpl = [{ file: 'debtFileTemplate', text: K.debtFileTemplate() }, { file: 'archiveFileTemplate', text: K.archiveFileTemplate() }];
  expect('şablondaki makine adresi kurulan bir yeri gösterir', check(tpl, repoFiles()).map((p) => p.raw), []);
}

console.log(fail ? `\n✗ ${fail} test başarısız` : '\n✓ tümü geçti');
process.exit(fail ? 1 : 0);
