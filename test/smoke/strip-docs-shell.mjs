// The docs pages used to render <div class="docs-shell"><aside class="docs-sidebar">…<main>
// — but with the global gnav now on every page, the docs-sidebar is redundant.
// This script strips the docs-shell wrapper and the docs-sidebar aside,
// promoting <main class="docs-content"> to a top-level child of <body>.

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'landing-page/docs';

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
  let html = readFileSync(file, 'utf8');
  if (!html.includes('docs-shell')) continue;

  // Remove the opening <div class="docs-shell"> ... <aside class="docs-sidebar"…></aside>
  html = html.replace(
    /<div class="docs-shell">\s*<aside class="docs-sidebar"[^>]*><\/aside>\s*/m,
    '',
  );

  // Remove the closing </div> after <main class="docs-content">…</main>.
  // The pattern is `</main>\n</div>` at the very end of the doc content.
  // Match `</main>` followed by optional whitespace and `</div>` immediately.
  html = html.replace(/(<\/main>)\s*<\/div>/, '$1');

  // Remove the per-page sidebar-loader script block (if any) since the
  // global nav handles that now.
  html = html.replace(/<script>\s*\(function\s*\(\)\s*\{\s*fetch\('[^']*_sidebar\.html'\)[\s\S]*?\}\)\(\);\s*<\/script>\s*/g, '');

  writeFileSync(file, html, 'utf8');
  console.log(`stripped ${file}`);
}
