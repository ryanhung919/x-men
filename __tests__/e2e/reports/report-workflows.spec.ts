import { test, expect } from '@playwright/test';
import { login, logout } from '../helpers/auth';
import { ReportPage } from '../pages/ReportPage';
import { TasksPage } from '../pages/TasksPage';

/**
 * E2E Admin Reporting Workflow Tests
 * Tests complete workflow: report before state, task creation, report after state
 */
test.describe('Admin Reporting Workflows with Real Task Data', () => {
  test('complete reporting workflow with task creation', async ({ page }) => {
    test.setTimeout(180000);

    const tasksPage = new TasksPage(page);
    const reportPage = new ReportPage(page);

    const timestamp = Date.now();
    const completedTaskTitle = `E2E Report Completed Task ${timestamp}`;
    const inProgressTaskTitle = `E2E Report In Progress Task ${timestamp}`;
    const todoTaskTitle = `E2E Report Todo Task ${timestamp}`;

    // === LOGIN AND VERIFY BEFORE STATE ===
    console.log('Logging in as admin and checking BEFORE state...');
    await login(page, 'admin');

    await reportPage.goto();
    await reportPage.waitForPageLoad();

    console.log('Setting up filters for Finance Director department...');
    await reportPage.selectDepartments(['Finance Director']);
    await page.waitForTimeout(2000);
    await reportPage.selectProjects(['Annual Budget FY25']);
    await page.waitForTimeout(2000);
    await reportPage.selectDateRangePreset('2 Weeks (±1 week)');
    await page.waitForTimeout(2000);

    console.log('Verifying all report types load with existing data...');

    await reportPage.selectReportType('loggedTime');
    await reportPage.verifyReportLoaded();
    console.log('Logged Time Report loaded (BEFORE state)');

    await reportPage.selectReportType('teamSummary');
    await reportPage.verifyReportLoaded();
    console.log('Team Summary Report loaded (BEFORE state)');

    await reportPage.selectReportType('taskCompletions');
    await reportPage.verifyReportLoaded();
    console.log('Task Completion Report loaded (BEFORE state)');

    // === CREATE TASKS AS MANAGER ===
    console.log('Logging out and logging in as manager to create tasks...');
    await logout(page);
    await login(page, 'manager');
    await tasksPage.goto();

    console.log('Creating completed task...');
    const today = new Date();
    await tasksPage.createAdvancedTaskWithAttachments({
      project: 'Annual Budget FY25',
      title: completedTaskTitle,
      description: 'This task is completed for report testing',
      priority: '5',
      status: 'Completed',
      assignees: ['Mitch Shona'],
      deadline: today,
      tags: ['report-testing', 'completed'],
    });
    await page.waitForTimeout(2000);

    console.log('Creating in progress task...');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await tasksPage.createAdvancedTaskWithAttachments({
      project: 'Annual Budget FY25',
      title: inProgressTaskTitle,
      description: 'This task is in progress for report testing',
      priority: '7',
      status: 'In Progress',
      assignees: ['Noel Tang'],
      deadline: tomorrow,
      tags: ['report-testing', 'in-progress'],
    });
    await page.waitForTimeout(2000);

    console.log('Creating todo task...');
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    await tasksPage.createAdvancedTaskWithAttachments({
      project: 'Annual Budget FY25',
      title: todoTaskTitle,
      description: 'This task is todo for report testing',
      priority: '6',
      assignees: ['Ryan Hung'],
      deadline: nextWeek,
      tags: ['report-testing', 'todo'],
    });
    await page.waitForTimeout(2000);

    console.log('Verifying all 3 tasks appear in manager list...');
    await tasksPage.toggleShowCompleted();
    await page.waitForTimeout(1000);

    await tasksPage.verifyTaskInList(completedTaskTitle);
    await tasksPage.verifyTaskInList(inProgressTaskTitle);
    await tasksPage.verifyTaskInList(todoTaskTitle);
    console.log('All 3 tasks created successfully');

    console.log('Waiting for database synchronization...');
    await page.waitForTimeout(5000);

    // === VERIFY AFTER STATE ===
    console.log('Switching back to admin to check AFTER state...');
    await logout(page);
    await login(page, 'admin');

    await reportPage.goto();
    await reportPage.waitForPageLoad();

    console.log('Setting up filters (same as BEFORE)...');
    await reportPage.selectDepartments(['Finance Director']);
    await page.waitForTimeout(2000);
    await reportPage.selectProjects(['Annual Budget FY25']);
    await page.waitForTimeout(2000);
    await reportPage.selectDateRangePreset('2 Weeks (±1 week)');
    await page.waitForTimeout(2000);

    console.log('Verifying all reports load with newly created tasks...');

    await reportPage.selectReportType('loggedTime');
    await reportPage.verifyReportLoaded();
    console.log('Logged Time Report loaded (AFTER state)');

    await reportPage.selectReportType('teamSummary');
    await reportPage.verifyReportLoaded();
    console.log('Team Summary Report loaded (AFTER state)');

    await reportPage.selectReportType('taskCompletions');
    await reportPage.verifyReportLoaded();
    console.log('Task Completion Report loaded (AFTER state)');
    console.log(`Created tasks: ${completedTaskTitle}, ${inProgressTaskTitle}, ${todoTaskTitle}`);
  });
});
