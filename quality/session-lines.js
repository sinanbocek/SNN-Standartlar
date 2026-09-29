// OTURUM AÇILIŞI EK SATIRLARI: oturum bekçisinin (hooks/session-start.js) çağırdığı TEK giriş.
//
// NEDEN BÖYLE (2026-09-29): bekçi kodu makineye elle kurulur. Yeni bir açılış satırı için bekçiyi
// değiştirmek her seferinde elle kurulum demekti. Bekçi artık yalnız bu modülü çağırır; yeni
// satırlar buraya eklenir ve canlı kopyadan kendiliğinden akar.
//
// Her satır kendi try/catch'i içindedir: biri çökerse açılış ve diğer satırlar sürer.
'use strict';

// deps: testte sahte ölçüm vermek için ({ summary: () => özet|null, owner: 'hesap' }).
function lines(root, deps = {}) {
  const out = [];
  // Actions kotası (quality/actions-quota.js): 19 Eylül'de sınır aşıldı, kimse görmedi.
  try {
    const q = require('./actions-quota');
    // Başka hesaptaki projede bu hesabın sayısı gösterilmez (2026-09-29, GHS-Panel).
    const owner = deps.owner !== undefined ? deps.owner : (root ? q.repoOwner(root) : '');
    if (!q.ownsQuota(owner)) { out.push(`   ⚠ ${q.foreignLine(owner)}`); return out; }
    const s = deps.summary ? deps.summary() : q.cachedSummary();
    out.push(`   ${s ? q.sessionLine(s) : '⚠ Actions kotası ölçülemedi (gh faturalama okuması: gh auth refresh -h github.com -s user)'}`);
  } catch (e) {
    out.push(`   ⚠ Actions kota satırı çalışmadı: ${e.message}`);
  }
  return out;
}

module.exports = { lines };
