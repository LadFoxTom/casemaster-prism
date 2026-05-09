// Inject favicon + OG meta tags into every docs / playground / migrate / 404 page.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = 'landing-page';

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
  // Skip the landing index — already injected.
  if (relative(ROOT, file) === 'index.html') continue;
  // Skip the OG card source.
  if (relative(ROOT, file).endsWith('og-card.html')) continue;
  // Skip sandbox.
  if (relative(ROOT, file) === 'sandbox.html') continue;

  const rel = relative(ROOT, file).replace(/\\/g, '/');
  const depth = rel.split('/').length - 1; // 0 for root, 1 for docs/x.html, 2 for docs/enhancers/x.html
  const up = depth === 0 ? './' : '../'.repeat(depth);

  const inject =
    `<link rel="icon" href="${up}favicon.svg" type="image/svg+xml">\n` +
    `<meta name="theme-color" content="#2563eb">\n` +
    `<meta property="og:title" content="casemaster-prism">\n` +
    `<meta property="og:description" content="Drop-in design system for CaseMaster apps.">\n` +
    `<meta property="og:image" content="${up}assets/og-card.png">\n` +
    `<meta name="twitter:card" content="summary_large_image">\n` +
    `<meta name="twitter:image" content="${up}assets/og-card.png">\n`;

  let html = readFileSync(file, 'utf8');
  if (html.includes('rel="icon"')) continue; // already injected
  // Insert just before the first <link rel="stylesheet" or before </head>
  if (html.includes('<link rel="stylesheet"')) {
    html = html.replace('<link rel="stylesheet"', inject + '<link rel="stylesheet"');
  } else {
    html = html.replace('</head>', inject + '</head>');
  }
  writeFileSync(file, html, 'utf8');
  console.log(`patched ${rel}`);
}
