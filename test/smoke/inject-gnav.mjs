// Inject the global-nav host + loader script into every site page.
// Skips template demo pages (they're standalone product previews).

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = 'landing-page';
const SKIP = new Set([
  'sandbox.html',
  'assets/og-card.html',
  // Templates have their own product-style chrome — leave them alone.
  'templates/dashboard.html',
  'templates/settings.html',
  'templates/list-detail.html',
]);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (name.endsWith('.html') && !name.startsWith('_')) out.push(p);
  }
  return out;
}

for (const file of walk(ROOT)) {
  const rel = relative(ROOT, file).replace(/\\/g, '/');
  if (SKIP.has(rel)) continue;

  const depth = rel.split('/').length - 1;
  const root = depth === 0 ? './' : '../'.repeat(depth);
  const navJs = root + 'assets/nav.js';

  let html = readFileSync(file, 'utf8');

  if (html.includes('id="gnav-host"')) {
    // Re-write the data-root attribute in case the page moved.
    html = html.replace(/id="gnav-host"[^>]*data-root="[^"]*"/, `id="gnav-host" data-root="${root}"`);
    writeFileSync(file, html, 'utf8');
    continue;
  }

  // Remove legacy <header class="site-header">…</header> block (if any).
  html = html.replace(/<header class="site-header">[\s\S]*?<\/header>\s*/, '');

  // Inject <div id="gnav-host"> right after <body> so it's the first grid cell.
  html = html.replace(
    /<body([^>]*)>/i,
    `<body$1>\n<div id="gnav-host" data-root="${root}"></div>`,
  );

  // Inject <script src="…nav.js"> right before </body>.
  if (!html.includes(`src="${navJs}"`)) {
    html = html.replace(
      /<\/body>/i,
      `<script src="${navJs}"></script>\n</body>`,
    );
  }

  writeFileSync(file, html, 'utf8');
  console.log(`patched ${rel}`);
}
