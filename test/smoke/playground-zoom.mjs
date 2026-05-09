import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
mkdirSync('test/smoke/screenshots/playground', { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

await page.goto('http://localhost:4000/playground/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
await page.screenshot({ path: 'test/smoke/screenshots/playground/default.png' });
console.log('saved default.png');

// Click button → soft-primary + pill
await page.click('[data-class="btn-soft-primary"]');
await page.click('[data-class="btn-pill"]');
await page.waitForTimeout(400);
const cls = await page.locator('#pg-class').textContent();
console.log('class string:', cls);
await page.screenshot({ path: 'test/smoke/screenshots/playground/btn-soft-pill.png' });

// Switch to Linear
await page.click('#presetSwitch button[data-preset="linear"]');
await page.waitForTimeout(800);
await page.screenshot({ path: 'test/smoke/screenshots/playground/linear.png' });

await browser.close();
