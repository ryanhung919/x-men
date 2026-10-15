import * as dotenv from 'dotenv';
// Load environment variables from .env file
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, beforeEach } from 'vitest';
import { personas, type PersonaKey } from '@/lib/sample-data';

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

// Test users are the fictional demo personas from lib/sample-data.ts.
// Passwords are never hardcoded: they come from DEMO_PASSWORD (and
// GUEST_PASSWORD for the guest), the same env vars the seed route uses.
function demoUser(key: PersonaKey) {
  const p = personas[key];
  return {
    id: p.id,
    email: p.email,
    password: process.env[p.password_env] ?? '',
    department: p.department_name,
    roles: [...p.roles] as string[],
  };
}

export const testUsers = {
  // admin + manager + staff
  daniel: demoUser('daniel'), // Engineering Operations Division Director
  weijie: demoUser('weijie'), // Engineering Operations Division Director
  priya: demoUser('priya'), // Finance Director
  aisha: demoUser('aisha'), // Finance Director
  marcus: demoUser('marcus'), // System Solutioning Division Director
  // staff only - for testing non-admin access
  hannah: demoUser('hannah'), // Senior Engineers
  farah: demoUser('farah'), // Finance Executive
  // project owner's account: staff + admin, Finance Managers
  ryan: demoUser('ryan'),
  // public guest: staff + read-only demo_viewer
  guest: demoUser('guest'),
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
    // Use VERCEL_URL in production/preview, localhost in development
    const appUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000';
    
    const seedSecret = process.env.SEED_SECRET;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    // Add authorization header if seed secret is configured (for production)
    if (seedSecret) {
      headers['Authorization'] = `Bearer ${seedSecret}`;
    }
    
    const response = await fetch(`${appUrl}/seed`, {
      method: 'GET',
      headers,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Seed endpoint failed: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log('✅ Database seeded successfully');
    console.log('   Message:', result.message);
  } catch (error) {
    console.error('❌ Failed to seed database:', error);
    console.error('   Make sure your deployment is accessible');
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
    'DEMO_PASSWORD',
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      const errorMsg = `${envVar} is not set. Please check your .env.local file`;
      console.error(`❌ ${errorMsg}`);
      throw new Error(errorMsg);
    }
  }

  console.log('✅ Environment variables verified');

  // Check if database is already seeded
  let isSeeded = false;
  try {
    isSeeded = await isDatabaseSeeded();
    console.log(`Database seed status: ${isSeeded ? '✅ Seeded' : '⚠️  Not seeded'}`);
  } catch (error) {
    console.error('❌ Error checking database seed status:', error);
    throw error;
  }
  
  if (!isSeeded) {
    console.log('⚠️  Database not seeded. Attempting to seed...');
    try {
      await seedDatabase();
      
      // Verify seeding was successful
      const isSeededNow = await isDatabaseSeeded();
      if (!isSeededNow) {
        throw new Error('Database seeding failed. Please ensure the app is running with `npm run dev`');
      }
      console.log('✅ Database seeded successfully');
    } catch (seedError) {
      console.error('❌ Seeding failed:', seedError);
      console.error('\n📝 How to fix:');
      console.error('   1. Start the Next.js dev server: npm run dev');
      console.error('   2. Ensure NEXT_PUBLIC_APP_URL is set to http://localhost:3000');
      console.error('   3. Run tests again: npm run test:integration');
      throw seedError;
    }
  } else {
    console.log('✅ Database already seeded');
  }

  // Verify user roles
  try {
    await verifyUserRoles();
    console.log('✅ User roles verified');
  } catch (error) {
    console.warn('⚠️  Warning during user role verification:', error);
    // Don't throw here - proceed with tests even if role verification has issues
  }

  console.log('✅ Integration test environment ready\n');
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
