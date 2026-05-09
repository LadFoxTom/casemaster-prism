import { test, expect } from '@playwright/test';

/**
 * Verifies the Phase 2 enhancers run end-to-end on whichever runtime the
 * Playwright project points at. Same test file is executed against both
 * dotnet (:5051) and vercel (:5052), proving the dual-runtime claim.
 */

const errors: Array<{ url: string; text: string }> = [];

test.beforeEach(async ({ page }) => {
  errors.length = 0;
  page.on('console', (m) => { if (m.type() === 'error') errors.push({ url: page.url(), text: m.text() }); });
  page.on('pageerror', (e) => { errors.push({ url: page.url(), text: 'PAGEERROR ' + e.message }); });
});

test.describe('cms-ui on real runtime markup', () => {
  test('item-list page enhances tables', async ({ page }) => {
    await page.goto('/page/wms/item');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(400);

    const enhanced = await page.locator('table[data-cms-enhanced="1"]').count();
    expect(enhanced).toBeGreaterThanOrEqual(1);

    const sortable = await page.locator('th[data-cms-sortable="1"]').count();
    expect(sortable).toBeGreaterThanOrEqual(4);

    await expect(page.locator('.cms-table-toolbar')).toBeVisible();
    await expect(page.locator('.cms-table-search')).toBeVisible();
    await expect(page.locator('.cms-table-toolbar .cms-table-count')).toContainText(/\d+ rows?/);
  });

  test('clicking a header sorts the column', async ({ page }) => {
    await page.goto('/page/wms/item');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(400);

    const skuHeader = page.locator('th[data-cms-sortable="1"]').nth(1);
    await skuHeader.click();
    await expect(skuHeader).toHaveAttribute('data-cms-sort', 'asc');
    await skuHeader.click();
    await expect(skuHeader).toHaveAttribute('data-cms-sort', 'desc');
  });

  test('filter input hides non-matching rows', async ({ page }) => {
    await page.goto('/page/wms/item');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(400);

    const search = page.locator('.cms-table-search');
    await search.fill('ZZZ-NEVER-MATCH');
    await expect(page.locator('.cms-table-empty')).toBeVisible();
    await search.fill('');
  });

  test('/ keyboard shortcut focuses the filter', async ({ page }) => {
    await page.goto('/page/wms/item');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(400);

    await page.keyboard.press('/');
    const focused = await page.evaluate(() => document.activeElement?.classList.contains('cms-table-search'));
    expect(focused).toBe(true);
  });

  test('Cmd+K opens the command palette', async ({ page }) => {
    await page.goto('/page/wms/item');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(400);

    await page.keyboard.press('Control+K');
    await expect(page.locator('.cms-cmdk.is-open')).toBeVisible();
    await page.keyboard.press('Escape');
  });

  test('body carries data-cms-runtime + version', async ({ page }) => {
    await page.goto('/page/wms/item');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(400);

    const runtime = await page.locator('body').getAttribute('data-cms-runtime');
    const version = await page.locator('body').getAttribute('data-cms-ui-version');
    expect(['dotnet', 'vercel', 'unknown']).toContain(runtime);
    expect(version).toBe('0.2.0');
  });

  test('zero console / page errors', async ({ page }) => {
    await page.goto('/page/wms/item');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);

    expect(errors).toEqual([]);
  });
});
