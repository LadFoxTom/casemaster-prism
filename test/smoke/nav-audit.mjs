// Click every nav link, screenshot the destination, and report any
// page that shows < ~250px of content (likely empty / broken).

import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

mkdirSync('test/smoke/screenshots/nav-audit', { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

await page.goto('http://localhost:4000/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);

const links = await page.$$eval('#gnav-host a[href]', (as) =>
  as.map((a) => ({ label: a.textContent.trim(), href: a.href })).filter((x) => x.label && !x.href.startsWith('https')),
);

console.log(`Found ${links.length} nav links to audit`);

const issues = [];
for (const link of links) {
  await page.goto(link.href, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  const stat = await page.evaluate(() => {
    const main = document.querySelector('main, .docs-content, .pg-shell, .mig-shell, .nf-shell');
    const text = main?.innerText ?? '';
    const h = main?.getBoundingClientRect().height ?? 0;
    return { textLen: text.length, height: Math.round(h), hasMain: !!main };
  });
  const slug = link.href.replace(/^https?:\/\/[^/]+/, '').replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^_/, '');
  await page.screenshot({ path: `test/smoke/screenshots/nav-audit/${slug || 'root'}.png` });
  const status = stat.hasMain && stat.height > 200 && stat.textLen > 50 ? 'OK ' : 'ISSUE';
  console.log(`${status} ${link.href.padEnd(60)} h=${String(stat.height).padStart(4)} text=${String(stat.textLen).padStart(4)} label="${link.label}"`);
  if (status !== 'OK ') issues.push({ ...link, ...stat });
}

console.log(`\nIssues: ${issues.length}`);
issues.forEach((i) => console.log(`  • ${i.label} → ${i.href}`));
await browser.close();
