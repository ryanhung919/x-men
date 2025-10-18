import { describe, it, expect, beforeEach, vi } from 'vitest';

// We will mock the Supabase server client used by the API route
let mockUserId = 'test-user-id';
let mockAuthError: any = null;
let mockUpdateReturns: { data: any; error: any } = { data: { default_view: 'schedule' }, error: null };

vi.mock('@/lib/supabase/server', () => {
  const mockMaybeSingle = async () => mockUpdateReturns;
  const mockSelect = () => ({ maybeSingle: mockMaybeSingle });
  const mockEq = () => ({ select: mockSelect });
  const mockUpdate = () => ({ eq: mockEq });
  const mockFrom = () => ({ update: mockUpdate });
  return {
    createClient: vi.fn(async () => ({
      auth: {
        getUser: vi.fn(async () => ({ data: { user: mockAuthError ? null : { id: mockUserId } }, error: mockAuthError })),
      },
      from: vi.fn(() => mockFrom()),
    })),
  };
});

// Import after mock
import { PATCH } from '@/app/api/user/role/route';

// Minimal mock NextRequest-like object for calling PATCH
const makeReq = (body: any) => ({
  json: async () => body,
} as any);

const readJson = async (res: any) => {
  // NextResponse is a Response-like object
  const text = await (res as Response).text();
  try { return JSON.parse(text); } catch { return text; }
};

describe('API PATCH /api/user/role (default_view)', () => {
  beforeEach(() => {
    mockUserId = 'test-user-id';
    mockAuthError = null;
    mockUpdateReturns = { data: { default_view: 'schedule' }, error: null };
  });

  it('updates default_view when payload and auth are valid', async () => {
    const req = makeReq({ defaultView: 'schedule' });
    const res = await PATCH(req);
    expect((res as Response).status).toBe(200);
    const json = await readJson(res);
    expect(json).toEqual({ default_view: 'schedule' });
  });

  it('returns 404 when no row is updated', async () => {
    mockUpdateReturns = { data: null, error: null };
    const req = makeReq({ defaultView: 'tasks' });
    const res = await PATCH(req);
    expect((res as Response).status).toBe(404);
    const json = await readJson(res);
    expect(json).toHaveProperty('error');
  });

  it('returns 400 for invalid payload', async () => {
    const req = makeReq({ defaultView: 'invalid' });
    const res = await PATCH(req);
    expect((res as Response).status).toBe(400);
    const json = await readJson(res);
    expect(json).toHaveProperty('error');
  });

  it('returns 401 when not authenticated', async () => {
    mockAuthError = { message: 'not authed' };
    const req = makeReq({ defaultView: 'schedule' });
    const res = await PATCH(req);
    expect((res as Response).status).toBe(401);
    const json = await readJson(res);
    expect(json).toHaveProperty('error');
  });
});
