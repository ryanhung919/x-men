import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/auth/confirm/route';
import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

vi.mock('@/lib/supabase/server');
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

describe('app/auth/confirm/route', () => {
  const mockSupabase = {
    auth: {
      verifyOtp: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
    vi.mocked(redirect).mockImplementation((url: string) => {
      throw new Error(`REDIRECT: ${url}`);
    });
  });

  describe('GET /auth/confirm', () => {
    it('should redirect to error page when token_hash is missing', async () => {
      const url = 'http://localhost:3000/auth/confirm?type=signup';
      const request = new NextRequest(url);

      await expect(GET(request)).rejects.toThrow('REDIRECT: /auth/error?error=No token hash or type');
    });

    it('should redirect to error page when type is missing', async () => {
      const url = 'http://localhost:3000/auth/confirm?token_hash=abc123';
      const request = new NextRequest(url);

      await expect(GET(request)).rejects.toThrow('REDIRECT: /auth/error?error=No token hash or type');
    });

    it('should redirect to error page when both token_hash and type are missing', async () => {
      const url = 'http://localhost:3000/auth/confirm';
      const request = new NextRequest(url);

      await expect(GET(request)).rejects.toThrow('REDIRECT: /auth/error?error=No token hash or type');
    });

    it('should verify OTP and redirect to root when successful', async () => {
      mockSupabase.auth.verifyOtp.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const url = 'http://localhost:3000/auth/confirm?token_hash=abc123&type=signup';
      const request = new NextRequest(url);

      await expect(GET(request)).rejects.toThrow('REDIRECT: /');
      expect(mockSupabase.auth.verifyOtp).toHaveBeenCalledWith({
        type: 'signup',
        token_hash: 'abc123',
      });
    });

    it('should verify OTP with email type', async () => {
      mockSupabase.auth.verifyOtp.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const url = 'http://localhost:3000/auth/confirm?token_hash=abc123&type=email';
      const request = new NextRequest(url);

      await expect(GET(request)).rejects.toThrow('REDIRECT: /');
      expect(mockSupabase.auth.verifyOtp).toHaveBeenCalledWith({
        type: 'email',
        token_hash: 'abc123',
      });
    });

    it('should redirect to custom next URL when provided', async () => {
      mockSupabase.auth.verifyOtp.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const url = 'http://localhost:3000/auth/confirm?token_hash=abc123&type=signup&next=/dashboard';
      const request = new NextRequest(url);

      await expect(GET(request)).rejects.toThrow('REDIRECT: /dashboard');
      expect(mockSupabase.auth.verifyOtp).toHaveBeenCalledWith({
        type: 'signup',
        token_hash: 'abc123',
      });
    });

    it('should redirect to root when next URL is not absolute', async () => {
      mockSupabase.auth.verifyOtp.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const url = 'http://localhost:3000/auth/confirm?token_hash=abc123&type=signup&next=http://evil.com';
      const request = new NextRequest(url);

      await expect(GET(request)).rejects.toThrow('REDIRECT: /');
    });

    it('should redirect to root when next URL is external', async () => {
      mockSupabase.auth.verifyOtp.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const url = 'http://localhost:3000/auth/confirm?token_hash=abc123&type=signup&next=https://example.com';
      const request = new NextRequest(url);

      await expect(GET(request)).rejects.toThrow('REDIRECT: /');
    });

    it('should redirect to error page when verifyOtp fails', async () => {
      mockSupabase.auth.verifyOtp.mockResolvedValue({
        data: null,
        error: { message: 'Invalid token' },
      });

      const url = 'http://localhost:3000/auth/confirm?token_hash=abc123&type=signup';
      const request = new NextRequest(url);

      await expect(GET(request)).rejects.toThrow('REDIRECT: /auth/error?error=Invalid token');
      expect(mockSupabase.auth.verifyOtp).toHaveBeenCalledWith({
        type: 'signup',
        token_hash: 'abc123',
      });
    });

    it('should handle recovery type', async () => {
      mockSupabase.auth.verifyOtp.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const url = 'http://localhost:3000/auth/confirm?token_hash=abc123&type=recovery';
      const request = new NextRequest(url);

      await expect(GET(request)).rejects.toThrow('REDIRECT: /');
      expect(mockSupabase.auth.verifyOtp).toHaveBeenCalledWith({
        type: 'recovery',
        token_hash: 'abc123',
      });
    });

    it('should handle invite type', async () => {
      mockSupabase.auth.verifyOtp.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const url = 'http://localhost:3000/auth/confirm?token_hash=abc123&type=invite';
      const request = new NextRequest(url);

      await expect(GET(request)).rejects.toThrow('REDIRECT: /');
      expect(mockSupabase.auth.verifyOtp).toHaveBeenCalledWith({
        type: 'invite',
        token_hash: 'abc123',
      });
    });

    it('should redirect to root when verifyOtp returns undefined error (success case)', async () => {
      mockSupabase.auth.verifyOtp.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: undefined,
      });

      const url = 'http://localhost:3000/auth/confirm?token_hash=abc123&type=signup';
      const request = new NextRequest(url);

      // When error is undefined, it's treated as success, so redirect to next (default "/")
      await expect(GET(request)).rejects.toThrow('REDIRECT: /');
    });

    it('should use default "/" for next when next is empty string', async () => {
      mockSupabase.auth.verifyOtp.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const url = 'http://localhost:3000/auth/confirm?token_hash=abc123&type=signup&next=';
      const request = new NextRequest(url);

      await expect(GET(request)).rejects.toThrow('REDIRECT: /');
    });

    it('should handle magiclink type', async () => {
      mockSupabase.auth.verifyOtp.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const url = 'http://localhost:3000/auth/confirm?token_hash=abc123&type=magiclink';
      const request = new NextRequest(url);

      await expect(GET(request)).rejects.toThrow('REDIRECT: /');
      expect(mockSupabase.auth.verifyOtp).toHaveBeenCalledWith({
        type: 'magiclink',
        token_hash: 'abc123',
      });
    });

    it('should pass through to error when token_hash is empty string', async () => {
      const url = 'http://localhost:3000/auth/confirm?token_hash=&type=signup';
      const request = new NextRequest(url);

      await expect(GET(request)).rejects.toThrow('REDIRECT: /auth/error?error=No token hash or type');
    });

    it('should pass through to error when type is empty string', async () => {
      const url = 'http://localhost:3000/auth/confirm?token_hash=abc123&type=';
      const request = new NextRequest(url);

      await expect(GET(request)).rejects.toThrow('REDIRECT: /auth/error?error=No token hash or type');
    });
  });
});
