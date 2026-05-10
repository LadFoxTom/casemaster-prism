// Dev launcher for casemaster-prism-site (the marketing site, itself a
// CaseMaster .cms app). Wraps the cms-vercel handler in a plain Node
// http.Server so we can run without the Vercel CLI.

import http from 'node:http';
import { createReadStream, statSync, existsSync, readFileSync } from 'node:fs';
import { join, extname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Tiny .env loader (we don't need DB, but support it if present).
const envPath = resolve(__dirname, '.env.local');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}
process.env.CMS_APP_DIR ??= resolve(__dirname, 'app');

const PORT   = Number(process.env.PORT ?? 4000);
const PUBLIC = resolve(__dirname, 'public');

// Use the vendored cms-vercel runtime under api/_runtime/. The
// runtime is shipped pre-compiled (JS) and lives next to the api
// function so Vercel auto-bundles it together with api/index.ts.
const RUNTIME_DIST = resolve(__dirname, 'api', '_runtime', 'index.js');

const runtimeMod = await import(pathToFileURL(RUNTIME_DIST).href);
const handler = runtimeMod.createHandler({
  appDir: resolve(__dirname, 'app'),
  ui: {
    theme:     '/static/lib/prism/prism.min.css',
    enhancers: true,
    scriptUrl: '/static/lib/prism/prism.js',
  },
});

const MIME = {
  '.css':'text/css', '.js':'application/javascript', '.mjs':'application/javascript',
  '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg',
  '.html':'text/html', '.ico':'image/x-icon', '.map':'application/json',
  '.woff':'font/woff', '.woff2':'font/woff2',
};

function serveStatic(req, res, fileAbsPath) {
  if (!existsSync(fileAbsPath)) return false;
  let stat;
  try { stat = statSync(fileAbsPath); } catch { return false; }
  if (!stat.isFile()) return false;
  const mime = MIME[extname(fileAbsPath).toLowerCase()] ?? 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': mime, 'Content-Length': stat.size });
  createReadStream(fileAbsPath).pipe(res);
  return true;
}

// Routing precedence (mirrors what Vercel does in production):
//  1. /static/<path>            → public/<path>      (legacy CaseMaster URL convention)
//  2. /assets, /lib, /favicon, /manifest, /sandbox.html, /_nav.html,
//     /templates/, /404.html    → public/* (real static assets)
//  3. /api*                     → cms-vercel handler
//  4. /page/<path>              → cms-vercel handler (e.g. /page/cms-demo)
//  5. /                         → /page/index/f/main
//  6. /docs, /docs/<x>          → /page/docs/(x)/f/main
//  7. /playground, /migrate     → /page/playground/f/main, /page/migrate/f/main
//  8. anything else             → fall back to public/* lookup, then 404

// URLs that should always be served as static files (assets, fixtures,
// Vercel's auto 404 page, demo-product templates).
const STATIC_PREFIXES = ['/assets/', '/lib/', '/templates/', '/css/'];
const STATIC_FILES    = new Set([
  '/favicon.svg', '/favicon.ico', '/manifest.webmanifest',
  '/sandbox.html', '/_nav.html', '/404.html',
]);

function routeToCmsPage(path) {
  // Returns the /page/<...>/f/main URL, or null if this path stays static.
  // Strips trailing slash + ".html" suffix so /docs/themes and
  // /docs/themes.html both map to page/docs/themes.
  const norm = path.replace(/\/$/, '').replace(/\.html$/, '');

  if (norm === '' || norm === '/') return '/api?_p=/page/index/f/main';

  const docsM = norm.match(/^\/docs(?:\/(.+))?$/);
  if (docsM) {
    const sub = docsM[1] ? '/' + docsM[1] : '';
    return `/api?_p=/page/docs${sub}/f/main`;
  }

  if (norm === '/playground') return '/api?_p=/page/playground/f/main';
  if (norm === '/migrate')    return '/api?_p=/page/migrate/f/main';

  return null;
}

const server = http.createServer(async (req, res) => {
  try {
    const url  = req.url || '/';
    const path = url.split('?')[0];
    const qs   = url.includes('?') ? '&' + url.split('?')[1] : '';

    // 1. /static/<path> prefix (CaseMaster convention) → public/<path>
    const staticMatch = path.match(/^\/static\/(.+)$/);
    if (staticMatch) {
      const abs = join(PUBLIC, staticMatch[1]);
      if (serveStatic(req, res, abs)) return;
      res.statusCode = 404; res.end(`not found: ${staticMatch[1]}`); return;
    }

    // 2. /api and /page/* → cms-vercel handler.
    if (path === '/api' || path.startsWith('/api?') || path.startsWith('/api/')) {
      return invokeHandler(req, res);
    }
    if (path.match(/^\/page\/(.+)$/)) {
      req.url = `/api?_p=${path}${qs}`;
      return invokeHandler(req, res);
    }

    // 3. Probe public/ — any file that exists there wins. Covers asset
    //    paths nested under /docs/assets/, /playground/assets/, etc.
    const rel = path.replace(/^\//, '');
    if (rel && serveStatic(req, res, join(PUBLIC, rel))) return;

    // 4. Friendly URLs map to .cms pages (rooted at known prefixes).
    const cms = routeToCmsPage(path);
    if (cms) {
      req.url = cms + qs.replace(/^&/, '&');
      return invokeHandler(req, res);
    }

    // 5. Trailing-slash directory index from public/.
    if (path.endsWith('/') && serveStatic(req, res, join(PUBLIC, rel, 'index.html'))) return;

    // 6. 404 — emit the static 404 page if available.
    if (serveStatic(req, res, join(PUBLIC, '404.html'))) {
      res.statusCode = 404;
      return;
    }
    res.statusCode = 404; res.end(`not found: ${path}`);
  } catch (e) {
    console.error('[dev-server] fatal', e);
    res.statusCode = 500; res.end('Internal error\n' + (e?.stack ?? e));
  }
});

async function invokeHandler(req, res) {
  const u = new URL(req.url, 'http://x');
  req.query = Object.fromEntries(u.searchParams);
  if (req.method && req.method !== 'GET' && req.method !== 'HEAD') {
    req.body = await new Promise((resolve, reject) => {
      let buf = '';
      req.on('data', (c) => { buf += c; });
      req.on('end', () => resolve(buf));
      req.on('error', reject);
    });
  } else {
    req.body = '';
  }
  const origSetHeader = res.setHeader.bind(res);
  res.setHeader = (...args) => { if (!res.headersSent) origSetHeader(...args); return res; };
  res.status = (code) => { res.statusCode = code; return res; };
  res.send = (body) => { if (typeof body === 'string') res.end(body); else res.end(String(body ?? '')); return res; };
  await handler(req, res);
}

server.listen(PORT, () => {
  console.log(`casemaster-prism-site listening on http://localhost:${PORT}`);
  console.log(`  /                  → public/index.html (static landing)`);
  console.log(`  /docs/, /playground/, /migrate/, /sandbox.html, /404.html`);
  console.log(`                     → public/* (static)`);
  console.log(`  /                  → app/page/index.cms (and every other page lives under app/page/)`);
  console.log(`  /static/lib/prism/* → public/lib/prism/* (CaseMaster URL convention)`);
});
