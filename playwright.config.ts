import { defineConfig, devices } from '@playwright/test';

const PORT = process.env.PORT || 4000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './tests/e2e',

  // Run spec files in parallel across workers. Locally this defaults to
  // half the CPU cores; CI is capped explicitly to keep the free runner
  // stable. Tests within a single file also run in parallel by default —
  // see the `test.describe.configure({ mode: 'parallel' })` calls in specs
  // that don't share mutable state.
  fullyParallel: true,
  workers: process.env.CI ? 2 : undefined,

  // Fail the CI build if someone accidentally left a `.only` in a spec.
  forbidOnly: !!process.env.CI,

  // Flaky-test safety net: retry twice on CI, never locally (retries should
  // never mask a real bug during local development).
  retries: process.env.CI ? 2 : 0,

  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    ...(process.env.CI ? [['github'] as const] : []),
  ],

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  // Visual regression: keep a small, deterministic tolerance so minor
  // anti-aliasing differences between machines don't cause false failures.
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.02 },
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
  ],

  // Boots the app under test automatically for `npm test`, and reuses an
  // already-running instance locally so you can leave `npm run app:start`
  // open in another terminal while iterating on specs.
  webServer: {
    command: 'npm --prefix app/backend start',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    cwd: __dirname,
  },
});
