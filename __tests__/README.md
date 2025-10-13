# Testing Guide

This project uses a comprehensive testing strategy with unit and integration tests.

## Test Structure

```
__tests__/
├── unit/                    # Unit tests (mocked dependencies)
│   ├── lib/
│   │   ├── db/             # Database layer tests
│   │   └── services/       # Service layer tests
│   └── components/         # Component tests
├── integration/            # Integration tests (real database)
│   └── lib/
│       └── filter.integration.test.ts
├── setup/                  # Test setup files
│   ├── vitest.setup.ts    # Unit test setup
│   └── integration.setup.ts # Integration test setup
├── mocks/                  # Mock utilities
│   └── supabase.mock.ts
└── fixtures/               # Test data fixtures
    └── database.fixtures.ts
```

## Running Tests

### Unit Tests (Fast, No Database Required)
```bash
# Run all unit tests
pnpm test:unit

# Run specific test file
pnpm test:unit filter.test.ts

# With coverage
pnpm test:coverage
```

### Integration Tests (Requires Supabase Database)
```bash
# Check database status first
pnpm db:status

# Seed database if needed
pnpm db:seed

# Run integration tests
pnpm test:integration

# Reset database and reseed
pnpm db:reset
```

### CI Pipeline
```bash
# Run all tests (unit + integration)
pnpm ci:test
```

## Unit Tests

Unit tests use **mocked dependencies** and test individual functions in isolation.

**Characteristics:**
- Fast execution (milliseconds)
- No external dependencies
- Tests single units of code
- Run on every commit

**Example:**
```typescript
// Tests the service layer with mocked database calls
it('should filter projects by department', async () => {
  vi.mocked(dbFilter.fetchProjectsByDepartments)
    .mockResolvedValue([projectsFixtures.alpha]);
  
  const result = await filterProjects(userId, [deptId]);
  
  expect(result).toHaveLength(1);
});
```

## Integration Tests

Integration tests use the **real seeded database** and test the entire stack including:
- ✅ Row Level Security (RLS) policies
- ✅ Database triggers
- ✅ RPC functions
- ✅ Foreign key constraints
- ✅ Real data relationships

**Characteristics:**
- Slower execution (seconds)
- Requires real database
- Tests multiple layers together
- Uses actual Supabase auth

**Example:**
```typescript
// Tests actual RLS policies with authenticated users
it('should only see tasks in own department', async () => {
  const { client } = await authenticateAs('joel');
  
  const { data: tasks } = await client
    .from('tasks')
    .select('*');
  
  // RLS ensures Joel only sees his department's tasks
  expect(tasks).toBeDefined();
});
```

## Database Management

### Seeding Strategy

The database is seeded **once** before integration tests run, not reset between tests. This approach:

✅ **Faster**: Avoid expensive reset operations  
✅ **Realistic**: Tests run against persistent state  
✅ **Reliable**: Uses same data as development

```bash
# Check if database is seeded
pnpm db:status

# Seed the database (via /seed endpoint)
pnpm db:seed

# Full reset (drops tables and reseeds)
pnpm db:reset
```

### Seed Endpoint

The `/seed` route (in `app/seed/route.ts`) handles database setup:

1. **Drops existing tables** (teardown)
2. **Creates schema** (tables, constraints)
3. **Seeds data** (from `lib/sample-data.ts`)
4. **Enables RLS** (security policies)
5. **Creates triggers** (notifications, auto-linking)

**Access:** `http://localhost:3000/seed` (development only)

## Test Data

### Fixtures (`database.fixtures.ts`)
Used for **unit tests** - simplified mock data:
```typescript
export const authUsersFixtures = {
  alice: { id: '11111111-...', email: 'alice@example.com' },
  bob: { id: '22222222-...', email: 'bob@example.com' },
};
```

### Sample Data (`lib/sample-data.ts`)
Used for **integration tests** - complete realistic data:
```typescript
export const auth_users = [
  { id: '235d62da-...', email: 'garrisonkoh12315@gmail.com' },
  // ... 10 real users with departments, roles, etc.
];
```

## Test Users (Integration Tests)

Pre-seeded test users available in integration tests:

| User | Email | Department | Use Case |
|------|-------|------------|----------|
| **Joel** | joel.wang.2023@scis.smu.edu.sg | Engineering Ops Director | Test hierarchy access |
| **Mitch** | mitch.shona.2023@scis.smu.edu.sg | Finance Director | Test shared tasks |
| **Garrison** | garrisonkoh.2023@scis.smu.edu.sg | System Solutions Director | Test department filtering |
| **Ryan** | ryan.hung.2023@scis.smu.edu.sg | Finance Director | Test colleague access |
| **Kester** | kesteryeo.2024@computing.smu.edu.sg | Engineering Ops Director | Test same department |

**All passwords:** `password123`

### Authenticating in Tests

```typescript
import { authenticateAs, testUsers } from '../setup/integration.setup';

// Authenticate as Joel
const { client, user, session } = await authenticateAs('joel');

// Now use the authenticated client
const { data, error } = await client.from('tasks').select('*');
```

## What to Test

### Unit Tests Should Test:
- ✅ Business logic
- ✅ Data transformations
- ✅ Error handling
- ✅ Edge cases (null, empty, invalid inputs)
- ✅ Sorting and filtering logic
- ✅ Deduplication

### Integration Tests Should Test:
- ✅ RLS policies (who can see what)
- ✅ Database triggers (notifications, auto-linking)
- ✅ RPC functions (hierarchy, colleagues)
- ✅ Foreign key constraints
- ✅ Authentication and authorization
- ✅ Multi-user scenarios
- ✅ Real data relationships

## CI/CD Integration

The GitHub Actions workflow (`.github/workflows/test.yml`):

1. **Runs unit tests** on every push
2. **Runs integration tests** on main/develop branches
3. **Tests on Node 18 and 20** (matrix)
4. **Requires environment secrets:**
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `POSTGRES_URL`

## Environment Variables

### Required for Integration Tests

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
POSTGRES_URL=postgresql://postgres:[password]@db.xxx.supabase.co:5432/postgres
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Optional, defaults to localhost
```

## Best Practices

### 1. Test Isolation
- **Unit tests:** Always use mocks, never real database
- **Integration tests:** Use read-only queries when possible
- **Cleanup:** Remove test data created during tests

### 2. Naming Conventions
```typescript
// Unit test file
__tests__/unit/lib/services/filter.test.ts

// Integration test file
__tests__/integration/lib/filter.integration.test.ts
```

### 3. Test Organization
```typescript
describe('Feature Name', () => {
  describe('Specific functionality', () => {
    it('should do something specific', () => {
      // Test implementation
    });
  });
});
```

### 4. Async/Await
Always use async/await for database operations:
```typescript
it('should return data', async () => {
  const result = await someAsyncFunction();
  expect(result).toBeDefined();
});
```

### 5. Error Testing
Test both success and failure cases:
```typescript
it('should handle errors gracefully', async () => {
  vi.mocked(dbFunction).mockRejectedValue(new Error('DB error'));
  
  const result = await serviceFunction();
  
  expect(result).toEqual([]);
  expect(console.error).toHaveBeenCalled();
});
```

## Troubleshooting

### Tests Can't Connect to Database
```bash
# Check database status
pnpm db:status

# Verify environment variables
echo $NEXT_PUBLIC_SUPABASE_URL
```

### Integration Tests Failing
```bash
# Reset database
pnpm db:reset

# Run tests again
pnpm test:integration
```

### Seed Endpoint Not Working
```bash
# Make sure dev server is running
pnpm dev

# In another terminal
pnpm db:seed
```

### Mock Not Working
```typescript
// Ensure mock is set up BEFORE importing the function
vi.mock('@/lib/db/filter', () => ({
  fetchProjects: vi.fn(),
}));

// Then import
const { filterProjects } = await import('@/lib/services/filter');
```

## Adding New Tests

### Adding a Unit Test

1. Create test file: `__tests__/unit/lib/yourmodule.test.ts`
2. Mock dependencies
3. Test individual functions
4. Run: `pnpm test:unit yourmodule.test.ts`

### Adding an Integration Test

1. Create test file: `__tests__/integration/lib/yourfeature.integration.test.ts`
2. Use `authenticateAs()` for user context
3. Test real database operations
4. Test RLS policies
5. Cleanup test data
6. Run: `pnpm test:integration`

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Supabase Testing Guide](https://supabase.com/docs/guides/testing)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)