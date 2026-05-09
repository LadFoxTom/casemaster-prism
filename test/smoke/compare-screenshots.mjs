// Capture before/after screenshots of /page/wms/item:
//   - "before": forcibly disable the @import in app.css by routing the request
//   - "after":  let the page load normally
// Saves both PNGs into test/smoke/screenshots/ for side-by-side comparison.

import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const URL = 'http://localhost:5051/page/wms/item';
const OUT = 'test/smoke/screenshots';

const browser = await chromium.launch();

// --- BEFORE: stub out our CSS import + JS bundle so the page renders raw ---
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.route('**/cms-ui/**', (route) => route.fulfill({ status: 200, body: '' }));
  await ctx.route('**/static/css/app.css*', (route) =>
    route.fulfill({ status: 200, contentType: 'text/css', body: '/* stubbed for before-shot */' }),
  );
  await ctx.route('**/static/js/app.js*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/javascript', body: '// stubbed' }),
  );
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/item-before.png`, fullPage: true });
  await ctx.close();
  console.log(`saved ${OUT}/item-before.png`);
}

// --- AFTER: full pipeline, no cache ---
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/item-after.png`, fullPage: true });

  const probe = await page.evaluate(() => {
    const t = document.querySelector('table.table.table-striped');
    const cs = t ? getComputedStyle(t) : null;
    const headers = document.querySelectorAll('th[data-cms-sortable]');
    const toolbar = document.querySelector('.cms-table-toolbar');
    return {
      tableBg: cs?.backgroundColor,
      tableRadius: cs?.borderRadius,
      tableShadow: cs?.boxShadow,
      sortableHeaders: headers.length,
      toolbarPresent: !!toolbar,
      cmsPrimary: getComputedStyle(document.documentElement).getPropertyValue('--cms-primary').trim(),
    };
  });
  console.log('after probe:', probe);
  await ctx.close();
  console.log(`saved ${OUT}/item-after.png`);
}

await browser.close();
