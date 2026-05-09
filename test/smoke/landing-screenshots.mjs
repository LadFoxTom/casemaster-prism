// Capture full-page screenshots of the landing page.

import { chromium } from 'playwright';

const URL = 'http://localhost:4000/';
const OUT = 'test/smoke/screenshots';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

await page.goto(URL, { waitUntil: 'networkidle' });

// Trigger lazy iframes before screenshotting
await page.evaluate(async () => {
  const total = document.documentElement.scrollHeight;
  for (let y = 0; y <= total; y += 600) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 80));
  }
  window.scrollTo(0, 0);
});
await page.waitForTimeout(2500);

// Light
await page.screenshot({ path: `${OUT}/landing-light.png`, fullPage: true });
console.log(`saved ${OUT}/landing-light.png`);

// Dark
await page.click('[data-theme-toggle]');
await page.waitForTimeout(800);
await page.evaluate(async () => {
  const total = document.documentElement.scrollHeight;
  for (let y = 0; y <= total; y += 600) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 80));
  }
  window.scrollTo(0, 0);
});
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/landing-dark.png`, fullPage: true });
console.log(`saved ${OUT}/landing-dark.png`);

// Hero shot (above-the-fold)
await page.click('[data-theme-toggle]');
await page.waitForTimeout(400);
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/landing-hero.png`, fullPage: false });
console.log(`saved ${OUT}/landing-hero.png`);

await browser.close();
