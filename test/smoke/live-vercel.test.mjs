// Smoke test against cms-vercel dev server (port 5052).
// Confirms theme + enhancers run end-to-end on the second runtime,
// matching what we already proved on .NET.

import { chromium } from 'playwright';

const BASE = 'http://localhost:5052';
const PAGES = [
  { url: '/page/wms', label: 'dashboard' },
  { url: '/page/wms/item', label: 'item-list' },
  { url: '/page/wms/yard_slot', label: 'yard-slot' },
  { url: '/page/wms/inventory', label: 'inventory' },
];

const errors = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

page.on('console', (msg) => { if (msg.type() === 'error') errors.push({ at: page.url(), text: msg.text() }); });
page.on('pageerror', (err) => { errors.push({ at: page.url(), text: 'PAGEERROR ' + err.message }); });

for (const p of PAGES) {
  console.log(`\n--- ${p.label} (${p.url}) ---`);
  await page.goto(BASE + p.url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const stats = await page.evaluate(() => {
    const tables = document.querySelectorAll('table.table.table-striped, table.cms-table');
    const sortableHeaders = document.querySelectorAll('th[data-cms-sortable]');
    const enhancedTables = document.querySelectorAll('table[data-cms-enhanced]');
    const toolbar = document.querySelector('.cms-table-toolbar');
    const t = tables[0];
    const cs = t ? getComputedStyle(t) : null;
    return {
      tableCount: tables.length,
      sortableHeaders: sortableHeaders.length,
      enhancedTables: enhancedTables.length,
      toolbarPresent: !!toolbar,
      tableBg: cs?.backgroundColor,
      tableRadius: cs?.borderRadius,
      cmsPrimary: getComputedStyle(document.documentElement).getPropertyValue('--cms-primary').trim(),
    };
  });
  console.log('  tables:', stats.tableCount, 'enhanced:', stats.enhancedTables, 'sortableHeaders:', stats.sortableHeaders);
  console.log('  toolbar:', stats.toolbarPresent);
  console.log('  first-table bg:', stats.tableBg, 'radius:', stats.tableRadius);
  console.log('  --cms-primary:', stats.cmsPrimary || '(unset)');
}

console.log(`\n--- summary ---`);
console.log(`Console / page errors: ${errors.length}`);
for (const e of errors) console.log(`  • [${e.at}] ${e.text}`);

await browser.close();
process.exit(errors.length === 0 ? 0 : 1);
