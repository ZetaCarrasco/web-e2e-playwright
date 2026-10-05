import { test as base, expect, APIRequestContext } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { TasksPage } from '../pages/TasksPage';

export const DEMO_USER = { username: 'demo', password: 'demo1234' };

type Fixtures = {
  /** Resets the backend's in-memory state before every test — each spec
   *  starts from the same three seeded tasks, regardless of run order or
   *  what other parallel workers are doing. Runs automatically. */
  resetApp: void;

  loginPage: LoginPage;
  tasksPage: TasksPage;

  /** Logs in through the API (fast, no UI round-trip) and seeds the
   *  browser's sessionStorage with the resulting token — used by specs
   *  that don't care about testing the login form itself. */
  apiToken: string;

  /** A page that is already authenticated and sitting on the tasks view.
   *  This is the fixture most CRUD/filter specs should depend on. */
  authenticatedPage: import('@playwright/test').Page;
};

export const test = base.extend<Fixtures>({
  resetApp: [
    async ({ playwright, baseURL }, use) => {
      const request: APIRequestContext = await playwright.request.newContext({ baseURL });
      await request.post('/api/test/reset');
      await request.dispose();
      await use();
    },
    { auto: true },
  ],

  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  tasksPage: async ({ page }, use) => {
    await use(new TasksPage(page));
  },

  apiToken: async ({ request }, use) => {
    const res = await request.post('/api/auth/login', { data: DEMO_USER });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    await use(body.token);
  },

  authenticatedPage: async ({ page, apiToken }, use) => {
    await page.addInitScript((token) => {
      window.sessionStorage.setItem('token', token);
    }, apiToken);
    await page.goto('/');
    await expect(page.getByTestId('task-list')).toBeVisible();
    await use(page);
  },
});

export { expect };
