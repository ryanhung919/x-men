/**
 * Database helper utilities for E2E tests
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';

/**
 * Seed the database with sample data via the /seed endpoint
 * Uses same authentication method as db-management.ts
 */
export async function seedDatabase(): Promise<void> {
  try {
    const seedSecret = process.env.SEED_SECRET;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Add authorization header if seed secret is configured (for CI)
    if (seedSecret) {
      headers['Authorization'] = `Bearer ${seedSecret}`;
      console.log('Using SEED_SECRET for database seeding');
    }

    const response = await fetch(`${BASE_URL}/seed`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to seed database: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Database seeded successfully');
    console.log('   Message:', result.message);
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
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
