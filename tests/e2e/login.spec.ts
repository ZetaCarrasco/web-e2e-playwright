import { test, expect, DEMO_USER } from '../fixtures';

test.describe('Login', () => {
  test('logs in with valid credentials and reaches the tasks view', async ({ page, loginPage, tasksPage }) => {
    await loginPage.goto('/');
    await loginPage.login(DEMO_USER.username, DEMO_USER.password);

    await expect(tasksPage.heading).toBeVisible();
    await expect(page.getByTestId('task-list')).toBeVisible();
  });

  test('shows an error for invalid credentials and stays on the login view', async ({ loginPage }) => {
    await loginPage.goto('/');
    await loginPage.login('demo', 'wrong-password');

    await expect(loginPage.errorMessage).toBeVisible();
    await expect(loginPage.errorMessage).toHaveText('Invalid credentials');
    await expect(loginPage.form).toBeVisible();
  });

  test('logs out and returns to the login view', async ({ loginPage, tasksPage }) => {
    await loginPage.goto('/');
    await loginPage.login(DEMO_USER.username, DEMO_USER.password);
    await expect(tasksPage.heading).toBeVisible();

    await tasksPage.logoutButton.click();

    await expect(loginPage.form).toBeVisible();
  });
});
