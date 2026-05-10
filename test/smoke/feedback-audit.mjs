// Capture all the pages mentioned in user feedback so I can see
// what's actually rendering.

import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
mkdirSync('test/smoke/screenshots/feedback', { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push({ url: page.url(), text: m.text() }); });
page.on('pageerror', (e) => { errors.push({ url: page.url(), text: 'PAGEERROR ' + e.message }); });

const pages = [
  ['/',                         'landing'],
  ['/docs/',                    'docs-home'],
  ['/docs/getting-started.html','docs-getting-started'],
  ['/playground/',              'playground'],
  ['/migrate/',                 'migrate'],
  ['/page/cms-demo',            'cms-demo'],
  ['/404.html',                 'notfound'],
];
for (const [url, slug] of pages) {
  await page.goto('http://localhost:4000' + url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `test/smoke/screenshots/feedback/${slug}.png`, fullPage: true });
  console.log(`saved ${slug}`);
}

console.log(`\nerrors: ${errors.length}`);
for (const e of errors) console.log(`  • [${e.url}] ${e.text}`);

await browser.close();
