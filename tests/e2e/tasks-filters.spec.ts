import { test, expect } from '../fixtures';
import { TasksPage, Filter } from '../pages/TasksPage';

/**
 * Data-driven filter matrix. Seeded fixture is:
 *  1. Write project README   — done
 *  2. Set up CI pipeline     — pending
 *  3. Review pull request    — pending
 */
const filterScenarios: { filter: Filter; expectedTitles: string[] }[] = [
  { filter: 'all', expectedTitles: ['Write project README', 'Set up CI pipeline', 'Review pull request'] },
  { filter: 'pending', expectedTitles: ['Set up CI pipeline', 'Review pull request'] },
  { filter: 'done', expectedTitles: ['Write project README'] },
];

test.describe('Task filters', () => {
  // These only read state (no mutations), so they're safe to run in
  // parallel against independent browser contexts.
  test.describe.configure({ mode: 'parallel' });

  for (const { filter, expectedTitles } of filterScenarios) {
    test(`filter "${filter}" shows exactly: ${expectedTitles.join(', ')}`, async ({ authenticatedPage }) => {
      const tasksPage = new TasksPage(authenticatedPage);

      await tasksPage.filterBy(filter);

      const titles = await tasksPage.visibleTaskTitles();
      expect(titles.sort()).toEqual([...expectedTitles].sort());
    });
  }

  test('switching filters updates the active button state', async ({ authenticatedPage }) => {
    const tasksPage = new TasksPage(authenticatedPage);

    await tasksPage.filterBy('done');
    await expect(authenticatedPage.getByTestId('filter-done')).toHaveClass(/active/);
    await expect(authenticatedPage.getByTestId('filter-all')).not.toHaveClass(/active/);
  });
});
