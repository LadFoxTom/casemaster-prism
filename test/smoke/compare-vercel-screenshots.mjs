// Generate before/after screenshots of /page/wms/item on cms-vercel,
// matching what compare-screenshots.mjs does for the .NET runtime.

import { chromium } from 'playwright';

const URL = 'http://localhost:5052/page/wms/item';
const OUT = 'test/smoke/screenshots';

const browser = await chromium.launch();

// BEFORE: stub out cms-ui assets so the page renders raw BS4
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.route('**/cms-ui/**', (route) => route.fulfill({ status: 200, body: '' }));
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/vercel-item-before.png`, fullPage: true });
  await ctx.close();
  console.log(`saved ${OUT}/vercel-item-before.png`);
}

// AFTER
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/vercel-item-after.png`, fullPage: true });
  await ctx.close();
  console.log(`saved ${OUT}/vercel-item-after.png`);
}

await browser.close();
