// Verify each landing-page anchor scrolls into view.
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
mkdirSync('test/smoke/screenshots/anchors', { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

for (const slug of ['', 'install', 'components', 'themes', 'templates', 'variants', 'enhancers']) {
  const url = 'http://localhost:4000/' + (slug ? '#' + slug : '');
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const found = await page.evaluate((id) => {
    if (!id) return { ok: true, top: 0 };
    const el = document.getElementById(id);
    if (!el) return { ok: false, top: null };
    const rect = el.getBoundingClientRect();
    return { ok: true, top: Math.round(rect.top), height: Math.round(rect.height) };
  }, slug);
  const fname = (slug || 'root') + '.png';
  await page.screenshot({ path: `test/smoke/screenshots/anchors/${fname}` });
  const label = (slug || '(root)').padEnd(12);
  console.log(`${label}  → top=${found.top}  height=${found.height ?? '-'}  found=${found.ok}`);
}
await browser.close();
