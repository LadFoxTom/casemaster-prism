// One-shot generator for docs pages. Run from this directory:
//   node _build-docs.mjs
//
// Reads `_pages.json` for the page list and writes each one.
// Header / sidebar host / footer nav are common chrome.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const pages = JSON.parse(readFileSync(join(__dirname, '_pages.json'), 'utf8'));

const HEADER = (depth) => `<header class="site-header">
  <div class="site-header-inner">
    <a class="site-brand" href="${'../'.repeat(depth + 1)}">
      <span class="site-brand-mark"></span>
      casemaster-prism
      <span class="site-tag">v0.3.0 · docs</span>
    </a>
    <nav class="site-nav">
      <a href="${'../'.repeat(depth + 1)}">Landing</a>
      <a href="${'../'.repeat(depth)}index.html">Docs home</a>
      <button data-theme-toggle aria-label="Toggle dark mode">Dark</button>
    </nav>
  </div>
</header>`;

const SHELL_OPEN = (depth) => `<div class="docs-shell">
  <aside class="docs-sidebar" id="docs-sidebar-host"></aside>
  <main class="docs-content">`;

const SHELL_CLOSE = `  </main>
</div>`;

function FOOTER_NAV(prev, next) {
  if (!prev && !next) return '';
  const left = prev ? `<a href="${prev.href}"><small>← Previous</small>${prev.label}</a>` : '<span></span>';
  const right = next ? `<a class="next" href="${next.href}"><small>Next →</small>${next.label}</a>` : '<span></span>';
  return `<div class="docs-footer-nav">${left}${right}</div>`;
}

function pageHTML(p) {
  const depth = (p.slug.match(/\//g) || []).length;
  const cssRef = `${'../'.repeat(depth)}assets/docs.css`;
  const jsRef  = `${'../'.repeat(depth)}assets/docs.js`;
  const homeRef = `${'../'.repeat(depth + 1)}`;
  const docsRef = `${'../'.repeat(depth)}index.html`;
  const sidebarRef = `${'../'.repeat(depth)}_sidebar.html`;

  const breadcrumbExtra = p.crumb ? p.crumb.split('/').map((s) => s.trim()).filter(Boolean) : [];
  const crumbHTML = `<a href="${homeRef}">Home</a> &nbsp;/&nbsp; <a href="${docsRef}">Docs</a>` +
    (breadcrumbExtra.length ? ' &nbsp;/&nbsp; ' + breadcrumbExtra.join(' &nbsp;/&nbsp; ') : '') +
    ' &nbsp;/&nbsp; ' + p.title;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
<title>${p.title} · casemaster-prism docs</title>
<meta name="description" content="${p.description ?? p.title + ' — casemaster-prism docs'}">
<link rel="stylesheet" href="${cssRef}">
</head>
<body>

${HEADER(depth)}

${SHELL_OPEN(depth)}
    <p class="docs-breadcrumb">${crumbHTML}</p>

    <h1>${p.title}</h1>
    ${p.lead ? `<p class="docs-lead">${p.lead}</p>` : ''}

${p.body}

    ${FOOTER_NAV(p.prev, p.next)}
${SHELL_CLOSE}

<script>
  // Inject the sidebar HTML manually (relative path differs per depth)
  (function () {
    fetch('${sidebarRef}').then((r) => r.text()).then((h) => {
      const host = document.getElementById('docs-sidebar-host');
      if (!host) return;
      host.innerHTML = h;
      const here = location.pathname.split('/').pop();
      host.querySelectorAll('a[href]').forEach((a) => {
        const t = a.getAttribute('href').split('/').pop();
        if (t === here) a.classList.add('is-current');
      });
      const search = host.querySelector('.docs-search');
      if (search) search.addEventListener('input', () => {
        const q = search.value.trim().toLowerCase();
        host.querySelectorAll('.docs-nav a').forEach((a) => {
          a.classList.toggle('is-hidden', !!q && !a.textContent.toLowerCase().includes(q));
        });
      });
    });
  })();
</script>
<script src="${jsRef}"></script>
</body>
</html>`;
}

for (const p of pages) {
  const out = join(__dirname, p.slug + '.html');
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, pageHTML(p), 'utf8');
  console.log(`wrote ${p.slug}.html`);
}
