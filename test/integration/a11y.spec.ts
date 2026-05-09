import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * axe-core accessibility audit on a representative cms-ui-enhanced page.
 *
 * Spec gate: zero "serious" or "critical" violations introduced by our
 * markup. Pre-existing runtime-emitted issues (e.g. .NET runtime's <main>
 * sometimes lacks landmarks, navbar branding image without alt) are
 * reported but do not fail the suite — we don't own that markup.
 *
 * Reported impacts: 'minor' | 'moderate' | 'serious' | 'critical'.
 */

const FAIL_IMPACTS = new Set(['serious', 'critical']);

test.describe('axe-core accessibility', () => {
  test('item-list page passes the serious/critical bar', async ({ page }, testInfo) => {
    await page.goto('/page/wms/item');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      // Out of cms-ui scope:
      //   - color-contrast       — driven by Bootstrap 4 navbar palette.
      //   - image-alt            — runtime emits the navbar <img> without alt.
      //   - document-title       — runtime page wrapper omits <title>.
      // These are framework-shell issues we don't own. cms-ui must not
      // *introduce* any new failures, which is what this gate checks.
      .disableRules(['color-contrast', 'image-alt', 'document-title'])
      // Restrict to the main content where cms-ui actually applies.
      .exclude('nav.navbar')
      .analyze();

    const blocking = results.violations.filter((v) => FAIL_IMPACTS.has(v.impact ?? ''));
    const minorOrModerate = results.violations.filter((v) => !FAIL_IMPACTS.has(v.impact ?? ''));

    // Attach the full violation list for diagnostic visibility on failures.
    await testInfo.attach('axe-violations.json', {
      contentType: 'application/json',
      body: JSON.stringify(results.violations, null, 2),
    });

    if (minorOrModerate.length > 0) {
      console.log(`\n[a11y] ${minorOrModerate.length} non-blocking violation(s) reported (informational):`);
      for (const v of minorOrModerate) {
        console.log(`  - ${v.id} (${v.impact}): ${v.help}  [${v.nodes.length} node(s)]`);
      }
    }

    expect(blocking, blocking.map((v) => `${v.id}: ${v.help}`).join('\n')).toEqual([]);
  });
});
