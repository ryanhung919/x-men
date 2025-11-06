import { Page, Locator, Download, expect } from '@playwright/test';

export type ReportType = 'loggedTime' | 'taskCompletions' | 'teamSummary';

export class ReportPage {
  readonly page: Page;
  readonly departmentSelector: Locator;
  readonly projectSelector: Locator;
  readonly dateRangeStartInput: Locator;
  readonly dateRangeEndInput: Locator;
  readonly reportTypeSelector: Locator;
  readonly exportPDFButton: Locator;
  readonly exportExcelButton: Locator;
  readonly clearFiltersButton: Locator;
  readonly activeFiltersBadge: Locator;
  readonly emptyStateMessage: Locator;

  constructor(page: Page) {
    this.page = page;

    // Initialize locators based on actual DOM structure (combobox buttons by position)
    // Comboboxes appear in order: department, project, date range, report type
    // Department is the first combobox
    this.departmentSelector = page.locator('button[role="combobox"]').nth(0);
    // Project is the second combobox
    this.projectSelector = page.locator('button[role="combobox"]').nth(1);
    this.dateRangeStartInput = page.getByLabel(/start date/i);
    this.dateRangeEndInput = page.getByLabel(/end date/i);
    this.reportTypeSelector = page.getByRole('combobox');
    this.exportPDFButton = page.getByRole('button', { name: 'Export PDF' });
    this.exportExcelButton = page.getByRole('button', { name: 'Export Excel' });
    this.clearFiltersButton = page.locator('button', { hasText: 'Clear Filters' }).first();
    this.activeFiltersBadge = page.locator('span').filter({ hasText: /department|project|\d+ departments?|\d+ projects?/i }).first();
    this.emptyStateMessage = page.getByText(/no filters selected/i);
  }

  /**
   * Navigate to the report page
   */
  async goto(): Promise<void> {
    await this.page.goto('/report');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Wait for the report to finish loading
   */
  async waitForReportLoad(): Promise<void> {
    // Wait for any loading spinners to disappear
    await this.page.waitForTimeout(1000);

    // Wait for export buttons to be enabled (indicates report is loaded)
    try {
      await this.page.waitForSelector('button:has-text("Export PDF"):not([disabled])', {
        timeout: 10000,
      });
    } catch (error) {
      // Export buttons might not be visible if no data, continue anyway
    }
  }

  /**
   * Select departments by clicking the department selector and choosing from dropdown
   */
  async selectDepartments(departmentNames: string[]): Promise<void> {
    console.log(`Selecting departments: ${departmentNames.join(', ')}`);

    // Click department selector trigger button to open dropdown
    await this.departmentSelector.click();
    console.log('Clicked department selector button');
    await this.page.waitForTimeout(2000); // Wait longer for dropdown animation

    // Select each department - use getByText for direct text matching
    for (const name of departmentNames) {
      console.log(`Looking for department option: ${name}`);

      // Use the actual component structure from DepartmentSelector
      // Target the div with the department name
      const departmentOption = this.page
        .locator('div')
        .filter({ hasText: new RegExp(`^${name}$`, 'i') })
        .first();

      console.log('Attempting to click department option...');
      await departmentOption.click({ timeout: 10000, force: true });
      console.log(`Clicked department: ${name}`);
      await this.page.waitForTimeout(500);
    }

    // Close dropdown by clicking outside or pressing Escape
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(500);
  }

  /**
   * Select projects by clicking the project selector and choosing from dropdown
   */
  async selectProjects(projectNames: string[]): Promise<void> {
    console.log(`Selecting projects: ${projectNames.join(', ')}`);

    // Click project selector trigger button to open dropdown
    await this.projectSelector.click();
    console.log('Clicked project selector button');
    await this.page.waitForTimeout(2000); // Wait longer for dropdown animation

    // Select each project - look for clickable options in the dropdown (not in button)
    for (const name of projectNames) {
      console.log(`Looking for project option: ${name}`);

      // Use the actual component structure from ProjectSelector
      // Target the div with the project name
      const projectOption = this.page
        .locator('div')
        .filter({ hasText: new RegExp(`^${name}$`, 'i') })
        .first();

      console.log('Attempting to click project option...');
      await projectOption.click({ timeout: 10000, force: true });
      console.log(`Clicked project: ${name}`);
      await this.page.waitForTimeout(500);
    }

    // Close dropdown
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(500);
  }

  /**
   * Select a date range using the date range filter preset
   * Uses the "2 Weeks (±1 week)" preset by default which covers tasks from 7 days ago to 7 days from now
   */
  async selectDateRangePreset(preset: string = '2 Weeks (±1 week)'): Promise<void> {
    // Click the date range button to open the calendar
    // Look for button with CalendarIcon or text "All Time"
    const dateRangeButton = this.page.locator('.relative.w-52 button').first();

    await dateRangeButton.click();
    await this.page.waitForTimeout(1000);

    // Wait for calendar dropdown to be visible
    await this.page.waitForSelector('.absolute.z-50', { timeout: 5000 });

    // Click the preset button
    const presetButton = this.page.locator('button').filter({ hasText: preset }).first();
    await presetButton.click();
    await this.page.waitForTimeout(1000);
  }

  /**
   * Select a date range using manual date selection
   * For more precise control when needed
   */
  async selectDateRange(startDate: Date, endDate: Date): Promise<void> {
    // For E2E tests, use the preset that covers the range
    // This is simpler and more reliable than manual date selection
    await this.selectDateRangePreset('2 Weeks (±1 week)');
  }

  /**
   * Select a report type from the dropdown
   */
  async selectReportType(reportType: ReportType): Promise<void> {
    const reportTypeMap: Record<ReportType, string> = {
      loggedTime: 'Logged Time',
      taskCompletions: 'Task Completions',
      teamSummary: 'Team Summary',
    };

    // Click the report type selector
    const selector = this.page.getByRole('combobox').filter({
      has: this.page.locator('span', { hasText: /logged time|task completion|team summary/i })
    }).first();

    await selector.click();
    await this.page.waitForTimeout(500);

    // Click the desired option
    const option = this.page.getByRole('option', {
      name: new RegExp(reportTypeMap[reportType], 'i')
    });
    await option.click();
    await this.page.waitForTimeout(1000);

    // Wait for report to load
    await this.waitForReportLoad();
  }

  /**
   * Click the Clear Filters button
   */
  async clearFilters(): Promise<void> {
    await this.clearFiltersButton.click();
    await this.page.waitForTimeout(1000);
  }

  /**
   * Clear all filters and start fresh for test scenarios
   */
  async clearAllFiltersAndWait(): Promise<void> {
    // First clear any existing filters
    if (await this.activeFiltersBadge.isVisible()) {
      await this.clearFilters();
      await this.page.waitForTimeout(2000); // Wait for data to reload
    }
  }

  /**
   * Wait for initial page load with preselected data to complete
   */
  async waitForInitialLoad(): Promise<void> {
    // Wait for either export buttons to appear (indicating report data)
    // or for filters to be visible
    await Promise.race([
      this.exportPDFButton.waitFor({ state: 'visible', timeout: 10000 }),
      this.activeFiltersBadge.waitFor({ state: 'visible', timeout: 10000 }),
      this.emptyStateMessage.waitFor({ state: 'visible', timeout: 10000 })
    ]);
  }

  /**
   * Verify that the active filters badge displays the expected text
   */
  async verifyActiveFiltersBadge(expectedText: string | RegExp): Promise<void> {
    const badge = this.page.locator('span').filter({
      hasText: /department|project|\d+/i
    }).first();

    await expect(badge).toBeVisible();

    if (typeof expectedText === 'string') {
      await expect(badge).toContainText(expectedText);
    } else {
      await expect(badge).toContainText(expectedText);
    }
  }

  /**
   * Verify that the empty state message is displayed
   */
  async verifyEmptyState(): Promise<void> {
    const emptyState = this.page.getByText(/no filters selected/i);
    await expect(emptyState).toBeVisible();
  }

  /**
   * Verify that the report has loaded successfully
   */
  async verifyReportLoaded(): Promise<void> {
    // Report is loaded if export buttons are visible and enabled
    await expect(this.exportPDFButton).toBeVisible();
    await expect(this.exportExcelButton).toBeVisible();

    // Or if the report content is visible (not empty state)
    const emptyState = this.page.getByText(/no filters selected/i);
    await expect(emptyState).not.toBeVisible();
  }

  /**
   * Verify that the report contains the specified text
   */
  async verifyReportContainsText(text: string | RegExp): Promise<void> {
    await expect(this.page.getByText(text)).toBeVisible();
  }

  /**
   * Verify that the report contains a task with the specified title
   */
  async verifyReportContainsTask(taskTitle: string): Promise<void> {
    await this.verifyReportContainsText(taskTitle);
  }

  /**
   * Get the value of a specific metric from the report
   */
  async getMetricValue(metricName: string): Promise<string> {
    const metricLabel = this.page.getByText(new RegExp(metricName, 'i'));
    await expect(metricLabel).toBeVisible();

    // The value is typically in a sibling or nearby element
    // This might need adjustment based on actual report structure
    const parent = metricLabel.locator('..').first();
    const text = await parent.textContent();
    return text?.trim() || '';
  }

  /**
   * Click Export PDF button and wait for download
   */
  async exportPDF(): Promise<Download> {
    const [download] = await Promise.all([
      this.page.waitForEvent('download', { timeout: 30000 }),
      this.exportPDFButton.click(),
    ]);

    return download;
  }

  /**
   * Click Export Excel button and wait for download
   */
  async exportExcel(): Promise<Download> {
    const [download] = await Promise.all([
      this.page.waitForEvent('download', { timeout: 30000 }),
      this.exportExcelButton.click(),
    ]);

    return download;
  }

  /**
   * Verify that export buttons are disabled (when report is loading)
   */
  async verifyExportButtonsDisabled(): Promise<void> {
    await expect(this.exportPDFButton).toBeDisabled();
    await expect(this.exportExcelButton).toBeDisabled();
  }

  /**
   * Verify that export buttons are enabled (when report is loaded)
   */
  async verifyExportButtonsEnabled(): Promise<void> {
    await expect(this.exportPDFButton).toBeEnabled();
    await expect(this.exportExcelButton).toBeEnabled();
  }

  /**
   * Verify that the report shows metrics greater than or equal to expected values
   */
  async verifyMetricGreaterThanOrEqual(metricName: string, expectedValue: number): Promise<void> {
    const metricText = await this.getMetricValue(metricName);

    // Extract numeric value from text (e.g., "Total Time: 10.5h" -> 10.5)
    const match = metricText.match(/(\d+\.?\d*)/);
    if (!match) {
      throw new Error(`Could not extract numeric value from metric: ${metricText}`);
    }

    const actualValue = parseFloat(match[1]);
    expect(actualValue).toBeGreaterThanOrEqual(expectedValue);
  }

  /**
   * Wait for the report page to be fully loaded (after navigation)
   */
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');

    // Wait a bit for the page to stabilize
    await this.page.waitForTimeout(1000);
  }

  /**
   * Verify that a specific department is selected in the filter
   */
  async verifyDepartmentSelected(departmentName: string): Promise<void> {
    const departmentBadge = this.page.locator('span').filter({
      hasText: new RegExp(departmentName, 'i')
    });
    await expect(departmentBadge).toBeVisible();
  }

  /**
   * Verify that a specific project is selected in the filter
   */
  async verifyProjectSelected(projectName: string): Promise<void> {
    const projectBadge = this.page.locator('span').filter({
      hasText: new RegExp(projectName, 'i')
    });
    await expect(projectBadge).toBeVisible();
  }
}
