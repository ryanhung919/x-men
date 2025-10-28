import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createClient } from '@/lib/supabase/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Mock @supabase/ssr
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(),
}));

// Mock next/headers
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

describe('lib/supabase/server', () => {
  const mockCookies = {
    getAll: vi.fn(),
    set: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    vi.mocked(cookies).mockResolvedValue(mockCookies as any);
  });

  describe('createClient', () => {
    it('should create a server client with cookie handlers', async () => {
      const mockClient = { from: vi.fn() };
      vi.mocked(createServerClient).mockReturnValue(mockClient as any);
      mockCookies.getAll.mockReturnValue([{ name: 'test', value: 'cookie' }]);

      const client = await createClient();

      expect(cookies).toHaveBeenCalled();
      expect(createServerClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-anon-key',
        expect.objectContaining({
          cookies: expect.objectContaining({
            getAll: expect.any(Function),
            setAll: expect.any(Function),
          }),
        })
      );
      expect(client).toBe(mockClient);
    });

    it('should call getAll from cookie store', async () => {
      const mockClient = { from: vi.fn() };
      const testCookies = [{ name: 'session', value: 'abc123' }];
      mockCookies.getAll.mockReturnValue(testCookies);
      
      let capturedGetAll: any;
      vi.mocked(createServerClient).mockImplementation((url, key, options) => {
        capturedGetAll = options.cookies.getAll;
        return mockClient as any;
      });

      await createClient();

      const result = capturedGetAll();
      expect(result).toEqual(testCookies);
      expect(mockCookies.getAll).toHaveBeenCalled();
    });

    it('should call setAll to update cookies', async () => {
      const mockClient = { from: vi.fn() };
      
      let capturedSetAll: any;
      vi.mocked(createServerClient).mockImplementation((url, key, options) => {
        capturedSetAll = options.cookies.setAll;
        return mockClient as any;
      });

      await createClient();

      const cookiesToSet = [
        { name: 'session', value: 'new-value', options: {} },
        { name: 'refresh', value: 'refresh-token', options: {} },
      ];

      capturedSetAll(cookiesToSet);

      expect(mockCookies.set).toHaveBeenCalledWith('session', 'new-value', {});
      expect(mockCookies.set).toHaveBeenCalledWith('refresh', 'refresh-token', {});
      expect(mockCookies.set).toHaveBeenCalledTimes(2);
    });

    it('should handle setAll errors gracefully', async () => {
      const mockClient = { from: vi.fn() };
      mockCookies.set.mockImplementation(() => {
        throw new Error('Cannot set cookies in Server Component');
      });
      
      let capturedSetAll: any;
      vi.mocked(createServerClient).mockImplementation((url, key, options) => {
        capturedSetAll = options.cookies.setAll;
        return mockClient as any;
      });

      await createClient();

      const cookiesToSet = [{ name: 'session', value: 'value', options: {} }];

      // Should not throw
      expect(() => capturedSetAll(cookiesToSet)).not.toThrow();
    });

    it('should use correct environment variables', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://custom.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'custom-server-key';

      const mockClient = { from: vi.fn() };
      vi.mocked(createServerClient).mockReturnValue(mockClient as any);

      await createClient();

      expect(createServerClient).toHaveBeenCalledWith(
        'https://custom.supabase.co',
        'custom-server-key',
        expect.any(Object)
      );
    });
  });
});
