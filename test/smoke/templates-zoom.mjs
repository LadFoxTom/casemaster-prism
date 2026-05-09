// Capture each template + the templates section on the landing page.

import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

mkdirSync('test/smoke/screenshots/templates', { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

// Templates section on landing
await page.goto('http://localhost:4000/#templates', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.screenshot({ path: 'test/smoke/screenshots/templates/landing-templates.png' });
console.log('saved landing-templates.png');

// Each template
for (const slug of ['dashboard', 'settings', 'list-detail']) {
  await page.goto(`http://localhost:4000/templates/${slug}.html`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `test/smoke/screenshots/templates/${slug}.png` });
  console.log(`saved ${slug}.png`);

  // Linear preset
  await page.locator('button[data-preset="linear"]').click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `test/smoke/screenshots/templates/${slug}-linear.png` });
  console.log(`saved ${slug}-linear.png`);
}

await browser.close();
