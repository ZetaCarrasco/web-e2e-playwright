import { test, expect } from '../fixtures';
import { TasksPage } from '../pages/TasksPage';

test.describe('Task CRUD', () => {
  test('creates a new task and shows it in the list', async ({ authenticatedPage }) => {
    const tasksPage = new TasksPage(authenticatedPage);

    await tasksPage.addTask('Buy birthday gift', 'high');

    const titles = await tasksPage.visibleTaskTitles();
    expect(titles).toContain('Buy birthday gift');
  });

  test('rejects an empty task title', async ({ authenticatedPage }) => {
    const tasksPage = new TasksPage(authenticatedPage);

    // The native `required` attribute blocks submission before our JS
    // error even runs, so we assert the browser-level validity instead.
    await tasksPage.submitButton.click();
    const isValid = await tasksPage.titleInput.evaluate((el: HTMLInputElement) => el.checkValidity());
    expect(isValid).toBe(false);
  });

  test('toggles a task as done and shows it struck through', async ({ authenticatedPage }) => {
    const tasksPage = new TasksPage(authenticatedPage);
    const item = tasksPage.taskItem(2); // "Set up CI pipeline" — seeded as pending

    await expect(item).not.toHaveClass(/done/);
    await tasksPage.toggleTaskById(2);
    await expect(item).toHaveClass(/done/);
  });

  test('deletes a task and it disappears from the list', async ({ authenticatedPage }) => {
    const tasksPage = new TasksPage(authenticatedPage);
    const item = tasksPage.taskItem(3); // "Review pull request"

    await expect(item).toBeVisible();
    await tasksPage.deleteTaskById(3);
    await expect(item).toHaveCount(0);
  });
});
