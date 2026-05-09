# Integration tests

Runs the same `*.spec.ts` files against **both** runtimes:

| Project | URL | What runs |
|---|---|---|
| `dotnet` | `http://localhost:5051` | `CaseMaster.Web.exe` from the in-package WMS copy |
| `vercel` | `http://localhost:5052` | `dev-server.mjs` wrapping the cms-vercel handler |

## Run

Both servers must be running. Launchers:

```powershell
# Terminal 1 — .NET runtime
$env:ASPNETCORE_URLS = 'http://localhost:5051'
& 'C:\casemaster-frontend-package\Casemaster-WMS\casemaster-runtime\runtime\CaseMaster.Web.exe'

# Terminal 2 — cms-vercel dev server
cd C:\casemaster-frontend-package\casemaster-vercel-wms-test1\my-cms-app
$env:PORT = 5052
node dev-server.mjs
```

Then from the package root:

```powershell
npm run test:e2e                       # both projects
npx playwright test --project=dotnet   # only .NET
npx playwright test --project=vercel   # only cms-vercel

# First-time visual baselines
npx playwright test test/integration/visual.spec.ts --update-snapshots
```

## Test files

- `enhancers.spec.ts` — sortable headers, filter, `/`, `Cmd+K`, body
  attribute tagging, zero console errors.
- `theme.spec.ts` — design-token resolution, table surface check.
- `visual.spec.ts` — baseline screenshot regression (commit
  `*-snapshots/` after first run with `--update-snapshots`).
- `a11y.spec.ts` — axe-core; gate on zero serious/critical
  violations introduced by cms-ui markup.
