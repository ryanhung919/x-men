import * as dotenv from 'dotenv';
// Load environment variables from .env file
dotenv.config();

import { beforeAll, afterAll, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// Create admin Supabase client for setup/teardown operations
const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Use service role for full access
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Test user credentials from sample-data.ts
// All SMU accounts have admin role in the seeded data
export const testUsers = {
  joel: {
    id: '8d7a0c21-17ba-40f3-9e6d-dac4ae3cbe2a',
    email: 'joel.wang.2023@scis.smu.edu.sg',
    password: 'password123',
    department: 'Engineering Operations Division Director',
    roles: ['admin', 'manager', 'staff'], 
  },
  mitch: {
    id: 'e1aa6307-0985-4f5b-b25b-0b37fbb8d964',
    email: 'mitch.shona.2023@scis.smu.edu.sg',
    password: 'password123',
    department: 'Finance Director',
    roles: ['admin', 'manager', 'staff'],
  },
  garrison: {
    id: '32635261-038c-4405-b6ed-2d446738f94c',
    email: 'garrisonkoh.2023@scis.smu.edu.sg',
    password: 'password123',
    department: 'System Solutioning Division Director',
    roles: ['admin', 'manager', 'staff'],
  },
  ryan: {
    id: '61ca6b82-6d42-4058-bb4c-9316e7079b24',
    email: 'ryan.hung.2023@scis.smu.edu.sg',
    password: 'password123',
    department: 'Finance Director',
    roles: ['admin', 'manager', 'staff'],
  },
  kester: {
    id: '67393282-3a06-452b-a05a-9c93a95b597f',
    email: 'kester.yeo.2024@computing.smu.edu.sg',
    password: 'password123',
    department: 'Engineering Operations Division Director',
    roles: ['admin', 'manager', 'staff'],
  },
  // Personal accounts (staff only) - for testing non-admin access
  joelPersonal: {
    id: 'baa47e05-2dba-4f12-8321-71769a9a3702',
    email: 'joel.wang.03@gmail.com',
    password: 'password123',
    department: 'Senior Engineers',
    roles: ['staff'],
  },
  mitchPersonal: {
    id: 'aa344933-c44b-4097-b0ac-56987a10734b',
    email: 'mitchshonaaa@gmail.com',
    password: 'password123',
    department: 'Finance Executive',
    roles: ['staff'],
  },
  ryanPersonal: {
    id: 'aa6209a7-be3b-477e-8426-62b8cfd7043b',
    email: 'ryanhung919@gmail.com',
    password: 'password123',
    departnent: 'Finance Managers',
    roles: ['staff'],
  },
};

/**
 * Authenticate as a specific test user and return an authenticated client
 * This creates a new client instance with a valid session for the user
 */
export async function authenticateAs(userKey: keyof typeof testUsers) {
  const user = testUsers[userKey];
  
  // Sign in the user using password authentication
  const { data: authData, error } = await adminClient.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });

  if (error) {
    console.error(`Failed to authenticate as ${userKey}:`, error);
    throw error;
  }

  if (!authData.session) {
    throw new Error(`No session returned for user ${userKey}`);
  }

  // Create a new client with the user's session
  // IMPORTANT: Use global.headers to ensure Authorization header is sent with EVERY request
  // This is required for auth.uid() to work in database triggers
  const authenticatedClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${authData.session.access_token}`,
        },
      },
    }
  );

  return {
    client: authenticatedClient,
    user: authData.user,
    session: authData.session,
  };
}

/**
 * Check if database is seeded by querying user_info table
 */
async function isDatabaseSeeded(): Promise<boolean> {
  try {
    const { count, error } = await adminClient
      .from('user_info')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('Error checking database seed status:', error);
      return false;
    }
    
    return count !== null && count > 0;
  } catch (error) {
    console.error('Error checking database:', error);
    return false;
  }
}

/**
 * Seed the database by calling the /seed endpoint
 */
async function seedDatabase(): Promise<void> {
  console.log('🌱 Seeding database for integration tests...');
  
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${appUrl}/seed`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Seed endpoint failed: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log('Database seeded successfully');
    console.log('   Message:', result.message);
  } catch (error) {
    console.error('❌ Failed to seed database:', error);
    console.error('   Make sure your Next.js dev server is running on', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
    throw error;
  }
}

/**
 * Verify user roles are correctly seeded
 */
async function verifyUserRoles(): Promise<void> {
  console.log('Verifying user roles...');
  
  for (const [key, userData] of Object.entries(testUsers)) {
    const { data: roles, error } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.id);

    if (error) {
      console.error(`Error fetching roles for ${key}:`, error);
      continue;
    }

    const actualRoles = roles?.map(r => r.role) || [];
    const expectedRoles = userData.roles;

    const missingRoles = expectedRoles.filter(r => !actualRoles.includes(r));
    if (missingRoles.length > 0) {
      console.warn(`User ${key} missing roles: ${missingRoles.join(', ')}`);
    }
  }
  
  console.log('User roles verified');
}

// Run before all integration tests
beforeAll(async () => {
  console.log('\n🔧 Setting up integration test environment...');

  // Capture the exact timestamp when testing starts
  // Use a small buffer to account for any setup operations
  testStartTime = new Date(Date.now() - 1000).toISOString(); // 1 second buffer

  // Verify environment variables
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`${envVar} is not set. Please check your .env.local file`);
    }
  }

  // Check if database is already seeded
  const isSeeded = await isDatabaseSeeded();
  
  if (!isSeeded) {
    console.log('⚠️  Database not seeded. Attempting to seed...');
    await seedDatabase();
    
    // Verify seeding was successful
    const isSeededNow = await isDatabaseSeeded();
    if (!isSeededNow) {
      throw new Error('Database seeding failed. Please run: pnpm db:seed');
    }
  } else {
    console.log('Database already seeded');
  }

  // Verify user roles
  await verifyUserRoles();

  console.log('Integration test environment ready\n');
}, 120000); // 2 minute timeout for setup

// Capture the exact timestamp when testing starts
let testStartTime: string;

// Clean up after all tests
afterAll(async () => {
  console.log('\n🧹 Cleaning up integration test environment...');

  // Clean up ONLY notifications created during this specific test run
  try {
    // Get test user IDs
    const testUserIds = Object.values(testUsers).map(user => user.id);

    // Find notifications created AFTER the test started (using captured timestamp)
    const { data: testNotifications, error: fetchError } = await adminClient
      .from('notifications')
      .select('id')
      .in('user_id', testUserIds)
      .gt('created_at', testStartTime);

    if (fetchError) {
      console.error('Error fetching test notifications for cleanup:', fetchError);
    } else if (testNotifications && testNotifications.length > 0) {
      const notificationIds = testNotifications.map(n => n.id);

      const { error: deleteError } = await adminClient
        .from('notifications')
        .delete()
        .in('id', notificationIds);

      if (deleteError) {
        console.error('Error cleaning up test notifications:', deleteError);
      } else {
        console.log(`Cleaned up ${notificationIds.length} test notifications created during this test run`);
      }
    }
  } catch (error) {
    console.error('Error during notification cleanup:', error);
  }

  // Sign out all sessions
  try {
    await adminClient.auth.signOut();
  } catch (error) {
    console.error('Error during cleanup:', error);
  }

  console.log('Integration test cleanup complete\n');
});

// Reset state before each test
beforeEach(async () => {
  // Sign out any existing sessions to ensure clean state
  try {
    await adminClient.auth.signOut();
  } catch (error) {
    // Ignore errors during cleanup
  }
});

// Export the admin client for direct database operations
export { adminClient };