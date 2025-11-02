import { chromium, FullConfig } from '@playwright/test';
import { seedDatabase, checkDatabaseHealth } from './helpers/database';

/**
 * Global setup runs once before all tests
 * Seeds the database with sample data for testing
 */
async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL || 'http://localhost:3000';

  console.log('\nRunning global setup...');
  console.log(`Base URL: ${baseURL}`);

  // Check if server is running
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await page.goto(baseURL, { timeout: 10000 });
    console.log('Server is running');
  } catch (error) {
    console.error('Server is not running. Please start the dev server first.');
    await browser.close();
    throw new Error('Dev server is not accessible');
  }

  await browser.close();

  // Check database health
  console.log('Checking database health...');
  const isHealthy = await checkDatabaseHealth();

  if (!isHealthy) {
    console.warn('Database health check failed, but continuing...');
  } else {
    console.log('Database is healthy');
  }

  // Seed database
  console.log('Seeding database...');
  await seedDatabase();

  console.log('Global setup complete\n');
}

export default globalSetup;
