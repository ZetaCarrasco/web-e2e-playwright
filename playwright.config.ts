import { defineConfig, devices } from '@playwright/test';

const PORT = process.env.PORT || 4000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './tests/e2e',

    // All specs share ONE in-memory backend, and `resetApp` wipes its state
    // (including sessions) before every test. Running tests concurrently
    // makes them wipe each other's data mid-test, so they run one at a time.
    // Parallelism happens one level up: CI runs one job per browser project,
    // each with its own backend instance.
    fullyParallel: false,
    workers: 1,

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
