import { Page, expect } from '@playwright/test';

/**
 * Helper functions for user preference testing
 */
export class PreferenceHelpers {
  constructor(private page: Page) {}

  /**
   * Get current theme state from the UI
   * @returns Current theme ('light', 'dark', or 'system')
   */
  async getCurrentTheme(): Promise<'light' | 'dark' | 'system'> {
    const htmlElement = this.page.locator('html');
    const dataTheme = await htmlElement.getAttribute('data-theme');

    if (dataTheme === 'light' || dataTheme === 'dark' || dataTheme === 'system') {
      return dataTheme;
    }

    const hasDarkClass = await htmlElement.evaluate((el) => el.classList.contains('dark'));
    return hasDarkClass ? 'dark' : 'light';
  }

  /**
   * Toggle theme to the opposite of current
   */
  async toggleTheme(): Promise<void> {
    const currentTheme = await this.getCurrentTheme();
    console.log(`Toggling theme from ${currentTheme}`);

    await this.page.waitForTimeout(1000);

    const themeToggle = this.page.locator('button').filter({
      has: this.page.locator('span.sr-only', { hasText: 'Toggle theme' })
    }).first();

    if (!(await themeToggle.isVisible())) {
      console.log('Theme toggle button not visible');
      return;
    }

    await themeToggle.click();
    await this.page.waitForTimeout(500);

    const targetTheme = currentTheme === 'light' ? 'Dark' : 'Light';
    const themeOption = this.page.getByRole('menuitem', { name: targetTheme });

    if (await themeOption.count() > 0) {
      await themeOption.first().click();
      console.log(`Changed theme to ${targetTheme.toLowerCase()}`);
    } else {
      console.log(`Theme option ${targetTheme} not found`);
    }

    await this.page.waitForTimeout(1000);
    await this.page.locator('body').click({ position: { x: 100, y: 100 } });
    await this.page.waitForTimeout(200);
  }

  /**
   * Navigate to user settings dropdown menu
   */
  async navigateToUserSettings(): Promise<void> {
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(300);

    const userDropdown = this.page.locator('button').filter({
      has: this.page.locator('div', { hasText: /@/ })
    }).first();

    if (await userDropdown.isVisible()) {
      await userDropdown.click();
      await this.page.waitForTimeout(500);
    } else {
      console.log('User dropdown button not found');
    }
  }

  /**
   * Change default view preference in user dropdown
   * @param targetView - The view to set as default ('tasks' or 'schedule')
   */
  async changeDefaultView(targetView: 'tasks' | 'schedule'): Promise<void> {
    await this.navigateToUserSettings();

    const viewOption = this.page.getByRole('menuitemradio', {
      name: new RegExp(targetView, 'i')
    }).first();

    if (await viewOption.isVisible()) {
      await viewOption.click();
    } else {
      console.log(`Default view option ${targetView} not found`);
    }

    await this.page.waitForTimeout(1000);
  }

  /**
   * Save settings if there's a save button
   */
  async saveSettings(): Promise<void> {
    const saveButton = this.page.getByRole('button', {
      name: /save|update|apply/i
    }).first();

    if (await saveButton.isVisible()) {
      await saveButton.click();
      await this.page.waitForTimeout(1000);
    }
  }

  /**
   * Verify user is on tasks page
   */
  async verifyOnTasksPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/tasks/);
  }

  /**
   * Verify user is on unauthorized page
   */
  async verifyOnUnauthorizedPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/unauthorized/);
    await expect(this.page.getByText(/unauthorized|access denied/i)).toBeVisible();
  }

  /**
   * Verify user is on report page
   */
  async verifyOnReportPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/report/);
  }
}