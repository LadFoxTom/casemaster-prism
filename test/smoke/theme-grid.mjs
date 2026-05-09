// Capture each preset theme rendered on the toolbar-table demo.
// Helps verify the theme picker swaps tokens cleanly.

import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const OUT = 'test/smoke/screenshots/audit/themes';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

const PRESETS = [
  { id: '',        label: 'default'  },
  { id: 'linear',  label: 'linear'   },
  { id: 'tabler',  label: 'tabler'   },
  { id: 'material',label: 'material' },
];

for (const p of PRESETS) {
  const ctx = await browser.newContext({ viewport: { width: 720, height: 540 } });
  const page = await ctx.newPage();
  let url = 'http://localhost:4000/sandbox.html?demo=toolbar-table&ui=1';
  if (p.id) url += `&preset=${p.id}`;
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/table-${p.label}.png` });
  await ctx.close();
  console.log(`saved theme: ${p.label}`);
}

// One row of buttons per preset — most distinctive shapes there
for (const p of PRESETS) {
  const ctx = await browser.newContext({ viewport: { width: 720, height: 360 } });
  const page = await ctx.newPage();
  let url = 'http://localhost:4000/sandbox.html?demo=variants-buttons&ui=1';
  if (p.id) url += `&preset=${p.id}`;
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/buttons-${p.label}.png` });
  await ctx.close();
  console.log(`saved buttons: ${p.label}`);
}

await browser.close();
