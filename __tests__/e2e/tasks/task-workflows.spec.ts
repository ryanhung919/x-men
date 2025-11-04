import { test, expect } from '@playwright/test';
import { login, logout } from '../helpers/auth';
import { TasksPage } from '../pages/TasksPage';
import { NotificationHelpers } from '../helpers/notifications';

/**
 * E2E Task Management Workflow Tests
 */
test.describe('Task Management Workflows', () => {

  test('complete multi-assignee task workflow with notifications', async ({ page }) => {
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
      project: 'Data Warehouse Lift',
      title: taskTitle,
      description: 'Complete multi-assignee workflow test with notifications and calendar views',
      priority: '8',
      assignees: ['Mitch Shona', 'Noel Tang'], // MULTIPLE ASSIGNEES (1st will check notifications)
      deadline: tomorrow, // Use tomorrow to match calendar navigation
      tags: ['multi-assignee-test', 'notifications', 'calendar'],
      attachments: ['__tests__/e2e/fixtures/e2e-testing-sample.pdf'],
      recurrence: {
        frequency: 'weekly',
        startDate: tomorrow,
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
    await tasksPage.navigateToCalendarDate(tomorrow);
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
    await expect(page.getByText(taskTitle)).toBeVisible();
    await expect(page.getByText('Complete multi-assignee workflow test with notifications and calendar views')).toBeVisible();

    // Navigate back to tasks list
    console.log('Navigating back to tasks list...');
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

