import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createClient } from '@/lib/supabase/client';
import { createBrowserClient } from '@supabase/ssr';

// Mock @supabase/ssr
vi.mock('@supabase/ssr', () => ({
  createBrowserClient: vi.fn(),
}));

describe('lib/supabase/client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set required environment variables
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  });

  describe('createClient', () => {
    it('should create a browser client with correct URL and key', () => {
      const mockClient = { from: vi.fn() };
      vi.mocked(createBrowserClient).mockReturnValue(mockClient as any);

      const client = createClient();

      expect(createBrowserClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-anon-key'
      );
      expect(client).toBe(mockClient);
    });

    it('should return the same client type for multiple calls', () => {
      const mockClient1 = { from: vi.fn() };
      const mockClient2 = { from: vi.fn() };
      
      vi.mocked(createBrowserClient)
        .mockReturnValueOnce(mockClient1 as any)
        .mockReturnValueOnce(mockClient2 as any);

      const client1 = createClient();
      const client2 = createClient();

      expect(createBrowserClient).toHaveBeenCalledTimes(2);
      expect(client1).toBe(mockClient1);
      expect(client2).toBe(mockClient2);
    });

    it('should use environment variables correctly', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://custom.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'custom-key';

      const mockClient = { from: vi.fn() };
      vi.mocked(createBrowserClient).mockReturnValue(mockClient as any);

      createClient();

      expect(createBrowserClient).toHaveBeenCalledWith(
        'https://custom.supabase.co',
        'custom-key'
      );
    });
  });
});
