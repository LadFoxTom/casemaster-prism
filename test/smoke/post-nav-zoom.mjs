import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

mkdirSync('test/smoke/screenshots/post-nav', { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const pages = [
  ['/',                            'landing'],
  ['/docs/',                       'docs-index'],
  ['/docs/getting-started.html',   'docs-getting-started'],
  ['/docs/themes.html',            'docs-themes'],
  ['/docs/enhancers/tables.html',  'docs-enhancers-tables'],
  ['/playground/',                 'playground'],
  ['/migrate/',                    'migrate'],
  ['/404.html',                    'notfound'],
];

const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push({ url: page.url(), text: m.text() }); });
page.on('pageerror', (e) => { errors.push({ url: page.url(), text: 'PAGEERROR ' + e.message }); });

for (const [url, slug] of pages) {
  await page.goto('http://localhost:4000' + url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  await page.screenshot({ path: `test/smoke/screenshots/post-nav/${slug}.png` });
  console.log(`saved ${slug}`);
}

console.log(`\nerrors: ${errors.length}`);
for (const e of errors) console.log(`  • [${e.url}] ${e.text}`);

await browser.close();
process.exit(errors.length === 0 ? 0 : 1);
