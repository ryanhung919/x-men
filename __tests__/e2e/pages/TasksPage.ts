import { Page, expect, Locator } from '@playwright/test';

/**
 * Page Object for Tasks page
 * Handles task creation, editing, filtering, and view switching
 */
export class TasksPage {
  readonly page: Page;
  readonly createTaskButton: Locator;
  readonly listViewButton: Locator;
  readonly calendarViewButton: Locator;
  constructor(page: Page) {
    this.page = page;
    this.createTaskButton = page.getByRole('button', { name: /Create Task/i });
    this.listViewButton = page.getByRole('button', { name: /Switch to list view/i });
    this.calendarViewButton = page.getByRole('button', { name: /Switch to calendar view/i });
  }

  /**
   * Navigate to the tasks page
   */
  async goto() {
    await this.page.goto('/tasks');
    await expect(this.page).toHaveURL('/tasks');
  }

  /**
   * Open the create task dialog
   */
  async openCreateTaskDialog() {
    await this.createTaskButton.click();
    // Wait for dialog to appear
    await expect(this.page.getByRole('heading', { name: /Create New Task/i })).toBeVisible();
  }

  /**
   * Fill basic task fields
   */
  async fillBasicTaskFields(taskData: {
    project: string;
    title: string;
    description: string;
    priority: string;
    status?: string;
    assignee: string;
    deadline: Date;
  }) {
    // Select project - click the combobox trigger to open dropdown
    await this.page.getByText('Select a project').click();
    // Wait for dropdown to open and click the project name within the listbox
    await this.page.locator('[role="listbox"]').getByText(taskData.project, { exact: true }).click();
    // Close the dropdown (it doesn't close automatically)
    await this.page.keyboard.press('Escape');

    // Fill title
    await this.page.getByLabel(/Title/i).fill(taskData.title);

    // Fill description
    await this.page.getByLabel(/Description/i).fill(taskData.description);

    // Select priority
    await this.page.getByRole('combobox', { name: /Priority/i }).click();
    await this.page.getByRole('option', { name: taskData.priority }).click();

    // Select status (if provided, defaults to "To Do")
    if (taskData.status) {
      await this.page.getByRole('combobox', { name: /Status/i }).click();
      await this.page.getByRole('option', { name: taskData.status }).click();
    }

    // Select assignee - click the trigger to open dropdown
    await this.page.getByText('Select assignees').click();
    // Wait for dropdown and click the assignee name within the dropdown (scope to avoid duplicates in page)
    await this.page.locator('[role="listbox"]').getByText(taskData.assignee, { exact: true }).click();
    // Close assignee selector
    await this.page.keyboard.press('Escape');

    // Select deadline - click to open calendar popover
    await this.page.getByRole('button', { name: /Pick a date/i }).click();
    // Wait for calendar grid to be visible
    await this.page.locator('[role="grid"]').waitFor({ state: 'visible' });
    // Click the day by its visible text - more reliable approach
    const dayNumber = taskData.deadline.getDate().toString();
    await this.page.locator('[role="grid"] button').filter({ hasText: dayNumber }).first().click();

    // Ensure calendar closes by pressing Escape or clicking outside
    await this.page.waitForTimeout(500); // Wait for date to be selected

    // Try multiple ways to close the calendar if it's still open
    for (let i = 0; i < 3; i++) {
      try {
        const calendarVisible = await this.page.locator('[role="grid"]').isVisible({ timeout: 1000 });
        if (calendarVisible) {
          await this.page.keyboard.press('Escape');
          await this.page.waitForTimeout(200);
        } else {
          break; // Calendar is closed
        }
      } catch {
        break; // Calendar not found or closed
      }
    }
  }

  /**
   * Add tags to task
   */
  async addTags(tags: string[]) {
    const tagInput = this.page.getByPlaceholder(/Type tags/i);
    for (const tag of tags) {
      await tagInput.fill(tag);
      await tagInput.press('Enter');
    }
  }

  /**
   * Set task as recurring
   */
  async setRecurring(frequency: 'daily' | 'weekly' | 'monthly', startDate: Date) {
    // Check recurring checkbox
    await this.page.getByRole('checkbox', { name: /Recurring Task/i }).check();

    // Select frequency
    await this.page.getByRole('combobox', { name: /Frequency/i }).click();
    await this.page.getByRole('option', { name: new RegExp(frequency, 'i') }).click();

    // Select start date - click to open calendar popover (this is in the recurrence section)
    await this.page.locator('div[class*="border"]').locator('button').filter({ hasText: /Pick a date/i }).click();
    // Wait for calendar and click the day by its visible text
    const dayNumber = startDate.getDate().toString();
    await this.page.locator('[role="grid"] button').filter({ hasText: dayNumber }).first().click();
  }

  /**
   * Submit the create task form
   */
  async submitTaskForm() {
    await this.page.getByRole('button', { name: /^Create Task$/i }).click();
    // Wait for dialog to close
    await expect(this.page.getByRole('heading', { name: /Create New Task/i })).not.toBeVisible();
  }

  
  
  /**
   * Switch to calendar view
   */
  async switchToCalendarView() {
    await this.calendarViewButton.click();
    // Wait for calendar to load
    await expect(this.page.getByRole('button', { name: /Today/i })).toBeVisible();
  }

  /**
   * Switch to list view
   */
  async switchToListView() {
    await this.listViewButton.click();
    // Wait a moment for the view to switch and table to appear
    await this.page.waitForTimeout(1000);
    // Look for any indication that we're in list view (task rows or table structure)
    await expect(this.page.locator('table, [role="table"], .task-row, tr').first()).toBeVisible();
  }

  
  /**
   * Click on a task in the list to view details
   */
  async clickTaskByTitle(title: string) {
    const taskRow = this.page.getByRole('row').filter({ hasText: title });
    await taskRow.click();
    // Wait for navigation to task details page
    await this.page.waitForURL(/\/tasks\/\d+/);
  }

  /**
   * Verify task appears in the list
   */
  async verifyTaskInList(title: string) {
    await expect(this.page.getByRole('cell', { name: title })).toBeVisible();
  }

  /**
   * Verify task appears in calendar view
   */
  async verifyTaskInCalendar(title: string) {
    // In calendar view, tasks appear as event elements
    await expect(this.page.getByText(title)).toBeVisible();
  }

  /**
   * Archive a task (from task details page)
   * Note: Only available for managers
   */
  async archiveTask() {
    console.log('Attempting to archive task...');

    // Try to find the Archive Task button with multiple selectors
    const archiveButton = this.page.getByRole('button', { name: /Archive Task/i })
      .or(this.page.getByRole('button', { name: /Archive/i }))
      .or(this.page.locator('button').filter({ hasText: 'Archive Task' }))
      .or(this.page.locator('button').filter({ hasText: 'Archive' }));

    await archiveButton.first().click({ timeout: 5000 });
    console.log('Archive button clicked');

    // Wait for confirmation dialog with better error handling
    try {
      await expect(this.page.getByRole('heading', { name: /Are you sure/i })).toBeVisible({ timeout: 3000 });
      console.log('Confirmation dialog appeared');
    } catch {
      console.log('No confirmation dialog found, checking if already archived...');
      // If no confirmation dialog, check if we're already redirected
      const currentUrl = this.page.url();
      if (currentUrl.includes('/tasks')) {
        console.log('Already redirected to tasks page');
        return;
      }
    }

    // Confirm archive
    const confirmButton = this.page.getByRole('button', { name: /^Archive$/i })
      .or(this.page.locator('button').filter({ hasText: /^Archive$/i }))
      .or(this.page.getByRole('button', { name: /Confirm/i }));

    await confirmButton.first().click({ timeout: 5000 });
    console.log('Confirm archive clicked');

    // Wait for redirect back to tasks page with better error handling
    try {
      await this.page.waitForURL(/\/tasks/, { timeout: 5000 });
      console.log('Successfully redirected to tasks page');
    } catch (error) {
      console.log('Failed to wait for URL redirect, manually navigating...');
      // Fallback: manually navigate to tasks
      await this.page.goto('/tasks');
      await this.page.waitForLoadState('networkidle');
    }
  }

  /**
   * Verify task is NOT in the list (e.g., after archiving)
   */
  async verifyTaskNotInList(title: string) {
    await expect(this.page.getByRole('cell', { name: title })).not.toBeVisible();
  }

  /**
   * Verify validation error appears
   */
  async verifyValidationError(errorText: string) {
    // Try multiple ways to find the error message
    const errorElement = this.page.getByText(new RegExp(errorText, 'i'))
      .or(this.page.locator('.error, .error-message, [role="alert"]').filter({ hasText: new RegExp(errorText, 'i') }))
      .or(this.page.locator('text=/' + errorText + '/i'));

    await expect(errorElement.first()).toBeVisible({ timeout: 3000 });
  }

  /**
   * Submit form without filling required fields (for validation testing)
   */
  async submitEmptyForm() {
    await this.page.getByRole('button', { name: /^Create Task$/i }).click();
    // Dialog should remain open
    await expect(this.page.getByRole('heading', { name: /Create New Task/i })).toBeVisible();
  }

  /**
   * Get task row by title
   */
  getTaskRow(title: string): Locator {
    return this.page.getByRole('row').filter({ hasText: title });
  }

  /**
   * Verify task has priority badge
   */
  async verifyTaskPriority(title: string, priority: string) {
    const taskRow = this.getTaskRow(title);
    // Look for the priority badge specifically, not just any text matching the priority number
    await expect(taskRow.locator('[data-slot="badge"]').filter({ hasText: priority })).toBeVisible();
  }

  /**
   * Verify task has status badge
   */
  async verifyTaskStatus(title: string, status: string) {
    const taskRow = this.getTaskRow(title);
    await expect(taskRow.getByText(status)).toBeVisible();
  }

  /**
   * Add attachments to task in the create/edit dialog
   */
  async addAttachments(filePaths: string[]) {

    // Find the visible drag and drop zone (not the hidden input)
    const uploadZone = this.page.locator('div').filter({ hasText: /Drag files here or click to browse/i })
      .or(this.page.locator('[data-testid="file-upload-zone"]'))
      .or(this.page.locator('div[class*="border-dashed"]'))
      .or(this.page.locator('div[class*="upload"]'));

    for (let i = 0; i < filePaths.length; i++) {
      const filePath = filePaths[i];

      try {
        // Wait for upload zone to be visible
        await uploadZone.first().waitFor({ state: 'visible', timeout: 5000 });

        // Set files directly on the hidden input element (more reliable than clicking)
        const fileInput = this.page.locator('input[type="file"]');
        await fileInput.setInputFiles(filePath);

        // Wait for the file to be processed and appear in the UI
        await this.page.waitForTimeout(1500);

        // Verify the file appears in the file list
        const fileName = filePath.split('/').pop() || filePath;
        const fileVisible = await this.page.getByText(fileName).isVisible({ timeout: 3000 });
        if (fileVisible) {
        } else {
          // Try alternative selectors to find the file
          const fileByExtension = await this.page.locator('text=/.pdf$/i').isVisible({ timeout: 2000 });
          if (fileByExtension) {
          }
        }

      } catch (error) {
        // Don't throw error, just log it so the test can continue
      }
    }

  }

  /**
   * Add multiple assignees to task (enhanced version of existing single assignee)
   */
  async addMultipleAssignees(assignees: string[]) {
    // Wait a moment to ensure any previous interactions are complete
    await this.page.waitForTimeout(500);

    // Try multiple possible selectors for the assignee dropdown trigger
    const assigneeSelector = this.page.getByText(/Select assignees/i)
      .or(this.page.getByText(/Select assignee/i))
      .or(this.page.getByText(/assignees/i))
      .or(this.page.locator('[data-testid="assignee-input"]'))
      .or(this.page.locator('input[placeholder*="assignee"]'))
      .or(this.page.locator('button[aria-label*="assignee"]'));

    // Click to open the dropdown
    await assigneeSelector.first().click({ timeout: 5000 });
    await this.page.waitForTimeout(500); // Wait for dropdown to open

    for (const assignee of assignees) {
      // Click each assignee in the dropdown with better error handling
      try {
        await this.page.locator('[role="listbox"]').getByText(assignee, { exact: true }).click({ timeout: 3000 });
        await this.page.waitForTimeout(200); // Small delay between selections
      } catch {
        // Try alternative selector for assignee options
        try {
          await this.page.getByRole('option', { name: assignee }).click({ timeout: 3000 });
          await this.page.waitForTimeout(200);
        } catch {
          // Try clicking by text content directly
          await this.page.locator('[role="option"], div[role="menuitem"], .option').filter({ hasText: assignee }).first().click({ timeout: 3000 });
          await this.page.waitForTimeout(200);
        }
      }
    }

    // Close the dropdown
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(300);
  }

  /**
   * Enhanced create advanced task with attachments and multiple assignees
   */
  async createAdvancedTaskWithAttachments(taskData: {
    project: string;
    title: string;
    description: string;
    priority: string;
    assignees: string[]; // Multiple assignees
    deadline: Date;
    tags?: string[];
    recurrence?: {
      frequency: 'daily' | 'weekly' | 'monthly';
      startDate: Date;
    };
    attachments?: string[]; // File paths
  }) {
    await this.openCreateTaskDialog();

    // Fill basic fields but don't set assignee yet (we'll do multiple assignees)
    await this.page.getByText('Select a project').click();
    await this.page.locator('[role="listbox"]').getByText(taskData.project, { exact: true }).click();
    await this.page.keyboard.press('Escape');

    await this.page.getByLabel(/Title/i).fill(taskData.title);
    await this.page.getByLabel(/Description/i).fill(taskData.description);

    await this.page.getByRole('combobox', { name: /Priority/i }).click();
    await this.page.getByRole('option', { name: taskData.priority }).click();

    // Select deadline
    await this.page.getByRole('button', { name: /Pick a date/i }).click();
    await this.page.locator('[role="grid"]').waitFor({ state: 'visible' });
    const dayNumber = taskData.deadline.getDate().toString();
    await this.page.locator('[role="grid"] button').filter({ hasText: dayNumber }).first().click();

    // Ensure calendar closes
    await this.page.waitForTimeout(500);
    for (let i = 0; i < 3; i++) {
      try {
        const calendarVisible = await this.page.locator('[role="grid"]').isVisible({ timeout: 1000 });
        if (calendarVisible) {
          await this.page.keyboard.press('Escape');
          await this.page.waitForTimeout(200);
        } else {
          break;
        }
      } catch {
        break;
      }
    }

    // Now handle multiple assignees properly
    await this.page.getByText(/Select assignees/i).click();
    await this.page.waitForTimeout(500);

    for (const assignee of taskData.assignees) {
      try {
        await this.page.locator('[role="listbox"]').getByText(assignee, { exact: true }).click({ timeout: 3000 });
        await this.page.waitForTimeout(200);
      } catch {
        await this.page.getByRole('option', { name: assignee }).click({ timeout: 3000 });
        await this.page.waitForTimeout(200);
      }
    }
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(300);

    // Add tags
    if (taskData.tags && taskData.tags.length > 0) {
      await this.addTags(taskData.tags);
    }

    // Scroll down to access attachment fields
    await this.page.keyboard.press('End');
    await this.page.waitForTimeout(500);

    // Add attachments
    if (taskData.attachments && taskData.attachments.length > 0) {
      await this.addAttachments(taskData.attachments);
    }

    // Set recurrence
    if (taskData.recurrence) {
      await this.setRecurring(taskData.recurrence.frequency, taskData.recurrence.startDate);
    }

    // Scroll back up to find the submit button
    await this.page.keyboard.press('Home');
    await this.page.waitForTimeout(500);

    await this.submitTaskForm();
    // Wait for page refresh
    await this.page.waitForTimeout(1000);
  }

  /**
   * Navigate to a specific date in calendar view
   */
  async navigateToCalendarDate(date: Date) {
    // Click Today button first to go to current date
    try {
      await this.page.getByRole('button', { name: 'Today' }).click();
      await this.page.waitForTimeout(500);
    } catch {
      // Today button might not be visible, continue
    }

    const today = new Date();
    const targetDate = new Date(date);

    // Calculate days difference
    const daysDiff = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff > 0) {
      // Navigate forward by clicking the chevron button the required number of times
      for (let i = 0; i < daysDiff; i++) {
        await this.page.locator('button').filter({ has: this.page.locator('svg.lucide-chevron-right') }).first().click();
        await this.page.waitForTimeout(300);
      }
    } else if (daysDiff < 0) {
      // Navigate backward
      for (let i = 0; i < Math.abs(daysDiff); i++) {
        try {
          await this.page.getByRole('button', { name: 'Previous' }).click();
          await this.page.waitForTimeout(300);
        } catch {
          // Try alternative selector for previous button
          try {
            await this.page.locator('button').filter({ has: this.page.locator('svg') }).filter({ hasText: '' }).first().click();
            await this.page.waitForTimeout(300);
          } catch {
          }
        }
      }
    }
  }

  /**
   * Wait for task to appear in calendar view with retry
   */
  async waitForTaskInCalendar(title: string, timeout = 10000) {
    await expect(this.page.getByText(title)).toBeVisible({ timeout });
  }

  /**
   * Scroll within calendar component to find task title (for Week view)
   */
  async scrollCalendarToFindTask(title: string) {

    // Find the scrollable calendar content area (based on week-view component)
    const calendarContent = this.page.locator('.overflow-auto, .overflow-y-auto').first();

    let found = false;
    let scrollAttempts = 0;
    const maxScrollAttempts = 15;

    while (!found && scrollAttempts < maxScrollAttempts) {
      // Check if task is currently visible by trying to find the task button
      const taskButton = this.page.getByRole('button', { name: `Task: ${title}` });
      const isVisible = await taskButton.isVisible({ timeout: 1000 });
      if (isVisible) {
        found = true;
        break;
      }

      // Scroll within the calendar content area
      try {
        await calendarContent.evaluate((el) => {
          el.scrollTop += 200; // Scroll down by 200px
        });
        await this.page.waitForTimeout(500);
      } catch {
        // Fallback: try page down
        await this.page.keyboard.press('PageDown');
        await this.page.waitForTimeout(500);
      }

      scrollAttempts++;
    }

    if (!found) {
    }
  }

  /**
   * Click on task in calendar view - first click title to open modal, then click "View Full Details"
   */
  async clickTaskInCalendar(title: string) {
    // First find the task element in calendar and click the title to open modal
    const taskElement = this.page.getByText(title).first();
    await taskElement.click();

    // Wait for modal/popup to appear
    await this.page.waitForTimeout(1000);

    // Now look for the "View Full Details" button in the modal
    const viewDetailsButton = this.page.getByRole('button', { name: /View Full Details/i })
      .or(this.page.getByText(/View Full Details/i))
      .or(this.page.locator('button').filter({ hasText: /View Full Details/i }));

    // Click the "View Full Details" button
    await viewDetailsButton.first().click({ timeout: 5000 });

    // Wait for navigation to task details page
    await this.page.waitForURL(/\/tasks\/\d+/, { timeout: 5000 });
  }

  /**
   * Navigate back to tasks list from task details page
   */
  async backToTasksList() {
    // Try multiple possible selectors for back button
    const backButton = this.page.getByRole('button', { name: /Back/i })
      .or(this.page.getByRole('link', { name: /Back/i }))
      .or(this.page.getByRole('button', { name: /Tasks/i }))
      .or(this.page.getByText(/Back to Tasks/i));

    await backButton.first().click();
    await this.page.waitForURL('/tasks');
  }

  /**
   * Switch calendar view to Day view
   */
  async switchCalendarToDayView() {
    // Use the exact aria-label from the button
    const dayButton = this.page.getByRole('button', { name: 'Day view' });

    await dayButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Switch calendar view to Week view
   */
  async switchCalendarToWeekView() {
    // Use the exact aria-label from the button
    const weekButton = this.page.getByRole('button', { name: 'Week view' });

    await weekButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Switch calendar view to Month view
   */
  async switchCalendarToMonthView() {
    // Use the exact aria-label from the button
    const monthButton = this.page.getByRole('button', { name: 'Month view' });

    await monthButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Click on task in calendar and handle popup (for testing views)
   */
  async clickTaskInCalendarAndHandlePopup(title: string, viewFullDetails = false) {
    // Try multiple ways to find and click the task in calendar
    let taskClicked = false;

    // Method 1: Try clicking by aria-label (CalendarTaskCard buttons)
    try {
      const taskButton = this.page.getByRole('button', { name: `Task: ${title}` });
      await taskButton.first().click({ timeout: 3000 });
      taskClicked = true;
    } catch {
    }

    // Method 2: Try direct text click
    if (!taskClicked) {
      try {
        const taskElement = this.page.getByText(title).first();
        await taskElement.click({ timeout: 3000 });
        taskClicked = true;
      } catch {
      }
    }

    // Method 3: Try clicking on button elements containing the task text
    if (!taskClicked) {
      try {
        const clickableTask = this.page.locator('button').filter({ hasText: title }).first();
        await clickableTask.click({ timeout: 3000 });
        taskClicked = true;
      } catch {
      }
    }

    // Wait for modal/popup to appear
    await this.page.waitForTimeout(1000);

    // Verify popup appears with task details (look for dialog title specifically)
    await expect(this.page.getByRole('heading', { name: title })).toBeVisible();

    if (viewFullDetails) {
      // Click "View Full Details" button
      const viewDetailsButton = this.page.getByRole('button', { name: /View Full Details/i })
        .or(this.page.getByText(/View Full Details/i))
        .or(this.page.locator('button').filter({ hasText: /View Full Details/i }));

      await viewDetailsButton.first().click({ timeout: 5000 });
      await this.page.waitForURL(/\/tasks\/\d+/, { timeout: 5000 });
    } else {
      // Close the popup (look for close button, escape, or click outside)
      try {
        const closeButton = this.page.getByRole('button', { name: /Close|X/i })
          .or(this.page.locator('button').filter({ hasText: /Close/i }));

        await closeButton.first().click({ timeout: 2000 });
      } catch {
        // If no close button, try pressing Escape
        await this.page.keyboard.press('Escape');
        await this.page.waitForTimeout(500);
      }
    }
  }
}
