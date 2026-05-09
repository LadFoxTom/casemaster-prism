import { chromium } from 'playwright';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1200, height: 630 } });
const page = await ctx.newPage();
await page.goto('http://localhost:4000/assets/og-card.html', { waitUntil: 'networkidle' });
await page.waitForTimeout(400);
await page.screenshot({ path: 'landing-page/assets/og-card.png', clip: { x: 0, y: 0, width: 1200, height: 630 } });
console.log('saved landing-page/assets/og-card.png');
await browser.close();
