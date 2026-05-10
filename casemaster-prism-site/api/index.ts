/**
 * casemaster-prism-site — the marketing site, served by cms-vercel.
 *
 * The cms-vercel runtime is vendored under ../packages/runtime/dist/
 * (pre-compiled JS, included in the repo so this site deploys
 * standalone without an npm-published cms-vercel package).
 *
 * vercel.json declares { includeFiles: "{app,packages}/**" } so the
 * runtime ships into the serverless bundle.
 *
 * Resilience: the cms-vercel runtime imports `pg` and may set up a
 * Postgres pool lazily. On Vercel without a DATABASE_URL it can crash
 * during a request (e.g. if any .cms page touches a BO). We wrap the
 * handler so a crash returns a friendly fallback instead of 500.
 */

// @ts-ignore — vendored runtime ships JS only, no .d.ts at this path
import { createHandler } from './_runtime/index.js';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Resolve app/ relative to THIS file rather than process.cwd(). On
// Vercel, process.cwd() is /var/task (the function root), but app/
// lives at /var/task/casemaster-prism-site/app/. Computing from
// import.meta.url gives the right path in both local and Vercel.
const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_DIR   = join(__dirname, '..', 'app');

let inner: ((req: any, res: any) => Promise<void>) | null = null;
let initError: unknown = null;
try {
  inner = createHandler({
    appDir: APP_DIR,
    ui: {
      theme:     '/static/lib/prism/prism.min.css',
      enhancers: true,
      scriptUrl: '/static/lib/prism/prism.js',
    },
  });
} catch (e) {
  initError = e;
  console.error('[prism-site] runtime init failed:', e);
}

export default async function handler(req: any, res: any) {
  if (!inner) return renderFallback(res, initError, 'init');

  try {
    await inner(req, res);
  } catch (e) {
    console.error('[prism-site] request crashed:', e);
    if (!res.headersSent) renderFallback(res, e, 'request');
  }
}

function renderFallback(res: any, err: unknown, stage: 'init' | 'request') {
  const msg = err instanceof Error ? err.message : String(err);
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>cms-vercel runtime unavailable</title>
<link rel="stylesheet" href="/static/lib/prism/prism.min.css">
<style>body{padding:3rem 2rem;max-width:720px;margin:0 auto;font-family:system-ui,sans-serif}</style>
</head>
<body>
  <h1>cms-vercel runtime unavailable</h1>
  <p>The serverless function tried to render this <code>.cms</code>
     page but the cms-vercel runtime crashed during ${stage}. This
     deployment likely lacks a <code>DATABASE_URL</code> environment
     variable that the runtime requires.</p>
  <p>To enable the <code>.cms</code> dog-food demo:</p>
  <ol>
    <li>In Vercel: <strong>Settings → Environment Variables</strong></li>
    <li>Add <code>DATABASE_URL</code> with a valid Postgres connection
        string (e.g. a free Neon tier).</li>
    <li>Redeploy.</li>
  </ol>
  <p>The static landing site at <a href="/">/</a> works without a
     database.</p>
  <details style="margin-top:2rem">
    <summary>Error</summary>
    <pre style="white-space:pre-wrap;background:#f1f5f9;padding:1rem;border-radius:6px;font-size:0.78rem">${escapeHtml(msg)}</pre>
  </details>
</body>
</html>`;
  res.status(503).setHeader('Content-Type', 'text/html').send(html);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
