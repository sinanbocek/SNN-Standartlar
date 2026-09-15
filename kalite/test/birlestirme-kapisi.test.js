// Birleştirme kapısı testleri (saf; GitHub'a istek atmaz). Çalıştır: node kalite/test/birlestirme-kapisi.test.js
'use strict';
const { parseMerges, decide } = require('../birlestirme-kapisi');

let fail = 0;
const expect = (name, actual, wanted) => {
  const ok = JSON.stringify(actual) === JSON.stringify(wanted);
  if (!ok) fail += 1;
  console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : `\n    gelen: ${JSON.stringify(actual)}\n    beklenen: ${JSON.stringify(wanted)}`}`);
};
const pick = (list) => list.map(({ number, repo }) => ({ number, repo }));

console.log('— komut çözme');
expect('numara ve -R', pick(parseMerges('gh pr merge 3 -R sinanbocek/SNN-Standartlar --merge')), [{ number: 3, repo: 'sinanbocek/SNN-Standartlar' }]);
expect('--repo= biçimi', pick(parseMerges('gh pr merge --merge --repo=o/r 12')), [{ number: 12, repo: 'o/r' }]);
expect('PR adresi', pick(parseMerges('gh pr merge https://github.com/o/r/pull/7 --squash')), [{ number: 7, repo: 'o/r' }]);
expect('değişkenli numara çözülemez', pick(parseMerges('gh pr merge $n -R $r --merge')), [{ number: null, repo: null }]);
expect('tırnaklı komutta tırnak depo adına karışmaz', pick(parseMerges('bash -c "gh pr merge 3 -R o/r"')), [{ number: 3, repo: 'o/r' }]);
expect('zincirde iki birleştirme', parseMerges('gh pr merge 1 -R a/b; gh pr merge 2 -R c/d').length, 2);
expect('başka gh komutu sayılmaz', parseMerges('gh pr view 3 --json state; gh pr checks 3').length, 0);

console.log('— karar');
const m = { number: 3, repo: 'o/r', raw: 'gh pr merge 3' };
expect('hepsi yeşil → izin', decide(m, [{ name: 'test', bucket: 'pass' }, { name: 'x', bucket: 'skipping' }]).allow, true);
expect('kırmızı → ret', decide(m, [{ name: 'test', bucket: 'fail' }]).allow, false);
expect('iptal → ret', decide(m, [{ name: 'test', bucket: 'cancel' }]).allow, false);
expect('sürüyor → ret ve bekleme komutu', [decide(m, [{ name: 'ci', bucket: 'pending' }]).allow, decide(m, [{ name: 'ci', bucket: 'pending' }]).reason.includes('--watch')], [false, true]);
expect('kontrol tanımlı değil → izin (not ile)', decide(m, null).allow, true);
expect('numara yok → ret', decide({ number: null, repo: null, raw: 'gh pr merge $n' }, []).allow, false);
expect('ret gerekçesi kırmızı kontrolün adını söyler', decide(m, [{ name: 'build-and-lint', bucket: 'fail' }]).reason.includes('build-and-lint'), true);

console.log(fail ? `\n✗ ${fail} test başarısız` : '\n✓ tümü geçti');
process.exit(fail ? 1 : 0);
