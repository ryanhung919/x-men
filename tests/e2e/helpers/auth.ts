import { Page, expect } from '@playwright/test';
import { testUsers, UserRole } from '../fixtures/users';

/**
 * Login helper for E2E tests
 * @param page - Playwright page instance
 * @param role - User role to login as (admin, manager, staff)
 */
export async function login(page: Page, role: UserRole = 'staff'): Promise<void> {
  const user = testUsers[role];

  await page.goto('/');

  // Wait for login page to load
  await expect(page.getByText('Login', { exact: true }).first()).toBeVisible();

  // Fill in credentials
  await page.getByLabel(/email/i).fill(user.email);
  await page.getByLabel(/password/i).fill(user.password);

  // Click login button
  await page.getByRole('button', { name: /login/i }).click();

  // Wait for redirect to tasks or schedule page
  await page.waitForURL(/\/tasks|\/schedule/);

  console.log(`Logged in as ${role}: ${user.email}`);
}

/**
 * Logout helper for E2E tests
 * @param page - Playwright page instance
 */
export async function logout(page: Page): Promise<void> {
  // Try desktop menu first (button containing "User" text)
  const userMenuButton = page.getByRole('button', { name: /user/i }).first();

  // Check if it's visible (desktop), if not, use mobile menu
  const isDesktop = await userMenuButton.isVisible().catch(() => false);

  if (isDesktop) {
    await userMenuButton.click();
    await page.getByRole('menuitem', { name: /sign out/i }).click();
  } else {
    // Mobile: Click hamburger menu
    await page.getByRole('button', { name: /toggle menu/i }).click();
    await page.getByRole('button', { name: /sign out/i }).click();
  }

  // Wait for redirect to login page
  await page.waitForURL('/');

  console.log('Logged out successfully');
}

/**
 * Check if user is authenticated by verifying redirect from login page
 * @param page - Playwright page instance
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  const currentUrl = page.url();
  return !currentUrl.endsWith('/') && !currentUrl.includes('/auth/');
}
