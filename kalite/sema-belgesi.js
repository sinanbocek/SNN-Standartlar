// Şema belgesi bekçisi: yapısal veritabanı değişikliği (tablo/sütun/tip) yapılıp şema belgesi güncellenmediyse iş bitirilmez.
// Neden (2026-09-15 ölçümü, son 120 gün): yapısal migration'ların şema belgesiyle birlikte gelme oranı Portföy 4/9,
// GHS 3/6, Nakit-Akış 4/16. Yapay zekâ eskimiş şema belgesine bakıp olmayan sütunla kod yazar.
// Bilinçli istisna: migration dosyasına "-- sema-belgesi: gerek yok (neden)" satırı yazılır.
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const MIGRATIONS = 'supabase/migrations/';
// Projelerde ölçülen şema belgesi adları (ilk bulunan kullanılır)
const SCHEMA_DOCS = ['docs/database/core-schema.md', 'docs/database/schema.md', 'docs/database/project-core-schema.md'];
const DDL = /\bcreate\s+table\b|\bdrop\s+table\b|\balter\s+table\b[^;]*\b(add|drop|rename|alter)\b|\b(create|alter|drop)\s+type\b/i;
const EXEMPT = /--\s*sema-belgesi:\s*gerek yok/i;

// SAF: SQL yorumları çıkarılmış metinde yapısal değişiklik var mı (istisna satırı varsa yok sayılır)
function isStructural(sql) {
  if (EXEMPT.test(sql)) return false;
  const code = sql.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  return DDL.test(code);
}

// SAF: karar. changed = bu işte değişen yollar; structural = yapısal migration yolları
function decide({ schemaDoc, structural, changed, hookActive }) {
  if (!schemaDoc || !structural.length || changed.includes(schemaDoc)) return null;
  const msg = `Veritabanı yapısı değişti (${structural.map((f) => path.basename(f)).join(', ')}) ama şema belgesi (${schemaDoc}) güncellenmedi. `
    + 'Belgeyi aynı işte güncelle (yeni/silinen tablo ve sütunlar, tipler). Bilinçli olarak gerek yoksa migration dosyasına '
    + '"-- sema-belgesi: gerek yok (neden)" satırını ekle.';
  if (hookActive) return { systemMessage: `⚠ ${msg}` };
  return { decision: 'block', reason: `[global kural] ${msg}` };
}

// raw: çıktı kırpılmaz. "git status --porcelain" satırı " M yol" diye BOŞLUKLA başlar; kırpılırsa ilk satırın
// yolunun ilk harfi kesilir ("ocs/…") ve belge değişikliği görünmez (2026-09-15, bu dosyanın testi yakaladı)
function git(root, args, { raw = false } = {}) {
  try {
    const out = execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return raw ? out : out.trim();
  } catch {
    return null;
  }
}

// Bu işte değişenler: commit'lenmemiş + ana daldan ayrıldıktan sonraki commit'ler
function changedPaths(root) {
  const set = new Set();
  (git(root, ['status', '--porcelain', '--untracked-files=all'], { raw: true }) || '').split('\n').filter(Boolean)
    .forEach((l) => set.add(l.slice(3).replace(/^"|"$/g, '').split(' -> ').pop()));
  const base = (git(root, ['symbolic-ref', '--short', 'refs/remotes/origin/HEAD']) || 'origin/main');
  const mergeBase = git(root, ['merge-base', 'HEAD', base]);
  if (mergeBase) (git(root, ['diff', '--name-only', mergeBase, 'HEAD']) || '').split('\n').filter(Boolean).forEach((f) => set.add(f));
  return [...set];
}

function measure(root) {
  if (!fs.existsSync(path.join(root, MIGRATIONS))) return null;
  const schemaDoc = SCHEMA_DOCS.find((d) => fs.existsSync(path.join(root, d))) || null;
  const changed = changedPaths(root);
  const structural = changed
    .filter((f) => f.startsWith(MIGRATIONS) && f.endsWith('.sql') && fs.existsSync(path.join(root, f)))
    .filter((f) => isStructural(fs.readFileSync(path.join(root, f), 'utf8')));
  return { schemaDoc, structural, changed };
}

module.exports = { isStructural, decide, measure, SCHEMA_DOCS };
