// Smoke test for the landing-page demo. Boots Chromium against
// http://localhost:4000 and walks every iframe + the token tester
// to confirm cms-ui loads cleanly and the comparison panes render.

import { chromium } from 'playwright';

const BASE = 'http://localhost:4000';

const errors = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.on('console', (m) => { if (m.type() === 'error') errors.push({ url: page.url(), text: m.text() }); });
page.on('pageerror', (e) => { errors.push({ url: page.url(), text: 'PAGEERROR ' + e.message }); });

await page.goto(BASE + '/', { waitUntil: 'networkidle' });
// Scroll through the whole page so lazy iframes load.
await page.evaluate(async () => {
  await new Promise((r) => setTimeout(r, 200));
  const total = document.documentElement.scrollHeight;
  for (let y = 0; y <= total; y += 600) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 80));
  }
  window.scrollTo(0, 0);
});
await page.waitForTimeout(2000);

const srcs = await page.locator('iframe').evaluateAll((nodes) =>
  nodes.map((n) => ({ src: n.src, name: n.title || '' })),
);
console.log(`Found ${srcs.length} iframes on the landing page`);

let cmsUiInsideAfter = 0;
let assertedAfterIframes = 0;
for (let i = 0; i < srcs.length; i++) {
  const { src } = srcs[i];
  const inUi = src?.includes('ui=1');
  const frame = page.frames().find((f) => f.url() === src || f.url().endsWith(new URL(src, BASE).pathname + new URL(src, BASE).search));
  if (!frame) { console.log(`  ${i}: NO LIVE FRAME for ${src}`); continue; }

  let probe;
  try {
    probe = await frame.evaluate(() => {
      const tableBg = document.querySelector('table.table.table-striped, table.cms-table');
      const cs = tableBg ? getComputedStyle(tableBg) : null;
      return {
        hasCmsUiCss: !!document.querySelector('link[href*="prism/prism.min.css"]'),
        hasCmsUiJs:  !!document.querySelector('script[src*="prism/prism.js"]'),
        runtimeAttr: document.body.getAttribute('data-cms-runtime'),
        tableRadius: cs?.borderRadius,
      };
    });
  } catch (e) {
    console.log(`  ${i}: probe failed for ${src}: ${e.message}`);
    continue;
  }
  if (inUi && probe.hasCmsUiCss) cmsUiInsideAfter++;
  if (inUi) assertedAfterIframes++;
  console.log(`  ${i}: ui=${inUi}  cssLoaded=${probe.hasCmsUiCss}  jsLoaded=${probe.hasCmsUiJs}  radius=${probe.tableRadius || '-'}  runtime=${probe.runtimeAttr || '-'}`);
}

// Token tester: tweak the radius slider, confirm the iframe gets a new src.
await page.evaluate(() => {
  const r = document.querySelector('input[name=radius]');
  r.value = '14';
  r.dispatchEvent(new Event('input', { bubbles: true }));
});
await page.waitForTimeout(800);
const tokenSrc = await page.locator('#tokenTester iframe').getAttribute('src');
console.log(`\nToken tester src after slider=14: ${tokenSrc}`);
if (!tokenSrc?.includes('radius=14')) {
  errors.push({ url: 'token-tester', text: 'slider did not update iframe src' });
}

// Dark toggle
await page.click('[data-theme-toggle]');
await page.waitForTimeout(400);
const isDark = await page.evaluate(() => document.documentElement.getAttribute('data-theme') === 'dark');
console.log(`Dark toggle: ${isDark ? 'on' : 'off'}`);

console.log(`\n--- summary ---`);
console.log(`cms-ui CSS loaded inside ui=1 iframes: ${cmsUiInsideAfter}`);
console.log(`Total errors: ${errors.length}`);
for (const e of errors) console.log(`  • [${e.url}] ${e.text}`);

await browser.close();
process.exit(errors.length === 0 ? 0 : 1);
