import { Download, expect } from '@playwright/test';
import * as XLSX from 'xlsx';
import * as fs from 'fs';

/**
 * Parses PDF content and returns extracted text
 * Uses pdf-parse v2 API with PDFParse class
 */
export async function parsePDFContent(download: Download): Promise<string> {
  const path = await download.path();
  if (!path) {
    throw new Error('Download path not available');
  }

  const dataBuffer = fs.readFileSync(path);

  // Import PDFParse class from pdf-parse (v2 API)
  const { PDFParse } = await import('pdf-parse');

  // Convert Buffer to Uint8Array (required by pdf-parse v2)
  const uint8Array = new Uint8Array(dataBuffer);

  // Create parser instance with Uint8Array
  const parser = new PDFParse(uint8Array);

  // Extract text using getText() method
  const result = await parser.getText();
  return result.text;
}

/**
 * Verifies that PDF content contains all expected text strings
 */
export async function verifyPDFContains(
  download: Download,
  expectedTexts: string[]
): Promise<void> {
  const content = await parsePDFContent(download);

  console.log('\n--- PDF Content Preview (first 500 chars) ---');
  console.log(content.substring(0, 500));
  console.log('--- End Preview ---\n');

  for (const expectedText of expectedTexts) {
    expect(content).toContain(expectedText);
  }
}

/**
 * Parses Excel workbook and returns XLSX.WorkBook object
 */
export async function parseExcelWorkbook(download: Download): Promise<XLSX.WorkBook> {
  const path = await download.path();
  if (!path) {
    throw new Error('Download path not available');
  }

  // Use dynamic import to get the correct XLSX object
  const xlsx = await import('xlsx');
  const XLSX_LIB = xlsx.default || xlsx;

  return XLSX_LIB.readFile(path);
}

/**
 * Gets all sheet names from an Excel workbook
 */
export async function getExcelSheetNames(download: Download): Promise<string[]> {
  const workbook = await parseExcelWorkbook(download);
  return workbook.SheetNames;
}

/**
 * Gets data from a specific Excel sheet as an array of objects
 */
export async function getExcelSheetData(
  download: Download,
  sheetName: string
): Promise<any[]> {
  const workbook = await parseExcelWorkbook(download);
  const sheet = workbook.Sheets[sheetName];

  if (!sheet) {
    throw new Error(`Sheet "${sheetName}" not found in workbook`);
  }

  // Use dynamic import to get the correct XLSX object
  const xlsx = await import('xlsx');
  const XLSX_LIB = xlsx.default || xlsx;

  return XLSX_LIB.utils.sheet_to_json(sheet);
}

/**
 * Verifies that an Excel workbook contains all expected sheet names
 */
export async function verifyExcelSheetsExist(
  download: Download,
  expectedSheets: string[]
): Promise<void> {
  const workbook = await parseExcelWorkbook(download);
  const sheetNames = workbook.SheetNames;

  console.log(`\n--- Excel Sheets Found: ${sheetNames.join(', ')} ---`);

  for (const expectedSheet of expectedSheets) {
    expect(sheetNames).toContain(expectedSheet);
  }
}

/**
 * Verifies that a specific sheet has at least the minimum number of rows
 */
export async function verifyExcelSheetHasMinRows(
  download: Download,
  sheetName: string,
  minRows: number
): Promise<void> {
  const data = await getExcelSheetData(download, sheetName);
  console.log(`Sheet "${sheetName}" has ${data.length} rows (minimum: ${minRows})`);
  expect(data.length).toBeGreaterThanOrEqual(minRows);
}

/**
 * Verifies Excel content including sheets and basic data validation
 */
export async function verifyExcelContent(
  download: Download,
  options: {
    expectedSheets: string[];
    sheetValidations?: Array<{ sheetName: string; minRows: number }>;
  }
): Promise<void> {
  // Verify sheets exist
  await verifyExcelSheetsExist(download, options.expectedSheets);

  // Verify sheet data if provided
  if (options.sheetValidations) {
    for (const validation of options.sheetValidations) {
      await verifyExcelSheetHasMinRows(download, validation.sheetName, validation.minRows);
    }
  }
}
