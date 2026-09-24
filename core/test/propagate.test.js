// Aşılmış PR kapatma planı testleri. Çalıştır: node core/test/propagate.test.js
//
// NEDEN (SNN-Abacus-Core bildirimi #79): çekirdek bir günde beş sürüm yayımladı; her yayılım yeni
// PR açtı, eskisini kapatmadı. 8 tüketicide 25 açık PR yığıldı, biri hariç hepsi ölüydü ve
// başlıkları neredeyse aynıydı. Zarar: listeden eski sürümü seçen gözden geçiren, yenisindeki
// düzeltmeyi almamış olur — o düzeltme 1000 kat sapma üreten bir hatayı kapatıyordu.
'use strict';
const P = require('../lib/propagate-plan');

let fail = 0;
const expect = (name, actual, wanted) => {
  const ok = JSON.stringify(actual) === JSON.stringify(wanted);
  if (!ok) fail += 1;
  console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : `\n    gelen: ${JSON.stringify(actual)}\n    beklenen: ${JSON.stringify(wanted)}`}`);
};

const pr = (number, branch, over = {}) => ({ number, headRefName: branch, commits: 1, reviews: 0, ...over });

console.log('— dal adından sürüm');
expect('bugünkü önek', P.versionOfBranch('core/abacus-core-v4.1.1'), '4.1.1');
// İKİ ÖNEK: dal adı bir dönem `cekirdek/` idi. Yalnız birini aramak eskileri sonsuza kadar açık
// bırakır — bildiren kişi elle temizlikte tam bunu yaşadı (Gunum-Var #176).
expect('eski önek de tanınır', P.versionOfBranch('cekirdek/abacus-core-v3.3.0'), '3.3.0');
expect('alakasız dal null', P.versionOfBranch('feat/bir-sey'), null);
expect('boş dal null', P.versionOfBranch(''), null);

console.log('— bildirilen gerçek yığılma (Gunum-Var, 2026-09-20)');
const GUNUM = [
  pr(215, 'core/abacus-core-v4.1.1'),
  pr(214, 'core/abacus-core-v4.1.0'),
  pr(213, 'core/abacus-core-v4.0.0'),
  pr(211, 'core/abacus-core-v3.5.1'),
  pr(210, 'core/abacus-core-v3.5.0'),
  pr(176, 'cekirdek/abacus-core-v3.3.0'),      // eski önek
];
const yeni = P.supersede(GUNUM, '4.1.1');
expect('yalnız en güncel kalır', yeni.keep.number, 215);
expect('kalan beşi kapatılır', yeni.close.map((p) => p.number).sort((a, b) => a - b), [176, 210, 211, 213, 214]);
// EN KRİTİK SATIR: eski önekli PR kaçarsa sonsuza kadar açık kalır.
expect('eski önekli PR da kapatılır', yeni.close.some((p) => p.number === 176), true);

console.log('— dokunulmuş PR da kapatılır, ama sessizce değil');
// PROJE SAHİBİ KARARI (2026-09-23, #79'un önerisi): inceleme ya da ek commit almış PR da
// kapatılır. Gerekçe: açık kalan eski PR tam da bu talebin şikâyet ettiği riski sürdürür.
// Ama DOKUNULMUŞ olduğu sayılır ve yazılır — sessiz kapatma, emeğini koyan kişinin
// "benim PR'ıma ne oldu?" diye aramasına yol açar.
const touchedCase = P.supersede([
  pr(215, 'core/abacus-core-v4.1.1'),
  pr(214, 'core/abacus-core-v4.1.0', { commits: 3 }),
  pr(213, 'core/abacus-core-v4.0.0', { reviews: 1 }),
  pr(212, 'core/abacus-core-v3.5.1'),
], '4.1.1');
expect('ek commit alan da kapatılır', touchedCase.close.some((p) => p.number === 214), true);
expect('inceleme alan da kapatılır', touchedCase.close.some((p) => p.number === 213), true);
// EN KRİTİK SATIR: bu boş dönerse dokunulmuş PR sessizce kapanır ve kimse fark etmez.
expect('dokunulanlar ayrıca bildirilir', touchedCase.touched.map((p) => p.number).sort((a, b) => a - b), [213, 214]);
expect('dizi olarak gelen inceleme de sayılır', P.supersede([pr(1, 'core/abacus-core-v1.0.0', { reviews: [{}] }), pr(2, 'core/abacus-core-v2.0.0')], '2.0.0').touched.map((p) => p.number), [1]);
expect('dokunulmamış PR bildirime girmez', touchedCase.touched.some((p) => p.number === 212), false);

console.log('— temizlik kipi (hedef sürüm verilmez)');
// Bugün var olan yığılma için: en yüksek sürüm kalır, kalanı kapanır.
const temizlik = P.supersede(GUNUM);
expect('en yüksek sürüm kalır', temizlik.keep.number, 215);
expect('kalanı kapanır', temizlik.close.length, 5);

console.log('— sınırlar');
expect('tek PR varsa kapatılacak yok', P.supersede([pr(9, 'core/abacus-core-v4.1.1')], '4.1.1').close, []);
expect('çekirdek dışı PR hiç sayılmaz', P.supersede([pr(3, 'feat/x'), pr(4, 'fix/y')], '4.1.1'), { close: [], keep: null, touched: [] });
// DAHA YENİ bir sürümün PR'ı varsa ona DOKUNULMAZ: yayılım sırası bozulmuş olabilir.
expect('daha yeni sürüme dokunulmaz', P.supersede([pr(20, 'core/abacus-core-v5.0.0'), pr(19, 'core/abacus-core-v4.1.1')], '4.1.1').close, []);
expect('bozuk sürüm etiketi atlanır', P.supersede([pr(5, 'core/abacus-core-vabc'), pr(6, 'core/abacus-core-v4.1.1')], '4.1.1').close, []);

console.log('— kapatma yorumu');
const stale = { ...pr(210, 'core/abacus-core-v3.5.0'), version: '3.5.0' };
const comment = P.supersedeComment(stale, { number: 215, version: '4.1.1' });
expect('yerini alan PR yazılır', comment.includes('#215'), true);
expect('geçiş yazılır', comment.includes('3.5.0 → 4.1.1'), true);
// Göç notlarının kaybolmadığı SÖYLENİR: ölçüldü, yeni PR gövdesi aradaki tüm sürümleri topluyor.
expect('göç notlarının durumu yazılır', comment.includes('Göç notları'), true);
// Dal silinmiyor (proje sahibi kararı) — yorumda da yazılı olmalı, yoksa "dalım da gitti mi?"
expect('dalın silinmediği yazılır', comment.includes('Dal silinmedi'), true);
// Dokunulmuş PR kapatılırken bunu SÖYLER ve ne yapılacağını yazar.
const touchedComment = P.supersedeComment(stale, { number: 215, version: '4.1.1' }, true);
expect('dokunulmuş PR yorumunda uyarı var', touchedComment.includes('inceleme ya da ek commit'), true);
expect('ne yapılacağı yazılır', touchedComment.includes('yeni PR'), true);
// Yeni PR açılmamışsa (tüketici zaten güncel) atıf verilecek numara yoktur.
expect('atıfsız yorum da anlamlı', P.supersedeComment(stale, null).includes('daha yeni bir sürümünde'), true);

console.log('— iki çekirdek, tek tüketici (#103)');
// KURAL ÇEKİRDEK BAŞINADIR: "bir tüketicide yalnız bir açık çekirdek PR'ı" Abacus için bir,
// Piyasa için bir demektir. Abacus yayılımı Piyasa PR'ını "aşılmış" sayıp KAPATMAMALI.
const piyasa = P.coreOf('sinanbocek/SNN-Piyasa-Core');
expect('Piyasa dalı Piyasa sürümü verir', P.versionOfBranch('core/piyasa-core-v0.4.0', piyasa), '0.4.0');
expect('Abacus dalı Piyasa için sayılmaz', P.versionOfBranch('core/abacus-core-v4.1.1', piyasa), null);
expect('Piyasa dalı varsayılan (Abacus) için sayılmaz', P.versionOfBranch('core/piyasa-core-v0.4.0'), null);
const MIXED = [
  pr(31, 'core/piyasa-core-v0.4.0'),
  pr(30, 'core/abacus-core-v4.1.1'),
  pr(29, 'core/abacus-core-v4.1.0'),
  pr(28, 'core/piyasa-core-v0.3.0'),
];
expect('Abacus yayılımı yalnız Abacus PR\'ını kapatır', P.supersede(MIXED, '4.1.1').close.map((p) => p.number), [29]);
expect('Piyasa yayılımı yalnız Piyasa PR\'ını kapatır', P.supersede(MIXED, '0.4.0', piyasa).close.map((p) => p.number), [28]);
expect('Piyasa temizliği en yüksek Piyasa sürümünü tutar', P.supersede(MIXED, null, piyasa).keep.number, 31);

console.log(fail ? `\n${fail} test başarısız` : '\nTüm testler geçti');
process.exit(fail ? 1 : 0);
