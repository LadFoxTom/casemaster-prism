# casemaster-prism

> One source, many themes. Drop-in design system + progressive
> enhancement for CaseMaster apps that runs on **both** runtimes
> (`CaseMaster.Web.exe` and `cms-vercel`) without `.cms` source
> changes.

`casemaster-prism` ships:

- A **theme** built from CSS variables — light + dark out of the box.
- A **variant catalogue** (compact / comfortable / elevated tables;
  soft / ghost / pill buttons; status-strip cards; subtle / soft
  alerts; filled / underlined inputs; etc.) callable from `.cms` via
  existing qualifier props.
- Three **preset themes**: Linear, Tabler, Material — opt in via a
  single attribute on `<html>`.
- A page-level **density preset** (`compact` / `comfortable`).
- Eight **progressive-enhancement** modules (sortable + filterable
  tables, Tom Select / Flatpickr forms, confirm dialog, top-bar
  loading, toasts, keyboard shortcuts, modal-link drawer, inline-edit,
  command palette).
- **Verified** on both runtimes by 24 Playwright tests + an axe-core
  accessibility audit + visual-regression baselines.

## Quick start

### cms-vercel

```ts
import { createHandler } from 'cms-vercel';

export default createHandler({ ui: 'pro' });
```

The runtime injects the `<link>` / `<script>` tags into the default
HTML shell.

### .NET runtime — append to your app's `static/css/app.css` and `static/js/app.js`

```css
/* app.css */
@import url('/static/lib/prism/prism.min.css');
```

```js
// app.js
const s = document.createElement('script');
s.type = 'module';
s.src  = '/static/lib/prism/prism.js';
document.body.appendChild(s);
```

See [`integrations/dotnet/README.md`](./integrations/dotnet/README.md)
and [`integrations/vercel/README.md`](./integrations/vercel/README.md)
for the full recipe (CDN alternative, vendoring, version pinning,
coexistence with Select2).

## Theme it

Override any CSS variable in your app's CSS:

```css
:root {
  --cms-primary: #7c3aed;
  --cms-radius:  6px;
}
```

Switch to a preset theme with a single attribute on `<html>`:

```html
<html data-cms-theme="linear" data-cms-density="compact" data-theme="dark">
```

Pass variant classes through existing CaseMaster qualifiers:

```cms
<@page/data/table iterator: [items], group: 'list',
                  tableClass: 'cms-table-elevated cms-table-compact'>

<@page/button class: 'btn btn-soft-primary btn-pill', label: 'Approve'>

<@page/alert  class: 'alert alert-warning cms-alert-subtle',
              text:  'Two items below safety stock.'>
```

## Configure

Disable any enhancer at runtime:

```html
<script>window.cmsUi = { shortcuts: false, inlineEdit: false }</script>
```

…or per-element:

```html
<table class="cms-table" data-cms-no-enhance>...</table>
```

## Build / develop

```sh
npm install
npm run build           # → dist/prism.min.css, dist/prism.js
npm test                # vitest unit tests
npx playwright test     # e2e on both runtimes (requires servers running)
npm run landing         # serves the landing-page demo on :4000
```

## Reading list

- [`ROADMAP.md`](./ROADMAP.md) — phased plan, naming rationale,
  adoption strategy, repo target.
- [`AB-ui-package.md`](./AB-ui-package.md) — original design proposal
  (kept for posterity; superseded by `ROADMAP.md`).
- `landing-page/` — live demo + interactive theme picker.
- `docs/` — long-form documentation (in progress as part of L4).

## License

MIT.
