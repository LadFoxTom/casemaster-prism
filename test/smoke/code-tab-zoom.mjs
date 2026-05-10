// Capture the .cms / HTML toggle on a component code pane.
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
mkdirSync('test/smoke/screenshots/code-tab', { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

await page.goto('http://localhost:4000/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

// Find the tables comp-block, switch to Code tab, screenshot
const block = page.locator('.comp-block[data-demo="table"]');
await block.scrollIntoViewIfNeeded();
await page.waitForTimeout(500);

await block.locator('button[data-pane="code"]').click();
await page.waitForTimeout(500);
await block.screenshot({ path: 'test/smoke/screenshots/code-tab/tables-cms.png' });
console.log('saved tables-cms.png (.cms tab default)');

// Now click the HTML output toggle inside the pane
await block.locator('.comp-code-toggle button[data-mode="html"]').click();
await page.waitForTimeout(300);
await block.screenshot({ path: 'test/smoke/screenshots/code-tab/tables-html.png' });
console.log('saved tables-html.png (HTML toggled)');

await browser.close();
