// SessionStart: açılan projenin durumunu ve diğer projelerdeki uyarıları bağlama ekler.
'use strict';
const path = require('path');
const debt = require('./lib/debt');
const { projectStatus, listProjects, findProjectRoot, debtLabel } = debt;
// Ortak depo yerelde eski bir dalda olabilir; yeni fonksiyon yoksa özellik atlanır, açılış özeti çökmez
// (2026-09-15: ortak depo başka dala geçince "forgottenWork is not a function" ile açılış özeti tamamen durdu)
const forgottenWork = typeof debt.forgottenWork === 'function' ? debt.forgottenWork : () => [];

const STALE_DIRTY_DAYS = 3;
const TOP_DEBTS = 5;
// Bu kadar gündür dokunulmayan commit'siz dosya / gönderilmemiş dal "unutulan iş" sayılır
const FORGOTTEN_DAYS = 7;

function readInput() {
  try {
    return JSON.parse(require('fs').readFileSync(0, 'utf8').replace(/^﻿/, '') || '{}');
  } catch {
    return {};
  }
}

function main() {
  const input = readInput();
  const root = findProjectRoot(input.cwd || process.cwd());
  const lines = [];
  // Canlı kural kopyasını GitHub main'e ileri sar (6 saatte bir). Kurallar zaten yüklendiyse bir sonraki oturumda geçerli olur.
  const updateResult = require('./lib/shared').refresh();
  if (updateResult.status === 'hata') lines.push(`⚠ Kurallar: ${updateResult.mesaj}`);

  if (root) {
    const p = projectStatus(root);
    lines.push(`📂 ${p.name} · v${p.version || '?'} · dal: ${p.branch || '?'}`);
    lines.push(`   Son commit: ${p.lastDate || '-'} "${p.lastMsg || '-'}"`);
    // Eş zamanlı çalışma: aynı projede başka oturum açıksa haber ver (kural: quality/session-registry.js).
    // Defter okunamazsa oturum açılışı bozulmaz; koordinasyon bilgisi eksik kalır.
    try {
      const registry = require(require('./lib/shared').shared('quality/session-registry.js'));
      const others = registry.announce({
        dir: path.join(require('os').homedir(), '.claude', 'oturumlar'),
        root,
        sessionId: input.session_id,
        branch: p.branch,
      });
      const msg = registry.message(others);
      if (msg) lines.push(`   ${msg}`);
    } catch { /* defter yok → sessiz geç */ }
    if (p.dirty.count) lines.push(`   ⚠ ${p.dirty.count} dosya commit'lenmemiş (en eskisi ${p.dirty.ageDays} gün)`);
    const forgotten = forgottenWork(p, FORGOTTEN_DAYS).filter((x) => !x.includes("commit'siz"));
    if (forgotten.length) {
      lines.push(`   ⚠ Unutulan iş: ${forgotten.join(' · ')}. Kullanıcıya sor: gönderilsin mi, silinsin mi, yoksa kütüğe kayıt mı açılsın?`);
    }
    lines.push(`   Teknik borç: ${debtLabel(p.debts)}`);
    const urgent = p.debts.items.filter((i) => i.priority === 'P1').slice(0, TOP_DEBTS);
    urgent.forEach((i) => lines.push(`     • ${i.id} — ${i.title}`));
    if (p.debts.format === 'yok') {
      lines.push('   ⚠ Bu proje SNN standart sistemine bağlı değil (kütük yok). Kullanıcıya "proje-kur" becerisiyle kurulumu öner (önce ölçüm, onayla uygulama).');
    } else if (p.debts.format !== 'standart') {
      lines.push(`   Not: kütük standart biçimde değil (${p.debts.format}) → kayıtlar standarda taşınmalı; kullanıcıya "proje-kur" becerisiyle ölçüm öner.`);
    }
    // Rehber tazeliği: kontrol çökerse oturum açılışı yine sürer
    try {
      const rehber = require(require('./lib/shared').shared('quality/guide-freshness.js'));
      const warning = rehber.summary(rehber.check(root));
      if (warning) lines.push(`   ⚠ ${warning}`);
    } catch (e) {
      lines.push(`   ⚠ rehber tazelik kontrolü çalışmadı: ${e.message}`);
    }
    // Kütüphane güvenlik uyarıları (GitHub, yarım gün önbellekli); okunamazsa sessizce atlanır
    try {
      const security = require(require('./lib/shared').shared('quality/security-alerts.js')).check(root);
      if (security) lines.push(`   ⚠ ${security}`);
    } catch (e) {
      lines.push(`   ⚠ güvenlik uyarısı kontrolü çalışmadı: ${e.message}`);
    }
  }

  const others = listProjects()
    .filter((d) => !root || path.resolve(d) !== root)
    .map(projectStatus)
    .filter((p) => (p.debts.count && p.debts.count.P1) || forgottenWork(p, STALE_DIRTY_DAYS).length);
  if (others.length) {
    lines.push('Diğer projelerde bekleyenler:');
    others.forEach((p) => {
      const parts = [];
      if (p.debts.count && p.debts.count.P1) parts.push(`P1:${p.debts.count.P1}`);
      parts.push(...forgottenWork(p, STALE_DIRTY_DAYS));
      lines.push(`   ${p.name}: ${parts.join(' · ')}`);
    });
  }

  if (lines.length) process.stdout.write(lines.join('\n') + '\n');
}

try {
  main();
} catch (e) {
  process.stderr.write(`session-start hook hatası: ${e.message}\n`);
}
process.exit(0);
