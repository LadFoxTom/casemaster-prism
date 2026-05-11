// Cross-page width consistency check. Loads every top-level route in
// a headless browser, measures the computed left edge + width of the
// main content wrapper, and reports if they don't agree.

import { chromium } from 'playwright';

const PAGES = [
  { url: 'http://localhost:4000/',           selector: 'main' },
  { url: 'http://localhost:4000/docs',       selector: '.docs-content' },
  { url: 'http://localhost:4000/docs/themes', selector: '.docs-content' },
  { url: 'http://localhost:4000/docs/enhancers/tables', selector: '.docs-content' },
  { url: 'http://localhost:4000/migrate',    selector: 'main.mig-shell' },
  { url: 'http://localhost:4000/migrate',    selector: '.mig-hero' },
  { url: 'http://localhost:4000/playground', selector: '.pg-shell' },
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const rows = [];
for (const p of PAGES) {
  await page.goto(p.url, { waitUntil: 'networkidle' });
  const rect = await page.locator(p.selector).first().boundingBox();
  rows.push({ url: p.url, selector: p.selector, left: rect?.x ?? null, width: rect?.width ?? null });
}
await browser.close();

console.log('page                                              selector              left   width');
console.log('─'.repeat(95));
for (const r of rows) {
  console.log(
    r.url.padEnd(50),
    r.selector.padEnd(20),
    String(Math.round(r.left)).padStart(5),
    String(Math.round(r.width)).padStart(6)
  );
}
