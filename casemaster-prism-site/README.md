# casemaster-prism-site

The full `casemaster-prism` marketing + docs site, packaged as a
**cms-vercel** application. Deploys directly to Vercel with one
command.

The homepage is a static landing page. One route (`/page/cms-demo`)
is a real CaseMaster `.cms` page rendered through the cms-vercel
runtime and themed by `casemaster-prism` — the package eats its own
dog food.

## Run locally

```powershell
cd C:\casemaster-frontend-package\casemaster-prism-site
node dev-server.mjs
# → http://localhost:4000
```

The dev-server reuses the cms-vercel runtime that's already compiled
under `casemaster-vercel-wms-test1/my-cms-app/packages/runtime/dist/`.

## Routing (mirrors what Vercel does in production)

| Path                              | Resolves to                         |
|----------------------------------|-------------------------------------|
| `/`                              | `public/index.html` (landing)       |
| `/sandbox.html`                  | `public/sandbox.html` (iframe demo) |
| `/docs/*`                        | `public/docs/*`                     |
| `/playground/`                   | `public/playground/index.html`      |
| `/migrate/`                      | `public/migrate/index.html`         |
| `/templates/*.html`              | `public/templates/*.html`           |
| `/page/cms-demo`                 | `app/page/cms-demo.cms` via runtime |
| `/static/lib/prism/*`            | `public/lib/prism/*`                |
| `/404.html`, `/favicon.svg`, etc.| `public/*`                          |

## Layout

```
casemaster-prism-site/
├── api/
│   └── index.ts                 createHandler({ ui: 'pro' })
├── app/
│   └── page/
│       └── cms-demo.cms         dog-food .cms page
├── public/
│   ├── index.html               static landing (homepage)
│   ├── sandbox.html             iframe fixture for component demos
│   ├── _nav.html                global left-nav fragment
│   ├── 404.html
│   ├── favicon.svg
│   ├── manifest.webmanifest
│   ├── assets/                  site.css, site.js, nav.js, og-card.png
│   ├── lib/
│   │   └── prism/               vendored prism dist
│   ├── docs/                    static docs subsite (19 pages)
│   ├── playground/              class-builder playground
│   ├── migrate/                 migration guide
│   └── templates/               full-page product previews
├── dev-server.mjs               local Node http wrapper
├── package.json
├── vercel.json
└── README.md
```

## Deploy to Vercel

Two options.

### A. Vercel CLI

```sh
cd casemaster-prism-site
npm install -g vercel       # one-time
vercel link                 # connect to a Vercel project
vercel deploy --prod
```

### B. Git-based deploy

Push this directory (or its parent monorepo) to GitHub / GitLab /
Bitbucket. Import the project into Vercel; it picks up `vercel.json`
automatically.

#### Vercel project settings

| Setting              | Value                                       |
|---------------------|---------------------------------------------|
| Framework preset    | Other                                       |
| Root directory      | `casemaster-prism-site/` (if monorepo)      |
| Build command       | (leave empty)                               |
| Output directory    | `public`                                    |
| Install command     | `npm install`                               |
| Node.js version     | 20.x                                        |

The `vercel.json` rewrites handle the rest:

- `/page/:path*` → the `.cms` runtime
- `/static/:path*` → public/ (legacy CaseMaster URL convention)

The cms-vercel runtime needs to be available at deploy time — it's
referenced via `import { createHandler } from 'cms-vercel'` in
`api/index.ts`. For production deploys, install it as an npm
dependency. For this monorepo, the dev-server reaches into the
sibling `casemaster-vercel-wms-test1` workspace; before deploying
standalone, copy `packages/runtime/` into this directory or publish
`cms-vercel` to npm and add it to `package.json`.

## Refresh the prism dist

Whenever the prism package gets a new build, refresh the vendored copy:

```powershell
$src = 'C:\casemaster-frontend-package\dist'
$dst = 'C:\casemaster-frontend-package\casemaster-prism-site\public\lib\prism'
Copy-Item (Join-Path $src 'prism.min.css')  $dst -Force
Copy-Item (Join-Path $src 'prism.js')       $dst -Force
Copy-Item (Join-Path $src 'prism.js.map')   $dst -Force
Copy-Item (Join-Path $src 'chunks\*')       (Join-Path $dst 'chunks') -Recurse -Force
```

## What's the proof?

1. Open `/` — the static landing.
2. Open `/page/cms-demo`. View Source. The HTML is emitted by
   `app/page/cms-demo.cms` through the cms-vercel runtime, then themed
   by `casemaster-prism` (added via the `ui` option in `api/index.ts`).
3. Same package the docs are recommending — applied here to prove the
   integration recipe in production.
