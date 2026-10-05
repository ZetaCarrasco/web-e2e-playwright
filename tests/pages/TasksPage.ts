import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export type Priority = 'low' | 'medium' | 'high';
export type Filter = 'all' | 'pending' | 'done';

export class TasksPage extends BasePage {
  readonly heading: Locator;
  readonly titleInput: Locator;
  readonly prioritySelect: Locator;
  readonly submitButton: Locator;
  readonly taskError: Locator;
  readonly taskList: Locator;
  readonly logoutButton: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { name: 'Mis tareas' });
    this.titleInput = page.getByTestId('task-title-input');
    this.prioritySelect = page.getByTestId('task-priority-select');
    this.submitButton = page.getByTestId('task-submit');
    this.taskError = page.getByTestId('task-error');
    this.taskList = page.getByTestId('task-list');
    this.logoutButton = page.getByTestId('logout-button');
  }

  async addTask(title: string, priority: Priority = 'medium'): Promise<void> {
    await this.titleInput.fill(title);
    await this.prioritySelect.selectOption(priority);
    await this.submitButton.click();
  }

  taskItem(id: number): Locator {
    return this.page.getByTestId(`task-item-${id}`);
  }

  taskItemByTitle(title: string): Locator {
    return this.taskList.locator('.task-item', { hasText: title });
  }

  async toggleTaskById(id: number): Promise<void> {
    await this.page.getByTestId(`task-toggle-${id}`).click();
  }

  async deleteTaskById(id: number): Promise<void> {
    await this.page.getByTestId(`task-delete-${id}`).click();
  }

  async filterBy(filter: Filter): Promise<void> {
    await this.page.getByTestId(`filter-${filter}`).click();
  }

  async visibleTaskTitles(): Promise<string[]> {
    return this.taskList.locator('.task-title').allTextContents();
  }
}
