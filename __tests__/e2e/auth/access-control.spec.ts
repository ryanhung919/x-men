import { test, expect } from '@playwright/test';
import { login, logout } from '../helpers/auth';
import { PreferenceHelpers } from '../helpers/preferences';

/**
 * E2E Access Control Tests
 */
test.describe('Access Control', () => {
  /**
   * Test report access control: staff users denied access, admin users granted access
   * @param page - Playwright page instance
   */
  test('report access control: staff denied, admin granted', async ({ page }) => {
    const preferences = new PreferenceHelpers(page);

    console.log('Testing staff user access to /report...');
    await login(page, 'staff');
    await page.goto('/report');
    await preferences.verifyOnUnauthorizedPage();

    await logout(page);
    await login(page, 'admin');

    console.log('Admin user navigating to /report...');
    await page.goto('/report');
    await preferences.verifyOnReportPage();
    await expect(page.locator('select, button, .data-table, .report').first()).toBeVisible({ timeout: 10000 });

    console.log('Access control test completed successfully!');
  });
});