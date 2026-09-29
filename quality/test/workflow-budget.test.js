// Akış bütçesi kapısı testleri. Çalıştır: node quality/test/workflow-budget.test.js
'use strict';
const b = require('../workflow-budget');

let fail = 0;
const expect = (name, actual, wanted) => {
  const ok = JSON.stringify(actual) === JSON.stringify(wanted);
  if (!ok) fail += 1;
  console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : `\n    gelen: ${JSON.stringify(actual)}\n    beklenen: ${JSON.stringify(wanted)}`}`);
};

// VAKA (2026-09-29): Gunum-Var'ın ana daldaki ci.yml tetiği ve adımları (kısaltılmış, birebir).
// Eylülde bu akış 705 dk yaktı; 324 dk'sı main'e gönderimdeydi.
const GUNUM_CI = `name: CI - Code Quality

on:
  push:
    branches: [main, dev]
    paths-ignore:
      - 'docs/**'
  pull_request:
    branches: [main, dev]

# Kota koruması (2026-09-20): aynı dala arka arkaya gönderim yapılınca biten
concurrency:
  group: ci-\${{ github.workflow }}-\${{ github.ref }}
  cancel-in-progress: \${{ github.ref != 'refs/heads/main' }}

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install Dependencies
        run: npm ci
      - name: Unit Tests (Jest)
        run: npm test
`;

// VAKA (2026-09-29): Gunum-Var'ın ana daldaki anahtar-tarama.yml (birebir). Eylülde 187 dk;
// her iş ~15 sn, her biri 1 dk faturalandı.
const GUNUM_SECRET_SCAN = `name: anahtar-tarama

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  tara:
    uses: sinanbocek/SNN-Standartlar/.github/workflows/anahtar-tarama.yml@main
`;

// VAKA: teknik-borc.yml main'e gönderimde koşar ama AĞIR değildir (kütük senkronu).
const DEBT_SYNC = `on:
  push:
    branches: [main]
    paths: ['docs/teknik-borc.md']
  schedule:
    - cron: "17 4 * * 1"
jobs:
  sync:
    uses: sinanbocek/SNN-Standartlar/.github/workflows/debt.yml@main
`;

const read = (p) => require('fs').readFileSync(require('path').join(__dirname, '..', '..', p), 'utf8');

console.log('— vaka: Gunum-Var (eylül 916 dk)');
const vaka = b.analyzeWorkflows([
  { name: 'ci.yml', text: GUNUM_CI },
  { name: 'anahtar-tarama.yml', text: GUNUM_SECRET_SCAN },
  { name: 'teknik-borc.yml', text: DEBT_SYNC },
]);
expect('main gönderiminde CI koşması yakalanır', vaka.mainRuns, ['ci.yml']);
expect('ayrı akıştaki anahtar taraması yakalanır', vaka.separateScans, ['anahtar-tarama.yml']);
expect('koşullu iptal ayarı iptal sayılır', vaka.noCancel, []);

console.log('— şablonlar kapıdan geçer');
const templates = b.analyzeWorkflows([
  { name: 'ci.yml', text: read('ornek/ci-duzeni.yml') },
  { name: 'aile-kontrol.yml', text: read('ornek/aile-kontrol.yml') },
  { name: 'teknik-borc.yml', text: read('ornek/teknik-borc.yml') },
]);
expect('ci-duzeni + aile-kontrol + teknik-borc temiz', templates, { mainRuns: [], separateScans: [], noCancel: [] });
expect('eski anahtar-tarama şablonu ayrı akış sayılır',
  b.analyzeWorkflows([{ name: 'a.yml', text: read('ornek/anahtar-tarama.yml') }]).separateScans, ['a.yml']);

console.log('— sınırlar');
expect('ağır olmayan main akışı serbest', b.analyzeWorkflows([{ name: 'borc.yml', text: DEBT_SYNC }]).mainRuns, []);
expect('yalnız etiketle tetiklenen sürüm akışı serbest',
  b.analyzeWorkflows([{ name: 's.yml', text: 'on:\n  push:\n    tags: [\'v*\']\njobs:\n  x:\n    steps:\n      - run: npm ci\n' }]).mainRuns, []);
expect('tek satır "on: [push, pull_request]" yakalanır',
  b.analyzeWorkflows([{ name: 'c.yml', text: 'on: [push, pull_request]\njobs:\n  x:\n    steps:\n      - run: npm test\n' }]).mainRuns, ['c.yml']);
expect('iptalsiz ağır PR akışı yakalanır',
  b.analyzeWorkflows([{ name: 'c.yml', text: 'on:\n  pull_request:\njobs:\n  x:\n    steps:\n      - run: npm ci\n' }]).noCancel, ['c.yml']);
expect('yorumdaki npm test ağır iş sayılmaz',
  b.isHeavy('on:\n  push:\n# burada npm test kosmaz\njobs:\n  x:\n    steps:\n      - run: echo tamam\n'), false);
expect('yalnız workflow_call olan köprü ayrı akış sayılmaz',
  b.analyzeWorkflows([{ name: 'k.yml', text: 'on:\n  workflow_call:\njobs:\n  x:\n    uses: sinanbocek/SNN-Standartlar/.github/workflows/secret-scan.yml@main\n' }]).separateScans, []);

console.log('— dependabot');
expect('dosya yok', b.dependabotState(''), 'yok');
// VAKA (2026-09-29): Proje-Nakit ve İhale haftalık; Proje-Nakit'te eylülde 13 güncelleme PR'ı.
expect('haftalık yakalanır', b.dependabotState('version: 2\nupdates:\n  - package-ecosystem: npm\n    schedule:\n      interval: weekly\n'), 'haftalik');
expect('güvenlik grubu yok', b.dependabotState('updates:\n  - schedule:\n      interval: monthly\n'), 'grupsuz');
expect('şablon geçer', b.dependabotState(read('ornek/dependabot.yml')), 'ok');

console.log(fail ? `\n✗ ${fail} test başarısız` : '\n✓ tümü geçti');
process.exit(fail ? 1 : 0);
