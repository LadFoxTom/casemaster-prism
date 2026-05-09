// Zoom into the iframe contents — capture each "before/after" pair
// at iframe-internal resolution so we can see what's broken.

import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const OUT = 'test/smoke/screenshots/audit/zoom';
mkdirSync(OUT, { recursive: true });

const DEMOS = ['table', 'form', 'buttons', 'cards', 'alerts', 'badges', 'pagination', 'toolbar-table', 'cmdk', 'inline-edit'];
const HEIGHTS = { 'form': 540, 'cards': 300, 'cmdk': 320, 'inline-edit': 280, 'pagination': 110, 'badges': 180, 'buttons': 200, 'toolbar-table': 540, 'table': 380, 'alerts': 280 };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 720, height: 600 } });

for (const demo of DEMOS) {
  const h = HEIGHTS[demo] || 400;
  for (const ui of [0, 1]) {
    const url = `http://localhost:4000/sandbox.html?demo=${demo}&ui=${ui}`;
    const p = await ctx.newPage();
    await p.setViewportSize({ width: 720, height: h });
    await p.goto(url, { waitUntil: 'networkidle' });
    await p.waitForTimeout(700);
    await p.screenshot({ path: `${OUT}/${demo}-${ui ? 'after' : 'before'}.png` });
    await p.close();
  }
  console.log(`zoomed ${demo}`);
}

await browser.close();
