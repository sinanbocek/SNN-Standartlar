// stop-gate karar testleri. Çalıştır: node hooks/test/stop-gate.test.js
//
// NEDEN (TB-004): bu bekçi "iş bitti" demeyi ENGELLEYEBİLEN tek kancadır. Yanlış davranırsa
// iki yönde de zarar verir: gereksiz engel oturumu kilitler, eksik engel kırmızı tipi geçirir.
// Tip kontrolünü gerçekten çalıştırmadan sınanabilmesi için karar mantığı `lib/stop-gate-plan.js`
// içine ayrıldı (2026-09-19).
'use strict';
const plan = require('../lib/stop-gate-plan');

let fail = 0;
const expect = (name, actual, wanted) => {
  const ok = JSON.stringify(actual) === JSON.stringify(wanted);
  if (!ok) fail += 1;
  console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : `\n    gelen: ${JSON.stringify(actual)}\n    beklenen: ${JSON.stringify(wanted)}`}`);
};

console.log('— değişen TS dosyaları');
const STATUS = [
  ' M src/app.ts',
  '?? src/new.tsx',
  ' M README.md',
  ' D src/gone.ts',
  'D  src/staged-gone.ts',
  'A  src/added.mts',
  ' M src/legacy.js',
].join('\n');
expect('yalnız TS dosyaları sayılır', plan.changedTsLines(STATUS).length, 3);
expect('izlenmeyen TS dosyası sayılır', plan.changedTsLines('?? a.tsx').length, 1);
// Silinen dosya için tip kontrolü istemek anlamsız; silme işini bitiren ajanı boşuna durdurur.
expect('silinen dosya sayılmaz', plan.changedTsLines(' D a.ts\nD  b.ts'), []);
expect('js dosyası sayılmaz', plan.changedTsLines(' M a.js'), []);
// ".ts" METİN OLARAK geçen ama uzantısı olmayan dosya tetiklememeli.
expect('adında ts geçen klasör tetiklemez', plan.changedTsLines(' M docs/ts-notlari.md'), []);
// GERÇEK KAÇAK (2026-09-19, uçtan uca denemede bulundu): git yeni bir klasörü varsayılan
// olarak tek satırda bildirir (`?? src/`) — içindeki TS dosyaları görünmez, kapı hiç
// tetiklenmez. Kanca bu yüzden `-uall` ile okur. Aşağıdaki iki satır o kaçağı sabitler.
expect('klasör satırı tek başına sayılmaz', plan.changedTsLines('?? src/'), []);
expect('yeni klasör kaçmaz (-uall çıktısı)', plan.changedTsLines(['?? src/a.ts', '?? src/b.tsx'].join('\n')).length, 2);
expect('boş durum boş liste', plan.changedTsLines(''), []);
expect('null durum patlamaz', plan.changedTsLines(null), []);

console.log('— komut seçimi');
expect('projenin kendi betiği kazanır', plan.pickCommand({ typecheck: 'tsc -p .' }, true), 'npm run typecheck --silent');
expect('betik yoksa tsconfig ile tsc', plan.pickCommand({}, true), 'npx --no-install tsc --noEmit');
expect('ikisi de yoksa komut yok', plan.pickCommand({}, false), null);
expect('scripts null ise patlamaz', plan.pickCommand(null, false), null);
// TS projesi olmayanda kapı hiç çalışmamalı: yanlış alarm ajanı kapıya karşı körleştirir.
expect('betik yok ama tsconfig var', plan.pickCommand({ build: 'vite' }, true), 'npx --no-install tsc --noEmit');

console.log('— parmak izi');
const f1 = plan.fingerprint('/r', ' M a.ts', 'diff1');
expect('aynı girdi aynı iz', plan.fingerprint('/r', ' M a.ts', 'diff1'), f1);
expect('durum değişince iz değişir', plan.fingerprint('/r', ' M b.ts', 'diff1') !== f1, true);
// Aynı durumda İÇERİK değişebilir (kaydedilmiş düzeltme); iz diff'i de okumalı,
// yoksa düzeltilmiş kod eski "yeşil" kaydıyla geçer.
expect('içerik değişince iz değişir', plan.fingerprint('/r', ' M a.ts', 'diff2') !== f1, true);
expect('kök değişince iz değişir', plan.fingerprint('/other', ' M a.ts', 'diff1') !== f1, true);

console.log('— karar');
const CMD = 'npm run typecheck --silent';

const ok = plan.decide({ command: CMD, error: null, stopHookActive: false });
expect('yeşilde çıktı yok', ok.output, null);
expect('yeşilde önbelleğe yazılır', ok.cache, true);

const red = plan.decide({ command: CMD, error: { text: 'src/a.ts(3,1): error TS2322' }, stopHookActive: false });
expect('kırmızıda engellenir', red.output.decision, 'block');
expect('derleyici çıktısı gerekçede', red.output.reason.includes('TS2322'), true);
expect('kırmızıda önbelleğe YAZILMAZ', red.cache, false);

// EN KRİTİK SATIR. İkinci turda yeniden engellenirse ajan aynı kapıya tekrar tekrar çarpar
// ve oturum hiç ilerleyemez. Bu satır kırmızıya dönerse sonsuz döngü kurulmuş demektir.
const second = plan.decide({ command: CMD, error: { text: 'error TS2322' }, stopHookActive: true });
expect('ikinci turda ASLA engellenmez', second.output.decision, undefined);
expect('ikinci turda hatırlatma yazılır', (second.output.systemMessage || '').includes('KIRMIZI'), true);

// Zaman aşımı bir ÖLÇÜM BAŞARISIZLIĞIDIR, kırmızı değil. Yapılamayan ölçümle iş durdurulmaz.
const slow = plan.decide({ command: CMD, error: { timedOut: true }, stopHookActive: false });
expect('zaman aşımı engellemez', slow.output.decision, undefined);
expect('zaman aşımı bildirilir', (slow.output.systemMessage || '').includes('zaman aşımına'), true);
expect('zaman aşımında önbelleğe YAZILMAZ', slow.cache, false);
// İkinci turda bile zaman aşımı engel değildir.
expect('ikinci turda zaman aşımı engellemez', plan.decide({ command: CMD, error: { timedOut: true }, stopHookActive: true }).output.decision, undefined);

console.log('— uzun çıktı kırpılır');
const huge = plan.decide({ command: CMD, error: { text: 'x'.repeat(50000) }, stopHookActive: false });
expect('gerekçe sınırın altında', huge.output.reason.length < plan.MAX_OUTPUT_CHARS + 500, true);
// Derleyici çıktısının SONU alınır: ilk satırlar değil, özet ve son hatalar işe yarar.
expect('çıktının sonu alınır', plan.decide({ command: CMD, error: { text: 'BAS' + 'x'.repeat(5000) + 'SON' }, stopHookActive: false }).output.reason.endsWith('SON'), true);

console.log('— bozuk girdi');
expect('metin yoksa patlamaz', typeof plan.decide({ command: CMD, error: {}, stopHookActive: false }).output.reason, 'string');

console.log(fail ? `\n${fail} test başarısız` : '\nTüm testler geçti');
process.exit(fail ? 1 : 0);
