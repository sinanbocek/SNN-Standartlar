// Geniş etkili git komutu denetimi testleri. Çalıştır: node quality/test/wide-effect-git.test.js
'use strict';
const g = require('../wide-effect-git');

let fail = 0;
const expect = (name, actual, wanted) => {
  const ok = JSON.stringify(actual) === JSON.stringify(wanted);
  if (!ok) fail += 1;
  console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : `\n    gelen: ${JSON.stringify(actual)}\n    beklenen: ${JSON.stringify(wanted)}`}`);
};
const engel = (cmd) => (g.check(cmd) ? g.check(cmd).name : null);

console.log('— sahneye her şeyi alma');
expect('git add -A', engel('git add -A'), 'git add -A');
expect('git add --all', engel('git add --all'), 'git add -A');
expect('git add .', engel('git add .'), 'git add -A');
expect('git add <yol> serbest', engel('git add quality/a.js quality/b.js'), null);
expect('git add -p serbest', engel('git add -p quality/a.js'), null);
expect('dosya adı .env.example serbest', engel('git add .env.example'), null);

console.log('— commit -a');
expect('git commit -a', engel('git commit -a -m "x"'), 'git commit -a');
expect('git commit -am', engel('git commit -am "x"'), 'git commit -a');
expect('git commit -m serbest', engel('git commit -m "x"'), null);

console.log('— toplu geri alma');
expect('git checkout -- .', engel('git checkout -- .'), 'git checkout -- .');
expect('git restore .', engel('git restore .'), 'git checkout -- .');
expect('git restore --staged .', engel('git restore --staged .'), 'git checkout -- .');
expect('git restore <yol> serbest', engel('git restore quality/a.js'), null);
expect('git checkout <dal> serbest', engel('git checkout main'), null);

console.log('— temizlik ve kenara koyma');
expect('git clean -fd', engel('git clean -fd'), 'git clean');
expect('git clean -n serbest', engel('git clean -n'), null);
expect('git stash', engel('git stash'), 'git stash');
expect('git stash list serbest', engel('git stash list'), null);

console.log('— mesaj');
expect('mesaj kurala yönlendirir', g.blockMessage(g.check('git add -A')).includes('es-zamanli-calisma-standardi.md'), true);
expect('mesaj doğru yolu söyler', g.blockMessage(g.check('git add -A')).includes('git add <yol1>'), true);

console.log('— dal silme');
expect('push --delete', g.deletedBranch('git push origin --delete feat/x'), 'feat/x');
expect('push :dal', g.deletedBranch('git push origin :feat/x'), 'feat/x');
expect('branch -D', g.deletedBranch('git branch -D feat/x'), 'feat/x');
expect('birleştirme komutu PR numarası döndürür', g.deletedBranch('gh pr merge 17 --merge --delete-branch'), { prNumber: 17 });
expect('silme yoksa null', g.deletedBranch('git push origin feat/x'), null);

// #18 vakası: docs/giris dalı silindi, onu TABAN alan #18 kapandı
const acikPR = [{ number: 17, base: 'main', head: 'docs/giris' }, { number: 18, base: 'docs/giris', head: 'feat/kod' }];
expect('taban dalı silinirken engellenir', g.branchDeleteBlock('git push origin --delete docs/giris', acikPR) !== null, true);
expect('engel mesajı PR numarasını söyler', g.branchDeleteBlock('git push origin --delete docs/giris', acikPR).includes('#18'), true);
expect('birleştirme: alttaki PR silinirken üstteki varsa engellenir', g.branchDeleteBlock('gh pr merge 17 --merge --delete-branch', acikPR) !== null, true);

// YANLIŞ ALARM (2026-09-18): tek PR birleştirilirken kendi dalı siliniyor — engellenmemeli
const tekPR = [{ number: 25, base: 'main', head: 'fix/tarayici' }];
expect('kendi dalını silen birleştirme serbest', g.branchDeleteBlock('gh pr merge 25 --merge --delete-branch', tekPR), null);
expect('başka dal serbest', g.branchDeleteBlock('git push origin --delete feat/baska', acikPR), null);
expect('açık PR listesi boşsa serbest', g.branchDeleteBlock('git push origin --delete docs/giris', []), null);
expect('PR listede yoksa engelleme yok', g.branchDeleteBlock('gh pr merge 99 --merge --delete-branch', tekPR), null);
console.log(fail ? `\n${fail} test başarısız` : '\nTüm testler geçti');
process.exit(fail ? 1 : 0);
