import { Page, expect } from '@playwright/test';
import { testUsers, UserRole } from '../fixtures/users';

/**
 * Login helper for E2E tests
 * @param page - Playwright page instance
 * @param role - User role to login as (admin, manager, staff)
 */
export async function login(page: Page, role: UserRole = 'staff'): Promise<void> {
  const user = testUsers[role];
  console.log(`Logging in as ${role} (${user.email})...`);

  await page.goto('/');

  // Wait for login page to load
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();

  // Fill in credentials
  await page.getByLabel(/email/i).fill(user.email);
  await page.getByLabel(/password/i).fill(user.password);

  // Click login button
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();

  // Wait for redirect to tasks or schedule page
  await page.waitForURL(/\/tasks|\/schedule/);

  console.log(`Successfully logged in as ${role}`);

}

/**
 * Logout helper for E2E tests
 * @param page - Playwright page instance
 */
export async function logout(page: Page): Promise<void> {
  console.log('Logging out current user...');

  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Account menu', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();

  console.log('Successfully logged out');
}

/**
 * Check if user is authenticated by verifying redirect from login page
 * @param page - Playwright page instance
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  const currentUrl = page.url();
  return !currentUrl.endsWith('/') && !currentUrl.includes('/auth/');
}
