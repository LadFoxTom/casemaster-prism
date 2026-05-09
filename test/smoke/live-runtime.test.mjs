// Smoke test — boot Chromium against the live .NET runtime on :5051
// and check that:
//   - the dashboard, an item list page, and a stock page load
//   - cms-ui CSS rules apply (computed background-color of the table)
//   - cms-ui JS attaches data-cms-sortable to table headers
//   - no console errors are logged
//
// Run with:  node test/smoke/live-runtime.test.mjs

import { chromium } from 'playwright';

const BASE = 'http://localhost:5051';
const PAGES = [
  { url: '/page/wms', label: 'dashboard' },
  { url: '/page/wms/item', label: 'item-list' },
  { url: '/page/wms/yard_slot', label: 'yard-slot' },
  { url: '/page/wms/stock', label: 'stock' },
];

const errors = [];
const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push({ at: page.url(), text: msg.text() });
});
page.on('pageerror', (err) => {
  errors.push({ at: page.url(), text: 'PAGEERROR ' + err.message });
});

for (const p of PAGES) {
  console.log(`\n--- ${p.label} (${p.url}) ---`);
  await page.goto(BASE + p.url, { waitUntil: 'networkidle' });

  // Wait a tick for the cms-ui module + its DOMContentLoaded handler to run.
  await page.waitForTimeout(500);

  const stats = await page.evaluate(() => {
    const tables = document.querySelectorAll('table.table.table-striped, table.cms-table');
    const sortableHeaders = document.querySelectorAll('th[data-cms-sortable]');
    const enhancedTables = document.querySelectorAll('table[data-cms-enhanced]');
    const toolbar = document.querySelector('.cms-table-toolbar');
    const select2Wrapped = document.querySelectorAll('.select2-hidden-accessible');
    const tomSelectWrapped = document.querySelectorAll('.ts-wrapper');

    let firstTableBg = null;
    let firstTableRadius = null;
    if (tables[0]) {
      const cs = getComputedStyle(tables[0]);
      firstTableBg = cs.backgroundColor;
      firstTableRadius = cs.borderRadius;
    }

    return {
      tableCount: tables.length,
      sortableHeaders: sortableHeaders.length,
      enhancedTables: enhancedTables.length,
      toolbarPresent: !!toolbar,
      select2Wrapped: select2Wrapped.length,
      tomSelectWrapped: tomSelectWrapped.length,
      firstTableBg,
      firstTableRadius,
      cmsPrimary: getComputedStyle(document.documentElement).getPropertyValue('--cms-primary').trim(),
      hasCmsToastContainer: !!document.querySelector('.cms-toast-container'),
    };
  });

  console.log('  tables:', stats.tableCount, 'enhanced:', stats.enhancedTables, 'sortableHeaders:', stats.sortableHeaders);
  console.log('  toolbar present:', stats.toolbarPresent);
  console.log('  Select2 wrapped:', stats.select2Wrapped, '(skipped by cms-ui)');
  console.log('  TomSelect wrapped:', stats.tomSelectWrapped);
  console.log('  first-table bg:', stats.firstTableBg, 'radius:', stats.firstTableRadius);
  console.log('  --cms-primary:', stats.cmsPrimary || '(unset)');
}

console.log(`\n--- summary ---`);
console.log(`Console errors / page errors: ${errors.length}`);
for (const e of errors) {
  console.log(`  • [${e.at}] ${e.text}`);
}

await browser.close();
process.exit(errors.length === 0 ? 0 : 1);
