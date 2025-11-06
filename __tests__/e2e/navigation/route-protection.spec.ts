import { test, expect } from '@playwright/test';

/**
 * E2E Route Protection Tests (Unauthenticated Access)
 */
test.describe('Route Protection', () => {
  /**
   * Test that unauthenticated users are redirected to login page
   * @param page - Playwright page instance
   */
  test('unauthenticated users are redirected to login', async ({ page }) => {
    await page.context().clearCookies();

    console.log('Testing access to protected routes without authentication...');

    await page.goto('/tasks');
    await expect(page).toHaveURL('/');
    await expect(page.getByText('Login', { exact: true }).first()).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /login/i })).toBeVisible();

    await page.goto('/schedule');
    await expect(page).toHaveURL('/');

    await page.goto('/report');
    await expect(page).toHaveURL('/');

    await page.goto('/tasks/99999');
    await expect(page).toHaveURL('/');

    console.log('Route protection test completed successfully!');
  });
});