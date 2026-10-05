import { test, expect, DEMO_USER } from '../fixtures';
import { TasksPage } from '../pages/TasksPage';

test.describe('Combined API + UI checks', () => {
  test('a task created via the API appears in the UI after reload', async ({
    request,
    authenticatedPage,
  }) => {
    const tasksPage = new TasksPage(authenticatedPage);
    const loginRes = await request.post('/api/auth/login', { data: DEMO_USER });
    const { token } = await loginRes.json();

    const createRes = await request.post('/api/tasks', {
      headers: { Authorization: `Bearer ${token}` },
      data: { title: 'Seeded directly via API', priority: 'high' },
    });
    expect(createRes.status()).toBe(201);

    await authenticatedPage.reload();

    const titles = await tasksPage.visibleTaskTitles();
    expect(titles).toContain('Seeded directly via API');
  });

  test('a task created via the UI is retrievable and correct via the API', async ({
    request,
    authenticatedPage,
    apiToken,
  }) => {
    const tasksPage = new TasksPage(authenticatedPage);

    await tasksPage.addTask('Created through the UI', 'low');
    await expect(tasksPage.taskItemByTitle('Created through the UI')).toBeVisible();

    const res = await request.get('/api/tasks', {
      headers: { Authorization: `Bearer ${apiToken}` },
    });
    const tasks = await res.json();
    const created = tasks.find((t: { title: string }) => t.title === 'Created through the UI');

    expect(created).toBeTruthy();
    expect(created.priority).toBe('low');
    expect(created.done).toBe(false);
  });

  test('deleting a task via the API removes it from the UI on reload', async ({
    request,
    authenticatedPage,
    apiToken,
  }) => {
    const tasksPage = new TasksPage(authenticatedPage);
    await expect(tasksPage.taskItem(1)).toBeVisible();

    const res = await request.delete('/api/tasks/1', {
      headers: { Authorization: `Bearer ${apiToken}` },
    });
    expect(res.status()).toBe(204);

    await authenticatedPage.reload();

    await expect(tasksPage.taskItem(1)).toHaveCount(0);
  });

  test('API rejects task creation without an auth token', async ({ request }) => {
    const res = await request.post('/api/tasks', { data: { title: 'No auth' } });
    expect(res.status()).toBe(401);
  });
});
