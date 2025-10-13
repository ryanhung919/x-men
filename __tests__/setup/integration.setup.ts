import { beforeAll, afterAll, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client for integration tests
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Use service role for full access
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Store test user sessions
export const testUsers = {
  joel: {
    id: '8d7a0c21-17ba-40f3-9e6d-dac4ae3cbe2a',
    email: 'joel.wang.2023@scis.smu.edu.sg',
    department: 'Engineering Operations Division Director',
  },
  mitch: {
    id: 'e1aa6307-0985-4f5b-b25b-0b37fbb8d964',
    email: 'mitch.shona.2023@scis.smu.edu.sg',
    department: 'Finance Director',
  },
  garrison: {
    id: '32635261-038c-4405-b6ed-2d446738f94c',
    email: 'garrisonkoh.2023@scis.smu.edu.sg',
    department: 'System Solutioning Division Director',
  },
  ryan: {
    id: '61ca6b82-6d42-4058-bb4c-9316e7079b24',
    email: 'ryan.hung.2023@scis.smu.edu.sg',
    department: 'Finance Director',
  },
  kester: {
    id: '67393282-3a06-452b-a05a-9c93a95b597f',
    email: 'kesteryeo.2024@computing.smu.edu.sg',
    department: 'Engineering Operations Division Director',
  },
};

// Helper to create authenticated client for a specific user
export async function getAuthenticatedClient(userId: string) {
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: Object.values(testUsers).find((u) => u.id === userId)?.email || '',
  });

  if (error) throw error;

  // Create client with user session
  const userClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${data.properties.hashed_token}`,
        },
      },
    }
  );

  return userClient;
}

// Helper to authenticate as a specific user and return the client
export async function authenticateAs(userKey: keyof typeof testUsers) {
  const user = testUsers[userKey];

  // Sign in the user
  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: 'password123',
  });

  if (error) {
    console.error(`Failed to authenticate as ${userKey}:`, error);
    throw error;
  }

  // Create client with session
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
          Authorization: `Bearer ${authData.session?.access_token}`,
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

// Check if database is seeded
async function isDatabaseSeeded() {
  try {
    const { count, error } = await supabase
      .from('user_info')
      .select('*', { count: 'exact', head: true });

    if (error) throw error;
    return count && count > 0;
  } catch (error) {
    console.error('Error checking database seed status:', error);
    return false;
  }
}

// Seed the database by calling the seed endpoint
async function seedDatabase() {
  console.log('🌱 Seeding database for integration tests...');

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/seed`
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Seed endpoint failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Database seeded successfully:', result);
  } catch (error) {
    console.error('❌ Failed to seed database:', error);
    throw error;
  }
}

// Run before all integration tests
beforeAll(async () => {
  console.log('🔧 Setting up integration test environment...');

  // Verify environment variables
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  }

  // Check if database is already seeded
  const isSeeded = await isDatabaseSeeded();

  if (!isSeeded) {
    console.log('⚠️  Database not seeded. Seeding now...');
    await seedDatabase();
  } else {
    console.log('✅ Database already seeded');
  }

  console.log('✅ Integration test environment ready');
}, 120000); // 2 minute timeout for setup

// Clean up after all tests
afterAll(async () => {
  console.log('🧹 Cleaning up integration test environment...');
  // Sign out all sessions
  await supabase.auth.signOut();
  console.log('✅ Integration test cleanup complete');
});

// Reset state before each test (optional - only if tests modify data)
beforeEach(async () => {
  // Note: We don't reset the database between tests to avoid overhead
  // If tests need isolation, they should use transactions or test-specific data

  // Sign out any existing sessions
  await supabase.auth.signOut();
});

// Export the service role client for admin operations
export { supabase as adminClient };
