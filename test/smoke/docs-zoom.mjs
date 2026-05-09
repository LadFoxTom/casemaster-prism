import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

mkdirSync('test/smoke/screenshots/docs', { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

for (const slug of ['', 'getting-started', 'themes', 'configuration', 'migration', 'troubleshooting', 'enhancers/tables']) {
  const url = `http://localhost:4000/docs/${slug ? slug + '.html' : ''}`;
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  await page.screenshot({ path: `test/smoke/screenshots/docs/${(slug || 'index').replace('/', '_')}.png`, fullPage: true });
  console.log(`saved ${slug || 'index'}`);
}
await browser.close();
