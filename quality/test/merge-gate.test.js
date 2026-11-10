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

console.log('— dal main\'in gerisinde (2026-09-29, CI main\'de koşmuyor)');
const { behindReason } = require('../merge-gate');
const pr = { number: 42, repo: 'sinanbocek/Gunum-Var', raw: 'gh pr merge 42' };
expect('geride gizli depo → ret', behindReason(pr, { behindBy: 3, isPublic: false, base: 'main' }) !== null, true);
expect('ret, güncelleme komutunu verir', behindReason(pr, { behindBy: 3, isPublic: false, base: 'main' }).includes('gh pr update-branch 42 -R sinanbocek/Gunum-Var'), true);
expect('güncel dal → geçer', behindReason(pr, { behindBy: 0, isPublic: false, base: 'main' }), null);
expect('açık depo geride olsa da geçer (main CI ücretsiz ve kalır)', behindReason(pr, { behindBy: 5, isPublic: true, base: 'main' }), null);

console.log('— otomatik birleştirme (2026-11-09, SNN-Standartlar PR #183: sahip "CI yeşilse otomatik birleşsin" dedi)');
const { autoMergeReason } = require('../merge-gate');
const auto = { number: 183, repo: 'o/r', raw: 'gh pr merge 183 --auto --squash', auto: true };
const pend = [{ name: 'ci', bucket: 'pending' }];
const req = { contexts: ['ci'], strict: false };
const reqStrict = { contexts: ['ci'], strict: true };
// Kapı akışı: önce koruma kararı, sonra denetim kararı
const allowed = (merge, prot, pub, checks) => {
  const a = autoMergeReason(merge, prot, pub);
  return !!a && a.allow === true && decide(merge, checks, a.allow).allow;
};
expect('komutta --auto çözülür', parseMerges('gh pr merge 183 -R o/r --auto --squash')[0].auto, true);
expect('--auto yoksa auto false', parseMerges('gh pr merge 183 -R o/r --squash')[0].auto, false);
expect('--auto, numara ve depoyu bozmaz', pick(parseMerges('gh pr merge --auto 183 -R o/r')), [{ number: 183, repo: 'o/r' }]);
expect('REST birleştirmede auto false', parseMerges('gh api repos/o/r/pulls/9/merge -X PUT')[0].auto, false);
expect('--auto olmayan komut → null', autoMergeReason({ number: 1, repo: 'o/r', raw: 'x', auto: false }, null, true), null);
expect('VAKA: zorunlu denetimli açık depo + pending → izin', allowed(auto, req, true, pend), true);
expect('zorunlu denetim yok (koruma yok) → ret', autoMergeReason(auto, null, true).allow, false);
expect('zorunlu denetim listesi boş → ret', autoMergeReason(auto, { contexts: [], strict: true }, true).allow, false);
expect('ret gerekçesi --auto olmadan yolunu söyler', autoMergeReason(auto, null, true).reason.includes('"--auto" olmadan'), true);
const { parseProtection } = require('../merge-gate');
expect('koruma cevabı: contexts ve checks[].context birleşir, tekrar yok', parseProtection({ contexts: ['a', 'b'], checks: [{ context: 'b' }, { context: 'c' }], strict: true }), { contexts: ['a', 'b', 'c'], strict: true });
expect('koruma cevabı: strict yoksa false', parseProtection({ contexts: ['a'] }).strict, false);
expect('gizli depo + strict false → ret', autoMergeReason(auto, req, false).allow, false);
expect('gizli depo + strict true → izin', allowed(auto, reqStrict, false, pend), true);
expect('açık depo + strict false → izin', autoMergeReason(auto, req, true).allow, true);
expect('kırmızı + --auto → ret', decide(auto, [{ name: 'ci', bucket: 'fail' }], true).allow, false);
expect('iptal + --auto → ret', decide(auto, [{ name: 'ci', bucket: 'cancel' }], true).allow, false);
expect('checks null + --auto + koruma var → izin', allowed(auto, req, true, null), true);
expect('--auto olmayan pending → ret (eski davranış)', decide(m, pend).allow, false);
expect('--auto olmayan pending, koruma izni verilse de ret', decide(m, pend, true).allow, false);
expect('--auto ama koruma izni yok: pending ret', decide(auto, pend, false).allow, false);

console.log(fail ? `\n✗ ${fail} test başarısız` : '\n✓ tümü geçti');
process.exit(fail ? 1 : 0);
