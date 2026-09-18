// Kütük → GitHub Issue senkron planı. SAF fonksiyon: GitHub'a dokunmaz, yalnızca yapılacakları listeler.
// Yön tek: Markdown kaynak, issue ayna. Issue üzerindeki düzenleme kütüğe geri yazılmaz.
'use strict';

const LABEL_BASE = 'teknik-borç';
const PRIORITY_LABELS = { P1: 'P1-Acil', P2: 'P2-Planlı', P3: 'P3-Fırsatta' };
const LABELS = [
  { name: LABEL_BASE, color: '6f42c1', description: 'Teknik borç kütüğünden aynalanan kayıt' },
  { name: PRIORITY_LABELS.P1, color: 'd73a4a', description: 'Acil: veri/para/güvenlik/sessiz hata' },
  { name: PRIORITY_LABELS.P2, color: 'fbca04', description: 'Planlı: ertelenirse arıza çıkar' },
  { name: PRIORITY_LABELS.P3, color: '0e8a16', description: 'Fırsatta: düzen ve temizlik' },
];
// Public depoda issue açılmayacak kayıtları yakalar (bilerek geniş tutuldu: yanlış pozitif zararsız).
const SENSITIVE = /güvenlik|guvenlik|\bRLS\b|token|anahtar|parola|şifre|sifre|secret|credential|yetki|KVKK|VKN|TCKN|sızıntı|sizinti/i;

// Hassas kayıtta issue başlığı açığı anlatmaz (kullanıcı kararı a, 2026-09-15); ayrıntı yalnız kütükte kalır.
const SENSITIVE_DEFAULT_TITLE = 'Ayrıntısı kütükte (hassas kayıt)';
const issueTitle = (d) => `[${d.id}] ${d.hassas ? (d.publicTitle || SENSITIVE_DEFAULT_TITLE) : d.title}`;
const idFromTitle = (title) => (title.match(/^\[(TB-\d+)\]/) || [])[1] || null;

function issueBody(d, ctx) {
  const link = `${ctx.repoUrl}/blob/${ctx.branch}/docs/teknik-borc.md`;
  const head = `**Kaynak:** [\`docs/teknik-borc.md\`](${link}) → **${d.id}**\n\n`
    + '> Bu issue kütükten otomatik aynalanır. Düzenlemeyi kütükte yapın; burada yapılan değişiklik kütüğe yansımaz.\n';
  if (d.hassas) return `${head}\n> 🔒 Hassas kayıt: ayrıntılar yalnızca kütükte tutulur.\n`;
  if (ctx.isPublic || !d.sade) return head;
  return `${head}\n### 🟢 Sade Anlatım\n${d.sade}\n`;
}

/**
 * @param {object} input
 * @param {Array} input.debts        parseDebts çıktısı (açık kayıtlar)
 * @param {string[]} input.archiveIds kapanmış kayıt kimlikleri
 * @param {Array} input.issues       GitHub'daki issue'lar: {number, title, state: 'OPEN'|'CLOSED', labels: string[]}
 * @param {object} input.ctx         {isPublic, repoUrl, branch, existingLabels: string[]}
 */
function plan({ debts, archiveIds, issues, ctx }) {
  const actions = [];
  const warnings = [];
  const byNumber = new Map(issues.map((i) => [i.number, i]));
  const byId = new Map();
  issues.forEach((i) => { const id = idFromTitle(i.title); if (id) byId.set(id, i); });

  LABELS.filter((l) => !ctx.existingLabels.includes(l.name))
    .forEach((l) => actions.push({ type: 'label', label: l }));

  const openIds = new Set(debts.map((d) => d.id));
  for (const id of archiveIds) {
    if (openIds.has(id)) warnings.push(`${id} hem açık kütükte hem arşivde; arşiv işlemi atlandı`);
  }

  for (const d of debts) {
    if (d.priority === 'P?') {
      warnings.push(`${d.id} önceliksiz; önce Öncelik alanı doldurulmalı (atlandı)`);
      continue;
    }
    if (ctx.isPublic && (d.hassas || SENSITIVE.test(d.text))) {
      warnings.push(`${d.id} hassas içerik barındırıyor ve depo PUBLIC; issue açılmadı`);
      continue;
    }
    const labels = [LABEL_BASE, PRIORITY_LABELS[d.priority]];
    const existing = (d.issue && byNumber.get(d.issue)) || byId.get(d.id);

    if (!existing) {
      if (d.issue) warnings.push(`${d.id} kütükte #${d.issue} diyor ama bu issue bulunamadı; yenisi açılacak`);
      actions.push({ type: 'create', id: d.id, title: issueTitle(d), body: issueBody(d, ctx), labels });
      continue;
    }
    if (d.issue !== existing.number) {
      actions.push({ type: 'writeback', id: d.id, number: existing.number });
    }
    if (existing.state === 'CLOSED') {
      warnings.push(`${d.id} kütükte AÇIK ama #${existing.number} kapalı; issue yeniden açılacak`);
      actions.push({ type: 'reopen', id: d.id, number: existing.number });
    }
    const staleLabels = existing.labels.filter((l) => Object.values(PRIORITY_LABELS).includes(l) && !labels.includes(l));
    const missingLabels = labels.filter((l) => !existing.labels.includes(l));
    if (existing.title !== issueTitle(d) || staleLabels.length || missingLabels.length) {
      actions.push({ type: 'update', id: d.id, number: existing.number, title: issueTitle(d), addLabels: missingLabels, removeLabels: staleLabels });
    }
  }

  for (const id of archiveIds) {
    if (openIds.has(id)) continue;
    const existing = byId.get(id);
    if (existing && existing.state === 'OPEN') {
      actions.push({ type: 'close', id, number: existing.number });
    }
  }

  for (const i of issues) {
    const id = idFromTitle(i.title);
    if (id && i.state === 'OPEN' && !openIds.has(id) && !archiveIds.includes(id)) {
      warnings.push(`#${i.number} (${id}) açık ama kayıt kütükte de arşivde de yok; elle incelenmeli`);
    }
  }

  return { actions, warnings };
}

module.exports = { plan, LABELS, PRIORITY_LABELS, LABEL_BASE, issueTitle };
