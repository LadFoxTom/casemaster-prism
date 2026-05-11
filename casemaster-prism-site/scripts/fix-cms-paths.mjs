// Rewrite relative asset/link URLs inside .cms response.write() bodies to
// absolute paths, so they resolve correctly when the page is served at a
// trailing-slash-less friendly URL (e.g. /docs, /docs/themes,
// /docs/enhancers/tables).
//
// The .cms files were originally generated from static HTML, where
// relative paths worked because the file lived at /docs/themes.html.
// Once those same paths are emitted by a function at /docs/themes
// (no .html, no trailing slash), the browser's base directory shifts
// up one segment and every "../" / "./" reference resolves to the
// wrong place.

import { readFileSync, writeFileSync, statSync, existsSync } from 'node:fs';
import { readdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';

const PAGE_DIR = new URL('../app/page/', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else if (name.endsWith('.cms')) out.push(p);
  }
  return out;
}

const RULES = [
  // Favicon — any depth of ../ → absolute
  [/href="(?:\.\.?\/)+favicon\.svg"/g, 'href="/favicon.svg"'],
  // og-card image — any depth
  [/(href|content)="(?:\.\.?\/)+assets\/og-card\.png"/g, '$1="/assets/og-card.png"'],
  // site.css / site.js / nav.js — global assets, always under /assets/
  [/(href|src)="(?:\.\.?\/)+assets\/(site\.css|site\.js|nav\.js)"/g, '$1="/assets/$2"'],
  // docs.css / docs.js — always under /docs/assets/
  [/(href|src)="(?:\.\.?\/)*assets\/(docs\.css|docs\.js)"/g, '$1="/docs/assets/$2"'],
  // Manifest
  [/href="(?:\.\.?\/)+manifest\.webmanifest"/g, 'href="/manifest.webmanifest"'],
];

// Per-directory link rewrites (anchor hrefs to other docs pages).
// We need the file's own directory depth to map relative anchor hrefs
// like "./themes.html" or "../enhancers/tables.html" to absolute.
function fixDocLinks(src, fileAbs) {
  // Determine the URL **directory** the page originally lived in
  // (i.e. the directory whose index/sibling the original HTML was).
  // Relative anchor hrefs resolve against this directory, regardless
  // of the friendly URL the page is now served at.
  //
  //   app/page/index.cms              → /            (was /index.html)
  //   app/page/playground.cms         → /            (was /playground.html)
  //   app/page/migrate.cms            → /            (was /migrate.html)
  //   app/page/docs.cms               → /docs/       (was /docs/index.html — index of docs/)
  //   app/page/docs/themes.cms        → /docs/       (was /docs/themes.html)
  //   app/page/docs/enhancers/x.cms   → /docs/enhancers/  (was /docs/enhancers/x.html)
  //
  // Rule: if a .cms file has a sibling directory of the same stem
  // (e.g. docs.cms has docs/ next to it), treat it as that
  // directory's index — base dir is /<stem>/. Otherwise base dir
  // is the file's own parent directory in the URL tree.
  const fileNorm = fileAbs.replaceAll('\\', '/');
  const relFromPage = fileNorm.split('/app/page/')[1];
  const parentRel = dirname(relFromPage);          // e.g. "docs/enhancers", "docs", "."
  const stem = basename(relFromPage, '.cms');      // e.g. "tables", "docs", "index"
  const siblingDir = join(dirname(fileAbs), stem);
  const isDirIndex = existsSync(siblingDir) && statSync(siblingDir).isDirectory();

  let ownDir;
  if (isDirIndex) {
    // The page is the index of <stem>/ — base is /<parent>/<stem>/
    const parts = (parentRel === '.' ? [] : parentRel.split('/')).concat(stem);
    ownDir = '/' + parts.join('/') + '/';
  } else {
    // Base is the page's own URL directory.
    const parts = parentRel === '.' ? [] : parentRel.split('/');
    ownDir = parts.length ? '/' + parts.join('/') + '/' : '/';
  }

  // For an anchor href, resolve relative to the page's base directory
  // (ownDir is a directory path ending in "/").
  function resolveLink(href) {
    if (/^(?:[a-z]+:|#|mailto:|tel:|\/)/i.test(href)) return href; // absolute / scheme / fragment
    // Split off fragment so it survives normalisation.
    const hashIdx = href.indexOf('#');
    const hash = hashIdx === -1 ? '' : href.slice(hashIdx);
    let h = hashIdx === -1 ? href : href.slice(0, hashIdx);
    // Strip .html suffix — friendly URLs drop it.
    h = h.replace(/\.html(\?|$)/, '$1');

    // Resolve relative path against ownDir (directory).
    const baseSegs = ownDir.split('/').filter(Boolean); // directory segments
    const parts = h.split('/');
    for (const p of parts) {
      if (p === '' || p === '.') continue;
      if (p === '..') baseSegs.pop();
      else baseSegs.push(p);
    }
    let out = '/' + baseSegs.join('/');

    // "index" path component at the end means the directory's index
    // → drop it (friendly URL is the directory itself, no trailing slash).
    out = out.replace(/\/index$/, '');
    if (!out) out = '/';
    return out + hash;
  }

  return src.replace(/<a([^>]*?)\shref="([^"]+)"/g, (m, before, href) => {
    // Skip already-absolute, scheme, fragment, mailto, tel
    if (/^(?:[a-z]+:|#|mailto:|tel:|\/)/i.test(href)) return m;
    return `<a${before} href="${resolveLink(href)}"`;
  });
}

let changedFiles = 0;
for (const f of walk(PAGE_DIR)) {
  const orig = readFileSync(f, 'utf8');
  let next = orig;
  for (const [re, sub] of RULES) next = next.replace(re, sub);
  next = fixDocLinks(next, f);
  if (next !== orig) {
    writeFileSync(f, next);
    changedFiles++;
    console.log('fixed', f);
  }
}
console.log(`\n${changedFiles} file(s) updated`);
