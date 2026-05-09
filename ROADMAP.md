# Roadmap — `casemaster-prism`

A drop-in theme + progressive-enhancement layer for CaseMaster apps that
runs on **both** runtimes (`.NET CaseMaster.Web.exe` and `cms-vercel`)
without `.cms` source changes.

This document captures the strategic plan: where we are, where we're
going, and how we get there. Phases are sized so each one ships value
standalone — pause between phases if the appetite shrinks.

## Naming

Selected name: **`casemaster-prism`**.

Rationale: prism splits one beam into a spectrum, which mirrors the
package's defining feature — a single source of markup re-skinned
through multiple preset themes (Linear, Tabler, Material) plus
arbitrary custom themes via CSS variables. The name scales: future
sibling packages can be `casemaster-spectrum` (a richer theme
catalogue), `casemaster-lens` (analytics overlay), etc.

- npm: `casemaster-prism`
- repo: `casemaster-prism`
- import path: `casemaster-prism` (was `@casemaster/ui`)

## Status today (v0.2.x)

What's already shipped:

- Theme system with CSS variables (`tokens.css`, `dark.css`, `rtl.css`).
- Ten themed BS4 components (tables, forms, buttons, cards, navbar,
  sidebar, modals, badges, alerts, pagination).
- Variants catalogue (compact / comfortable / elevated / soft / ghost
  / pill / status-strip / filled / underlined / etc.).
- Three preset themes: Linear, Tabler, Material — opt in via
  `data-cms-theme="X"`.
- Density preset: `data-cms-density="compact|comfortable"`.
- Eight progressive-enhancement JS modules (sortable + filterable
  tables, Tom Select / Flatpickr forms, confirm dialog, top-bar
  loading, toasts, keyboard shortcuts, modal-link drawer, inline-edit,
  command palette).
- Verified live on **both runtimes** with 24 Playwright tests.
- Bundle: ~14 KB gz CSS, ~10 KB gz core JS, lazy-loaded TS / Flatpickr
  chunks (~50 KB gz combined when triggered).
- A landing page with hero, before/after component frames, theme
  picker, variants catalogue, token tester, config table, feature
  grid.

Gap relative to best-in-class styling-package landing pages (shadcn/ui,
Tailwind, Tabler, Mantine, Radix, MUI, Chakra):

- No live code/preview tabs per component.
- No real-product template demos (fake admin dashboard, settings,
  list-detail).
- No docs subsite — landing page is one long single-pager.
- No playground — users can't compose classes interactively and copy.
- No migration guide for existing apps.
- No trust signals (npm version badge, bundle-size badge, GitHub stars).
- Install snippets buried below the hero rather than pinned in it.

## Phases

Estimates assume a single developer. Each phase produces shippable
value; pause between any two without the next being half-built.

### Phase L1 — Hero + trust signals (½ day)

- Pin install snippet under the H1 with `npm` / `pnpm` / `yarn` / `bun`
  / `cdn` tabs (one click switches, copy-to-clipboard on each).
- Add badge row: GitHub stars, npm version, bundle size, license. (Use
  shields.io URLs; the actual count fills in once we publish.)
- Move the theme + density picker into the sticky header so it
  persists across sections.
- Primary CTA reads `Get started →` and points at the new docs route
  (initially the README, later `/docs/getting-started/`).

### Phase L2 — Preview / Code tabs on every component (1 day)

- Replace the dual before/after iframe pattern with a single iframe and
  a `<details>` "Show source" reveal underneath that exposes the exact
  HTML being rendered.
- Each component anchor (`#components/tables`, `#components/forms`,
  etc.) becomes a stable deep link.
- Copy-to-clipboard button on every revealed snippet.
- The "before" comparison stays available behind a toggle, but is no
  longer the default — users want to see what cms-ui renders, not
  what BS4 looks like by itself.

### Phase L3 — Templates / fake-product demos (1-2 days)

Three full-page routes served from the landing site:

- `/templates/dashboard` — KPI cards, recent-orders table, activity
  feed, sidebar nav. Modelled on the WMS dashboard but with sample
  data so it works offline.
- `/templates/settings` — multi-tab form with selects, dates, switches,
  a danger-zone section. Demonstrates form-level theming.
- `/templates/list-detail` — a list page where row click opens a
  modal-link detail panel. Demonstrates the modal-link enhancer.

Each one renders inside a card on the landing-page hero (replacing the
current "see the comparison" CTA target) with a "View full template"
link. Each template has its own theme switcher inside it.

### Phase L4 — Docs subsite (2-3 days)

- A `/docs/` route with a left-nav, right-content layout.
- Pages: getting-started, themes, variants, configuration,
  integration / dotnet, integration / vercel, migration, enhancers/*
  (one per enhancer — tables, forms, confirm, loading, toasts,
  shortcuts, modal-links, inline-edit, command-palette),
  troubleshooting, FAQ.
- Pagefind for search — build-time indexing, no JS hosting required.
- Each enhancer page has a live demo iframe + opt-out instructions +
  caveats.
- Linkable headings, breadcrumb, "edit on GitHub" link.
- Generated from markdown sources in `docs/` — could later swap to a
  static-site generator (Astro, VitePress) if the markdown surface
  grows beyond hand-rolled HTML.

### Phase L5 — Playground (1 day)

A `/playground/` route. Two panes:

- **Left**: a class-builder UI. Tabs for component types (table,
  button, card, alert, input). Each tab has the variants and modifiers
  as toggles / radios.
- **Right**: a live preview iframe re-rendered on every change.
- A footer strip showing the resulting `class="…"` string with a
  copy-to-clipboard button.

Optional second pane: a CSS-variable inspector that lets users tweak
`--cms-primary`, `--cms-radius`, etc., live.

### Phase L6 — Migration guide (½ day)

- A `/migrate/` page that captures: "If your app currently does X,
  here's what changes after adopting cms-ui."
- Concrete deltas: button heights, table padding, modal corners,
  focus-ring colour, navbar palette.
- Pre-flight checklist with the five "things to verify before
  installing" items.
- Roll-back paragraph: comment two lines, you're back.
- Side-by-side screenshots of a typical inventory list page before
  and after.

### Phase L7 — Polish (½ day)

- Mobile responsiveness sweep on every iframe and section.
- Open Graph + Twitter Card meta with a share-preview screenshot.
- 404 page with the same chrome.
- Favicon set, apple-touch-icon, manifest.
- Print stylesheet audit — make sure `@media print` works for every
  component.

## Adoption — for existing projects

Risks and mitigations are documented in `docs/migrate/` (Phase L6
deliverable). Summary:

| Risk | Mitigation |
|---|---|
| App ships its own conflicting CSS with `!important`. | We use `!important` only where Bootstrap forces it. App's `!important` on a class beats ours on a token. |
| App already wired its own jQuery DataTables. | Enhancer skips tables inside `.dataTables_wrapper`. Add `data-cms-no-enhance` for explicit opt-out. |
| App uses the runtime's global `#cmModal`. | Modal-link enhancer is opt-in via `data-cms-modal-link`. Documented. |
| Print styles look weird. | `@media print` overrides ship in `extras.css`. Audit during L7. |
| Hard-coded `<select>` widths break with Tom Select. | `selectThreshold: 8` knob. Recommend `data-cms-no-enhance` on width-constrained selects. |
| Custom sidebar markup with the `.wms-sidebar` class. | `data-cms-no-theme` on the specific element disables our sidebar rules. |
| Right-to-left languages. | RTL stylesheet exists; verify against a Hebrew/Arabic test app. |

The single most-important property: every cms-ui assumption is
opt-out-able. There is no rule we apply that can't be reversed at the
page or element level (`window.cmsUi`, `data-cms-no-enhance`,
per-feature flags).

## Adoption — for new projects

Recommended defaults for a brand-new CaseMaster app:

- `<html data-cms-theme="tabler" data-cms-density="comfortable">` —
  Tabler matches what BS4 admin apps "feel like" today; comfortable
  density matches typical desktop ops UX.
- `window.cmsUi = {}` — everything default-on.
- `static/css/app.css` ships a single `@import` for cms-ui plus an
  empty `:root { /* override --cms-primary here */ }` block.
- `static/js/app.js` ships the cms-ui injection snippet and no other
  globals.
- A minimal `examples/` folder with one each of: list page, form page,
  dashboard. These are the "this is how a healthy CaseMaster page
  looks now" reference.

Convention rules every new project should follow:

1. Tables go through `<@page/data/table>` with default `tableClass` —
   never invent a custom table class.
2. Forms group inputs under `<@page/data/form>` so cms-ui's form
   theming applies.
3. Buttons use semantic intent (`btn btn-primary`, `btn btn-soft-success`)
   — not hand-rolled colours.
4. Status uses badges with intent classes; never inline-styled colours.
5. Modals stay inside the runtime's `#cmModal` for navigation, or use
   `data-cms-modal-link` for inline detail.

Future work: a `npm create casemaster@latest my-app` scaffold that
pre-wires all of the above. Out of scope for this roadmap, but flagged
as the highest-leverage adoption mechanic.

## Repo structure (target)

```
casemaster-prism/
├── README.md                     hero + install + 30-sec demo
├── ROADMAP.md                    this file
├── CHANGELOG.md                  Keep-a-changelog format
├── CONTRIBUTING.md               local dev, test, release
├── CODE_OF_CONDUCT.md
├── LICENSE                       MIT
├── package.json
├── src/                          theme + enhancers + lib (current contents)
├── dist/                         npm-published, .gitignored otherwise
├── landing-page/                 deployed site (GH Pages or Vercel)
├── docs/                         markdown source for the docs subsite
├── examples/                     vendored before/after captures
├── integrations/
│   ├── vercel/                   recipe + smoke test
│   └── dotnet/                   recipe + smoke test
├── test/                         unit + e2e + smoke
└── .github/
    ├── workflows/
    │   ├── ci.yml                lint + unit + e2e + bundle-size gate
    │   ├── release.yml           changesets-driven npm publish
    │   └── pages.yml             deploy landing-page
    ├── ISSUE_TEMPLATE/
    │   ├── bug.yml
    │   ├── feature.yml
    │   └── theme-preset.yml      community-submitted preset themes
    ├── PULL_REQUEST_TEMPLATE.md
    ├── DISCUSSION_TEMPLATE/
    │   └── show-and-tell.yml
    └── FUNDING.yml               (optional)
```

## Release process

- Use [changesets](https://github.com/changesets/changesets). Every PR
  adds a `.changeset/*.md` line describing the user-visible change. CI
  bot opens a "Version Packages" PR; merging it bumps versions and
  publishes to npm + cuts a GitHub release with the changelog excerpt.
- SemVer strictly: major bumps only on contract-breaking class
  assumptions, never on visual changes.
- Pre-1.0 (today) lets us iterate on visual decisions without major
  bumps. 1.0 cuts after the WMS demo lands cleanly on both runtimes
  and we have at least one external adopter.

## Hosting decisions (deferred)

- Repo location (separate org / personal account) — TBD.
- Docs domain — `prism.casemaster.io` if we control the parent;
  otherwise `casemaster-prism.dev` or GitHub Pages.

## Out of scope (for now)

- React / Vue / Svelte SPA — that's a separate package
  (originally Proposal C).
- Drag-drop dashboard editor.
- Real-time pages (SSE, websockets).
- Per-tenant visual customisation beyond CSS-variable overrides.
