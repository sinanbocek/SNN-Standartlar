// Canlı kopya yönlendiricisi testleri. Çalıştır: node hooks/test/shared.test.js
//
// NEDEN (TB-004): bu 45 satır tek nokta arızasıdır — bozulursa hiçbir bekçi ortak depoyu
// bulamaz ve TÜM projelerde oturum açılışı durur. 2026-09-15'te tam bu yaşandı.
// Testi yoktu; ilk test yazılırken de bir gerileme bulundu (damga adı, aşağıda).
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

let fail = 0;
const expect = (name, actual, wanted) => {
  const ok = JSON.stringify(actual) === JSON.stringify(wanted);
  if (!ok) fail += 1;
  console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : `\n    gelen: ${JSON.stringify(actual)}\n    beklenen: ${JSON.stringify(wanted)}`}`);
};

const git = (dir, ...args) => execFileSync('git', ['-C', dir, ...args], { stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8' });

// Modül ROOT'u yüklenirken okur; her senaryo için taze yükleme gerekir.
function load(root) {
  process.env.SNN_STANDARTLAR = root;
  delete require.cache[require.resolve('../lib/shared.js')];
  return require('../lib/shared.js');
}

// Sahte bir "uzak" depo + ondan klonlanmış canlı kopya
function setup() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'snn-shared-'));
  const remote = path.join(base, 'uzak');
  const live = path.join(base, 'canli');
  fs.mkdirSync(remote);
  git(remote, 'init', '-q', '-b', 'main');
  fs.mkdirSync(path.join(remote, 'quality'), { recursive: true });
  fs.writeFileSync(path.join(remote, 'quality', 'kural.js'), '// birinci');
  git(remote, 'add', '.');
  git(remote, '-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '-m', 'ilk');
  execFileSync('git', ['clone', '-q', remote, live], { stdio: ['ignore', 'pipe', 'ignore'] });
  return { base, remote, live };
}
const commitTo = (remote, text) => {
  fs.writeFileSync(path.join(remote, 'quality', 'kural.js'), text);
  git(remote, 'add', '.');
  git(remote, '-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '-m', 'ikinci');
};

const { base, remote, live } = setup();
const s = load(live);

console.log('— yol çözme');
expect('ROOT ortam değişkeninden gelir', s.ROOT, live);
expect('var olan dosyanın yolu döner', s.shared('quality/kural.js'), path.join(live, 'quality', 'kural.js'));
// Olmayan dosyada SESSIZ KALMAZ: bekçi neyin eksik olduğunu ve ne yapılacağını söylemeli.
let err = null;
try { s.shared('quality/missing.js'); } catch (e) { err = e.message; }
expect('olmayan dosya hata verir', err !== null, true);
expect('hata dosya adını söyler', err.includes('missing.js'), true);
expect('hata ne yapılacağını söyler', err.includes('git clone'), true);

console.log('— tazeleme');
const firstRefresh = s.refresh({ force: true });
expect('ilk tazeleme güncel', firstRefresh.status, 'guncel');
expect('damga yazıldı', fs.existsSync(s.STAMP), true);
// 2026-09-19 GERİLEMESİ: TB-001 yeniden adlandırması damga adını DİZGE İÇİNDE değiştirdi
// (snn-son-guncelleme → snn-son-updateResult). Eski damga öksüz kaldı ve o aralıkta
// 6 saatlik kısıtlama çalışmadı; her oturum tazeleme denedi.
expect('damga adı İngilizce', s.STAMP_NAME, 'snn-last-refresh');
expect('eski damga adları biliniyor', s.LEGACY_STAMPS.includes('snn-son-guncelleme'), true);

console.log('— 6 saat kısıtlaması');
expect('damga tazeyken atlanır', s.refresh({}).status, 'atlandi');
expect('force kısıtlamayı aşar', s.refresh({ force: true }).status, 'guncel');
// Damga eskiyse tazeleme yapılır: 7 saat öncesine çekilir.
const oldTime = new Date(Date.now() - 7 * 60 * 60 * 1000);
fs.utimesSync(s.STAMP, oldTime, oldTime);
expect('eski damga tazelemeyi tetikler', s.refresh({}).status, 'guncel');

console.log('— öksüz damgalar temizlenir');
for (const old of s.LEGACY_STAMPS) fs.writeFileSync(path.join(live, '.git', old), 'x');
s.refresh({ force: true });
expect('eski damgalar silindi', s.LEGACY_STAMPS.some((o) => fs.existsSync(path.join(live, '.git', o))), false);

console.log('— gerçekten ileri sarıyor mu');
commitTo(remote, '// ikinci');
s.refresh({ force: true });
expect('yeni içerik geldi', fs.readFileSync(path.join(live, 'quality', 'kural.js'), 'utf8'), '// ikinci');

console.log('— kirli kopyaya DOKUNULMAZ');
// Canlı kopyada elle değişiklik varsa tazeleme yapılmaz: eski kural çalışmaya devam eder.
// Aksi hâlde yerel değişiklik sessizce ezilir ya da pull çakışmayla yarıda kalır.
fs.writeFileSync(path.join(live, 'quality', 'kural.js'), '// elle bozuldu');
const dirty = s.refresh({ force: true });
expect('kirli kopyada hata döner', dirty.status, 'hata');
expect('hata sebebi yazılır', dirty.message.includes('elle yapılmış'), true);
expect('dosya ezilmedi', fs.readFileSync(path.join(live, 'quality', 'kural.js'), 'utf8'), '// elle bozuldu');
git(live, 'checkout', '--', 'quality/kural.js');

console.log('— ağ/uzak yoksa İŞ DURMAZ');
// Uzak depo kaybolduğunda pull başarısız olur; bekçi çökmemeli, eski kural çalışmalı.
fs.rmSync(remote, { recursive: true, force: true });
const offline = s.refresh({ force: true });
expect('hata olarak döner, patlamaz', offline.status, 'hata');
expect('sebep yazılır', typeof offline.message, 'string');
expect('yerel dosya duruyor', fs.existsSync(path.join(live, 'quality', 'kural.js')), true);

console.log('— canlı kopya hiç yoksa');
const emptyDir = path.join(base, 'missing');
const s2 = load(emptyDir);
const missing = s2.refresh({ force: true });
expect('hata döner, patlamaz', missing.status, 'hata');

fs.rmSync(base, { recursive: true, force: true });
delete process.env.SNN_STANDARTLAR;

console.log(fail ? `\n${fail} test başarısız` : '\nTüm testler geçti');
process.exit(fail ? 1 : 0);
