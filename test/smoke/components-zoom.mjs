// Zoom into the Components section to verify the comp-block tabs work.

import { chromium } from 'playwright';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto('http://localhost:4000/', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);

await page.locator('.comp-block[data-demo="table"]').scrollIntoViewIfNeeded();
await page.waitForTimeout(1500);

// Preview tab
await page.screenshot({ path: 'test/smoke/screenshots/audit/comp-tables-preview.png', clip: { x: 0, y: 0, width: 1440, height: 900 } });
console.log('saved comp-tables-preview.png');

// Click Code tab
await page.locator('.comp-block[data-demo="table"] button[data-pane="code"]').click();
await page.waitForTimeout(500);
await page.screenshot({ path: 'test/smoke/screenshots/audit/comp-tables-code.png', clip: { x: 0, y: 0, width: 1440, height: 900 } });
console.log('saved comp-tables-code.png');

// Click Before tab
await page.locator('.comp-block[data-demo="table"] button[data-pane="before"]').click();
await page.waitForTimeout(800);
await page.screenshot({ path: 'test/smoke/screenshots/audit/comp-tables-before.png', clip: { x: 0, y: 0, width: 1440, height: 900 } });
console.log('saved comp-tables-before.png');

await browser.close();
