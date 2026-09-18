// Senkron planı testleri. Çalıştır: node ~/.claude/hooks/test/senkron.test.js
'use strict';
const { plan, LABELS } = require('../lib/sync-plan');
const { parseDebts, parseArchiveIds } = require('../lib/debt');

let fail = 0;
function expect(name, actual, wanted) {
  const a = JSON.stringify(actual);
  const w = JSON.stringify(wanted);
  const ok = a === w;
  if (!ok) fail += 1;
  console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : `\n    gelen:    ${a}\n    beklenen: ${w}`}`);
}

const ALL_LABELS = LABELS.map((l) => l.name);
const ctx = (over = {}) => ({ isPublic: false, repoUrl: 'https://github.com/o/r', branch: 'main', existingLabels: ALL_LABELS, ...over });
const debt = (id, priority, extra = {}) => ({ id, title: `Başlık ${id}`, priority, issue: null, sade: '- **Sorun ne?** x', text: 'metin', ...extra });
const types = (r) => r.actions.map((a) => `${a.type}:${a.id || a.label.name}`);

console.log('— temel akış');
let r = plan({ debts: [debt('TB-004', 'P3')], archiveIds: [], issues: [], ctx: ctx() });
expect('yeni kayıt → issue açılır', types(r), ['create:TB-004']);
expect('başlık biçimi', r.actions[0].title, '[TB-004] Başlık TB-004');
expect('etiketler', r.actions[0].labels, ['teknik-borç', 'P3-Fırsatta']);
expect('private: gövdede sade anlatım var', r.actions[0].body.includes('Sade Anlatım'), true);

r = plan({ debts: [debt('TB-004', 'P3')], archiveIds: [], issues: [], ctx: ctx({ existingLabels: [] }) });
expect('eksik etiketler önce oluşturulur', types(r).slice(0, 4), ['label:teknik-borç', 'label:P1-Acil', 'label:P2-Planlı', 'label:P3-Fırsatta']);

console.log('— tekrar çalıştırma (aynı işi iki kez yapmama)');
const synced = { number: 12, title: '[TB-004] Başlık TB-004', state: 'OPEN', labels: ['teknik-borç', 'P3-Fırsatta'] };
r = plan({ debts: [debt('TB-004', 'P3', { issue: 12 })], archiveIds: [], issues: [synced], ctx: ctx() });
expect('senkron durumda hiçbir işlem yok', types(r), []);

r = plan({ debts: [debt('TB-004', 'P3')], archiveIds: [], issues: [synced], ctx: ctx() });
expect('issue var ama numara kütüğe yazılmamış → yalnızca geri yazım', types(r), ['writeback:TB-004']);

console.log('— değişiklikler');
r = plan({ debts: [debt('TB-004', 'P1', { issue: 12 })], archiveIds: [], issues: [synced], ctx: ctx() });
expect('öncelik değişti → etiket güncellenir', r.actions.map((a) => [a.type, a.addLabels, a.removeLabels]), [['update', ['P1-Acil'], ['P3-Fırsatta']]]);

r = plan({ debts: [debt('TB-004', 'P3', { issue: 12, title: 'Yeni ad' })], archiveIds: [], issues: [synced], ctx: ctx() });
expect('başlık değişti → güncellenir', r.actions.map((a) => a.title), ['[TB-004] Yeni ad']);

r = plan({ debts: [], archiveIds: ['TB-004'], issues: [synced], ctx: ctx() });
expect('arşive taşındı → issue kapanır', types(r), ['close:TB-004']);

r = plan({ debts: [], archiveIds: ['TB-004'], issues: [{ ...synced, state: 'CLOSED' }], ctx: ctx() });
expect('arşivde + zaten kapalı → işlem yok', types(r), []);

r = plan({ debts: [debt('TB-004', 'P3', { issue: 12 })], archiveIds: [], issues: [{ ...synced, state: 'CLOSED' }], ctx: ctx() });
expect('kütükte açık ama issue kapalı → yeniden açılır + uyarı', [types(r), r.warnings.length], [['reopen:TB-004'], 1]);

console.log('— güvenlik ve korumalar');
r = plan({ debts: [debt('TB-087', 'P1', { text: 'RLS rol kısıtları etkisiz' })], archiveIds: [], issues: [], ctx: ctx({ isPublic: true }) });
expect('PUBLIC + hassas → issue AÇILMAZ', [types(r), r.warnings.length], [[], 1]);

r = plan({ debts: [debt('TB-010', 'P3')], archiveIds: [], issues: [], ctx: ctx({ isPublic: true }) });
expect('PUBLIC + zararsız → açılır ama gövdede sade anlatım yok', [types(r), r.actions[0].body.includes('Sade Anlatım')], [['create:TB-010'], false]);

r = plan({ debts: [debt('TB-020', 'P?')], archiveIds: [], issues: [], ctx: ctx() });
expect('önceliksiz kayıt atlanır', [types(r), r.warnings.length], [[], 1]);

r = plan({ debts: [debt('TB-004', 'P3')], archiveIds: ['TB-004'], issues: [synced], ctx: ctx() });
expect('hem açık hem arşivde → kapatılmaz, uyarı', [types(r).includes('close:TB-004'), r.warnings.some((w) => w.includes('hem açık'))], [false, true]);

r = plan({ debts: [], archiveIds: [], issues: [{ number: 30, title: '[TB-099] Kayıp', state: 'OPEN', labels: [] }], ctx: ctx() });
expect('yetim issue → dokunulmaz, uyarı', [types(r), r.warnings.length], [[], 1]);

r = plan({ debts: [], archiveIds: [], issues: [{ number: 31, title: 'Normal bir hata bildirimi', state: 'OPEN', labels: [] }], ctx: ctx() });
expect('TB dışı issue\'lara hiç dokunulmaz', [types(r), r.warnings.length], [[], 0]);

console.log('— ayrıştırıcı');
const md = [
  '### TB-004 — Birinci', '- **Öncelik:** P3 (Fırsatta)', '- **Issue:** #12', '',
  '#### 🟢 Sade Anlatım', '- **Sorun ne?** Seçim yapılamıyor.', '- **Benzetme:** İki kopya.', '',
  '#### 🔧 Teknik Detay', '- **Açıklama:** kod', '', '---',
].join('\n');
const p = parseDebts(md)[0];
expect('issue numarası okunur', p.issue, 12);
expect('sade anlatım bölümü ayrı okunur (teknik detay karışmaz)', [p.sade.includes('İki kopya'), p.sade.includes('Açıklama')], [true, false]);
expect('arşiv kimlikleri', parseArchiveIds('- **Kapanış:** x — **TB-007: Rapor.**\n- **Kapanış:** y — **TB-001: KVKK.**'), ['TB-007', 'TB-001']);

console.log('— hassas kayıtlar (kullanıcı kararı a, 2026-09-15)');
const hassasMd = [
  '### TB-060 — `WHATSAPP_WEBHOOK_VERIFY_TOKEN` oturum kaydına sızdı', '- **Öncelik:** P2 (Planlı)',
  '- **Hassas:** Evet', '- **Genel Başlık:** Güvenlik: bir bağlantı parolasının yenilenmesi', '',
  '#### 🟢 Sade Anlatım', '- **Sorun ne?** WhatsApp parolası kayda yazıldı.', '---',
  '### TB-002 — prefer-const', '- **Öncelik:** P3 (Fırsatta)',
].join('\n');
const [hassasKayit, normalKayit] = parseDebts(hassasMd);
expect('Hassas alanı okunur', [hassasKayit.hassas, normalKayit.hassas], [true, false]);
expect('Genel Başlık okunur', hassasKayit.publicTitle, 'Güvenlik: bir bağlantı parolasının yenilenmesi');
r = plan({ debts: [hassasKayit], archiveIds: [], issues: [], ctx: ctx() });
expect('private + hassas → issue başlığı genel başlık', r.actions[0].title, '[TB-060] Güvenlik: bir bağlantı parolasının yenilenmesi');
expect('private + hassas → gövdede sade anlatım YOK', r.actions[0].body.includes('WhatsApp'), false);
expect('private + hassas → gövdede kütük linki var', r.actions[0].body.includes('docs/teknik-borc.md'), true);
r = plan({ debts: [{ ...hassasKayit, publicTitle: null }], archiveIds: [], issues: [], ctx: ctx() });
expect('hassas ama genel başlık yok → güvenli varsayılan başlık', r.actions[0].title, '[TB-060] Ayrıntısı kütükte (hassas kayıt)');
r = plan({ debts: [hassasKayit], archiveIds: [], issues: [], ctx: ctx({ isPublic: true }) });
expect('PUBLIC + hassas işaretli → hiç açılmaz', types(r), []);
r = plan({ debts: [normalKayit], archiveIds: [], issues: [], ctx: ctx() });
expect('hassas olmayan kayıt → kütük başlığı aynen', r.actions[0].title, '[TB-002] prefer-const');

console.log('— arşiv: eski GHS biçimleri (2026-09-15 ölçümü)');
const eskiArsiv = [
  '- **Kapanis:** 2026-09-14 — **TB-082: Plaka isleme.**',
  '- **Kapanis:** 2026-08-24 — **TB-017 Ondalik toplama hatasi.** Kullaniciya gorunen',
  '- **Kapanis:** 2026-08-23 — **TB-047 + TB-049: Yetki iki ayri alanda.**',
  '- **Kapanis:** v1.3.26 — TB-016 Tarih araligi UTC hatasi — toLocalISODate eklendi.',
  '- **Kapanış:** 2026-09-15 — **TB-007: Rapor.**',
  '- **Kapanis:** v1.3.27 — **Ekranlarin acilisindaki bekleme.** (numarasız)',
  '  Tam kayit: TB-037 ile birlikte okunmali (açıklama satırı, kapanış değil)',
].join('\n');
expect('tüm kapanış biçimleri okunur, açıklamadaki atıf sayılmaz',
  parseArchiveIds(eskiArsiv).sort(), ['TB-007', 'TB-016', 'TB-017', 'TB-047', 'TB-049', 'TB-082']);

console.log('— kütüğe issue numarası geri yazma');
const { setIssueNumber } = require('../lib/debt');
const iki = [
  '# Kütük', '', '---', '',
  '### TB-004 — Birinci', '- **Tespit Tarihi:** x', '- **Öncelik:** P3 (Fırsatta)', '', '#### 🟢 Sade Anlatım', '- a', '', '---', '',
  '### TB-008 — İkinci', '- **Tespit Tarihi:** y', '- **Öncelik:** P2 (Planlı)', '', '#### 🔧 Teknik Detay', '- b', '',
].join('\n');
let w = setIssueNumber(iki, 'TB-008', 21);
w = setIssueNumber(w, 'TB-004', 20);
expect('iki kayda ayrı ayrı yazılır (### başlığın ## sanılması hatası)', parseDebts(w).map((d) => d.issue), [20, 21]);
expect('yalnızca 2 satır eklenir, başka satır değişmez', w.split('\n').length - iki.split('\n').length, 2);
expect('numara Öncelik satırının hemen altında', w.includes('- **Öncelik:** P2 (Planlı)\n- **Issue:** #21'), true);
expect('var olan numara güncellenir, satır çoğalmaz', (setIssueNumber(w, 'TB-004', 22).match(/\*\*Issue:\*\*/g) || []).length, 2);
expect('güncellenen numara doğru', parseDebts(setIssueNumber(w, 'TB-004', 22))[0].issue, 22);
const crlf = setIssueNumber(iki.replace(/\n/g, '\r\n'), 'TB-004', 5);
expect('CRLF dosyada satır sonu biçimi korunur', [crlf.includes('\n- **Issue:**'), crlf.includes('\r\n- **Issue:** #5\r\n')], [true, true]);
let hata = null;
try { setIssueNumber(iki, 'TB-999', 1); } catch (e) { hata = e.message; }
expect('olmayan kayıt → açık hata (sessiz geçmez)', hata, 'TB-999 kütükte bulunamadı');

console.log('— istek hakkı (kota) kararları');
const kota = require('../lib/quota');
expect('GraphQL hak sınırı mesajı tanınır', kota.isRateLimitError('GraphQL: API rate limit exceeded for user ID 196833380.'), true);
expect('ikincil sınır mesajı tanınır', kota.isRateLimitError('You have exceeded a secondary rate limit'), true);
expect('başka hata hak sınırı sayılmaz', kota.isRateLimitError('resource not found, please check the URL'), false);
expect('pay altında → dur', kota.shouldPause(kota.RESERVE - 1), true);
expect('pay üstünde → devam', kota.shouldPause(kota.RESERVE), false);
expect('ölçülemedi → devam (hata olursa mesajdan yakalanır)', kota.shouldPause(null), false);
const pm = kota.pauseMessage({ remaining: 12, resetAt: '2026-09-15T13:52:28Z', done: 27, left: 4 });
expect('durma mesajı yenilenme saatini ve kalanı söyler', [pm.includes('13:52'), pm.includes('27 işlem'), pm.includes('4 işlem sonraki')], [true, true, true]);

console.log(fail ? `\n✗ ${fail} test başarısız` : '\n✓ tümü geçti');
process.exit(fail ? 1 : 0);
