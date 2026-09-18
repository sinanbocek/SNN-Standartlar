// Oturum defteri: aynı proje üzerinde AYNI ANDA çalışan yapay zekâ oturumlarını görünür kılar.
// Neden (2026-09-18): SNN-Standartlar'da iki oturum farkında olmadan aynı çalışma klasöründe çalıştı;
// biri `git add -A` ile diğerinin commit'lenmemiş dosyasını sahneye aldı, biri de üstünde açık PR duran
// bir dalı sildi (PR kapandı). İkisi de sessiz kayıptı: kimse "başkası da burada" demedi.
//
// Defter bilgisayarda durur (depoya girmez): her oturum kendini yazar, açılışta diğerlerini okur.
// Kayıt "kilit" DEĞİLDİR — kimseyi engellemez, yalnız haber verir. Kilit, insanı yanlış güvene iter;
// haber, ajanı konuşmaya iter.
'use strict';
const fs = require('fs');
const path = require('path');

// Bu süre boyunca haber vermeyen oturum "kapanmış" sayılır (defterden düşer).
const STALE_MS = 2 * 60 * 60 * 1000;

// SAF: proje kökünden defter dosyası adı üretir ('C:/x/SNN-Standartlar' → 'SNN-Standartlar.json')
function registryFile(dir, root) {
  const key = String(root).replace(/[\\/]+$/, '').split(/[\\/]/).pop() || 'proje';
  return path.join(dir, `${key.replace(/[^\w.-]/g, '_')}.json`);
}

// SAF: kayıt listesini tazeler — kendi kaydını günceller, eskimişleri atar
function upsert(entries, entry, now = Date.now()) {
  const fresh = (entries || []).filter((e) => e && e.sessionId !== entry.sessionId && now - (e.lastSeen || 0) < STALE_MS);
  return [...fresh, { ...entry, lastSeen: now }];
}

// SAF: bu oturum dışındaki canlı kayıtlar
const others = (entries, sessionId, now = Date.now()) => (entries || [])
  .filter((e) => e && e.sessionId !== sessionId && now - (e.lastSeen || 0) < STALE_MS);

// SAF: dakika cinsinden "ne kadar önce"
const agoText = (ms) => {
  const dk = Math.max(0, Math.round(ms / 60000));
  return dk < 1 ? 'az önce' : `${dk} dk önce`;
};

// SAF: oturum açılışında gösterilecek satır(lar). Kayıt yoksa null.
function message(list, now = Date.now()) {
  if (!list || !list.length) return null;
  const parts = list.map((e) => `${(e.sessionId || '?').slice(0, 8)} · dal: ${e.branch || '?'} · ${agoText(now - (e.lastSeen || now))}`);
  return `⚠ Bu projede ${list.length} başka oturum açık: ${parts.join(' · ')}. `
    + 'Kural: standartlar/es-zamanli-calisma-standardi.md — kendi dalında çalış, commit\'e yalnız kendi dosyalarını ekle, '
    + 'ortak dosyaya dokunmadan önce `git log --oneline -5` oku. Aynı klasörde ikinci iş yapılacaksa ayrı worktree aç.';
}

function read(file) {
  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Array.isArray(raw.sessions) ? raw.sessions : [];
  } catch {
    return [];
  }
}

function write(file, sessions) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify({ sessions }, null, 1));
    return true;
  } catch {
    return false; // defter yazılamazsa oturum yine de açılır; koordinasyon bilgisi eksik kalır
  }
}

// Kendini deftere yaz, diğer canlı oturumları döndür. Hata durumunda boş liste (oturum açılışı bozulmaz).
function announce({ dir, root, sessionId, branch, now = Date.now() }) {
  if (!dir || !root || !sessionId) return [];
  const file = registryFile(dir, root);
  const entries = read(file);
  const list = others(entries, sessionId, now);
  write(file, upsert(entries, { sessionId, root, branch }, now));
  return list;
}

// Oturum kapanırken kendi kaydını düşürür (Stop bekçisi çağırır).
function leave({ dir, root, sessionId }) {
  if (!dir || !root || !sessionId) return false;
  const file = registryFile(dir, root);
  return write(file, read(file).filter((e) => e.sessionId !== sessionId));
}

module.exports = { STALE_MS, registryFile, upsert, others, message, read, write, announce, leave };
