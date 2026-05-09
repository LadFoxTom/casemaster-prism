import { defineConfig } from '@playwright/test';

/**
 * Two runtime targets, side by side:
 *   - dotnet: CaseMaster.Web.exe on :5051 (assumed already running by the
 *     test harness — see test/integration/README.md).
 *   - vercel: dev-server.mjs on :5052.
 *
 * Each project runs the same test files under test/integration/. The
 * runtime base URL is read from process.env.CMS_BASE.
 */
export default defineConfig({
  testDir: 'test/integration',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.02,
      animations: 'disabled',
    },
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    viewport: { width: 1440, height: 900 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'dotnet',
      use: { baseURL: 'http://localhost:5051' },
    },
    {
      name: 'vercel',
      use: { baseURL: 'http://localhost:5052' },
    },
  ],
});
