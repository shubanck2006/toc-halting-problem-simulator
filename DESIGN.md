# UI Design System Contract (ElayaDesign `ai-design-skills` + `redesign-skill`)

This document is the single source of truth for the TOC Halting Problem Simulator UI overhaul, implementing [`elayadesign/ai-design-skills`](https://github.com/elayadesign/ai-design-skills) (`landing-page-design`, `figma-designer`) and [`elayadesign/redesign-skill`](https://github.com/elayadesign/redesign-skill) (`redesign-existing-projects`).

---

## 1. Non-Negotiable Visual Rules

1. **Fonts (`B1`)**:
   - **Primary UI typeface**: `'Geist', -apple-system, BlinkMacSystemFont, sans-serif` (weights `400`, `500`, `600`, `700`).
   - **Monospace typeface**: `'Geist Mono', ui-monospace, monospace` (weights `400`, `500`, `600`, `700`) — used **only** for tape symbols, state/transition formulas, binary UTM strings, Instantaneous Descriptions, code blocks, and numeric counters (`font-variant-numeric: tabular-nums`).
   - **Banned fonts**: Never reference `Inter`, `Fira Code`, `Roboto`, `Arial`, `Open Sans`, or `Helvetica`.
   - **No italics anywhere**: `font-style: normal` across the entire interface (including `<em>`, `<i>`, and citations; use `font-weight: 500` or `color: var(--text-primary)` for emphasis). Mathematical variables inside MathJax `$...$` remain handled by MathJax.
   - **No ultra-bold weights**: Never use `800` or `900` (`black` / `extrabold`). Cap all weights at `600` (SemiBold) or `700` (Bold).

2. **Type Scale & Named Text Styles (`B1`)**:
   Every text element must use one of these named classes (mapped strictly to Tailwind's type scale; zero arbitrary sizes like `1.4rem`, `0.88rem`, `0.83rem`, `2.2rem`):
   - `.heading-1`: `60px` / `60px`, weight `600`, tracking `-0.03em`, `text-wrap: balance` (responsive `36px` / `40px` below `640px`)
   - `.heading-2`: `48px` / `48px`, weight `600`, tracking `-0.025em`, `text-wrap: balance` (responsive `30px` / `36px` below `640px`)
   - `.heading-3`: `36px` / `40px`, weight `600`, tracking `-0.02em`, `text-wrap: balance` (responsive `24px` / `32px` below `640px`)
   - `.heading-4`: `30px` / `36px`, weight `600`, tracking `-0.015em`, `text-wrap: balance`
   - `.heading-5`: `24px` / `32px`, weight `600`, tracking `-0.01em`, `text-wrap: balance`
   - `.heading-6`: `20px` / `28px`, weight `600`, `text-wrap: balance`
   - `.title-1`: `20px` / `28px`, weight `500`
   - `.title-2`: `18px` / `28px`, weight `500`
   - `.title-3`: `16px` / `24px`, weight `500`
   - `.title-4`: `14px` / `20px`, weight `500`
   - `.title-5`: `12px` / `16px`, weight `500`
   - `.body-1`: `16px` / `24px`, weight `600`, `text-wrap: pretty`
   - `.body-2`: `16px` / `24px`, weight `500`, `text-wrap: pretty`
   - `.body-3`: `16px` / `24px`, weight `400`, `text-wrap: pretty`
   - `.body-4`: `14px` / `20px`, weight `600`, `text-wrap: pretty`
   - `.body-5`: `14px` / `20px`, weight `500`, `text-wrap: pretty`
   - `.body-6`: `14px` / `20px`, weight `400`, `text-wrap: pretty`
   - `.button-lg`: `18px` / `28px`, weight `600`
   - `.button-md`: `16px` / `24px`, weight `600`
   - `.button-sm`: `14px` / `20px`, weight `600`
   - `.button-xsm`: `12px` / `16px`, weight `600`
   - `.caption-1`: `14px` / `20px`, weight `500`
   - `.caption-2`: `14px` / `20px`, weight `400`
   - `.caption-3`: `12px` / `16px`, weight `600`
   - `.caption-4`: `12px` / `16px`, weight `500`
   - `.caption-5`: `12px` / `16px`, weight `400`

3. **Copy & Editorial Rules (`B1` & `B8`)**:
   - **Sentence case** on all headings, card titles, tabs, and buttons (preserve proper nouns like `Alan Turing`, `Church`, `Cantor`, `Rice`, `Turing Machine`, `UTM`, `PCP`, `OPPOSITE`, `HALT`, `LOOP`).
   - **No hyphens (`-`) inside prose sentences, headings, or UI labels** (rewrite `step-by-step` as `step by step`, `side-by-side` as `side by side`, `self-referential` as `self referential`, `non-terminating` as `nonterminating`, `3-track` as `three track`, `7-tuple` as `seven tuple`, `general-purpose` as `general purpose`). Mathematical minus signs inside `$...$` LaTeX or Python/JSON code snippets are allowed.
   - **Hero `Heading 1`** has no periods, caps at `max-width: 680px` (along with the hero subheading), and breaks lines at intentional thought boundaries.
   - **Paragraph measure**: Body copy blocks cap around `65ch` (`max-width: 65ch` or `680px`).

4. **Two-Layer Color System & Approved Dark Surfaces (`B4` & `figma-designer`)**:
   - **Approved Dark Backgrounds ONLY**:
     - `--surface-canvas`: `#000000` (Core `Grayscale/1000` — page background)
     - `--surface-primary`: `#181818` (Core `Grayscale/870` — primary cards and sections)
     - `--surface-primary-subtle`: `#1F1F1F` (Core `Grayscale/850` — recessed wells: tape housing, logs, code editors, Mermaid canvas)
     - `--surface-secondary`: `#272727` (Core `Grayscale/800` — inputs, selects, inactive buttons, tape cells, hover cards)
     - `--surface-secondary-subtle`: `#313131` (Core `Grayscale/750` — active tabs, secondary button hover, borders)
   - **Banned surface colors**: Never hardcode `#0a0f1d`, `#111827`, `#1e293b`, `#0f172a`, `#0c1220`, `#070a13`, `#020617`, `#090d16`, or any navy/purple-tinted background.
   - **Zero background gradients**: Never use `linear-gradient` or `radial-gradient` on any background, card, button, badge, or banner.
   - **Hero heading text gradient** (the **only** gradient in the project, text clip only):
     `.hero-heading-gradient` -> `background: linear-gradient(90deg, #FFFFFF 0%, #9B9B9B 100%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;`.
   - **Single Brand Accent (< 80% saturation)**:
     - `--action-primary`: `#4A85C5` (`hsl(211, 51%, 53%)`)
     - `--action-primary-hover`: `#3B71AD`
     - `--action-primary-click`: `#2E5B8F`
     - `--text-info`: `#82B1E1`
     - `--border-action-primary`: `#6BA0D8`
   - **Semantic Status Tokens** (used strictly for computation outcomes — Accepted, Rejected, Step Limit / Contradiction, Running — never for decorative multi-colored rainbow badges):
     - `--surface-success-subtle`: `#1F1F1F` with `--border-success: #4E9F78` and `--text-success: #6BC097`
     - `--surface-error-subtle`: `#1F1F1F` with `--border-error: #C95B5B` and `--text-error: #E08282`
     - `--surface-warning-subtle`: `#1F1F1F` with `--border-warning: #C79A4B` and `--text-warning: #DFB56B`
   - **Card Borders**: **Never** apply a border to only one side of a card or callout (`border-left: 4px ...` and `border-top: 4px ...` are strictly banned). Cards use `1px solid var(--border-primary)` (`#313131`) on all four sides, or flat surface contrast alone.

5. **Spacing Scale (`B2`)**:
   Only these exact spacing tokens:
   `--sp-0: 0`, `--sp-25: 2px`, `--sp-50: 4px`, `--sp-75: 8px`, `--sp-100: 12px`, `--sp-200: 16px`, `--sp-300: 24px`, `--sp-400: 32px`, `--sp-500: 40px`, `--sp-600: 48px`, `--sp-700: 64px`, `--sp-800: 80px`, `--sp-900: 96px`.
   - Main buttons (`.btn`): `padding: 8px 12px` (`var(--sp-75) var(--sp-100)`).

6. **Corner Radius & Nested Radius Formula (`B3`)**:
   Only Tailwind radius tokens:
   `--r-0: 0`, `--r-2: 2px`, `--r-4: 4px`, `--r-6: 6px`, `--r-8: 8px`, `--r-12: 12px`, `--r-16: 16px`, `--r-24: 24px`, `--r-full: 9999px`.
   - **Nested Radius Formula (`inner = outer - gap` when `gap < 32px` and `inner > 2`)**:
     - Outer `.card`: `border-radius: var(--r-24)` (`24px`) with `padding: var(--sp-200)` (`16px`) or `var(--sp-300)` (`24px`). When `padding: 16px`, nested wells (`.tape-container`, `.log-box`, `.table-wrap`, `.id-box`, `.controls-panel`, `.well`) get `border-radius: var(--r-8)` (`24 - 16 = 8px`). When `.card-compact` uses `border-radius: var(--r-16)` (`16px`) with `padding: var(--sp-75)` (`8px`), nested children get `border-radius: var(--r-8)` (`16 - 8 = 8px`).
     - Badges use square/subtle architectural tags (`border-radius: var(--r-6)` `6px`), not generic round AI pills.

7. **Icons (`B6`)**:
   - Load **Phosphor Icons** (`https://unpkg.com/@phosphor-icons/web@2.1.1/src/regular/style.css`).
   - Replace **all** emoji icons (`⚙️`, `🧬`, `⚠️`, `⚡`, `▶`, `⏩`, `↺`, `⏮`, `◀`, `⏭`, `⏸`) across HTML templates and JS `innerHTML` updates with clean `<i class="ph ph-..." aria-hidden="true"></i>` icons at uniform regular weight.

8. **Motion, Floating Navigation & Tagline Reveal (`B7` & `B11`)**:
   - `--ease-out-expo: cubic-bezier(0.22, 1, 0.36, 1)`.
   - Layout/movement transitions: `500ms var(--ease-out-expo)`. Color/opacity/border shifts: `300ms var(--ease-out-expo)`.
   - Interactive states on all buttons/controls: hover surface shift, `:active` `transform: scale(0.98)`, `:focus-visible` `2px` outside focus ring (`outline: 2px solid var(--border-action-primary); outline-offset: 2px`).
   - Floating navbar (`.app-header`): floats `16px` off the top viewport edge, centered and sized to its content, `background: rgba(24, 24, 24, 0.80)`, `backdrop-filter: blur(16px)`, `1px solid var(--border-primary)`, `border-radius: var(--r-12)`. Includes animated SVG menu button on mobile (`<= 960px`) opening a full-height (`100dvh`) panel with staggered `60ms` link entrance (`<= 400ms` total).
   - Scroll reveals (`.reveal-section`): `IntersectionObserver` reveals once (`translateY(32px)` -> `0`, `opacity: 0` -> `1`, `680ms var(--ease-out-expo)`).
   - Tagline reveal (`.tagline-reveal` on `/`): words wrapped in `.tagline-word` transition individually in reading order from `0.28` opacity to `1.0` via `IntersectionObserver` + `requestAnimationFrame` on `--ease-out-expo`.
   - `@media (prefers-reduced-motion: reduce)`: disables transforms and shows tagline words at full opacity immediately.

9. **Inline Notices, Loading Skeletons & Preserved JS Contracts (`B8` & `B9`)**:
   - **Never call `window.alert()`**: Use `window.showInlineNotice(message, type, targetId)` provided by `/static/js/main.js`, rendering into `#page-notice` (an inline calm status banner at the top of each workspace page). Messages must be calm, sentence case, specific about what failed and what to do next, with no exclamation marks.
   - **Loading skeletons**: Provide `.skeleton-line` / `.is-loading` shimmer via opacity pulse (`transform`/`opacity` only, no background gradient).
   - **Preserved DOM IDs & Classes**: Keep every existing functional DOM `id`, `data-*` attribute, and JS state class (`status-INITIALIZED`, `status-RUNNING`, `status-ACCEPTED`, `status-REJECTED`, `status-STEP_LIMIT_REACHED`, `tape-cell-wrap`, `tape-head-pointer`, `visible`, `tape-cell`, `active-head`, `tape-cell-index`, `table-custom`, `active-transition`, `log-entry`, `step-bullet`, `tab-btn`, `theory-tab-content`, `pcp-domino`, `domino-top`, `domino-bottom`, `btn-preset-str`, `btn-sample-prog`, `btn-rice-prop`, `btn-pcp-preset`, `badge`, `badge-blue`, `badge-green`, `badge-red`, `badge-purple`, `badge-amber`, `badge-cyan`) styled cleanly onto the new two-layer token system so zero backend/frontend integrations break.

