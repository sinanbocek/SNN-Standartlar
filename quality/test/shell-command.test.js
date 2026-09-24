// Komut bekçisi testleri. Çalıştır: node quality/test/shell-command.test.js
'use strict';
const s = require('../shell-command');

let fail = 0;
const expect = (name, actual, wanted) => {
  const ok = JSON.stringify(actual) === JSON.stringify(wanted);
  if (!ok) fail += 1;
  console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : `\n    gelen: ${JSON.stringify(actual)}\n    beklenen: ${JSON.stringify(wanted)}`}`);
};
const ids = (code) => s.bashisms(code).map((i) => i.id);
const fence = (tag, code) => `Şunu çalıştır:\n\n\`\`\`${tag}\n${code}\n\`\`\`\n`;

console.log('— gerçek vakalar');
// 2026-09-24, SNN-Piyasa-Core bb9f3899 L657: sahip PowerShell'de hata aldı, elle düzeltti.
const PIYASA = 'cd "C:/Users/sboce/Documents/SNN-AI-Asus-Z14/SNN-Piyasa-Core" && npx supabase functions deploy market-fetch';
expect('Piyasa-Core vakası yakalanır', s.findings(fence('bash', PIYASA)).map((b) => b.issues.map((i) => i.id)), [['&&']]);
// 2026-08-15, SNN-Portfoy-Yonetimi fcfefdd2 L108: "At line:1 char:12" hatası kayıtlı.
expect('Portföy vakası yakalanır', ids('git add -A && git commit -m "fix(security): sizan anahtar silindi"'), ['&&']);

console.log('— bash sözdizimi');
expect('||', ids('npm test || echo kirmizi'), ['||']);
expect('export', ids('export NODE_ENV=production'), ['export']);
expect('/dev/null', ids('git show abc 2>/dev/null'), ['/dev/null']);
expect('AD=değer komut', ids('DEBUG=1 node x.js'), ['AD=değer komut']);
expect('satır sonu ters bölü', ids('npx supabase functions deploy x \\\n  --project-ref abc'), ['satır sonu \\']);
expect('bir satırda iki kusur', ids('export A=1 && cat x 2>/dev/null').sort(), ['&&', '/dev/null', 'export'].sort());

console.log('— yanlış alarm koruması');
expect('tırnak içindeki && değil', ids('git commit -m "a && b"'), []);
expect('tek tırnak içindeki || değil', ids("node -e 'console.log(a || b)'"), []);
expect('PowerShell koşullu sıra temiz', ids('npm run build; if ($?) { npm run deploy }'), []);
expect('PowerShell $null yönlendirmesi temiz', ids('git show abc 2>$null'), []);
expect('PowerShell ortam değişkeni temiz', ids("$env:DEBUG = '1'"), []);
expect('PowerShell alt ifade $() temiz', ids('Write-Output "sürüm $(node -v)"'), []);
expect('düz gh komutu temiz', ids('gh pr merge 105 -R sinanbocek/SNN-Standartlar --merge'), []);
expect('yorum satırı atlanır', ids('# once build && sonra deploy\nnpm run build'), []);
expect('Windows yolu ters bölüsü satır sonu sayılmaz', ids('Set-Location "C:\\Users\\sboce\\"'), []);

console.log('— hangi bloklara bakılır');
expect('etiketsiz blok bakılmaz', s.findings(fence('', 'a && b')), []);
expect('js bloğu bakılmaz', s.findings(fence('js', 'const r = usdRate || 1;')), []);
expect('text bloğu bakılmaz (gösterim)', s.findings(fence('text', PIYASA)), []);
expect('powershell bloğu bakılır', s.findings(fence('powershell', 'a && b')).length, 1);
expect('etiket büyük harf de tanınır', s.findings(fence('Bash', 'a && b')).length, 1);

console.log('— cevabın son parçası');
const rec = (o) => JSON.stringify(o);
const asst = (content) => rec({ type: 'assistant', message: { content } });
const transcript = [
  rec({ type: 'user', message: { content: 'dağıt' } }),
  asst([{ type: 'text', text: fence('bash', 'ara && not') }, { type: 'tool_use', name: 'Bash' }]),
  rec({ type: 'user', message: { content: [{ type: 'tool_result', content: 'ok' }] } }),
  asst([{ type: 'text', text: 'Bitti.' }]),
  asst([{ type: 'text', text: fence('powershell', 'npm run deploy') }]),
];
expect('son parça birleşir', s.lastReplyText(transcript), `Bitti.\n${fence('powershell', 'npm run deploy')}`);
expect('araç çağrısından önceki ara not sayılmaz', s.findings(s.lastReplyText(transcript)), []);
expect('bozuk satır atlanır', s.lastReplyText(['{bozuk', asst([{ type: 'text', text: 'x' }])]), 'x');

console.log('— karar');
expect('temiz cevap: karar yok', s.decide({ text: fence('powershell', 'npm test'), hookActive: false }), null);
const block = s.decide({ text: fence('bash', PIYASA), hookActive: false });
expect('ilk tur: durdurur', block.decision, 'block');
expect('sebep düzeltmeyi söyler', /ayrı bloklara/.test(block.reason) && /iletisim-standardi/.test(block.reason), true);
// Sonsuz döngü olmaz: ikinci turda yalnız uyarı.
const again = s.decide({ text: fence('bash', PIYASA), hookActive: true });
expect('ikinci tur: yalnız uyarı', [again.decision, typeof again.systemMessage], [undefined, 'string']);

console.log(fail ? `\n${fail} test başarısız` : '\nTüm testler geçti');
process.exit(fail ? 1 : 0);
