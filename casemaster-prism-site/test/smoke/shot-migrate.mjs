import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
mkdirSync('test/smoke/screenshots', { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

await page.goto('http://localhost:4000/migrate/', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

// Full above-the-fold capture
await page.screenshot({ path: 'test/smoke/screenshots/migrate-top.png' });

// Measure gap: bottom of .lead inside .mig-hero, top of first .mig-section h2
const measurements = await page.evaluate(() => {
  const lead = document.querySelector('.mig-hero .lead');
  const h2   = document.querySelector('.mig-section h2');
  const hero = document.querySelector('.mig-hero');
  const main = document.querySelector('main.mig-shell');
  const firstSec = document.querySelector('.mig-section');
  const cs = (el) => window.getComputedStyle(el);
  return {
    leadBottom: lead.getBoundingClientRect().bottom,
    h2Top: h2.getBoundingClientRect().top,
    gapPx: h2.getBoundingClientRect().top - lead.getBoundingClientRect().bottom,
    heroPaddingBottom: cs(hero).paddingBottom,
    heroMarginBottom:  cs(hero).marginBottom,
    leadMarginBottom:  cs(lead).marginBottom,
    mainPaddingTop:    cs(main).paddingTop,
    mainMarginTop:     cs(main).marginTop,
    firstSecMarginTop: cs(firstSec).marginTop,
    h2MarginTop:       cs(h2).marginTop,
  };
});
console.log(JSON.stringify(measurements, null, 2));
await browser.close();
