# Arc bileşen sınıflandırması (ek)

`docs/arayuz-standardi-plani.md` belgesinin ekidir. Arc'ın ücretsiz kısmındaki her bileşen ve blok burada tek satırdır.

**Ölçüm:** 2026-10-14, `kuratlielia/arc-library` ana dal, commit `bfdf7e8`. Kaynak kod sığ kopyayla indirildi, her klasörün `.ts`/`.tsx` dosyaları tarandı.

**Sınıflar:**

| Sınıf | Anlamı | Sayı |
|---|---|---|
| **A** | Yasak biçim çağrısı yok, B sınıfı parça da getirmiyor. Türkçe metinle olduğu gibi alınabilir. | 55 bileşen, 9 blok |
| **B** | `Intl.*`, `toLocaleString`, `toFixed`, `toUpperCase` ya da `toLowerCase` kullanıyor. Aile kuralına (`giris-alanlari-standardi.md`) göre ABACUS'a bağlanmadan alınamaz. | 55 bileşen, 7 blok |
| **B (bağımlılık)** | Kendi dosyaları temiz, ama kurulunca B sınıfı bir parçayı yanında getiriyor. B gibi davranılır. | 2 bileşen, 2 blok |

> **Düzeltme (2026-10-14, SNN-UI aşama 1):** İlk sınıflandırma yalnız parçanın kendi dosyalarına bakmıştı. Arc'ın kurulum kaydı (`registry.json`, `registryDependencies`) parçanın yanında başka parçalar da getirir. SNN-UI oturumu `metric-card`'ın `animated-counter`'ı (B) getirdiğini buldu. Bütün A parçaları bağımlılık zinciriyle yeniden ölçüldü; dört parça B (bağımlılık) oldu: `metric-card`, `notification-center` (→ `avatar`), `newsletter-signup` (→ `animated-counter`), `page-header` (→ `animated-counter`, `avatar`, `avatar-group`).

**Sütunlar:**

- **Yasak çağrı:** dosyalarda kaç kez geçtiği ve hangileri.
- **İngilizce metin:** `aria-label`, `placeholder`, `title`, `label` gibi alanlarda yazılı İngilizce metin sayısı. Kaba bir taramadır, **alt sınırdır**: ekranda okunan ama bu kalıplara uymayan metinler sayılmadı. A sınıfı bileşende de İngilizce metin olabilir; her bileşen alınırken metinleri elle gözden geçirilir.
- **Ek bağımlılık:** `motion` dışındaki npm paketleri (`radix:` = Radix UI temel parçası).

| Tür | Ad | Sınıf | Yasak çağrı | İngilizce metin | Ek bağımlılık |
|---|---|---|---|---|---|
| bileşen | accordion | A | — | — | radix:accordion lucide-react |
| bileşen | action-button | A | — | — | lucide-react |
| bileşen | activity-heatmap | B | 6 (Intl) | 1 | — |
| bileşen | alert | A | — | — | lucide-react |
| bileşen | animated-counter | B | 2 (Intl,toFixed) | — | — |
| bileşen | announcement-bar | A | — | 4 | lucide-react |
| bileşen | avatar | B | 1 (toUpperCase) | — | — |
| bileşen | avatar-group | B | 1 (toLowerCase) | 1 | — |
| bileşen | badge | A | — | — | — |
| bileşen | bar-chart | B | 5 (Intl,toFixed,toLowerCase) | — | — |
| bileşen | billing-toggle | B | 1 (toFixed) | 1 | — |
| bileşen | bottom-sheet | A | — | — | radix:dialog lucide-react |
| bileşen | breadcrumb | A | — | 1 | lucide-react |
| bileşen | brush-chart | B | 11 (Intl,toFixed) | 2 | — |
| bileşen | button | A | — | — | — |
| bileşen | button-group | A | — | — | radix:dropdown-menu lucide-react |
| bileşen | calendar | B | 2 (Intl) | 2 | lucide-react |
| bileşen | card | A | — | 1 | radix:dialog lucide-react |
| bileşen | card-stack | B | 3 (toLowerCase) | 1 | lucide-react |
| bileşen | carousel | A | — | 4 | lucide-react |
| bileşen | chat-thread | B | 5 (Intl,toFixed,toUpperCase,toLocaleString) | 3 | lucide-react |
| bileşen | checkbox | A | — | — | radix:checkbox |
| bileşen | chip-group | B | 1 (toFixed) | — | — |
| bileşen | code-block | B | 1 (toLowerCase) | 2 | lucide-react |
| bileşen | color-picker | B | 7 (toUpperCase,toLowerCase,toFixed) | 7 | lucide-react |
| bileşen | combobox | A | — | 2 | lucide-react |
| bileşen | command-palette | B | 3 (toLowerCase) | 5 | lucide-react |
| bileşen | comment-thread | B | 4 (toUpperCase,toLowerCase) | 1 | lucide-react |
| bileşen | confirm-morph | B | 1 (toLowerCase) | — | lucide-react |
| bileşen | context-menu | A | — | 1 | lucide-react |
| bileşen | cookie-consent | A | — | — | radix:switch lucide-react |
| bileşen | copy-button | A | — | 1 | lucide-react |
| bileşen | countdown | B | 2 (Intl,toFixed) | 1 | — |
| bileşen | date-picker | B | 2 (Intl) | 1 | lucide-react |
| bileşen | date-range-picker | B | 9 (Intl) | 5 | lucide-react |
| bileşen | dialog | A | — | 1 | radix:dialog lucide-react |
| bileşen | donut-chart | B | 3 (Intl,toLowerCase) | — | — |
| bileşen | drawer | A | — | 1 | radix:dialog lucide-react |
| bileşen | dropdown-menu | A | — | — | radix:dropdown-menu lucide-react |
| bileşen | elastic-slider | B | 3 (toLocaleString,toFixed) | — | — |
| bileşen | empty-state | A | — | — | lucide-react |
| bileşen | expandable-card | A | — | — | lucide-react |
| bileşen | expanding-button-group | A | — | — | — |
| bileşen | expanding-search | A | — | 1 | lucide-react |
| bileşen | file-dropzone | B | 4 (toFixed,toLowerCase) | 4 | lucide-react |
| bileşen | file-upload | B | 3 (toFixed,toLowerCase) | 2 | lucide-react |
| bileşen | filter-toolbar | B | 3 (toLowerCase) | 3 | lucide-react |
| bileşen | floating-button-group | A | — | — | radix:tooltip |
| bileşen | gauge | B | 2 (toFixed) | — | — |
| bileşen | hold-to-confirm | B | 2 (toFixed,toLocaleString) | — | lucide-react |
| bileşen | hover-card | B | 1 (toUpperCase) | — | radix:popover |
| bileşen | icon-morph | A | — | — | — |
| bileşen | image-compare | B | 7 (toFixed) | 1 | lucide-react |
| bileşen | in-view-title | A | — | — | — |
| bileşen | inline-edit | B | 2 (toLowerCase) | 1 | lucide-react |
| bileşen | input | A | — | — | — |
| bileşen | json-viewer | B | 6 (toLowerCase) | 11 | lucide-react |
| bileşen | line-chart | B | 7 (Intl,toFixed,toLowerCase) | — | — |
| bileşen | mention-input | B | 6 (toLowerCase,toUpperCase) | — | lucide-react |
| bileşen | metric-card | B (bağımlılık: animated-counter) | — | — | — |
| bileşen | money-input | B | 11 (Intl,toUpperCase,toLowerCase) | 2 | lucide-react |
| bileşen | morph-select | B | 7 (toLowerCase) | 2 | lucide-react |
| bileşen | multi-select | A | — | 2 | lucide-react |
| bileşen | notification-center | B (bağımlılık: avatar) | — | 3 | radix:popover lucide-react |
| bileşen | number-field | B | 6 (Intl,toFixed) | — | lucide-react |
| bileşen | otp-input | A | — | — | — |
| bileşen | pagination | A | — | 3 | lucide-react |
| bileşen | password-field | A | — | — | — |
| bileşen | password-strength | A | — | — | — |
| bileşen | phone-input | B | 5 (toUpperCase,toLowerCase) | 5 | lucide-react |
| bileşen | popover | A | — | — | radix:popover |
| bileşen | progress | A | — | — | lucide-react |
| bileşen | radio-cards | A | — | — | — |
| bileşen | radio-group | A | — | — | — |
| bileşen | reactions | A | — | 4 | radix:popover lucide-react |
| bileşen | resizable-panels | B | 1 (toFixed) | — | lucide-react |
| bileşen | rich-text-editor | B | 15 (toLowerCase) | 16 | lucide-react |
| bileşen | ridgeline | B | 14 (Intl,toFixed) | — | — |
| bileşen | scroll-area | A | — | — | — |
| bileşen | search-field | A | — | 1 | lucide-react |
| bileşen | segmented-control | A | — | — | — |
| bileşen | select | A | — | 1 | radix:select lucide-react |
| bileşen | shortcut-recorder | B | 8 (toLowerCase,toUpperCase) | 4 | lucide-react |
| bileşen | signature-pad | B | 3 (toLowerCase,toUpperCase) | 6 | lucide-react |
| bileşen | skeleton | A | — | 1 | — |
| bileşen | slider | B | 5 (toFixed,toLocaleString) | — | — |
| bileşen | slope-chart | B | 1 (Intl) | — | — |
| bileşen | slot-text | B | 4 (toUpperCase,toFixed,toLocaleString) | — | — |
| bileşen | sortable-data-table | B | 1 (Intl) | 1 | lucide-react |
| bileşen | sparkline | B | 3 (Intl,toFixed) | — | — |
| bileşen | split-button | A | — | — | radix:dropdown-menu lucide-react |
| bileşen | stepper | A | — | 1 | — |
| bileşen | streamgraph | B | 7 (Intl,toFixed) | — | — |
| bileşen | swipe-actions | A | — | — | radix:dropdown-menu lucide-react |
| bileşen | switch | A | — | — | radix:switch |
| bileşen | tabs | A | — | 2 | radix:tabs lucide-react |
| bileşen | tag-input | B | 2 (toLowerCase) | 1 | lucide-react |
| bileşen | text-morph | A | — | — | — |
| bileşen | text-reveal | A | — | — | — |
| bileşen | text-shimmer | B | 3 (toFixed) | — | — |
| bileşen | textarea | A | — | — | — |
| bileşen | theme-switch | A | — | — | lucide-react |
| bileşen | time-picker | A | — | 1 | lucide-react |
| bileşen | timeline | B | 4 (Intl) | — | lucide-react |
| bileşen | toast | A | — | 1 | lucide-react |
| bileşen | toast-stack | A | — | 2 | lucide-react |
| bileşen | tooltip | A | — | — | radix:tooltip |
| bileşen | tree-view | B | 1 (toLowerCase) | 1 | lucide-react |
| bileşen | treemap | B | 7 (Intl,toFixed) | — | — |
| bileşen | usage-meter | B | 4 (Intl,toFixed) | — | lucide-react |
| bileşen | user-menu | B | 4 (toUpperCase,toLowerCase) | 3 | lucide-react |
| bileşen | waffle-chart | B | 6 (Intl,toFixed) | — | — |
| blok | blog-grid | B | 1 (Intl) | 5 | lucide-react |
| blok | changelog-feed | A | — | 8 | lucide-react |
| blok | comparison-table | A | — | 1 | lucide-react |
| blok | contact-section | B | 3 (toLowerCase,Intl) | 13 | lucide-react |
| blok | cta-section | A | — | 2 | lucide-react |
| blok | empty-states | A | — | 2 | — |
| blok | faq-section | B | 1 (toLowerCase) | 4 | lucide-react |
| blok | hero-section | B | 3 (Intl,toFixed,toLocaleString) | 13 | lucide-react |
| blok | login-centered | B | 3 (toFixed,toLowerCase) | 4 | lucide-react |
| blok | logo-marquee | A | — | 2 | lucide-react |
| blok | newsletter-signup | B (bağımlılık: animated-counter) | — | 1 | radix:switch lucide-react |
| blok | page-header | B (bağımlılık: animated-counter, avatar, avatar-group) | — | 9 | radix:dropdown-menu radix:tabs lucide-react |
| blok | plan-comparison | A | — | 3 | radix:switch lucide-react |
| blok | sign-in | B | 4 (toLowerCase,toUpperCase) | 6 | lucide-react |
| blok | signup-form | A | — | 8 | radix:checkbox |
| blok | site-footer | A | — | 5 | lucide-react |
| blok | site-header | A | — | 2 | lucide-react |
| blok | stats-band | B | 4 (Intl,toFixed) | 2 | — |
