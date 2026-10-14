import { describe, it, expect, beforeEach } from 'vitest';
import { authenticateAs } from '@/__tests__/setup/integration.setup';

describe('Schedule API - Basic Tests', () => {
  let danielCookie: string;
  const API_BASE = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // Extract project reference from Supabase URL
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  // Same rule supabase-js uses for its default storage key (works for local and hosted URLs)
  const projectRef = new URL(supabaseUrl).hostname.split('.')[0];

  // Helper function to format auth cookies
  const formatAuthCookie = (session: any) => {
    const cookieValue = JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at,
      expires_in: session.expires_in,
      token_type: session.token_type || 'bearer',
      user: session.user,
    });
    return `sb-${projectRef}-auth-token=${encodeURIComponent(cookieValue)}`;
  };

  beforeEach(async () => {
    // Authenticate fresh for each test
    const daniel = await authenticateAs('daniel');
    danielCookie = formatAuthCookie(daniel.session);
  });

  it('should return 401 when no auth cookie provided', async () => {
    const response = await fetch(`${API_BASE}/api/schedule`);
    expect(response.status).toBe(401);
  });

  it('should allow authenticated users to access schedule', async () => {
    const response = await fetch(`${API_BASE}/api/schedule`, {
      headers: {
        Cookie: danielCookie,
      },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it('should handle date filtering', async () => {
    const response = await fetch(
      `${API_BASE}/api/schedule?startDate=2025-10-01&endDate=2025-10-31`,
      {
        headers: {
          Cookie: danielCookie,
        },
      }
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });
});
