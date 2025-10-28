import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getRolesForUserClient } from '@/lib/db/roles';
import type { UserRoleRow } from '@/lib/db/roles';

describe('lib/db/roles', () => {
  let mockSupabaseClient: any;

  beforeEach(() => {
    // Create a fresh mock Supabase client for each test
    mockSupabaseClient = {
      from: vi.fn(),
    };
  });

  describe('getRolesForUserClient', () => {
    it('should return an array of role strings for a user', async () => {
      const userId = 'user-123';
      const mockRoles: UserRoleRow[] = [
        { role: 'staff' },
        { role: 'manager' },
      ];

      // Mock the Supabase query chain
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: mockRoles,
            error: null,
          }),
        }),
      });

      const result = await getRolesForUserClient(mockSupabaseClient, userId);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_roles');
      expect(result).toEqual(['staff', 'manager']);
    });

    it('should return a single role for a user with one role', async () => {
      const userId = 'user-456';
      const mockRoles: UserRoleRow[] = [{ role: 'admin' }];

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: mockRoles,
            error: null,
          }),
        }),
      });

      const result = await getRolesForUserClient(mockSupabaseClient, userId);

      expect(result).toEqual(['admin']);
      expect(result).toHaveLength(1);
    });

    it('should return an empty array when user has no roles', async () => {
      const userId = 'user-789';

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      });

      const result = await getRolesForUserClient(mockSupabaseClient, userId);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should return an empty array when data is null', async () => {
      const userId = 'user-null';

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      });

      const result = await getRolesForUserClient(mockSupabaseClient, userId);

      expect(result).toEqual([]);
    });

    it('should throw error when Supabase query fails', async () => {
      const userId = 'user-error';
      const mockError = {
        message: 'Database connection failed',
        code: 'PGRST301',
      };

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: mockError,
          }),
        }),
      });

      await expect(
        getRolesForUserClient(mockSupabaseClient, userId)
      ).rejects.toEqual(mockError);
    });

    it('should query user_roles table with correct user_id filter', async () => {
      const userId = 'specific-user-123';
      const mockRoles: UserRoleRow[] = [{ role: 'staff' }];

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: mockRoles,
          error: null,
        }),
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect,
      });

      await getRolesForUserClient(mockSupabaseClient, userId);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_roles');
      expect(mockSelect).toHaveBeenCalledWith('role');
      
      // Verify the eq method was called with correct filter
      const selectResult = mockSelect.mock.results[0].value;
      expect(selectResult.eq).toHaveBeenCalledWith('user_id', userId);
    });

    it('should handle multiple roles in correct order', async () => {
      const userId = 'user-multi';
      const mockRoles: UserRoleRow[] = [
        { role: 'staff' },
        { role: 'admin' },
        { role: 'manager' },
      ];

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: mockRoles,
            error: null,
          }),
        }),
      });

      const result = await getRolesForUserClient(mockSupabaseClient, userId);

      expect(result).toEqual(['staff', 'admin', 'manager']);
      expect(result).toHaveLength(3);
    });

    it('should handle role names with special characters', async () => {
      const userId = 'user-special';
      const mockRoles: UserRoleRow[] = [
        { role: 'super-admin' },
        { role: 'read_only' },
        { role: 'admin.support' },
      ];

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: mockRoles,
            error: null,
          }),
        }),
      });

      const result = await getRolesForUserClient(mockSupabaseClient, userId);

      expect(result).toEqual(['super-admin', 'read_only', 'admin.support']);
    });

    it('should work with UUID format user IDs', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const mockRoles: UserRoleRow[] = [{ role: 'staff' }];

      const mockEq = vi.fn().mockResolvedValue({
        data: mockRoles,
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: mockEq,
        }),
      });

      await getRolesForUserClient(mockSupabaseClient, userId);

      expect(mockEq).toHaveBeenCalledWith('user_id', userId);
    });

    it('should throw error with proper error object structure', async () => {
      const userId = 'user-error-structure';
      const mockError = {
        message: 'Permission denied',
        details: 'RLS policy violation',
        hint: 'Check user permissions',
        code: '42501',
      };

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: mockError,
          }),
        }),
      });

      await expect(
        getRolesForUserClient(mockSupabaseClient, userId)
      ).rejects.toMatchObject({
        message: 'Permission denied',
        code: '42501',
      });
    });

    it('should handle empty string user ID', async () => {
      const userId = '';
      const mockRoles: UserRoleRow[] = [];

      const mockEq = vi.fn().mockResolvedValue({
        data: mockRoles,
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: mockEq,
        }),
      });

      const result = await getRolesForUserClient(mockSupabaseClient, userId);

      expect(mockEq).toHaveBeenCalledWith('user_id', '');
      expect(result).toEqual([]);
    });

    it('should return roles without modifying the original data', async () => {
      const userId = 'user-immutable';
      const mockRoles: UserRoleRow[] = [
        { role: 'staff' },
        { role: 'manager' },
      ];
      const originalMockRoles = [...mockRoles];

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: mockRoles,
            error: null,
          }),
        }),
      });

      const result = await getRolesForUserClient(mockSupabaseClient, userId);

      // Verify original data wasn't mutated
      expect(mockRoles).toEqual(originalMockRoles);
      expect(result).toEqual(['staff', 'manager']);
    });

    it('should call from, select, and eq methods in correct order', async () => {
      const userId = 'user-chain';
      const mockRoles: UserRoleRow[] = [{ role: 'staff' }];

      const mockEq = vi.fn().mockResolvedValue({
        data: mockRoles,
        error: null,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      await getRolesForUserClient(mockSupabaseClient, userId);

      // Verify call order
      expect(mockSupabaseClient.from).toHaveBeenCalledBefore(mockSelect);
      expect(mockSelect).toHaveBeenCalledBefore(mockEq);
    });
  });
});
