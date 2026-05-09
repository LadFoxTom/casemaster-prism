// Smoke test for casemaster-prism-site (the .cms-served marketing site).
import { chromium } from 'playwright';

const errors = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.on('console', (m) => { if (m.type() === 'error') errors.push({ url: page.url(), text: m.text() }); });
page.on('pageerror', (e) => { errors.push({ url: page.url(), text: 'PAGEERROR ' + e.message }); });

await page.goto('http://localhost:4000/page/cms-demo', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

const stats = await page.evaluate(() => {
  const tables = document.querySelectorAll('table.table.table-striped, table.cms-table');
  const enhancedTables = document.querySelectorAll('table[data-cms-enhanced]');
  const sortable = document.querySelectorAll('th[data-cms-sortable]');
  const toolbar = document.querySelector('.cms-table-toolbar');
  const t = tables[0];
  const cs = t ? getComputedStyle(t) : null;
  return {
    tableCount: tables.length,
    enhancedTables: enhancedTables.length,
    sortableHeaders: sortable.length,
    toolbarPresent: !!toolbar,
    runtimeAttr: document.body.getAttribute('data-cms-runtime'),
    cmsPrimary: getComputedStyle(document.documentElement).getPropertyValue('--cms-primary').trim(),
    tableBg: cs?.backgroundColor,
    tableRadius: cs?.borderRadius,
  };
});
console.log('stats:', stats);

await page.screenshot({ path: 'test/smoke/screenshots/prism-site.png', fullPage: true });
console.log('saved test/smoke/screenshots/prism-site.png');

console.log(`errors: ${errors.length}`);
for (const e of errors) console.log(`  • [${e.url}] ${e.text}`);

await browser.close();
process.exit(errors.length === 0 ? 0 : 1);
