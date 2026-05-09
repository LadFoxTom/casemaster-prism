# Landing page

A static demo + developer-facing reference for `casemaster-prism`.

`index.html` is the landing page. It loads `sandbox.html` inside iframes
to render the same Bootstrap 4 markup with and without the prism
bundle, side by side. Each component (tables, forms, buttons, cards,
alerts, badges, pagination) gets a "before vs after" pair, then the
enhancers (sortable tables, toasts, confirm, command palette,
inline-edit) get their own interactive demos.

## Open it

This is a fully static site. No build step.

```powershell
cd C:\casemaster-frontend-package\landing-page
npx http-server . -p 4000
```

Or any other plain static server (`python -m http.server`, VS Code
Live Server, etc.). Don't use `npx serve` — its default `cleanUrls`
rewrite drops the `?demo=…&ui=1` query strings on the way to
`sandbox.html`, breaking every iframe.

Then open <http://localhost:4000>.

> **Why a static server, not file://?** The prism JS bundle is an ES
> module with relative chunk imports (`./chunks/tom-select-*.js`).
> Browsers require a real `http(s)://` origin to resolve module imports.

## Structure

```
landing-page/
├── index.html          marketing + side-by-side comparison
├── sandbox.html        the per-iframe fixture (?demo=NAME&ui=0|1)
├── assets/
│   ├── site.css        landing-page chrome (independent of prism)
│   ├── site.js         dark toggle, copy-to-clipboard, token tester
│   └── prism/         vendored copy of dist/ — refresh after rebuild
└── README.md           this file
```

## Refreshing the prism bundle inside the demo

```powershell
# At the package root
npm run build

# Then re-vendor dist into the landing page
$src = 'C:\casemaster-frontend-package\dist'
$dst = 'C:\casemaster-frontend-package\landing-page\assets\prism'
Copy-Item (Join-Path $src 'prism.min.css')  $dst -Force
Copy-Item (Join-Path $src 'prism.js')       $dst -Force
Copy-Item (Join-Path $src 'prism.js.map')   $dst -Force
Copy-Item (Join-Path $src 'chunks\*')       (Join-Path $dst 'chunks') -Recurse -Force
```

## Adding a new demo

1. Add a `<template id="demo-NAME">…</template>` block in `sandbox.html`.
2. Drop a `<div class="compare">…</div>` block in `index.html`
   referencing `./sandbox.html?demo=NAME` and `?demo=NAME&ui=1`.
3. Set `--frame-h` on the compare block to size the iframe to your
   content.
