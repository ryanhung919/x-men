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
  await expect(page.getByText('Login', { exact: true }).first()).toBeVisible();

  // Fill in credentials
  await page.getByLabel(/email/i).fill(user.email);
  await page.getByLabel(/password/i).fill(user.password);

  // Click login button
  await page.getByRole('button', { name: /login/i }).click();

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

  // Try to wait a moment for any pending operations
  await page.waitForTimeout(1000);

  // Try desktop user profile button first
  const userMenuButton = page.locator('button[data-slot="dropdown-menu-trigger"]')
    .filter({ has: page.locator('svg.lucide-user-round') })
    .first();

  // Check if it's visible (desktop), if not, use mobile menu
  let isDesktop = false;
  try {
    isDesktop = await userMenuButton.isVisible({ timeout: 3000 });
  } catch {
  }


  if (isDesktop) {
    try {
      await userMenuButton.click({ timeout: 5000 });
    } catch (error) {
      // Try alternative selectors for user menu
      const alternativeButton = page.locator('button')
        .filter({ has: page.locator('svg.lucide-user-round, svg[data-lucide="user"]') })
        .or(page.getByLabel(/user profile/i))
        .or(page.getByLabel(/account/i))
        .first();

      await alternativeButton.click({ timeout: 5000 });
    }

    // Wait for menu to open
    await page.waitForTimeout(500);

    try {
      await page.locator('div[role="menuitem"]')
        .filter({ has: page.locator('svg.lucide-log-out') })
        .filter({ hasText: 'Sign out' })
        .first()
        .click({ timeout: 5000 });
    } catch (error) {
      // Try alternative sign out selectors
      const signOutButton = page.getByRole('button', { name: /sign out/i })
        .or(page.getByRole('menuitem', { name: /sign out/i }))
        .or(page.locator('button').filter({ hasText: 'Sign out' }))
        .or(page.locator('button').filter({ has: page.locator('svg.lucide-log-out') }));

      await signOutButton.first().click({ timeout: 5000 });
    }
  } else {
    // Mobile: Try hamburger menu or other mobile menu button
    try {
      await page.getByRole('button', { name: /menu/i }).click();
    } catch {
      // Fallback: try to find any button that might be a menu trigger
      await page.locator('button').filter({ has: page.locator('svg') }).first().click();
    }
    await page.getByRole('button', { name: /sign out/i }).click();
  }

  // Wait for redirect to login page
  try {
    await page.waitForURL('/', { timeout: 5000 });
  } catch (error) {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  }

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
