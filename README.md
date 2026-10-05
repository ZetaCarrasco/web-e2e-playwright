# web-e2e-playwright

Advanced Playwright E2E suite for a small **Task Manager** web app, built to demonstrate
production-grade test architecture: Page Object Model, custom fixtures, data-driven tests,
visual regression, combined API+UI verification, and parallel execution across browsers.

Part of my QA portfolio. See also [`api-testing-automation`](https://github.com/ZetaCarrasco/api-testing-automation) — pure API testing (CRUD, negative cases, CI/CD).

## Why a purpose-built app instead of a public demo site

The app under test (`/app`) is a minimal Task Manager I built specifically for this suite:
a small Express API plus a vanilla JS frontend, with login, task CRUD, and filtering. Building
the system under test — rather than pointing Playwright at a third-party demo site — makes it
possible to demonstrate patterns that need control over the backend: deterministic state resets
between tests, combined API+UI assertions, and auth-token injection for fast test setup.

## Test architecture

```
tests/
├── pages/          # Page Object Model
│   ├── BasePage.ts
│   ├── LoginPage.ts
│   └── TasksPage.ts
├── fixtures/
│   └── index.ts     # custom fixtures: resetApp, apiToken, authenticatedPage
└── e2e/
    ├── login.spec.ts              # pure UI flow
    ├── tasks-crud.spec.ts         # create / toggle / delete
    ├── tasks-filters.spec.ts      # data-driven (parameterized scenarios)
    ├── visual.spec.ts             # visual regression (Chromium-based projects only)
    └── api-ui-combined.spec.ts    # API writes verified in UI, and vice versa
```

### Page Object Model
Each view (`LoginPage`, `TasksPage`) exposes locators and user actions as methods, so specs
read as business flows (`loginPage.login(user, pass)`) instead of raw selector calls.

### Custom fixtures
- **`resetApp`** *(auto-run)* — resets the backend's in-memory state before every test via a
  test-only API endpoint, so specs never depend on execution order or leftover state from a
  previous test.
- **`apiToken`** — logs in through the API directly (no UI round-trip) when a spec only needs
  a valid session, not a test of the login form itself.
- **`authenticatedPage`** — injects the token into `sessionStorage` before the page loads,
  landing directly on the authenticated view. This is what makes CRUD/filter/visual specs fast:
  they don't re-run the login flow every time.

### Data-driven tests
`tasks-filters.spec.ts` runs the same assertion logic against a matrix of `{filter,
expectedTitles}` scenarios, generated from a single array — adding a new filter case means
adding one line, not one test function.

### Visual regression
`visual.spec.ts` uses Playwright's built-in screenshot diffing (`toHaveScreenshot`) with a
tolerance (`maxDiffPixelRatio: 0.02`) tuned to absorb minor anti-aliasing differences between
machines without masking real layout regressions. Baselines are generated once and committed;
see [Updating visual baselines](#updating-visual-baselines).

These specs run in the Chromium-based projects only (`chromium` and `mobile-chrome`). Firefox
and WebKit are covered by the functional specs; see [Design notes](#design-notes--trade-offs)
for why.

### Combined API + UI checks
`api-ui-combined.spec.ts` is the piece most manual-only QA backgrounds don't get to practice:
creating data via the API and asserting it renders correctly in the UI, and vice versa — plus a
negative case (`401` on an unauthenticated request). This catches integration bugs that
UI-only or API-only suites miss individually (e.g. the API returns the right JSON, but the
frontend renders it wrong).

### Parallel execution
Tests run one at a time within each browser project (`workers: 1`), because all specs share a
single in-memory backend that `resetApp` wipes before every test (see
[Design notes](#design-notes--trade-offs)). Parallelism comes from CI: a GitHub Actions matrix
runs the four browser projects (Chromium, Firefox, WebKit, and a mobile Chrome viewport) as
four concurrent jobs, each on its own runner with its own backend instance.

## Running locally

```bash
# 1. Install test suite dependencies
npm install

# 2. Install backend dependencies
npm install --prefix app/backend

# 3. Download Playwright browsers (one-time)
npx playwright install

# 4. Run the suite (auto-starts the app under test)
npm test

# Other useful scripts
npm run test:ui        # Playwright's interactive UI mode
npm run test:headed    # run with visible browser windows
npm run test:report    # open the last HTML report
```

On Linux, a browser (WebKit in particular) may fail to launch because of missing system
libraries. In that case run `sudo npx playwright install-deps`.

The app can also be run standalone for manual exploration:

```bash
npm run app:start   # http://localhost:4000, login with demo / demo1234
```

### Updating visual baselines

The first run of `visual.spec.ts` has no baseline to compare against. Generate one with:

```bash
npm run test:update-snapshots
```

Commit the resulting `tests/e2e/visual.spec.ts-snapshots/` directory. Baselines exist for the
`chromium` and `mobile-chrome` projects only, and their file names carry the OS (`-linux.png`),
matching the Ubuntu CI runner. Re-run this command deliberately whenever a UI change is
intentional — a failing visual test in CI is the signal that either the code or the baseline
needs updating, never something to silence.

## CI/CD

`.github/workflows/playwright.yml` runs the full suite on every push and pull request to
`main`, fanned out across a 4-way browser matrix (Chromium, Firefox, WebKit, mobile Chrome)
so failures in one engine don't block feedback from the others. Each job uploads its HTML
report as a build artifact for debugging failures without re-running locally.

## Design notes / trade-offs

- **In-memory backend, no real crypto.** The app under test is deliberately minimal — the
  point of this repo is the test suite's architecture, not the app's production-readiness.
- **A test-only `/api/test/reset` endpoint** resets state between tests. This pattern (a
  reset/seed endpoint gated to test environments) is a common, pragmatic way to get
  deterministic E2E state without spinning up a real database per test run.
- **Two causes behind the first CI failures.** The suite passed locally but failed in all four
  browsers on the first CI run.
  1. *Shared state.* Every spec shares one in-memory backend, and `resetApp` clears all of its
     state (including login sessions) before each test. With two workers, one test's reset
     wiped the data and token of the test running next to it. The fix was `workers: 1`;
     parallelism now comes from the CI matrix, where each job has its own backend. Giving each
     test (or worker) an isolated backend state would allow parallel runs again, and is the
     natural next improvement.
  2. *Reads that don't wait.* After that fix, a few tests still failed intermittently on the
     slower CI runner (retries can hide this kind of failure). They read the task list with
     `allTextContents()`, which does not auto-wait, right after an action. Replacing those
     reads with `expect.poll` makes them wait until the list updates.
- **Visual regression in Chromium-based projects only.** On the CI runner, Firefox and WebKit
  rendered the tested element 1–3 px shorter than on the machine that generated the baselines
  (about 4% of pixels, above the 2% tolerance), most likely because of font rendering
  differences between the two environments. Raising the tolerance would mask real regressions,
  so those engines are covered by the functional specs only. Generating the baselines inside
  the same environment CI uses (for example a Playwright Docker image) is a possible next step
  to cover all four engines.
- **Retries are CI-only** (`retries: process.env.CI ? 2 : 0`), so a flaky test never
  silently passes during local development, but transient CI infrastructure hiccups don't
  block a PR unnecessarily.