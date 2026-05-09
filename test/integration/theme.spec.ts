import { test, expect } from '@playwright/test';

test.describe('cms-ui theme tokens reach computed style', () => {
  test('--cms-primary token resolves on root', async ({ page }) => {
    await page.goto('/page/wms/item');
    await page.waitForLoadState('networkidle');

    const primary = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--cms-primary').trim(),
    );
    expect(primary).toBe('#2563eb');
  });

  test('table picks up the modernised surface', async ({ page }) => {
    await page.goto('/page/wms/item');
    await page.waitForLoadState('networkidle');

    const stat = await page.evaluate(() => {
      const t = document.querySelector('table.table.table-striped, table.cms-table');
      if (!t) return null;
      const cs = getComputedStyle(t);
      return { bg: cs.backgroundColor, radius: cs.borderRadius };
    });
    expect(stat).not.toBeNull();
    expect(stat!.bg).toBe('rgb(255, 255, 255)');
    expect(stat!.radius).toBe('8px');
  });
});
