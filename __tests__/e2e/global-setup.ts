import { chromium, FullConfig } from '@playwright/test';
import { seedDatabase } from './helpers/database';

/**
 * Global setup runs once before all tests
 * Seeds the database with sample data for testing
 */
async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL || 'http://localhost:3000';

  // Check if server is running
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await page.goto(baseURL, { timeout: 10000 });
  } catch (error) {
    console.error('Server is not running. Please start the dev server first.');
    await browser.close();
    throw new Error('Dev server is not accessible');
  }

  await browser.close();

  // Seed database
  await seedDatabase();
}

export default globalSetup;
