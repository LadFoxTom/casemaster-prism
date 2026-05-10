// Convert every "page" HTML file under public/ into an app/page/*.cms
// file that emits the same body via response.write. After conversion,
// the public/*.html files are deleted (we want the route to be served
// by the cms-vercel runtime, not by Vercel's static layer).
//
// Static assets (templates/, sandbox.html, _nav.html, assets/, lib/,
// favicon, manifest) stay in public/ untouched.

import { readFileSync, writeFileSync, mkdirSync, statSync, readdirSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';

const PUBLIC = 'casemaster-prism-site/public';
const APP    = 'casemaster-prism-site/app/page';

// Routes we convert: [publicHtmlPath, cmsTargetPath].
// cms-vercel maps URL /page/<path> to app/page/<path>.cms, so:
//   public/docs/index.html  → app/page/docs.cms     (URL /docs)
//   public/docs/themes.html → app/page/docs/themes.cms (URL /docs/themes)
//   public/playground/index.html → app/page/playground.cms (URL /playground)
const routes = [
  ['index.html',                          'index.cms'],

  ['docs/index.html',                     'docs.cms'],
  ['docs/getting-started.html',           'docs/getting-started.cms'],
  ['docs/themes.html',                    'docs/themes.cms'],
  ['docs/tokens.html',                    'docs/tokens.cms'],
  ['docs/variants.html',                  'docs/variants.cms'],
  ['docs/configuration.html',             'docs/configuration.cms'],
  ['docs/integration-dotnet.html',        'docs/integration-dotnet.cms'],
  ['docs/integration-vercel.html',        'docs/integration-vercel.cms'],
  ['docs/migration.html',                 'docs/migration.cms'],
  ['docs/troubleshooting.html',           'docs/troubleshooting.cms'],
  ['docs/faq.html',                       'docs/faq.cms'],
  ['docs/enhancers/tables.html',          'docs/enhancers/tables.cms'],
  ['docs/enhancers/forms.html',           'docs/enhancers/forms.cms'],
  ['docs/enhancers/confirm.html',         'docs/enhancers/confirm.cms'],
  ['docs/enhancers/loading.html',         'docs/enhancers/loading.cms'],
  ['docs/enhancers/toasts.html',          'docs/enhancers/toasts.cms'],
  ['docs/enhancers/shortcuts.html',       'docs/enhancers/shortcuts.cms'],
  ['docs/enhancers/modal-links.html',     'docs/enhancers/modal-links.cms'],
  ['docs/enhancers/inline-edit.html',     'docs/enhancers/inline-edit.cms'],
  ['docs/enhancers/command.html',         'docs/enhancers/command.cms'],

  ['playground/index.html',               'playground.cms'],
  ['migrate/index.html',                  'migrate.cms'],
  ['404.html',                            'notfound.cms'],
];

function escapeForBacktick(s) {
  // resolveTemplate uses {{…}} for substitutions; backticks close the
  // outer template literal. Escape both, plus dollar-curly which is
  // ES template syntax.
  return s
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\${/g, '\\${');
}

function makeCms(html) {
  // The runtime sees `<!doctype` at the start and skips wrapInDefaultShell.
  return `// Auto-generated from public/ HTML by convert-html-to-cms.mjs.
// This page is rendered by cms-vercel, themed by casemaster-prism.
// To edit, edit the source HTML and re-run the converter, or edit
// this .cms file directly.

inherits 'base'

function main()
    response.setContentType('text/html; charset=utf-8')
    response.write(\`${escapeForBacktick(html)}\`)
end-function
`;
}

let created = 0;
let deleted = 0;
for (const [src, dst] of routes) {
  const srcPath = join(PUBLIC, src);
  const dstPath = join(APP, dst);

  let html;
  try { html = readFileSync(srcPath, 'utf8'); }
  catch { console.warn(`SKIP missing source: ${srcPath}`); continue; }

  mkdirSync(dirname(dstPath), { recursive: true });
  writeFileSync(dstPath, makeCms(html), 'utf8');
  created++;

  // Delete the public HTML so Vercel doesn't serve it directly.
  // (We want the route to go through the .cms runtime.)
  try { unlinkSync(srcPath); deleted++; }
  catch (e) { console.warn(`could not delete ${srcPath}:`, e.message); }
}

console.log(`Created ${created} .cms files, deleted ${deleted} public/*.html files.`);
