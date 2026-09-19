// Kuralların TEK kaynağı ortak depodur (sinanbocek/SNN-Standartlar). Buradaki dosyalar yalnızca oraya yönlendirir.
//
// CANLI KOPYA (2026-09-15): kurallar geliştirme klasöründen (Documents/.../snn-standartlar) DEĞİL, yalnız ana dalı
// izleyen ayrı bir kopyadan okunur: ~/.claude/standartlar-canli. Neden: geliştirme klasöründe dal değiştirince
// birleşmemiş koddaki fonksiyon kayboldu ve tüm projelerde oturum açılış özeti durdu.
// Canlı kopya elle değiştirilmez; yalnız `refresh()` ile GitHub'daki main'e ileri sarılır.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = process.env.SNN_STANDARTLAR || path.join(os.homedir(), '.claude', 'standartlar-canli');
const REPO_URL = 'https://github.com/sinanbocek/SNN-Standartlar.git';
const STAMP = path.join(ROOT, '.git', 'snn-son-updateResult');
const UPDATE_EVERY_MS = 6 * 60 * 60 * 1000;

function shared(rel) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) {
    throw new Error(`Ortak standart kodu bulunamadı: ${file} — canlı kopyayı indirin: git clone ${REPO_URL} "${ROOT}"`);
  }
  return file;
}

// Canlı kopyayı GitHub main'e ileri sarar (en fazla 6 saatte bir; force=true ile hemen).
// Yalnız ileri sarma (--ff-only): canlı kopyada yerel değişiklik varsa ya da ağ yoksa dokunmaz, eski kural çalışmaya devam eder.
// Döner: { status: 'guncel'|'atlandi'|'hata', mesaj }
function refresh({ force = false } = {}) {
  try {
    if (!force && Date.now() - fs.statSync(STAMP).mtimeMs < UPDATE_EVERY_MS) return { status: 'atlandi' };
  } catch { /* damga yok → güncelle */ }
  try {
    const opts = { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', timeout: 8000 };
    const dirty = execFileSync('git', ['-C', ROOT, 'status', '--porcelain'], opts).trim();
    if (dirty) return { status: 'hata', mesaj: 'canlı kopyada elle yapılmış değişiklik var; güncellenmedi' };
    execFileSync('git', ['-C', ROOT, 'pull', '--ff-only', '-q', 'origin', 'main'], opts);
    fs.writeFileSync(STAMP, new Date().toISOString());
    return { status: 'guncel' };
  } catch (e) {
    return { status: 'hata', mesaj: `canlı kopya güncellenemedi: ${(e.stderr || e.message || '').toString().trim().split('\n')[0]}` };
  }
}

module.exports = { ROOT, shared, refresh };
