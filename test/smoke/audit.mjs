// Visual audit. Captures each section of the landing page individually
// + a couple of WMS snapshots (light + dark, both runtimes) so we can
// scrutinise the comparison frames side-by-side.

import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const OUT = 'test/smoke/screenshots/audit';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

// ---------- Landing — section by section ----------
const LANDING = 'http://localhost:4000/';

async function landingSection(name, selector, theme) {
  await page.goto(LANDING, { waitUntil: 'networkidle' });
  if (theme === 'dark') {
    await page.click('[data-theme-toggle]');
    await page.waitForTimeout(400);
  }
  await page.evaluate(async () => {
    const total = document.documentElement.scrollHeight;
    for (let y = 0; y <= total; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 80));
    }
  });
  await page.waitForTimeout(1500);
  const target = await page.locator(selector).first();
  await target.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await target.screenshot({ path: `${OUT}/landing-${name}-${theme}.png` });
  console.log(`saved landing-${name}-${theme}.png`);
}

const sections = [
  ['hero',       'main > section.hero'],
  ['install',    '#install'],
  ['components', '#components'],
  ['enhancers',  '#enhancers'],
  ['tokens',     '#tokens'],
  ['config',     '#config'],
];

for (const [n, s] of sections) {
  await landingSection(n, s, 'light');
}

// ---------- WMS pages on both runtimes (light + dark) ----------
async function wmsShot(label, base, dark) {
  await page.goto(base + '/page/wms/item', { waitUntil: 'networkidle' });
  if (dark) {
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    await page.waitForTimeout(300);
  }
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/wms-${label}.png`, fullPage: true });
  console.log(`saved wms-${label}.png`);
}
await wmsShot('dotnet-light', 'http://localhost:5051', false);
await wmsShot('dotnet-dark',  'http://localhost:5051', true);
await wmsShot('vercel-light', 'http://localhost:5052', false);
await wmsShot('vercel-dark',  'http://localhost:5052', true);

await browser.close();
