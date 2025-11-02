import { test, expect } from '@playwright/test';
import { testUsers } from '../fixtures/users';
import { login, logout } from '../helpers/auth';

/**
 * E2E Authentication Flow Tests
 *
 * These tests verify basic authentication functionality through the browser.
 * Phase 1: Foundation - Auth flows only
 */
test.describe('Authentication Flows', () => {
  test('should login as staff and verify dashboard access', async ({ page }) => {
    const user = testUsers.staff;

    // Navigate to login page
    await page.goto('/');
    await expect(page.getByText('Login', { exact: true }).first()).toBeVisible();

    // Fill credentials and submit
    await page.getByLabel(/email/i).fill(user.email);
    await page.getByLabel(/password/i).fill(user.password);
    await page.getByRole('button', { name: /login/i }).click();

    // Verify redirect to tasks or schedule page
    await page.waitForURL(/\/tasks|\/schedule/);

    // Verify UI state: navbar shows user email
    await expect(page.getByText(user.email)).toBeVisible();

    // Verify navigation links are accessible
    await expect(page.getByRole('link', { name: /tasks/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /schedule/i })).toBeVisible();

    // Verify Report menu is NOT visible for staff-only users
    await expect(page.getByRole('link', { name: /report/i })).not.toBeVisible();
  });

  test('should login as admin and verify admin features visible', async ({ page }) => {
    const user = testUsers.admin;

    // Login flow
    await page.goto('/');
    await page.getByLabel(/email/i).fill(user.email);
    await page.getByLabel(/password/i).fill(user.password);
    await page.getByRole('button', { name: /login/i }).click();

    // Wait for redirect
    await page.waitForURL(/\/tasks|\/schedule/);

    // Verify role-based UI: Admin should see Report menu option
    await expect(page.getByRole('link', { name: /report/i })).toBeVisible();

    // Verify admin can access report page
    await page.goto('/report');
    await expect(page).toHaveURL('/report');
  });

  test('should logout and prevent protected route access', async ({ page }) => {
    // Login first
    await login(page, 'staff');
    await expect(page).toHaveURL(/\/tasks|\/schedule/);

    // Logout: Click user menu dropdown (button containing user email)
    const userMenuButton = page.getByRole('button', { name: /joel\.wang\.03@gmail\.com.*user/i });
    await userMenuButton.click();
    await page.getByRole('menuitem', { name: /sign out/i }).click();

    // Verify redirect to login page
    await page.waitForURL('/');
    await expect(page.getByText('Login', { exact: true }).first()).toBeVisible();

    // Verify session cleared: attempt to access protected route
    await page.goto('/tasks');

    // Should be redirected back to login (route protection)
    await page.waitForURL('/');
    await expect(page.getByText('Login', { exact: true }).first()).toBeVisible();
  });
});
