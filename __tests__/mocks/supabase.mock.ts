import { vi } from 'vitest';

/**
 * Mock Supabase Client Factory
 * Creates a chainable mock that mimics Supabase query builder pattern
 */

interface MockQueryBuilder {
  from: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  neq: ReturnType<typeof vi.fn>;
  gt: ReturnType<typeof vi.fn>;
  gte: ReturnType<typeof vi.fn>;
  lt: ReturnType<typeof vi.fn>;
  lte: ReturnType<typeof vi.fn>;
  like: ReturnType<typeof vi.fn>;
  ilike: ReturnType<typeof vi.fn>;
  is: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  contains: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  range: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  rpc: ReturnType<typeof vi.fn>;
  auth: any;
}

export function createMockSupabaseClient(): MockQueryBuilder {
  const mockClient: any = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),

    // ✅ Mock Supabase Auth
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: { user: { id: 'mock-user-id' } }, error: null }),
      signUp: vi.fn().mockResolvedValue({ data: { user: { id: 'new-user-id' } }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      getClaims: vi.fn().mockResolvedValue({ data: { claims: null }, error: null }),
    },
  };

  return mockClient;
}

/**
 * Create a mock Supabase client with predefined responses
 */
export function createMockSupabaseClientWithData(responses: Record<string, any> = {}) {
  const mockClient = createMockSupabaseClient();

  mockClient.from = vi.fn((table: string) => {
    const tableData = responses[table] || [];
    
    const tableMock: any = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      like: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      contains: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: tableData[0] || null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: tableData[0] || null, error: null }),
      then: vi.fn((resolve) => resolve({ data: tableData, error: null })),
    };

    return tableMock;
  });

  return mockClient;
}

/**
 * Setup default Supabase mocks for all tests
 */
/**
 * Setup default Supabase mocks for all tests
 */
export function setupSupabaseMocks() {
  const mockClient = createMockSupabaseClient();

  vi.doMock('@/lib/supabase/server', () => ({
    createClient: vi.fn(async () => mockClient),
  }));

  vi.doMock('@/lib/supabase/client', () => ({
    createClient: vi.fn(() => mockClient),
  }));

  return mockClient;
}

