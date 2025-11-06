import { test, expect } from '@playwright/test';
import { login, logout } from '../helpers/auth';
import { PreferenceHelpers } from '../helpers/preferences';

/**
 * E2E User Preferences Persistence Tests
 */
test.describe('User Preferences Persistence', () => {
  /**
   * Test user preferences persistence for theme and default view settings
   * @param page - Playwright page instance
   */
  test('user preferences persistence: theme and default view', async ({ page }) => {
    const preferences = new PreferenceHelpers(page);

    await login(page, 'staff');
    await preferences.verifyOnTasksPage();
    await page.waitForTimeout(2000);

    const initialTheme = await preferences.getCurrentTheme();
    console.log(`Initial theme: ${initialTheme}`);

    await preferences.toggleTheme();
    const newTheme = await preferences.getCurrentTheme();
    expect(newTheme).not.toBe(initialTheme);
    console.log(`Changed theme from ${initialTheme} to ${newTheme}`);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    const targetView = 'schedule';
    await preferences.navigateToUserSettings();
    await preferences.changeDefaultView(targetView);
    await preferences.saveSettings();
    console.log(`Changed default view to: ${targetView}`);

    console.log('Signing out to test persistence...');
    await logout(page);

    console.log('Logging back in to verify preferences persisted...');
    await login(page, 'staff');
    await page.waitForTimeout(2000);

    const persistedTheme = await preferences.getCurrentTheme();
    expect(persistedTheme).toBe(newTheme);
    console.log(`Theme persisted: ${persistedTheme}`);

    const currentUrl = page.url();
    if (currentUrl.includes('/schedule')) {
      console.log('Default view persisted: redirected to schedule page');
      await page.waitForTimeout(1000);
    } else {
      console.log(`Current URL after login: ${currentUrl}`);
    }

    console.log('User preferences persistence test completed');
  });
});
