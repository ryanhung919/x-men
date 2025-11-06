import { chromium, FullConfig } from '@playwright/test';
import { seedDatabase } from './helpers/database';

/**
 * Global setup runs once before all tests
 * Seeds the database with sample data for testing
 */
async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL || 'http://localhost:3000';

  console.log(`Waiting for server to be ready at ${baseURL}...`);

  // Wait for server to be ready with retries
  const browser = await chromium.launch();
  const page = await browser.newPage();

  let serverReady = false;
  const maxRetries = 30; // 30 retries * 2s = 60 seconds max wait
  let retryCount = 0;

  while (!serverReady && retryCount < maxRetries) {
    try {
      await page.goto(baseURL, { timeout: 5000, waitUntil: 'domcontentloaded' });
      serverReady = true;
      console.log('Server is ready!');
    } catch (error) {
      retryCount++;
      console.log(`Server not ready yet (attempt ${retryCount}/${maxRetries}), retrying...`);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
    }
  }

  await browser.close();

  if (!serverReady) {
    throw new Error(`Dev server at ${baseURL} did not become ready after ${maxRetries * 2} seconds`);
  }

  // Seed database
  console.log('Seeding database...');
  await seedDatabase();
  console.log('Database seeded successfully!');
}

export default globalSetup;
