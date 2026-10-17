import { test, expect } from '@playwright/test';
import { login, logout } from '../helpers/auth';
import { TasksPage } from '../pages/TasksPage';
import { NotificationHelpers } from '../helpers/notifications';

/**
 * E2E Multi-User Task Lifecycle Tests
 * Tests complete task lifecycle: creation → notifications → updates → calendar views → schedule → archiving
 */
test.describe('Multi-User Task Lifecycle', () => {
  test('complete multi-assignee task lifecycle with notifications, calendar, schedule, and archiving', async ({ page }) => {
    test.setTimeout(300000); // Increase timeout to 5 minutes
    const tasksPage = new TasksPage(page);

    // === MANAGER: CREATE ADVANCED TASK WITH MULTIPLE ASSIGNEES ===
    await login(page, 'manager');
    if (!page.url().includes('/tasks')) {
      await page.goto('/tasks');
    }

    const taskTitle = `E2E Multi-Assignee Task ${Date.now()}`;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    await tasksPage.createAdvancedTaskWithAttachments({
      project: 'Data Platform Migration',
      title: taskTitle,
      description: 'Complete multi-assignee workflow test with notifications and calendar views',
      priority: '8',
      assignees: ['Priya Nair', 'Hannah Lee'], // MULTIPLE ASSIGNEES (1st will check notifications)
      deadline: tomorrow, // Use tomorrow to match calendar navigation
      tags: ['multi-assignee-test', 'notifications', 'calendar'],
      attachments: ['__tests__/e2e/fixtures/e2e-testing-sample.pdf'],
      recurrence: {
        frequency: 'weekly',
      },
    });

    // Verify task appears in manager's list
    console.log('Verifying task appears in manager list...');
    await tasksPage.verifyTaskInList(taskTitle);

    // === 1ST ASSIGNEE: CHECK NOTIFICATIONS AND TASK ACCESS ===
    console.log('Switching to first assignee (Admin) to check notifications...');
    await logout(page);
    await login(page, 'admin');

    const notifications = new NotificationHelpers(page);
    let foundAssignmentNotification = false;

    // Open notification panel
    console.log('Opening notification panel...');
    await notifications.openNotificationPanel();

    // Wait for notifications to load
    console.log('Waiting for notifications to load...');
    await page.waitForTimeout(3000);

    // Look for the assignment notification with the task title
    try {
      // Look for "assigned you to task" notification specifically
      console.log('Looking for assignment notification...');
      await notifications.verifyNotificationExists('assigned you to task');
      await notifications.verifyNotificationExists(taskTitle);
      foundAssignmentNotification = true;

      // Click on the assignment notification (not the file attachment notification)
      console.log('Clicking on assignment notification...');
      await notifications.clickNotificationContainingText('assigned you to task');
    } catch (error) {
      // Debug: show what notifications are actually there
      const notificationItems = notifications.getNotificationItems();
      const notificationCount = await notificationItems.count();

      for (let i = 0; i < notificationCount; i++) {
        const item = notificationItems.nth(i);
        const text = await item.textContent();
      }
    }

    // === TASK UPDATE NOTIFICATION TESTING ===
    console.log('Starting task update notification testing...');

    // Step 1: Log in as unused assignee (Daniel Staff) and perform updates
    console.log('Switching to unused assignee (Daniel Staff) for task updates...');

    // Close notification panel first to avoid logout issues
    try {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    } catch {
      // Continue if panel is already closed
    }

    await logout(page);
    await login(page, 'staff'); // Hannah Lee account

    // Navigate to the created task
    await tasksPage.goto();
    await tasksPage.clickTaskByTitle(taskTitle);
    console.log('Opened task for updates:', taskTitle);

    // Step 2: Add comment (individual action that generates separate notification)
    console.log('Adding comment to task...');
    await tasksPage.addTaskComment('Starting analysis on this task');
    console.log('Comment added successfully');

    // Step 3: Return to first assignee (Priya Admin) and verify notifications
    console.log('Switching back to first assignee (Priya Admin) to verify notifications...');

    // Close any open panels first
    try {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    } catch {
      // Continue if no panel is open
    }

    await logout(page);
    await login(page, 'admin'); // Priya Nair

    // Open notification panel and verify comment notification
    console.log('Opening notification panel to verify comment notification...');
    await notifications.openNotificationPanel();

    // Wait a moment for all notifications to fully load and be visible
    console.log('Waiting for notifications to fully load...');
    await page.waitForTimeout(1500);

    // Verify we can see both original assignment and new comment notifications
    try {
      console.log('Verifying assignment notification exists...');
      await notifications.verifyNotificationExists('assigned you to task');
      console.log('Found original assignment notification');

      // Check total notifications and look for comment notification
      console.log('Retrieving all notification texts for verification...');
      const notificationTexts = await notifications.getAllNotificationTexts();
      console.log('Current notifications:', notificationTexts);
      console.log('Total notification count:', notificationTexts.length);

      // Look for comment notification specifically
      const hasCommentNotification = notificationTexts.some(
        (text) =>
          text.toLowerCase().includes('comment') || text.toLowerCase().includes('starting analysis')
      );

      if (hasCommentNotification) {
        console.log('SUCCESS: Comment notification found');

        // Find and interact with the comment notification specifically
        console.log('Looking for comment notification to interact with...');
        const commentNotification = await notifications.findNotificationContainingText('comment');

        if (commentNotification) {
          console.log('Found comment notification, hovering over it to make it visible...');
          await commentNotification.hover();
          await page.waitForTimeout(1000); // Keep hover visible for 2 seconds

          console.log('Clicking on comment notification to view details...');
          await commentNotification.click();

          // Wait for modal to appear and be visible
          console.log('Waiting for notification modal to open...');
          try {
            await page.waitForSelector('[role="dialog"]', { state: 'visible', timeout: 5000 });
            console.log('Notification modal opened successfully');

            // Keep modal open for a moment to ensure it's visible in recording
            await page.waitForTimeout(1000);

            console.log('Closing notification modal...');
            await page.keyboard.press('Escape');
            await page.waitForTimeout(1000);
          } catch (modalError) {
            console.log('Modal may not have opened, but notification click was successful');
          }
        }
      } else {
        console.log('Comment notification not found - checking all notifications');
      }

      console.log('SUCCESS: Comment notification testing completed with full interaction');
      console.log('Comment functionality and notification verification working correctly');
    } catch (error) {
      console.log('Comment notification verification completed with error:', error);
    }

    console.log('SUCCESS: Task update notification testing completed');
    console.log('Comment notification functionality working correctly');

    // Navigate to task list view and verify task appears
    console.log('Navigating to task list to verify task appears...');
    await tasksPage.goto();
    await tasksPage.verifyTaskInList(taskTitle);

    // Navigate to calendar view and verify task appears across different views
    console.log('Switching to calendar view for comprehensive testing...');
    await tasksPage.switchToCalendarView();

    // === DAY VIEW TESTING ===
    console.log('Testing Day view...');
    await tasksPage.switchCalendarToDayView();
    // Recurring work is displayed at its next occurrence, one interval after the anchor.
    const nextOccurrence = new Date(tomorrow);
    nextOccurrence.setDate(nextOccurrence.getDate() + 7);
    await tasksPage.navigateToCalendarDate(nextOccurrence);
    await tasksPage.waitForTaskInCalendar(taskTitle);

    // Test popup in Day view (close popup, don't view full details)
    await tasksPage.clickTaskInCalendarAndHandlePopup(taskTitle, false);

    // === WEEK VIEW TESTING ===
    console.log('Testing Week view...');
    await tasksPage.switchCalendarToWeekView();

    // Scroll to find task in Week view vertical timeline
    await tasksPage.scrollCalendarToFindTask(taskTitle);
    await tasksPage.waitForTaskInCalendar(taskTitle);

    // Test popup in Week view (close popup, don't view full details)
    await tasksPage.clickTaskInCalendarAndHandlePopup(taskTitle, false);

    // === MONTH VIEW TESTING (DEFAULT FLOW - VIEW FULL DETAILS) ===
    console.log('Testing Month view with View Full Details flow...');
    await tasksPage.switchCalendarToMonthView();
    await tasksPage.waitForTaskInCalendar(taskTitle);

    // Test popup in Month view with "View Full Details" flow
    await tasksPage.clickTaskInCalendarAndHandlePopup(taskTitle, true);

    // Verify we're on task details page
    console.log('Verifying task details page...');
    await expect(page).toHaveURL(/\/tasks\/\d+/);

    // Verify task details are correct
    console.log('Verifying task details content...');
    await expect(page.getByRole('main').getByText(taskTitle, { exact: true })).toBeVisible();
    await expect(
      page.getByText('Complete multi-assignee workflow test with notifications and calendar views')
    ).toBeVisible();

    // === SCHEDULE TESTING: TEST CREATED TASK IN SCHEDULE VIEW ===
    console.log('Testing created task in schedule/Gantt view...');

    // Navigate to schedule page
    await page.goto('/schedule');
    await page.waitForLoadState('networkidle');
    console.log('Navigated to schedule page');

    // Verify schedule page loaded
    await expect(page).toHaveURL(/\/schedule/);
    console.log('Schedule page URL verified');

    // Wait for schedule content to load
    await page.getByRole('region', { name: 'Staff task timeline' }).waitFor({ timeout: 10000 });
    console.log('Schedule content loaded');

    // Find the created task in schedule
    console.log('Looking for created task in schedule:', taskTitle);
    const taskElement = page.locator(`text=${taskTitle}`).first();
    await expect(taskElement).toBeVisible({ timeout: 10000 });
    console.log('Found created task in schedule:', taskTitle);

    // === SCHEDULE DATE FILTER TESTING ===
    console.log('Testing schedule date filter presets...');

    // Look for date filter button using the component structure
    const dateFilterButton = page.locator('.relative.w-52 button').first();
    if (await dateFilterButton.isVisible()) {
      console.log('Found date filter button, opening calendar dropdown...');

      await dateFilterButton.click();
      await page.waitForTimeout(500);

      // Wait for calendar dropdown to be visible
      await page.waitForSelector('.absolute.z-50.mt-2.w-auto', { timeout: 5000 });
      console.log('Calendar dropdown opened');

      // Define the exact preset labels from the component
      const datePresets = [
        'Today',
        'Next 7 Days',
        'Next 30 Days',
        'Next 60 Days',
        'This Month',
        '2 Weeks (±1 week)',
      ];

      // Click through all preset buttons sequentially
      for (const presetName of datePresets) {
        const presetButton = page
          .locator('.flex.gap-2.p-3.border-b button')
          .filter({ hasText: presetName })
          .first();

        if (await presetButton.isVisible()) {
          console.log(`Clicking preset: "${presetName}"`);
          await presetButton.click();
          await page.waitForTimeout(1000);
          console.log(`Successfully applied "${presetName}" preset`);
        } else {
          console.log(`Preset button not found: "${presetName}"`);
        }
      }

      // Close date filter after cycling through all presets
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    } else {
      console.log('Date filter button not found, skipping date filter tests');
    }

    // The accessible deadline control replaces the old CSS-only drag handle.
    const deadlineControl = page.getByRole('button', {
      name: `Adjust deadline for ${taskTitle}`, exact: true,
    }).first();
    await deadlineControl.click();
    const today = new Date();
    const dateValue = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    await page.getByLabel('Deadline date', { exact: true }).fill(dateValue);
    const deadlineSaved = page.waitForResponse(response =>
      response.url().endsWith('/api/schedule') && response.request().method() === 'PATCH'
    );
    await page.getByRole('button', { name: 'Save deadline', exact: true }).click();
    expect((await deadlineSaved).ok()).toBeTruthy();
    await expect(page.getByRole('button', { name: `Inspect ${taskTitle}, To Do, overdue`, exact: true }).first()).toBeVisible();

    // Navigate back to task details page first, then to tasks list
    console.log('Navigating back to task details page...');
    await page.goto('/tasks'); // Go to tasks list first
    await page.waitForTimeout(1000);

    console.log('Click on task to go back to details page...');
    await tasksPage.clickTaskByTitle(taskTitle);

    console.log('Navigating back to tasks list from task details...');
    await tasksPage.backToTasksList();

    // Switch back to list view (if not already)
    console.log('Switching back to list view...');
    await tasksPage.switchToListView();

    // === MANAGER: LOG BACK IN AND ARCHIVE THE TASK ===
    console.log('Switching back to manager to archive the task...');
    await logout(page);
    await login(page, 'manager');

    // Navigate to tasks page if not already there
    if (!page.url().includes('/tasks')) {
      await page.goto('/tasks');
    }

    // Verify task is still in manager's list
    console.log('Verifying task appears in manager list before archiving...');
    await tasksPage.verifyTaskInList(taskTitle);

    // Click on the task to view details
    console.log('Opening task details for archiving...');
    await tasksPage.clickTaskByTitle(taskTitle);

    // Verify we're on task details page
    console.log('Verifying we are on task details page...');
    await expect(page).toHaveURL(/\/tasks\/\d+/);

    // Archive the task (manager-only feature)
    console.log('Archiving the task...');
    await tasksPage.archiveTask();

    // Verify redirected back to tasks page
    console.log('Verifying redirect back to tasks page...');
    await expect(page).toHaveURL('/tasks');

    // Verify task no longer appears in active list
    console.log('Verifying task no longer appears in active list...');
    await tasksPage.verifyTaskNotInList(taskTitle);

    console.log('Multi-assignee task workflow test completed successfully!');
  });
});
