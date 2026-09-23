// Uyum ölçeri testleri. Çalıştır: node quality/test/compliance.test.js
'use strict';
const c = require('../compliance');

let fail = 0;
const expect = (name, actual, wanted) => {
  const ok = JSON.stringify(actual) === JSON.stringify(wanted);
  if (!ok) fail += 1;
  console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : `\n    gelen: ${JSON.stringify(actual)}\n    beklenen: ${JSON.stringify(wanted)}`}`);
};

// Tetiklenen (PR'da gerçekten çalışan) bir akış dosyasının metni.
const akis = (cagri) => `on:\n  pull_request:\n    branches: [main]\njobs:\n  x:\n    uses: sinanbocek/SNN-Standartlar/.github/workflows/${cagri}@main`;

// Tam uyumlu bir projenin durumu
const TAM = {
  workflows: ['kod-dili.yml', 'teknik-borc.yml', 'anahtar-tarama.yml'],
  workflowText: [akis('kod-dili.yml'), akis('teknik-borc.yml'), akis('anahtar-tarama.yml')],
  hasLedger: true,
  ledgerText: '## TB-012 · Kod dili geçişi\nP2 · 382 bulgu',
  guideNames: ['AI-RULES.md'],
  guideText: 'Aile standartları: sinanbocek/SNN-Standartlar deposuna bakılır.',
  exemptRaw: null,
  findings: 382, // işi olan ve kaydını açmış bir proje
};
const ids = (state, ex) => c.evaluate(state, ex).gaps.map((g) => g.id);

console.log('— tam uyum');
expect('eksik yok', ids(TAM), []);
expect('ölçüt sayısı', c.CHECKS.length, 7);

console.log('— tek tek eksikler');
expect('turnike yok', ids({ ...TAM, workflowText: [akis('teknik-borc.yml'), akis('anahtar-tarama.yml')] }), ['kod-dili-akisi']);
expect('teknik borç akışı yok', ids({ ...TAM, workflowText: [akis('kod-dili.yml'), akis('anahtar-tarama.yml')] }), ['teknik-borc-akisi']);
expect('anahtar tarama yok', ids({ ...TAM, workflowText: [akis('kod-dili.yml'), akis('teknik-borc.yml')] }), ['anahtar-tarama']);
expect('kütükte kod dili kaydı yok', ids({ ...TAM, ledgerText: '## TB-001 · başka iş' }), ['kod-dili-kaydi']);
expect('rehber yok', ids({ ...TAM, guideNames: [], guideText: '' }), ['rehber-atfi']);
// Genel "standartlar" kelimesi atıf SAYILMAZ: Gunum-Var'da ölçüldü (2026-09-19), oradaki
// CLAUDE.md yalnız "standartlar" diyor ve aile deposuna işaret etmiyor.
expect('genel kelime atıf sayılmaz', ids({ ...TAM, guideText: 'proje standartlarına uyulur' }), ['rehber-atfi']);
expect('CLAUDE.md de sayılır', ids({ ...TAM, guideNames: ['CLAUDE.md'] }), []);
// Depo adi yazmadan "SNN aile standardi" demek de ATIFTIR: Piyasa-Core 2026-09-19 olcumunde
// boyle yaziyordu ve ilk surum ona YANLIS ALARM verdi. Olcut atfi arar, bicimini degil.
expect('depo adı olmadan aile atfı sayılır', ids({ ...TAM, guideText: 'Kod dili: İngilizce (SNN aile standardı).' }), []);
expect('küçük harfli aile atfı sayılır', ids({ ...TAM, guideText: 'aile standardina uyulur' }), []);

console.log('— kapı VARLIĞI değil, ÇALDIĞI ölçülür');
// 2026-09-19: ilk sürüm yalnız dosya adına bakıyordu. SNN-Standartlar'ın kod-dili.yml dosyası
// `on: workflow_call` — başka depolar çağırır, KENDİ deposunda hiçbir şey yapmaz. Ölçer
// "turnike var" diyordu: YANLIŞ GEÇİŞ. Üstelik tam da o boşluk, aynı gün bir Türkçe adın
// main'e girmesine izin vermişti. Ölçüt artık tetiklenmeyen akışı saymaz.
expect('yalnız workflow_call tetiklenmiş sayılmaz', c.isTriggered('on:\n  workflow_call:\n    inputs:\njobs:\n  x:'), false);
expect('pull_request tetikler', c.isTriggered('on:\n  pull_request:\n    branches: [main]\njobs:'), true);
expect('push tetikler', c.isTriggered('on:\n  push:\njobs:'), true);
// `jobs:` içindeki metin tetikleyici sayılmaz: sadece başlık bölümüne bakılır.
expect('jobs içindeki söz tetikleyici değil', c.isTriggered('on:\n  workflow_call:\njobs:\n  x:\n    if: pull_request:'), false);

const CAGRILAMAZ = { ...TAM, workflowText: [] };
expect('tetiklenmeyen turnike eksik sayılır', ids(CAGRILAMAZ).includes('kod-dili-akisi'), true);
// Turnike başka bir akış dosyasının içinden de çalışabilir (bu depoda test.yml böyle yapar).
expect('taramayı çağıran başka akış sayılır', ids({ ...TAM, workflowText: ['on:\n  pull_request:\njobs:\n  x:\n    run: node quality/code-language-scan.js --diff'] }).includes('kod-dili-akisi'), false);

console.log('— temiz projeden kayıt istenmez');
// 2026-09-19: ilk surum her projeden "kod dili kaydi" istiyordu. Naturapan'in 0 bulgusu
// var; olmayan bir is icin kayit istemek yanlis alarmdir ve kapinin guvenilirligini oldurur.
// Tarama yapilmamasinin gerekcesi "pahali" varsayimiydi; olcum curuttu (en kotu 445 ms).
const TEMIZ = { ...TAM, ledgerText: '## TB-001 · başka iş', findings: 0 };
expect('0 bulgulu projeden kayıt istenmez', ids(TEMIZ).includes('kod-dili-kaydi'), false);
expect('bulgu varsa kayıt istenir', ids({ ...TEMIZ, findings: 382 }), ['kod-dili-kaydi']);
// Tarama calismazsa (null) BILMIYORUZ demektir; bilmiyorken dirdir edilmez.
expect('tarama çalışmazsa istenmez', ids({ ...TEMIZ, findings: null }).includes('kod-dili-kaydi'), false);
// Kayit varsa bulgu sayisi ne olursa olsun eksik degildir.
expect('kayıt varsa eksik yok', ids({ ...TAM, findings: 9999 }).includes('kod-dili-kaydi'), false);
// Eksik mesaji bulgu sayisini gosterir: "kac is var" sorusu acilista cevaplanir.
const gapDetail = c.evaluate({ ...TEMIZ, findings: 1841 }).gaps.find((g) => g.id === 'kod-dili-kaydi');
expect('mesajda bulgu sayısı var', gapDetail.detail.includes('1.841'), true);

console.log('— aile dışı depo hiç ölçülmez');
// 2026-09-19: yerelde duran her klasor aile projesi degil. ihale-mcp ucuncu tarafin
// (saidsurucu) deposu; olcer ona sonsuza kadar "6 eksik" diyordu. Bosuna dirdir,
// kapinin guvenilirligini oldurur. Yalniz ACIKCA dislananlar atlanir.
expect('https adresinden slug', c.repoSlug('https://github.com/saidsurucu/ihale-mcp.git'), 'saidsurucu/ihale-mcp');
expect('ssh adresinden slug', c.repoSlug('git@github.com:sinanbocek/trade-kasa.git'), 'sinanbocek/trade-kasa');
expect('adres yoksa boş', c.repoSlug(''), '');
const EMPTY = { ...TAM, workflowText: [], hasLedger: false, ledgerText: '', guideNames: [], guideText: '' };
expect('dışlanan depo ölçülmez', c.evaluate({ ...EMPTY, repo: 'x/y' }, undefined, ['x/y']).gaps.length, 0);
expect('dışlandığı belirtilir', c.evaluate({ ...EMPTY, repo: 'x/y' }, undefined, ['x/y']).excluded, true);
// Tanimadigimiz yeni bir depo YINE olculur: dislama sessizlestirme araci degildir.
expect('bilinmeyen depo yine ölçülür', c.evaluate({ ...EMPTY, repo: 'yeni/depo' }, undefined, ['x/y']).gaps.length > 0, true);
expect('gerçek listede ihale-mcp dışlanmış', c.excludedRepos().includes('saidsurucu/ihale-mcp'), true);

console.log('— kütük yoksa iki ölçüt birden düşer');
expect('kütük + kayıt', ids({ ...TAM, hasLedger: false, ledgerText: '' }), ['kod-dili-kaydi', 'kutuk']);

console.log('— kütük başlığındaki standart adresi');
// 2026-09-23: 10 tüketici kütüğünün 10'u da başlığın 9. satırında hiçbir betiğin kurmadığı
// `~/.claude/standartlar/…` adresini taşıyordu (kurulum şablonu öyle yazıyordu, #92'de düzeltildi).
// Aşağıdaki satır Gunum-Var kütüğünden birebir alındı.
const ESKI = '# Teknik Borç Kütüğü\n\n> **Standart:** `~/.claude/standartlar/teknik-borc-standardi.md` · **Son güncelleme:** 2026-09-16 · **Açık:** 45 (P1: 10 · P2: 15 · P3: 20)\n\n---\n\n## TB-012 · Kod dili geçişi';
const YENI = ESKI.replace('~/.claude/standartlar/', '~/.claude/standartlar-canli/standartlar/');
expect('kurulmayan standart adresi yakalanır', ids({ ...TAM, ledgerText: ESKI }), ['kutuk-adresi']);
expect('canlı kopya adresi geçer', ids({ ...TAM, ledgerText: YENI }), []);
expect('adres hiç yoksa eksik sayılmaz', ids({ ...TAM, ledgerText: '# Teknik Borç Kütüğü\n\n---\n\n## TB-012 · Kod dili geçişi' }), []);
expect('eksik adres adıyla bildirilir', String((c.evaluate({ ...TAM, ledgerText: ESKI }).gaps[0] || {}).detail).includes('~/.claude/standartlar/teknik-borc-standardi.md'), true);
// Kayıt gövdesi tarihçe anlatabilir ("eski betik ~/.claude/hooks/x.js silindi"); yalnız başlık ölçülür.
expect('kayıt gövdesindeki eski adres sayılmaz', c.brokenLedgerRefs(`${YENI}\n- eski betik \`~/.claude/hooks/yok-artik.js\` silindi`), []);
expect('başlıktaki eksik dosya yakalanır', c.brokenLedgerRefs('> Bkz. `~/.claude/hooks/yok-artik.js`\n\n---'), ['~/.claude/hooks/yok-artik.js']);
expect('kütük yoksa adres ölçütü düşmez', ids({ ...TAM, hasLedger: false, ledgerText: '' }).includes('kutuk-adresi'), false);

console.log('— muafiyet');
const muaf = JSON.stringify({ exempt: [{ check: 'kod-dili-akisi', reason: 'dışarıdan tüketilen MCP sunucusu' }] });
expect('gerekçeli muafiyet düşer', ids({ ...TAM, workflowText: [] }, c.exemptions(muaf)).includes('kod-dili-akisi'), false);
// Gerekçesiz muafiyet SAYILMAZ — istisna kurallarının aynısı. Sabotaj testi.
const gerekcesiz = JSON.stringify({ exempt: [{ check: 'anahtar-tarama' }] });
const ex2 = c.exemptions(gerekcesiz);
expect('gerekçesiz muafiyet sayılmaz', ex2.ids.size, 0);
expect('gerekçesizlik uyarı üretir', ex2.warnings.length, 1);
expect('bozuk JSON iş durdurmaz', c.exemptions('{bozuk').ids.size, 0);
expect('bozuk JSON uyarır', c.exemptions('{bozuk').warnings.length, 1);
expect('dosya yoksa sessiz', c.exemptions(null).warnings.length, 0);

console.log('— ANA DALDAN okur, çalışma klasöründen değil');
// 2026-09-19: ilk sürüm çalışma klasörünü okuyordu. Naturapan'a "sır tarama kapısı yok",
// Yönetici-Özeti'ne "kütüğü senkronlanmıyor" dedi — İKİSİ DE YANLIŞTI; dosyalar ana dalda
// vardı, yerel kopyalar 3 ve 7 commit gerideydi. Üç proje de kendi çalışma dalındaydı.
{
  const path = require('path');
  const fs2 = require('fs');
  const os2 = require('os');
  const cp = require('child_process');
  const repo = fs2.mkdtempSync(path.join(os2.tmpdir(), 'snn-uyum-'));
  const git = (...a) => cp.execFileSync('git', ['-C', repo, ...a], { stdio: ['ignore', 'pipe', 'ignore'] });
  git('init', '-q', '-b', 'main');
  fs2.mkdirSync(path.join(repo, '.github', 'workflows'), { recursive: true });
  fs2.writeFileSync(path.join(repo, '.github', 'workflows', 'anahtar-tarama.yml'), 'on:\n  pull_request:\njobs:\n  x:\n    uses: a/b/.github/workflows/anahtar-tarama.yml@main');
  fs2.writeFileSync(path.join(repo, 'AI-RULES.md'), 'Aile standartları: sinanbocek/SNN-Standartlar');
  git('add', '.github/workflows/anahtar-tarama.yml', 'AI-RULES.md');
  git('-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '-m', 'ilk');
  // "origin/main" taklidi: uzak dal olarak aynı commit'i işaretle
  git('update-ref', 'refs/remotes/origin/main', 'HEAD');

  expect('uzak ana dal bulunur', c.hasMain(repo), true);
  // KÖK için `origin/main:.` GEÇERSİZDİR; ilk sürüm onu kullandı ve rehber listesi hep
  // boş döndü → üç projeye yanlış "rehber yok" dedi.
  expect('kök listesi boş dönmez', c.listAt(repo, '.', true).includes('AI-RULES.md'), true);
  expect('alt klasör listesi okunur', c.listAt(repo, '.github/workflows', true), ['anahtar-tarama.yml']);
  expect('ana daldaki dosya okunur', c.readAt(repo, 'AI-RULES.md', true).includes('SNN-Standartlar'), true);
  expect('olmayan dosya boş döner', c.readAt(repo, 'yok.md', true), '');

  // Çalışma klasöründeki dosya ana dalda YOKSA sayılmaz: kapı main'i ölçer.
  fs2.writeFileSync(path.join(repo, '.github', 'workflows', 'kod-dili.yml'), 'on:\n  pull_request:\njobs:\n  x:\n    uses: a/b/.github/workflows/kod-dili.yml@main');
  expect('commit edilmemiş akış ana dalda görünmez', c.listAt(repo, '.github/workflows', true), ['anahtar-tarama.yml']);
  expect('çalışma klasöründe ise görünür', c.listAt(repo, '.github/workflows', false).sort(), ['anahtar-tarama.yml', 'kod-dili.yml']);

  const state = c.readState(repo);
  expect('durum ana daldan okundu', state.fromMain, true);
  expect('ana daldaki akış sayılır', state.workflows, ['anahtar-tarama.yml']);
  expect('anahtar taraması eksik değil', ids(state).includes('anahtar-tarama'), false);
  expect('rehber atfı eksik değil', ids(state).includes('rehber-atfi'), false);

  fs2.rmSync(repo, { recursive: true, force: true });
}

console.log('— özet metni');
expect('eksik yoksa satır yok', c.summary({ gaps: [], warnings: [] }), []);
const uc = c.evaluate({ ...TAM, workflowText: [], hasLedger: false, ledgerText: '', guideNames: [], guideText: '' });
const s = c.summary(uc);
expect('başlıkta sayı var', s[0].includes(`${uc.gaps.length} eksik`), true);
// Açılış özeti rapor değildir: uzun liste kırpılır, ama ilk düzeltme komutu hep görünür.
expect('liste kırpılır', s.some((l) => l.includes('tane daha')), true);
expect('düzeltme yolu gösterilir', s[s.length - 1].includes('→'), true);
expect('satır sayısı sınırlı', s.length <= c.MAX_SHOWN + 3, true);

console.log(fail ? `\n${fail} test başarısız` : '\nTüm testler geçti');
process.exit(fail ? 1 : 0);
