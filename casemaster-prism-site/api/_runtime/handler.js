/**
 * Public entry point for `cms-vercel`. Consumers do:
 *
 *   // api/index.ts
 *   import { createHandler } from 'cms-vercel';
 *   export default createHandler({ appDir: './app' });
 *
 * That's the entire integration. Everything else lives inside the
 * package — parser, interpreter, BO registry, page rendering, Postgres
 * pool, the lot. Upgrades happen with `npm update cms-vercel`.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadApp } from './loader.js';
import { callFunction } from './eval.js';
import { newSessionId, persistSession, buildCookie } from './session.js';
import { handleMaintenance } from './maintenance.js';
function normaliseUi(v) {
    const base = {
        enabled: false,
        theme: false,
        themeMode: 'light',
        enhancers: false,
        cssUrl: '',
        scriptUrl: '',
    };
    if (!v)
        return base;
    let opts;
    if (v === 'pro')
        opts = { theme: true, enhancers: true };
    else if (v === 'theme-only')
        opts = { theme: true };
    else if (v === 'enhancers-only')
        opts = { enhancers: true };
    else
        opts = v;
    const ver = opts.version ?? '1';
    const cdn = `https://cdn.jsdelivr.net/npm/@casemaster/ui@${ver}/dist`;
    base.enabled = !!(opts.theme || opts.enhancers);
    base.theme = opts.theme ?? false;
    base.themeAccent = opts.themeAccent;
    base.themeMode = opts.themeMode ?? 'light';
    base.enhancers = opts.enhancers ?? false;
    base.cssUrl = typeof opts.theme === 'string' ? opts.theme : `${cdn}/ui.min.css`;
    base.scriptUrl = opts.scriptUrl ?? `${cdn}/ui.js`;
    return base;
}
export function createHandler(opts = {}) {
    const APP_DIR = resolveAppDir(opts.appDir);
    const UI = normaliseUi(opts.ui);
    // Module-scoped registry: parsed once per warm Vercel instance.
    let appRegistry = null;
    let appRegistryError = null;
    function registry() {
        if (appRegistry)
            return appRegistry;
        try {
            appRegistry = loadApp(APP_DIR);
            opts.loaderHook?.(appRegistry);
            return appRegistry;
        }
        catch (e) {
            appRegistryError = e;
            throw e;
        }
    }
    return async function handler(req, res) {
        // ?diag=1 — surface registry / app-dir state without touching DB or interpreter.
        if (req.url && /[?&]diag=1/.test(req.url)) {
            // List user-supplied env keys (filter out the noisy Vercel/Node defaults
            // so the user can see whether .env.local was actually loaded).
            const SYSTEM_PREFIXES = ['VERCEL_', 'NEXT_', 'NODE_', 'NPM_', 'PATH', 'PATHEXT',
                'HOME', 'USER', 'USERPROFILE', 'TEMP', 'TMP', 'APPDATA', 'LOCALAPPDATA',
                'SYSTEMROOT', 'WINDIR', 'COMSPEC', 'COMPUTERNAME', 'PROCESSOR_', 'OS',
                'PROGRAMFILES', 'PROGRAMDATA', 'PUBLIC', 'SESSIONNAME', 'PSMODULEPATH',
                'COMMONPROGRAMFILES', 'PROGRAMW6432', 'ALLUSERSPROFILE', 'HOMEDRIVE',
                'HOMEPATH', 'SHELL', 'TERM', 'LANG', 'LC_', 'PWD', 'OLDPWD'];
            const userEnvKeys = Object.keys(process.env)
                .filter(k => !SYSTEM_PREFIXES.some(p => k.startsWith(p) || k === p.replace(/_$/, '')))
                .sort();
            res.status(200).setHeader('Content-Type', 'application/json').send(JSON.stringify({
                ok: true,
                cwd: process.cwd(),
                appDir: APP_DIR,
                appDirExists: existsSync(APP_DIR),
                hasDbUrl: Boolean(process.env.DATABASE_URL),
                dbUrlLength: process.env.DATABASE_URL?.length ?? 0,
                userEnvKeys,
                registryError: appRegistryError ? String(appRegistryError) : null,
                loadedFns: appRegistry ? [...appRegistry.funcs.keys()].length : null,
            }, null, 2));
            return;
        }
        // ?stats=1 — registry warmth + counts.
        if (req.url && /[?&]stats=1/.test(req.url)) {
            const tStart = Date.now();
            let buildMs = null;
            if (!appRegistry) {
                const tBuild = Date.now();
                try {
                    registry();
                }
                catch { /* surfaced via registryError above */ }
                buildMs = Date.now() - tBuild;
            }
            res.status(200).setHeader('Content-Type', 'application/json').send(JSON.stringify({
                ok: true,
                registryAlreadyWarm: buildMs === null,
                registryBuildMs: buildMs,
                funcs: appRegistry?.funcs.size ?? 0,
                resources: appRegistry?.resources.size ?? 0,
                bos: appRegistry?.bos.size ?? 0,
                requestTotalMs: Date.now() - tStart,
                cold: !appRegistry,
            }, null, 2));
            return;
        }
        try {
            // After Vercel's rewrite, req.url is `/api?_p=/page/foo/f/ping`.
            // Pull the original path out of `_p` so routing is consistent.
            const rawUrl = req.url ?? '/';
            const tmp = new URL(rawUrl, 'http://x');
            const proxied = tmp.searchParams.get('_p') ?? rawUrl;
            tmp.searchParams.delete('_p');
            const remainingQs = tmp.searchParams.toString();
            const url = new URL(proxied + (remainingQs ? `?${remainingQs}` : ''), 'http://x');
            const bodyStr0 = typeof req.body === 'string' ? req.body
                : (req.body && typeof req.body === 'object') ? JSON.stringify(req.body)
                    : '';
            const ct0 = String(req.headers['content-type'] ?? '');
            const formQuery0 = {};
            if (ct0.includes('application/x-www-form-urlencoded') && bodyStr0) {
                for (const [k, v] of new URLSearchParams(bodyStr0))
                    formQuery0[k] = v;
            }
            const mergedQuery = { ...Object.fromEntries(url.searchParams), ...formQuery0 };
            // Phase 20: auto BO maintenance pages. Returns true if the
            // request was handled.
            if (await handleMaintenance({ bos: registry().bos }, req, res, url.pathname, mergedQuery, bodyStr0))
                return;
            // /page/<path>(/f/<fn>)?  — path may be multi-segment (wms/inventory).
            // If /f/<fn> is omitted, default to `main` (CaseMaster page convention).
            const m = url.pathname.match(/^\/page\/(.+?)(?:\/f\/([^/]+))?\/?$/);
            if (!m) {
                res.status(404).setHeader('Content-Type', 'text/plain')
                    .send(`no route for ${url.pathname}`);
                return;
            }
            const pagePath = m[1];
            const fnName = m[2] ?? 'main';
            const reg = registry();
            // Prefer page-scoped key; fall back to bare for legacy single-page apps.
            const scopedKey = `page/${pagePath}:${fnName}`;
            const lookupKey = reg.funcs.has(scopedKey) ? scopedKey : fnName;
            if (!reg.funcs.has(lookupKey)) {
                res.status(404).setHeader('Content-Type', 'text/plain')
                    .send(`function not found: ${fnName} in page/${pagePath}`);
                return;
            }
            const ctx = {
                funcs: reg.funcs,
                resources: reg.resources,
                bos: reg.bos,
                currentPage: `page/${pagePath}`,
                req: {
                    method: req.method ?? 'GET',
                    url: url.toString(),
                    query: mergedQuery,
                    body: bodyStr0,
                    headers: req.headers,
                },
                res: { contentType: 'text/html', body: '', status: 200, headers: {} },
            };
            await callFunction(ctx, lookupKey, []);
            // Phase 18: write the session back if the function called session.set.
            // New sessions get a generated id + Set-Cookie header.
            if (ctx.sessionDirty) {
                if (!ctx.session?.id) {
                    ctx.session = { id: newSessionId(), payload: ctx.session?.payload ?? {} };
                    res.setHeader('Set-Cookie', buildCookie(ctx.session.id));
                }
                await persistSession(ctx.session.id, ctx.session.payload);
            }
            if (ctx.res.redirect) {
                res.status(302).setHeader('Location', ctx.res.redirect).send('');
                return;
            }
            // If the page emitted a body fragment (no <!doctype>, no <html>) for an
            // HTML response, wrap it in a default shell with Bootstrap loaded.
            // Real CaseMaster pages do this through `inherits 'base'` which pulls
            // in the framework's HTML envelope; our parser treats `inherits` as a
            // no-op, so an unwrapped page would render as a Times-New-Roman
            // fragment with all Bootstrap classes inert.
            let body = ctx.res.body;
            const isHtml = /text\/html/i.test(ctx.res.contentType);
            const looksWrapped = /^\s*<!doctype|^\s*<html\b/i.test(body);
            if (isHtml && !looksWrapped)
                body = wrapInDefaultShell(body, UI);
            res.status(ctx.res.status)
                .setHeader('Content-Type', ctx.res.contentType)
                .send(body);
        }
        catch (e) {
            if (opts.onError) {
                opts.onError(e, req, res);
                return;
            }
            // Log to stderr so the full trace shows up in `vercel dev`'s terminal.
            console.error('[cms-vercel] request failed:', e);
            // Ship the trace back to the browser too — far more useful than a
            // bare `Error: <message>` when debugging .cms code locally.
            const isDev = process.env.NODE_ENV !== 'production';
            const body = isDev
                ? `Error: ${e?.message ?? String(e)}\n\n${e?.stack ?? ''}`
                : `Error: ${e?.message ?? String(e)}`;
            res.status(500).setHeader('Content-Type', 'text/plain').send(body);
        }
    };
}
// Default HTML envelope for pages that didn't emit one. Loads the same
// front-end stack the official CaseMaster runtime ships (jQuery 3 +
// Bootstrap 4.6 + Font Awesome 6 free) so .cms pages written for the
// .NET runtime render with the same look. We deliberately stay on
// Bootstrap 4 — `jumbotron`, `badge-info`, `text-right`, `pull-right`
// and other BS4 idioms are pervasive in real CaseMaster source and
// were removed/renamed in BS5, which would silently no-op them.
function wrapInDefaultShell(body, ui = normaliseUi(false)) {
    const themeLink = ui.theme
        ? `<link rel="stylesheet" href="${escapeAttr(ui.cssUrl)}">`
        : '';
    const accentVar = ui.themeAccent
        ? `<style>:root{--cms-primary:${escapeAttr(ui.themeAccent)}}</style>`
        : '';
    const themeAttr = ui.themeMode && ui.themeMode !== 'light'
        ? ` data-theme="${escapeAttr(ui.themeMode)}"`
        : '';
    const enhancerScript = ui.enhancers
        ? `<script>window.cmsUi = ${JSON.stringify(typeof ui.enhancers === 'object' ? ui.enhancers : {})};</script>
       <script type="module" src="${escapeAttr(ui.scriptUrl)}"></script>`
        : '';
    return `<!doctype html>
<html lang="en"${themeAttr}>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
  <title>cms-vercel</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/css/bootstrap.min.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  <link rel="stylesheet" href="/static/css/app.css">
  ${themeLink}
  ${accentVar}
  <style>
    /* Mirror cm.css main width rule from the official runtime so layouts
       that rely on body > main > .container max-width none fill the viewport. */
    main { width: 100%; overflow-x: auto; }
  </style>
  <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
</head>
<body>
  <nav class="navbar navbar-expand-lg navbar-dark fixed-top bg-primary" style="height:56px" aria-label="Main navigation">
    <a class="navbar-brand" href="/">cms-vercel</a>
  </nav>
  <main style="padding-top:64px">${body}</main>
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/js/bootstrap.bundle.min.js"></script>
  ${enhancerScript}
</body>
</html>`;
}
function escapeAttr(s) {
    return s
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
function resolveAppDir(explicit) {
    const candidates = [
        explicit,
        process.env.CMS_APP_DIR,
        join(process.cwd(), 'app'),
        '/var/task/app',
        join(process.cwd(), '..', 'app'),
    ].filter(Boolean);
    for (const c of candidates)
        if (existsSync(c))
            return c;
    return candidates[0];
}
