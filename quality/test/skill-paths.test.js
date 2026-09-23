// Beceri adres kapısı testleri. Çalıştır: node quality/test/skill-paths.test.js
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { extractRefs, mapToRepo, check, report, repoFiles } = require('../skill-paths');

let fail = 0;
const expect = (name, actual, wanted) => {
  const ok = JSON.stringify(actual) === JSON.stringify(wanted);
  if (!ok) fail += 1;
  console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : `\n    gelen: ${JSON.stringify(actual)}\n    beklenen: ${JSON.stringify(wanted)}`}`);
};

const REPO = ['hooks/debts.js', 'hooks/lib/shared.js', 'setup/setup-project.js', 'standartlar/teknik-borc-standardi.md', 'GERI-BILDIRIM-KAYDI.md'];
const kinds = (text, files = REPO) => check([{ file: 'skills/x/SKILL.md', text }], files).map((p) => `${p.kind}:${p.repoPath || p.raw}`);

console.log('— gerçek vakalar');
// 2026-09-19: `borclar` becerisi yeniden adlandırılmış betiği çağırıyordu; kimse fark etmedi.
// Eski satırın birebir metni depoda yok (beceri depoya düzeltilmiş hâliyle girdi, PR #57);
// bugünkü satır eski adla yazıldı.
expect('yeniden adlandırılmış betik yakalanır', kinds('1. Çalıştır: `node "<ev>/.claude/hooks/borclar.js" --detay`'), ['yok:hooks/borclar.js']);
// 2026-09-23: iki beceri, hiçbir betiğin makineye kurmadığı bir yeri gösteriyordu. Dosya depoda
// VAR (standartlar/...) ama makinede o adreste yalnız elle yazılmış bir yönlendirme notu duruyor.
expect('kurulmayan yer yakalanır', kinds('Önce standardı oku: `<ev>/.claude/standartlar/teknik-borc-standardi.md`'), ['kurulmayan-yer:<ev>/.claude/standartlar/teknik-borc-standardi.md']);

console.log('— eşleme (setup/setup-machine.js ile aynı)');
expect('canlı kopya depo köküne eşlenir', mapToRepo('standartlar-canli/setup/setup-project.js'), { repoPath: 'setup/setup-project.js' });
expect('hooks/ depodaki hooks/ klasörüne eşlenir', mapToRepo('hooks/lib/shared.js'), { repoPath: 'hooks/lib/shared.js' });
expect('skills/ depodaki skills/ klasörüne eşlenir', mapToRepo('skills/borclar/SKILL.md'), { repoPath: 'skills/borclar/SKILL.md' });
expect('bilinmeyen yer eşlenmez', mapToRepo('standartlar/teknik-borc-standardi.md'), { repoPath: null });
expect('var olan canlı kopya adresi geçer', kinds('node <ev>/.claude/standartlar-canli/setup/setup-project.js <proje kökü> --uygula'), []);
expect('karar defteri geçer', kinds('Karar defteri: `<ev>/.claude/standartlar-canli/GERI-BILDIRIM-KAYDI.md`'), []);

console.log('— adres biçimleri (becerilerde bugün geçenler)');
const SHARED = "node -e \"console.log(require(require('os').homedir()+'/.claude/hooks/lib/shared.js').refresh({force:true}))\"";
expect('homedir biçimi tanınır', extractRefs(SHARED).map((r) => r.rel), ['hooks/lib/shared.js']);
expect('homedir biçimi var olan dosyada geçer', kinds(SHARED), []);
expect('homedir biçimi eksik dosyada yakalanır', kinds(SHARED, ['hooks/debts.js']), ['yok:hooks/lib/shared.js']);
expect('~ biçimi tanınır', extractRefs('bak: ~/.claude/hooks/debts.js').map((r) => r.rel), ['hooks/debts.js']);
expect('cümle sonu noktası adrese katılmaz', extractRefs('Betik <ev>/.claude/hooks/debts.js.').map((r) => r.rel), ['hooks/debts.js']);
expect('klasör adresi içinde dosya varsa geçer', kinds('Kancalar: `<ev>/.claude/hooks/`'), []);
expect('boş klasör adresi yakalanır', kinds('Kancalar: `<ev>/.claude/hooks/`', ['setup/setup-project.js']), ['yok:hooks/']);
expect('satır numarası doğru', check([{ file: 'a.md', text: 'bir\niki\n`<ev>/.claude/hooks/yok.js`' }], REPO).map((p) => p.line), [3]);

console.log('— yanlış alarm üretmemesi gerekenler (becerilerdeki gerçek satırlar)');
expect('proje kökü yer tutucusu atlanır', extractRefs('1. **Dosya:** `<proje kökü>/docs/teknik-borc.md`.'), []);
expect('başka projenin akışı atlanır', extractRefs('`gh workflow run teknik-borc.yml -R <depo> -f uygula=false`'), []);
expect('ev klasörü öğrenme komutu atlanır', extractRefs("node -e \"console.log(require('os').homedir())\""), []);
expect('<ev> tanımı atlanır', extractRefs('> `<ev>` = ev klasörü.'), []);
expect('adresin içindeki yer tutucu atlanır', extractRefs('`<ev>/.claude/skills/<ad>/SKILL.md`'), []);

console.log('— rapor');
const probs = check([{ file: 'skills/borclar/SKILL.md', text: '`node "<ev>/.claude/hooks/borclar.js"`' }], REPO);
expect('rapor dosya:satır ve depo yolunu yazar', /skills\/borclar\/SKILL\.md:1[\s\S]*hooks\/borclar\.js/.test(report(probs, 1)), true);
expect('temizse tek satır', report([], 4).split('\n').length, 1);

console.log('— depo dosya listesi (izlenmeyen dosya açıkça istenir; CLAUDE.md §3)');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'snn-beceri-yolu-'));
const git = (...a) => execFileSync('git', ['-C', root, ...a], { stdio: 'ignore' });
const put = (rel, text = 'x') => { fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.writeFileSync(path.join(root, rel), text); };
git('init', '-q');
put('hooks/eski.js'); put('hooks/silinen.js'); put('.gitignore', 'hooks/gizli.js\n'); put('hooks/gizli.js');
git('add', '.');
git('-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'ilk');
put('hooks/yeni.js');
fs.rmSync(path.join(root, 'hooks/silinen.js'));
const list = repoFiles(root);
expect('izlenmeyen yeni dosya listede', list.includes('hooks/yeni.js'), true);
expect('silinmiş ama kayıtlı dosya listede değil', list.includes('hooks/silinen.js'), false);
expect('git dışı dosya listede değil (canlı kopyaya gitmez)', list.includes('hooks/gizli.js'), false);
fs.rmSync(root, { recursive: true, force: true });

console.log(fail ? `\n✗ ${fail} test başarısız` : '\n✓ Tüm testler geçti');
process.exit(fail ? 1 : 0);
