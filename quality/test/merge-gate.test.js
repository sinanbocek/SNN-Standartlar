// Birleştirme kapısı testleri (saf; GitHub'a istek atmaz). Çalıştır: node quality/test/merge-gate.test.js
'use strict';
const { parseMerges, bypassReason, decide, TRIGGER } = require('../merge-gate');

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

console.log('— atlatma yolları');
expect('REST birleştirme çözülür', pick(parseMerges('gh api repos/sinanbocek/Gunum-Var/pulls/74/merge -X PUT -f merge_method=merge')), [{ number: 74, repo: 'sinanbocek/Gunum-Var' }]);
expect('REST birleştirme, -X önce', pick(parseMerges('gh api -X PUT repos/o/r/pulls/9/merge')), [{ number: 9, repo: 'o/r' }]);
expect('REST değişkenli numara çözülemez', pick(parseMerges('gh api repos/o/r/pulls/$n/merge -X PUT')), [{ number: null, repo: 'o/r' }]);
expect('PR okuma (birleştirme değil) sayılmaz', parseMerges('gh api repos/o/r/pulls/9 --jq .mergeable').length, 0);
expect('ham GraphQL birleştirme → ret', bypassReason('gh api graphql -f query="mutation { mergePullRequest(input:{}) { clientMutationId } }"') !== null, true);
expect('ham GraphQL taslak kaldırma → ret', bypassReason('gh api graphql -f query="mutation { markPullRequestReadyForReview(input:{}) { pullRequest { isDraft } } }"') !== null, true);
expect('taslak kaldırma + birleştirme aynı komutta → ret', bypassReason('gh pr ready 110 -R o/r && gh pr merge 110 -R o/r') !== null, true);
expect('tek başına taslak kaldırma komutu → atlatma değil', bypassReason('gh pr ready 110 -R o/r'), null);
expect('olay: diğer oturumun engellenen komutu tetikler', TRIGGER.test('gh api graphql -f query="mutation { markPullRequestReadyForReview(input:{}) { x } }" && gh api repos/o/r/pulls/110/merge -X PUT'), true);
expect('olay: REST birleştirme tetikler', TRIGGER.test('gh api repos/o/r/pulls/74/merge -X PUT -f merge_method=merge'), true);
expect('ilgisiz gh komutu tetiklemez', TRIGGER.test('gh pr view 3 --json state'), false);

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
