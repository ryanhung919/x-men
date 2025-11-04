import { Page, expect } from '@playwright/test';

export class NotificationHelpers {
  constructor(private page: Page) {}

  /**
   * Get the notification bell button element
   */
  getNotificationBell() {
    // The notification bell is in the navigation bar beside the dark/light mode toggle
    // Look for button with bell icon in the header/nav area

    // 1. Look for button with Bell icon in nav/header area
    const navBellButton = this.page.locator('nav button, header button')
      .filter({ has: this.page.locator('svg.lucide-bell, svg[data-lucide="bell"]') })
      .first();

    // 2. Look for any button with bell icon that's visible
    const visibleBellButton = this.page.locator('button:has(svg.lucide-bell):visible, button:has(svg[data-lucide="bell"]):visible')
      .first();

    // 3. Try by explicit role
    const byRole = this.page.getByRole('button')
      .filter({ has: this.page.locator('svg.lucide-bell, svg[data-lucide="bell"]') })
      .first();

    // 4. Try by test ID
    const byTestId = this.page.locator('button[data-testid="notification-bell"]');

    // 5. Try any button with bell icon (fallback)
    const anyButtonWithBell = this.page.locator('button:has(svg.lucide-bell), button:has(svg[data-lucide="bell"])')
      .first();

    // Return the first button-only locator, prioritizing nav area
    return navBellButton.or(visibleBellButton).or(byRole).or(byTestId).or(anyButtonWithBell).first();
  }

  /**
   * Get the notification badge element (shows count)
   */
  getNotificationBadge() {
    // The actual badge structure from NotificationPanel component
    return this.page.locator('button span.absolute')
      .filter({ hasText: /\d+/ })
      .or(this.page.locator('[data-testid="notification-badge"]'))
      .or(this.page.locator('.notification-badge'))
      .or(this.page.locator('span[class*="badge"]'));
  }

  
  /**
   * Open the notification panel
   */
  async openNotificationPanel() {

    // Wait for navbar to load
    await this.page.waitForTimeout(2000);

    const bell = this.getNotificationBell();

    await bell.click({ timeout: 5000 });

    // Wait for notification sheet to be visible
    await this.page.locator('[data-state="open"]').first().waitFor({ state: 'visible', timeout: 3000 })
  }

    
  /**
   * Get all notification items in the panel
   */
  getNotificationItems() {
    // Look for notification items based on the actual component structure
    // NotificationItem renders a div with notification title and message
    return this.page.locator('div.flex.gap-3.p-4.border-b').filter({ has: this.page.locator('h4.text-sm.font-medium') });
  }

  /**
   * Get notification item by index (0-based)
   */
  getNotificationItem(index: number) {
    return this.getNotificationItems().nth(index);
  }

  /**
   * Find notification containing specific text
   */
  async findNotificationContainingText(searchText: string): Promise<any> {
    const items = this.getNotificationItems();
    const count = await items.count();

    for (let i = 0; i < count; i++) {
      const item = items.nth(i);
      const text = await item.textContent();
      if (text && text.toLowerCase().includes(searchText.toLowerCase())) {
        return item;
      }
    }

    return null;
  }

  /**
   * Verify notification exists with specific text
   */
  async verifyNotificationExists(searchText: string): Promise<void> {
    const notification = await this.findNotificationContainingText(searchText);
    if (!notification) {
      throw new Error(`Expected to find notification containing: "${searchText}"`);
    }
    await expect(notification).toBeVisible();
  }

  /**
   * Click on notification containing specific text
   */
  async clickNotificationContainingText(searchText: string): Promise<void> {
    const notification = await this.findNotificationContainingText(searchText);
    if (!notification) {
      throw new Error(`Expected to find notification containing: "${searchText}"`);
    }

    await notification.click();

    // Wait for modal to appear
    try {
      await this.page.waitForSelector('[role="dialog"]', { state: 'visible', timeout: 3000 });

      // Wait a moment to see the modal content
      await this.page.waitForTimeout(1000);

      // Close the modal (click outside or press Escape)
      await this.page.keyboard.press('Escape');
      await this.page.waitForTimeout(500);
    } catch (error) {
    }

    // Wait a moment for the read status to update
    await this.page.waitForTimeout(1000);
  }
}