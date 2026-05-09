import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
mkdirSync('test/smoke/screenshots/mobile', { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

const pages = [
  { url: '/',                          slug: 'landing' },
  { url: '/docs/',                     slug: 'docs-index' },
  { url: '/docs/getting-started.html', slug: 'docs-getting-started' },
  { url: '/playground/',               slug: 'playground' },
  { url: '/migrate/',                  slug: 'migrate' },
  { url: '/templates/dashboard.html',  slug: 'tpl-dashboard' },
  { url: '/404.html',                  slug: 'notfound' },
];

for (const p of pages) {
  await page.goto('http://localhost:4000' + p.url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `test/smoke/screenshots/mobile/${p.slug}.png`, fullPage: false });
  console.log(`saved mobile/${p.slug}.png`);
}
await browser.close();
