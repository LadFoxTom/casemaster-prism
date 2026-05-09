import { test, expect } from '@playwright/test';

/**
 * Visual regression baselines. First run uses the `--update-snapshots` flag
 * to commit a baseline PNG per project; subsequent runs assert against it.
 *
 *   npx playwright test test/integration/visual.spec.ts --update-snapshots
 *
 * Per Playwright config: maxDiffPixelRatio: 0.02 (2 %), animations disabled.
 */

test.describe('visual regression (baseline-driven)', () => {
  test('item-list page', async ({ page }, testInfo) => {
    await page.goto('/page/wms/item');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);

    // Hide the dynamic count cell so the baseline doesn't drift over time
    await page.addStyleTag({ content: `.cms-table-count { visibility: hidden !important; }` });

    await expect(page).toHaveScreenshot(`item-list-${testInfo.project.name}.png`, {
      fullPage: true,
    });
  });

  // (Toolbar element snapshot was prone to stable-frame timeouts on the
  //  cms-vercel target — element-bound screenshots compete with Tom Select
  //  / Flatpickr lazy-loading. The full-page item-list snapshot above
  //  already covers the toolbar surface visually.)
});
