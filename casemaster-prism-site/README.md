# casemaster-prism-site

The full `casemaster-prism` marketing + docs site, packaged as a
**cms-vercel** application. Deploys directly to Vercel with one
command.

**Every URL is a real CaseMaster `.cms` page.** There are no static
HTML pages on the site — every public route under `app/page/` is
parsed by the cms-vercel runtime and rendered into the response, then
themed by `casemaster-prism`. The package eats its own dog food.

## Run locally

```powershell
cd C:\casemaster-frontend-package\casemaster-prism-site
node dev-server.mjs
# → http://localhost:4000
```

The dev-server uses the cms-vercel runtime vendored under
`api/_runtime/` so the site is self-contained — no external workspace,
no build step.

## Routing

`vercel.json` mirrors the local `dev-server.mjs` routes.

| Public URL                      | Served by                                  |
|--------------------------------|--------------------------------------------|
| `/`                            | `app/page/index.cms`                       |
| `/docs`                        | `app/page/docs.cms`                        |
| `/docs/<page>`                 | `app/page/docs/<page>.cms`                 |
| `/docs/enhancers/<page>`       | `app/page/docs/enhancers/<page>.cms`       |
| `/playground`                  | `app/page/playground.cms`                  |
| `/migrate`                     | `app/page/migrate.cms`                     |
| `/sandbox.html`                | `public/sandbox.html` (iframe fixture)     |
| `/templates/<x>.html`          | `public/templates/<x>.html` (product previews) |
| `/_nav.html`, `/404.html`, `/favicon.svg`, `/manifest.webmanifest` | `public/*` |
| `/assets/*`, `/lib/prism/*`    | `public/*`                                 |
| `/static/lib/prism/*`          | `public/lib/prism/*` (CaseMaster URL convention) |

Both `/docs/themes` and `/docs/themes.html` resolve to the same
`.cms` page (`.html` is stripped at the rewrite layer).

## Layout

```
casemaster-prism-site/
├── api/
│   ├── index.ts                 createHandler({ ui: 'pro' })
│   └── _runtime/                vendored cms-vercel runtime (pre-compiled)
├── app/
│   └── page/                    24 .cms files — every user-facing route
│       ├── index.cms
│       ├── docs.cms
│       ├── docs/
│       │   ├── getting-started.cms
│       │   ├── themes.cms · tokens.cms · variants.cms · …
│       │   └── enhancers/
│       │       ├── tables.cms · forms.cms · confirm.cms · …
│       ├── playground.cms
│       └── migrate.cms
├── public/
│   ├── sandbox.html             iframe fixture (loaded by docs/landing demos)
│   ├── _nav.html                global left-nav fragment (fetched by nav.js)
│   ├── 404.html                 Vercel auto-404 page
│   ├── favicon.svg, manifest.webmanifest
│   ├── assets/                  site.css, site.js, nav.js, og-card.png
│   ├── lib/prism/               vendored prism dist (CSS + JS + lazy chunks)
│   └── templates/               full-page product previews
│       ├── dashboard.html · settings.html · list-detail.html
├── dev-server.mjs               local Node http wrapper
├── package.json
├── vercel.json
└── README.md
```

## Refresh + edit cycle

To edit page content:

1. Edit `app/page/<path>.cms` directly.
2. Or edit the original HTML somewhere (e.g. a snapshot), then re-run
   the converter:
   ```sh
   node ../test/smoke/convert-html-to-cms.mjs
   ```
   The script regenerates each `.cms` from the corresponding HTML
   source. (Currently the source-of-truth IS the `.cms` file — the
   converter was used once during initial conversion.)

To refresh the prism dist:

```powershell
$src = 'C:\casemaster-frontend-package\dist'
$dst = 'C:\casemaster-frontend-package\casemaster-prism-site\public\lib\prism'
Copy-Item (Join-Path $src 'prism.min.css')  $dst -Force
Copy-Item (Join-Path $src 'prism.js')       $dst -Force
Copy-Item (Join-Path $src 'prism.js.map')   $dst -Force
Copy-Item (Join-Path $src 'chunks\*')       (Join-Path $dst 'chunks') -Recurse -Force
```

## Deploy to Vercel

```sh
cd casemaster-prism-site
npm install -g vercel        # one-time
vercel link                  # connect to a Vercel project
vercel deploy --prod
```

#### Vercel project settings

| Setting              | Value                                       |
|---------------------|---------------------------------------------|
| Framework preset    | Other                                       |
| Root directory      | `casemaster-prism-site/` (if monorepo)      |
| Build command       | (leave empty)                               |
| Output directory    | `public`                                    |
| Install command     | `npm install`                               |
| Node.js version     | 20.x                                        |

The `vercel.json` rewrites + `framework: null` + `buildCommand: ""`
combine to give Vercel exactly the right instructions: install,
trace `api/index.ts` imports, deploy `public/` as static, route
URLs through the rewrites.

## Proof

1. Open `/docs/themes` in the browser.
2. View Source.
3. The HTML is emitted by `app/page/docs/themes.cms` via the
   cms-vercel runtime in `api/_runtime/`. The polish is
   `casemaster-prism` applied via one config option in `api/index.ts`.

Same proof works for any URL on the site: edit the corresponding
`.cms` file, push, the page updates.
