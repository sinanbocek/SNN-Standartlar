// Oturum özeti (teşhis) testleri. Çalıştır: node quality/test/session-digest.test.js
//
// Örnek satırlar gerçek Claude Code oturum kaydının yapısını taklit eder (alan adları birebir).
// Gerçek kayıt depoya konmaz: kişisel veridir ve bu depo herkese açıktır.
'use strict';
const { parseTranscript, detect, stats, render, report, projectDirName } = require('../session-digest');

let fail = 0;
const expect = (name, actual, wanted) => {
  const ok = JSON.stringify(actual) === JSON.stringify(wanted);
  if (!ok) fail += 1;
  console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : `\n    gelen: ${JSON.stringify(actual)}\n    beklenen: ${JSON.stringify(wanted)}`}`);
};

const ts = (m) => `2026-09-23T19:${String(m).padStart(2, '0')}:00.000Z`;
const human = (text, m = 0) => ({ type: 'user', timestamp: ts(m), origin: { kind: 'human' }, message: { role: 'user', content: text } });
const bash = (command, m = 0) => ({ type: 'assistant', timestamp: ts(m), message: { role: 'assistant', content: [{ type: 'tool_use', id: 't1', name: 'Bash', input: { command, description: 'x' } }] } });
const said = (text, m = 0) => ({ type: 'assistant', timestamp: ts(m), message: { role: 'assistant', content: [{ type: 'text', text }] } });
const result = (content, isError = false) => ({ type: 'user', message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 't1', content, is_error: isError }] } });
const edited = (filename) => ({ type: 'attachment', attachment: { type: 'edited_text_file', filename, snippet: '1\t// x' } });
const silent = () => ({ type: 'attachment', attachment: { type: 'silent_turn_reminder', text: 'x' } });
const prLink = (n) => ({ type: 'pr-link', prNumber: n, prUrl: `https://github.com/a/b/pull/${n}` });
const jsonl = (records) => records.map((r) => (typeof r === 'string' ? r : JSON.stringify(r))).join('\n');
const kinds = (records) => detect(parseTranscript(jsonl(records))).map((f) => `${f.kind}@${f.line}`);

console.log('— bugünkü gerçek vakalar (2026-09-23)');
// GHS-Panel yanlış depo adıyla sorgulandı; hata susturulmuştu ve 404 "adres yok" diye basıldı.
const GHS_LOOP = 'for r in GHS-Panel Gunum-Var; do o=sinanbocek; t=$(gh api repos/$o/$r/contents/docs/teknik-borc.md -H "Accept: application/vnd.github.raw" 2>/dev/null); if [ -z "$t" ]; then echo "$r: kütük yok"; else echo "$r: $(echo "$t" | grep -m1 -oE x || echo \'adres yok\')"; fi; done';
expect('susturulmuş hata + "yok" etiketi yakalanır', kinds([bash(GHS_LOOP)]), ['hata-susturma@1']);
// Aynı döngünün doğru yazılmış hâli (aynı gün, sonra): okunamayanı "okunamadı" diye basıyor.
// "adres yok" etiketi KALIR ve doğrudur: dosya okundu, desen içinde yok. İşaretlenmemeli.
expect('okunamadı diye basan döngü sayılmaz', kinds([bash(GHS_LOOP.replace('kütük yok', 'KÜTÜK OKUNAMADI'))]), []);
// ihale-mcp, yerel klasörler gezilerek aileye sayıldı.
expect('yerel klasör gezme yakalanır', kinds([bash('cd ~/Documents/SNN-AI-Asus-Z14; for d in */; do d=${d%/}; [ -d "$d/.git" ] || continue; done')]), ['yerel-klasor-olcumu@1']);
// Sabotaj geri alınırken `git checkout --` düzeltmeyi de sildi; hemen ardından "dosya diskte değişti" eki geldi.
const REVERT = [bash('node setup/test/setup-plan.test.js; sed -i x setup/lib/setup-plan.js; git checkout -q -- setup/lib/setup-plan.js 2>/dev/null; git diff --stat'), result('ok'), said('devam'), edited('C:\\x\\setup\\lib\\setup-plan.js')];
expect('geri alma ardından aynı dosya değişti', kinds(REVERT), ['geri-alma-sonrasi-degisiklik@1']);
expect('başka dosya değiştiyse yalnız geri alma', kinds([REVERT[0], edited('C:\\x\\baska.js')]), ['geri-alma@1']);
expect('sahneden çıkarma geri alma sayılmaz', kinds([bash('git restore --staged docs/a.md')]), []);
// Kullanıcı iki kez düzeltti.
expect('kısa kullanıcı düzeltmesi yakalanır', kinds([human('birde ihale-mcp benim prjem değil. onu dikkate almaylım')]), ['kullanici-duzeltmesi@1']);
// JavaScript'in \b sınırı yalnız ASCII harf tanır; "yanlış" gibi ş ile biten kelimede boşluktan önce çalışmaz.
expect('ş ile biten düzeltme kelimesi yakalanır', kinds([human('bu yanlış bence')]), ['kullanici-duzeltmesi@1']);
expect('uzun yapıştırılmış metin düzeltme sayılmaz', kinds([human(`## Rapor\n${'bu doğru değil '.repeat(80)}`)]), []);
expect('ajanın kendi hata bildirimi yakalanır', kinds([said('Önceki mesajlarda "9 kütük" dedim, bu yanlıştı.')]), ['kendi-hatasi@1']);
expect('"yanlış alarm" konuşması hata bildirimi sayılmaz', kinds([said('Kapı yanlış alarm vermedi; 0 yanlış alarm.')]), []);

console.log('— bekçi engelleri');
const block = (why) => result(`PreToolUse:Bash hook error: [global kural] Engellendi: ${why} — Önce kendi dalını aç`, true);
const blocks = [block('main dalına doğrudan commit.'), block('main dalına doğrudan commit.'), block('main dalına doğrudan commit.'), block('git add -A')];
expect('aynı engele tekrar tekrar takılma yakalanır', kinds(blocks), ['tekrarlanan-engel@1']);
expect('tekrar sayısı yazılır', detect(parseTranscript(jsonl(blocks)))[0].summary.includes('3 kez'), true);
expect('tek engel bulgu değildir', kinds([block('git add -A')]), []);

console.log('— sayılar');
const s = stats(parseTranscript(jsonl([human('a', 0), bash('ls', 1), result('x', true), silent(), silent(), prLink(91), said('b', 42)])));
expect('kullanıcı mesajı', s.userTurns, 1);
expect('araç çağrısı', s.toolCalls, 1);
expect('araç hatası', s.toolErrors, 1);
expect('sessiz kalma uyarısı', s.silentTurns, 2);
expect('PR bağlantıları', s.prs, [91]);
expect('süre dakika', s.minutes, 42);

console.log('— token sayıları');
// Kayıtta aynı model yanıtı birden çok satıra bölünür ve her satır aynı `usage` değerini taşır
// (2026-09-24: bu oturumda 173 yanıt, 477 satır). Yanıt kimliğiyle bir kez sayılmazsa toplam ~3 kat şişer.
const usage = { input_tokens: 2, cache_creation_input_tokens: 100, cache_read_input_tokens: 5000, output_tokens: 40 };
const reply = (id, content) => ({ type: 'assistant', message: { id, role: 'assistant', usage, content: [content] } });
const tok = stats(parseTranscript(jsonl([
  reply('m1', { type: 'thinking', thinking: '' }), reply('m1', { type: 'text', text: 'a' }), reply('m1', { type: 'tool_use', name: 'Bash', input: { command: 'ls' } }),
  reply('m2', { type: 'text', text: 'b' }),
]))).tokens;
expect('aynı yanıt bir kez sayılır: çıktı', tok.output, 80);
expect('girdi (önbellek dahil)', tok.input, 2 * (2 + 100 + 5000));
expect('önbellekten okunan', tok.cacheRead, 10000);
expect('model yanıtı sayısı', tok.replies, 2);
expect('raporda token satırı', /çıktı 80 · girdi 10\.204/.test(report('x', parseTranscript(jsonl([reply('m1', { type: 'text', text: 'a' }), reply('m2', { type: 'text', text: 'b' })])))), true);
expect('token yoksa bilinmiyor denir', stats(parseTranscript(jsonl([human('a')]))).tokens.replies, 0);

console.log('— okuma güvenliği');
const lines = parseTranscript(jsonl([human('ilk'), '{bozuk satır', bash('echo x')]));
expect('bozuk satır atlanır, numaralar korunur', lines.filter((e) => e.kind === 'bash').map((e) => e.line), [3]);
const TOKEN = ['gh', 'p_'].join('') + 'A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8';
expect('anahtar biçimli değer maskelenir', render(parseTranscript(jsonl([bash(`GITHUB_TOKEN=${TOKEN} gh api user`)])), 1, 1).includes(TOKEN), false);
expect('uzun satır kısaltılır', render(parseTranscript(jsonl([said('x'.repeat(5000))])), 1, 1).length < 600, true);

console.log('— oturum klasörü');
expect('çalışma klasöründen proje klasör adı', projectDirName('C:\\Users\\sboce\\Documents\\SNN-AI-Asus-Z14\\SNN-Standartlar'), 'C--Users-sboce-Documents-SNN-AI-Asus-Z14-SNN-Standartlar');

console.log(fail ? `\n✗ ${fail} test başarısız` : '\n✓ Tüm testler geçti');
process.exit(fail ? 1 : 0);
