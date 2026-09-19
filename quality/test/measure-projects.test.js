// Aile ölçümü testleri. Çalıştır: node quality/test/measure-projects.test.js
'use strict';
const fs = require('fs');
const m = require('../measure-projects');

let fail = 0;
const expect = (name, actual, wanted) => {
  const ok = JSON.stringify(actual) === JSON.stringify(wanted);
  if (!ok) fail += 1;
  console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : `\n    gelen: ${JSON.stringify(actual)}\n    beklenen: ${JSON.stringify(wanted)}`}`);
};

console.log('— proje listesi');
expect('eksik alanlı kayıt atlanır', m.familyProjects({ projects: [{ repo: 'a/b', dir: 'b' }, { repo: 'c/d' }, { dir: 'e' }] }).length, 1);
expect('metin de okunur', m.familyProjects('{"projects":[{"repo":"a/b","dir":"b"}]}').length, 1);
expect('liste yoksa boş', m.familyProjects({}).length, 0);

const gercek = m.readList();
expect('gerçek listede 11 proje', gercek.length, 11);
// GHS-Panel baska bir hesapta: klasor adi ile depo adi AYNI DEGIL. Liste bu yuzden acik tutulur.
expect('GHS-Panel globalhedef altında', gercek.find((p) => p.dir === 'GHS-Panel').repo, 'globalhedef/global-hedef-web-platform');
// ihale-mcp ucuncu tarafin deposu; aile olcumune GIRMEZ.
expect('ihale-mcp listede değil', gercek.some((p) => p.dir === 'ihale-mcp'), false);
const ham = JSON.parse(fs.readFileSync(m.LIST_FILE, 'utf8'));
expect('dışlananın gerekçesi var', ham.excluded.every((x) => !!x.reason), true);

console.log('— karşılaştırma');
const SONRA = [{ dir: 'A', findings: 100, names: 10 }, { dir: 'B', findings: 50, names: 5 }];
const ONCE = [{ dir: 'A', findings: 80, names: 8 }, { dir: 'B', findings: 50, names: 5 }];
const k = m.compare(SONRA, ONCE);
expect('artış hesaplanır', k[0].delta, 20);
expect('değişmeyen sıfır', k[1].delta, 0);
expect('önce yoksa fark yok', m.compare(SONRA)[0].delta, null);
// Yeni eklenen bir proje "once" listesinde yoktur; fark hesaplanamaz, ama satir kaybolmaz.
const yeni = m.compare([...SONRA, { dir: 'C', findings: 7, names: 2 }], ONCE);
expect('yeni proje satırı korunur', yeni.length, 3);
expect('yeni projenin farkı yok', yeni[2].delta, null);

console.log('— yorum metni');
const delta = m.commentBody(k, { changed: true });
expect('fark sütunu var', delta.includes('| Fark |'), true);
expect('artış + ile yazılır', delta.includes('+20'), true);
expect('toplam satırı var', delta.includes('**Toplam**'), true);
// Olcum PR'i KIRMAZ: metin bunu acikca soylemeli, yoksa kirmizi sanilir.
expect('kırmadığını söyler', delta.includes("PR'ı kırmaz"), true);

const duz = m.commentBody(m.compare(SONRA), { changed: false });
expect('fark yoksa sade tablo', duz.includes('| Fark |'), false);
expect('tarayıcı değişmediğini söyler', duz.includes('tarayıcıyı değiştirmedi'), true);

console.log('— SQL sütunu');
// SQL ayrı sayılır: veritabanı adları dışa açık arayüzdür, kırıcı sürüm planı ister.
// Kod içi adlar proje içinde kalır; planlama farkı buradan çıkar.
const sqlText = m.commentBody(m.compare([{ dir: 'A', findings: 300, sql: 243, names: 94 }]));
expect('SQL sütunu başlıkta', sqlText.includes('| SQL |'), true);
expect('SQL sayısı yazılır', sqlText.includes('243'), true);
expect('SQL yoksa tire', m.commentBody(m.compare([{ dir: 'B', findings: 5, sql: 0, names: 2 }])).includes('| — |'), true);

console.log('— hatalı satırlar tabloyu bozmaz');
const bozuk = m.commentBody(m.compare([{ dir: 'X', missing: true }, { dir: 'Y', error: 'izin yok' }, { dir: 'Z', findings: 3, names: 1 }]));
expect('klonlanamayan görünür', bozuk.includes('klonlanamadı'), true);
expect('hata görünür', bozuk.includes('izin yok'), true);
expect('sağlam satır yine yazılır', bozuk.includes('| Z |'), true);

console.log(fail ? `\n${fail} test başarısız` : '\nTüm testler geçti');
process.exit(fail ? 1 : 0);
