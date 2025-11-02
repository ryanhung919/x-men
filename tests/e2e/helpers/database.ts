/**
 * Database helper utilities for E2E tests
 */

const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';

/**
 * Seed the database with sample data via the /seed endpoint
 */
export async function seedDatabase(): Promise<void> {
  try {
    const response = await fetch(`${BASE_URL}/seed`);

    if (!response.ok) {
      throw new Error(`Failed to seed database: ${response.status} ${response.statusText}`);
    }

    console.log('Database seeded successfully');
  } catch (error) {
    console.error('Database seeding failed:', error);
    throw error;
  }
}

/**
 * Check if the database is accessible
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${BASE_URL}/api/health`);
    return response.ok;
  } catch {
    return false;
  }
}
