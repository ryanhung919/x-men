import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';
import { ReportPage } from '../pages/ReportPage';
import * as fs from 'fs';
import { verifyPDFContains, verifyExcelContent } from '../helpers/exports';

/**
 * E2E Report Export Tests
 * Tests PDF and Excel export functionality using pre-loaded report data from SSR
 */
test.describe('Report Export Functionality', () => {
  test('PDF export downloads and file verification', async ({ page }) => {
    test.setTimeout(120000);

    const reportPage = new ReportPage(page);
    const downloadsDir = 'test-results/downloads';

    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true });
    }

    await login(page, 'admin');
    await reportPage.goto();
    await reportPage.waitForPageLoad();
    await page.waitForTimeout(3000);

    // === LOGGED TIME REPORT PDF ===
    console.log('Testing Logged Time Report PDF export...');
    await reportPage.selectReportType('loggedTime');
    await reportPage.waitForReportLoad();

    const loggedTimePDF = await reportPage.exportPDF();
    expect(loggedTimePDF.suggestedFilename()).toMatch(/logged.*time.*\.pdf$/i);

    const loggedTimePath = await loggedTimePDF.path();
    const loggedTimeStats = fs.statSync(loggedTimePath!);
    expect(loggedTimeStats.size).toBeGreaterThan(1000);
    console.log(`PDF file size: ${loggedTimeStats.size} bytes`);

    fs.copyFileSync(loggedTimePath!, `${downloadsDir}/${loggedTimePDF.suggestedFilename()}`);
    console.log(`Saved to: ${downloadsDir}/${loggedTimePDF.suggestedFilename()}`);

    await verifyPDFContains(loggedTimePDF, [
      'Logged Time',
      'Time Distribution',
      'On-Time Completion Rate'
    ]);
    console.log('PDF content validated');

    // === TEAM SUMMARY REPORT PDF ===
    console.log('Testing Team Summary Report PDF export...');
    await reportPage.selectReportType('teamSummary');
    await reportPage.waitForReportLoad();

    const teamSummaryPDF = await reportPage.exportPDF();
    expect(teamSummaryPDF.suggestedFilename()).toMatch(/team.*summary.*\.pdf$/i);

    const teamSummaryPath = await teamSummaryPDF.path();
    const teamSummaryStats = fs.statSync(teamSummaryPath!);
    expect(teamSummaryStats.size).toBeGreaterThan(1000);

    fs.copyFileSync(teamSummaryPath!, `${downloadsDir}/${teamSummaryPDF.suggestedFilename()}`);

    await verifyPDFContains(teamSummaryPDF, [
      'Team Summary',
      'Total Tasks by Week',
      'Top 10 Users by Total Tasks'
    ]);
    console.log('PDF content validated');

    // === TASK COMPLETION REPORT PDF ===
    console.log('Testing Task Completion Report PDF export...');
    await reportPage.selectReportType('taskCompletions');
    await reportPage.waitForReportLoad();

    const taskCompletionPDF = await reportPage.exportPDF();
    expect(taskCompletionPDF.suggestedFilename()).toMatch(/task.*completion.*\.pdf$/i);

    const taskCompletionPath = await taskCompletionPDF.path();
    const taskCompletionStats = fs.statSync(taskCompletionPath!);
    expect(taskCompletionStats.size).toBeGreaterThan(1000);

    fs.copyFileSync(taskCompletionPath!, `${downloadsDir}/${taskCompletionPDF.suggestedFilename()}`);

    await verifyPDFContains(taskCompletionPDF, [
      'Task Completions',
      'Task Status Distribution',
      'Overall Completion Rate'
    ]);
    console.log('PDF content validated');
  });

  test('Excel export content validation for all report types', async ({ page }) => {
    test.setTimeout(120000);

    const reportPage = new ReportPage(page);
    const downloadsDir = 'test-results/downloads';

    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true });
    }

    await login(page, 'admin');
    await reportPage.goto();
    await reportPage.waitForPageLoad();

    console.log('Selecting filters for report generation...');
    await reportPage.selectDepartments(['Finance Director']);
    await page.waitForTimeout(2000);
    await reportPage.selectProjects(['Annual Budget FY25']);
    await page.waitForTimeout(2000);
    await reportPage.selectDateRangePreset('2 Weeks (±1 week)');
    await page.waitForTimeout(2000);

    // === LOGGED TIME REPORT EXCEL ===
    console.log('Testing Logged Time Report Excel export...');
    await reportPage.selectReportType('loggedTime');
    await reportPage.waitForReportLoad();

    const loggedTimeExcel = await reportPage.exportExcel();
    expect(loggedTimeExcel.suggestedFilename()).toMatch(/logged.*time.*\.xlsx$/i);

    const loggedTimePath = await loggedTimeExcel.path();
    fs.copyFileSync(loggedTimePath!, `${downloadsDir}/${loggedTimeExcel.suggestedFilename()}`);

    await verifyExcelContent(loggedTimeExcel, {
      expectedSheets: ['Summary', 'Detailed Metrics'],
      sheetValidations: [
        { sheetName: 'Summary', minRows: 1 },
        { sheetName: 'Detailed Metrics', minRows: 1 }
      ]
    });
    console.log('Excel content validated');

    // === TEAM SUMMARY REPORT EXCEL ===
    console.log('Testing Team Summary Report Excel export...');
    await reportPage.selectReportType('teamSummary');
    await reportPage.waitForReportLoad();

    const teamSummaryExcel = await reportPage.exportExcel();
    expect(teamSummaryExcel.suggestedFilename()).toMatch(/team.*summary.*\.xlsx$/i);

    const teamSummaryPath = await teamSummaryExcel.path();
    fs.copyFileSync(teamSummaryPath!, `${downloadsDir}/${teamSummaryExcel.suggestedFilename()}`);

    await verifyExcelContent(teamSummaryExcel, {
      expectedSheets: ['Summary', 'Detailed Metrics'],
      sheetValidations: [
        { sheetName: 'Summary', minRows: 1 },
        { sheetName: 'Detailed Metrics', minRows: 1 }
      ]
    });
    console.log('Excel content validated');

    // === TASK COMPLETION REPORT EXCEL ===
    console.log('Testing Task Completion Report Excel export...');
    await reportPage.selectReportType('taskCompletions');
    await reportPage.waitForReportLoad();

    const taskCompletionExcel = await reportPage.exportExcel();
    expect(taskCompletionExcel.suggestedFilename()).toMatch(/task.*completion.*\.xlsx$/i);

    const taskCompletionPath = await taskCompletionExcel.path();
    fs.copyFileSync(taskCompletionPath!, `${downloadsDir}/${taskCompletionExcel.suggestedFilename()}`);

    await verifyExcelContent(taskCompletionExcel, {
      expectedSheets: ['Summary', 'Detailed Metrics'],
      sheetValidations: [
        { sheetName: 'Summary', minRows: 1 },
        { sheetName: 'Detailed Metrics', minRows: 1 }
      ]
    });
    console.log('Excel content validated');
  });
});
