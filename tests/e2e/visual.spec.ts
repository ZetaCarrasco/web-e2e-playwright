import { test, expect } from '../fixtures';
import { TasksPage } from '../pages/TasksPage';

test.describe('Visual regression', () => {
  test('login view matches baseline', async ({ loginPage, page }) => {
    await loginPage.goto('/');
    await expect(page).toHaveScreenshot('login-view.png');
  });

  test('login view shows a visible error state', async ({ loginPage, page }) => {
    await loginPage.goto('/');
    await loginPage.login('demo', 'wrong-password');
    await expect(loginPage.errorMessage).toBeVisible();

    await expect(page).toHaveScreenshot('login-view-error.png');
  });

  test('tasks view matches baseline with seeded data', async ({ authenticatedPage }) => {
    const tasksPage = new TasksPage(authenticatedPage);
    await expect(tasksPage.taskList).toBeVisible();

    // Mask the priority badges' surrounding card only if it ever carries
    // non-deterministic content (timestamps, IDs shown to the user, etc).
    // Not needed today since the seed data is fixed — kept here as the
    // documented pattern for the next dynamic field this app grows.
    await expect(authenticatedPage).toHaveScreenshot('tasks-view.png');
  });

  test('single task item renders consistently', async ({ authenticatedPage }) => {
    const tasksPage = new TasksPage(authenticatedPage);
    await expect(tasksPage.taskItem(2)).toHaveScreenshot('task-item-pending.png');
  });
});
