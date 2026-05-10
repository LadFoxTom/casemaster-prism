/**
 * Read all .cms files under the app directory, parse them, and return a
 * flat function registry. Phase 1: a single file is enough; later phases
 * will key by (script, fn) and build a richer module map.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { lex } from './lex.js';
import { parse } from './parse.js';
import { tryExtractBo } from './bo.js';
export function loadApp(appDir) {
    const funcs = new Map();
    const resources = new Map();
    const bos = new Map();
    const fileFns = new Map();
    for (const file of walk(appDir)) {
        if (!file.endsWith('.cms'))
            continue;
        const src = readFileSync(file, 'utf8');
        const rel = relative(appDir, file).split('\\').join('/');
        const tokens = lex(src, rel);
        const parsed = parse(tokens, rel);
        const fnNames = [];
        // Strip the trailing `.cms` so the page-scoped key matches `currentPage`
        // built from the URL path (URL has no extension).
        const fileBase = rel.replace(/\.cms$/, '');
        for (const fn of parsed.funcs) {
            // Page-scoped key — collision-free across the whole tree.
            // E.g. `page/wms/inventory:main`, `script/wms/_helpers:fmtDate`.
            funcs.set(`${fileBase}:${fn.name}`, fn);
            // Bare name — back-compat for legacy single-page apps + tests that
            // call `callFunction(ctx, 'foo')` without a path. Last write wins
            // when names collide; that's fine for unique helpers like
            // `welcome` / `ping`, and the page-scoped lookup wins for collisions.
            funcs.set(fn.name, fn);
            fnNames.push(fn.name);
        }
        fileFns.set(rel, fnNames);
        // Resources, like functions, are page-scoped to avoid collisions —
        // every WMS page declares a `mainView` resource and they would otherwise
        // clobber each other into a single global. We register both the
        // file-qualified key (`page/wms/inbound:mainView`) and the bare name
        // (last write wins) so the bare lookup keeps working for legacy
        // single-file apps and the welcome.cms test.
        for (const r of parsed.resources) {
            resources.set(`${fileBase}:${r.name}`, r);
            resources.set(r.name, r);
        }
        // BO files live under `bo/...`; their resource named `main` carries the
        // <@bo …> declaration. Extract it once at load time so iterator queries
        // can resolve entity → table without re-walking the AST.
        if (rel.startsWith('bo/') && rel.endsWith('.cms')) {
            const boName = rel.replace(/^bo\//, '').replace(/\.cms$/, '');
            const mainResource = parsed.resources.find(r => r.name === 'main');
            if (mainResource) {
                const info = tryExtractBo(boName, mainResource);
                if (info)
                    bos.set(boName, info);
            }
        }
    }
    return { funcs, resources, bos, fileFns };
}
function walk(dir) {
    const out = [];
    for (const entry of readdirSync(dir)) {
        const p = join(dir, entry);
        const st = statSync(p);
        if (st.isDirectory())
            out.push(...walk(p));
        else
            out.push(p);
    }
    return out;
}
