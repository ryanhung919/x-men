import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { createServerClient } from '@supabase/ssr';

vi.mock('@supabase/ssr');

describe('lib/supabase/middleware', () => {
  let mockSupabase: any;
  let mockRequest: NextRequest;
  let mockResponse: NextResponse;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = {
      auth: {
        getClaims: vi.fn(),
      },
      from: vi.fn(),
    };

    vi.mocked(createServerClient).mockReturnValue(mockSupabase);

    mockRequest = new NextRequest('http://localhost:3000/tasks');
    mockResponse = NextResponse.next({ request: mockRequest });
  });

  describe('updateSession', () => {
    it('should allow authenticated users to access protected routes', async () => {
      mockSupabase.auth.getClaims.mockResolvedValue({
        data: {
          claims: { sub: 'user-123' },
        },
      });

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: { department_id: 1 },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        single: mockSingle,
      });

      const response = await updateSession(mockRequest);

      expect(response).toBeDefined();
      expect(mockSupabase.auth.getClaims).toHaveBeenCalled();
    });

    it('should redirect unauthenticated users to login page', async () => {
      mockSupabase.auth.getClaims.mockResolvedValue({
        data: { claims: null },
      });

      const request = new NextRequest('http://localhost:3000/tasks');
      const response = await updateSession(request);

      expect(response.status).toBe(307); // Redirect status
      expect(response.headers.get('location')).toContain('/');
    });

    it('should allow access to public routes without authentication', async () => {
      mockSupabase.auth.getClaims.mockResolvedValue({
        data: { claims: null },
      });

      const request = new NextRequest('http://localhost:3000/');
      const response = await updateSession(request);

      expect(response.status).toBe(200);
    });

    describe('seed route protection', () => {
      it('should allow access to /seed in local development without auth header', async () => {
        vi.stubEnv('NODE_ENV', 'development');
        // Don't set CI env var (simulates local dev)

        mockSupabase.auth.getClaims.mockResolvedValue({
          data: { claims: null },
        });

        const request = new NextRequest('http://localhost:3000/seed');
        const response = await updateSession(request);

        expect(response.status).toBe(200);

        vi.unstubAllEnvs();
      });

      it('should block access to /seed in CI without auth header', async () => {
        vi.stubEnv('NODE_ENV', 'production');
        vi.stubEnv('CI', 'true'); // GitHub Actions sets this
        vi.stubEnv('SEED_SECRET', 'test-secret');

        mockSupabase.auth.getClaims.mockResolvedValue({
          data: { claims: null },
        });

        const request = new NextRequest('http://localhost:3000/seed');
        const response = await updateSession(request);

        expect(response.status).toBe(404);

        vi.unstubAllEnvs();
      });
    });

    it('should allow API routes without authentication checks', async () => {
      mockSupabase.auth.getClaims.mockResolvedValue({
        data: { claims: null },
      });

      const request = new NextRequest('http://localhost:3000/api/tasks');
      const response = await updateSession(request);

      expect(response.status).toBe(200);
    });

    it('should store user info in cookie for authenticated users', async () => {
      mockSupabase.auth.getClaims.mockResolvedValue({
        data: {
          claims: { sub: 'user-123' },
        },
      });

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: { department_id: 1 },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        single: mockSingle,
      });

      const request = new NextRequest('http://localhost:3000/tasks');
      const response = await updateSession(request);

      expect(mockSupabase.from).toHaveBeenCalledWith('user_info');
      expect(mockSelect).toHaveBeenCalledWith('department_id');
      expect(mockEq).toHaveBeenCalledWith('id', 'user-123');
    });

    it('should skip user info fetch if already exists in cookie', async () => {
      mockSupabase.auth.getClaims.mockResolvedValue({
        data: {
          claims: { sub: 'user-123' },
        },
      });

      const request = new NextRequest('http://localhost:3000/tasks');
      request.cookies.set('user-info', JSON.stringify({ userId: 'user-123', departmentId: 1 }));

      const response = await updateSession(request);

      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should handle user info fetch error gracefully', async () => {
      mockSupabase.auth.getClaims.mockResolvedValue({
        data: {
          claims: { sub: 'user-123' },
        },
      });

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        single: mockSingle,
      });

      const request = new NextRequest('http://localhost:3000/tasks');
      const response = await updateSession(request);

      expect(response.status).toBe(200);
    });

    it('should allow admin users to access /report routes', async () => {
      mockSupabase.auth.getClaims.mockResolvedValue({
        data: {
          claims: { sub: 'user-123' },
        },
      });

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();

      // Mock user_info query
      const mockSingleUserInfo = vi.fn().mockResolvedValue({
        data: { department_id: 1 },
        error: null,
      });

      // Mock user_roles query
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'user_info') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: mockSingleUserInfo,
              }),
            }),
          };
        }
        if (table === 'user_roles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [{ role: 'admin' }],
                error: null,
              }),
            }),
          };
        }
        return {};
      });

      const request = new NextRequest('http://localhost:3000/report');
      const response = await updateSession(request);

      expect(response.status).toBe(200);
    });

    it('should redirect non-admin users to /unauthorized for /report routes', async () => {
      mockSupabase.auth.getClaims.mockResolvedValue({
        data: {
          claims: { sub: 'user-123' },
        },
      });

      // Mock user_info query
      const mockSingleUserInfo = vi.fn().mockResolvedValue({
        data: { department_id: 1 },
        error: null,
      });

      // Mock user_roles query to return non-admin roles
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'user_info') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: mockSingleUserInfo,
              }),
            }),
          };
        }
        if (table === 'user_roles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [{ role: 'staff' }],
                error: null,
              }),
            }),
          };
        }
        return {};
      });

      const request = new NextRequest('http://localhost:3000/report');
      const response = await updateSession(request);

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('/unauthorized');
    });

    it('should redirect to /tasks when roles fetch fails for /report routes', async () => {
      mockSupabase.auth.getClaims.mockResolvedValue({
        data: {
          claims: { sub: 'user-123' },
        },
      });

      // Mock user_info query
      const mockSingleUserInfo = vi.fn().mockResolvedValue({
        data: { department_id: 1 },
        error: null,
      });

      // Mock user_roles query to return error
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'user_info') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: mockSingleUserInfo,
              }),
            }),
          };
        }
        if (table === 'user_roles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database error' },
              }),
            }),
          };
        }
        return {};
      });

      const request = new NextRequest('http://localhost:3000/report');
      const response = await updateSession(request);

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('/tasks');
    });

    it('should handle users with no roles for /report routes', async () => {
      mockSupabase.auth.getClaims.mockResolvedValue({
        data: {
          claims: { sub: 'user-123' },
        },
      });

      // Mock user_info query
      const mockSingleUserInfo = vi.fn().mockResolvedValue({
        data: { department_id: 1 },
        error: null,
      });

      // Mock user_roles query to return empty array
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'user_info') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: mockSingleUserInfo,
              }),
            }),
          };
        }
        if (table === 'user_roles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          };
        }
        return {};
      });

      const request = new NextRequest('http://localhost:3000/report');
      const response = await updateSession(request);

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('/unauthorized');
    });
  });
});
