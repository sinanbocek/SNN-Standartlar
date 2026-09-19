// Kod dili UYARI KIPI: ajan Turkce bir tanimlayici YAZARKEN not duser. Engellemez.
//
// Neden uyari, neden engel degil (2026-09-19 karari):
// Aktif oturumlar ortasinda bir kapi acilirsa, yarim kalmis is yarisi bir dilde yarisi otekinde
// kalir ve ajan ayni yazmayi tekrar tekrar dener. Uyari once olculur, yanlis alarmlar gorulur,
// sonra engele cevrilir. Ilke: "zorlanamayan madde kural degil, oneridir" — ama once olculmeyen
// zorlama da kurali degil, guruluyu buyutur.
//
// Kural: standartlar/kod-dili-standardi.md · Tarayici: quality/code-language-scan.js
'use strict';

const scan = require('./code-language-scan');

const MAX_NAME = 5;

// SAF: arac girdisinden YAZILAN metni cikarir (Edit/Write/MultiEdit/NotebookEdit).
// Yalniz yeni metin okunur; dosyanin tamami degil. Gecmis kod bu kapinin isi degildir.
function writtenText(toolInput) {
  const ti = toolInput || {};
  const edits = Array.isArray(ti.edits) ? ti.edits.map((e) => e.new_string || '') : [];
  return [ti.content, ti.new_string, ti.new_source, ...edits].filter(Boolean).join('\n');
}

// SAF: dosya yolu projeye gore normalize edilir; tarayici hep proje koku goreli yol bekler.
const BACKSLASH = String.fromCharCode(92);
const toSlash = (p) => String(p || '').split(BACKSLASH).join('/');

function relativePath(file, cwd) {
  if (!file) return '';
  const f = toSlash(file);
  const c = toSlash(cwd).replace(/[/]$/, '');
  return c && f.toLowerCase().startsWith(c.toLowerCase() + '/') ? f.slice(c.length + 1) : f;
}

// SAF: yazilan metinde kural disi ad var mi? -> [{ name, reason }] (ad basina tek kayit)
function warnFindings(text, file, words, exception) {
  if (!text || !scan.isScanned(file)) return [];
  const sql = /\.sql$/i.test(file);
  const out = [];
  const seen = new Set();
  for (const line of String(text).split(/\r?\n/)) {
    for (const b of scan.lineFindings(line, words, sql)) {
      if (seen.has(b.name)) continue;
      if (scan.isExcepted(b, file, exception)) continue;
      seen.add(b.name);
      out.push(b);
    }
  }
  return out;
}

// SAF: ajana gosterilecek not. Engel degil; ne yapilacagini soyler ve yanlis alarm yolunu acik tutar.
function warnMessage(findings, file) {
  if (!findings.length) return '';
  const lines = findings.slice(0, MAX_NAME).map((f) => `  ${f.name}  (${f.reason})`).join('\n');
  const more = findings.length > MAX_NAME ? `\n  ...ve ${findings.length - MAX_NAME} ad daha` : '';
  return [
    `[kod dili · uyari] ${file} icine Turkce tanimlayici yaziliyor:`,
    lines + more,
    '',
    'Aile standardi: tanimlayicilar Ingilizce yazilir (standartlar/kod-dili-standardi.md).',
    'Bu bir ENGEL degildir; yazma islemi surdu. Bundan SONRAKI adlari Ingilizce sec;',
    'dosyadaki eski adlari bu is icin toplu degistirme — gecmis temizligi projenin',
    'kendi teknik borc kaydinda yapilir.',
    'Ad gercekten cevrilemiyorsa (urun adi, Turkiye mevzuati) SNN-Standartlar\'a bildir;',
    'yanlis alarm .snn-kod-dili.json ile susturulmaz.',
  ].join('\n');
}

// IO: proje koku icin bir kez hazirlanan baglam.
function context(root) {
  return { words: scan.wordSet(), exception: scan.readExceptions(root) };
}

module.exports = { writtenText, relativePath, warnFindings, warnMessage, context, MAX_NAME };
