import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { GET } from '@/app/api/schedule/staff/route';
import { createClient } from '@/lib/supabase/server';

vi.mock('@/lib/supabase/server');

describe('app/api/schedule/staff/route', () => {
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = {
      auth: {
        getUser: vi.fn(),
      },
      from: vi.fn(),
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase);
  });

  describe('GET /api/schedule/staff', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
      });

      const request = new NextRequest('http://localhost:3000/api/schedule/staff');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return empty array when no projectIds provided', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
      });

      const request = new NextRequest('http://localhost:3000/api/schedule/staff');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual([]);
    });

    it('should return empty array when projectIds is empty string', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
      });

      const request = new NextRequest('http://localhost:3000/api/schedule/staff?projectIds=');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual([]);
    });

    it('should return staff list for valid projectIds', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
      });

      const mockAssignments = [
        { assignee_id: 'user-1' },
        { assignee_id: 'user-2' },
        { assignee_id: 'user-1' }, // Duplicate
      ];

      const mockUserInfo = [
        { id: 'user-1', first_name: 'John', last_name: 'Doe' },
        { id: 'user-2', first_name: 'Jane', last_name: 'Smith' },
      ];

      // Mock task_assignments query
      const mockTaskSelect = vi.fn().mockReturnThis();
      const mockTaskIn = vi.fn().mockReturnThis();
      const mockTaskEq = vi.fn().mockResolvedValue({
        data: mockAssignments,
        error: null,
      });

      // Mock user_info query
      const mockUserSelect = vi.fn().mockReturnThis();
      const mockUserIn = vi.fn().mockReturnThis();
      const mockUserOrder = vi.fn().mockResolvedValue({
        data: mockUserInfo,
        error: null,
      });

      mockSupabase.from
        .mockReturnValueOnce({
          select: mockTaskSelect,
        })
        .mockReturnValueOnce({
          select: mockUserSelect,
        });

      mockTaskSelect.mockReturnValue({
        in: mockTaskIn,
      });

      mockTaskIn.mockReturnValue({
        eq: mockTaskEq,
      });

      mockUserSelect.mockReturnValue({
        in: mockUserIn,
      });

      mockUserIn.mockReturnValue({
        order: mockUserOrder,
      });

      const request = new NextRequest('http://localhost:3000/api/schedule/staff?projectIds=1,2');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockUserInfo);
      expect(mockSupabase.from).toHaveBeenCalledWith('task_assignments');
      expect(mockTaskSelect).toHaveBeenCalledWith(`
        assignee_id,
        tasks!inner(
          project_id,
          is_archived
        )
      `);
      expect(mockTaskIn).toHaveBeenCalledWith('tasks.project_id', [1, 2]);
      expect(mockTaskEq).toHaveBeenCalledWith('tasks.is_archived', false);
      expect(mockSupabase.from).toHaveBeenCalledWith('user_info');
      expect(mockUserSelect).toHaveBeenCalledWith('id, first_name, last_name');
      expect(mockUserIn).toHaveBeenCalledWith('id', ['user-1', 'user-2']);
      expect(mockUserOrder).toHaveBeenCalledWith('first_name', { ascending: true });
    });

    it('should handle single projectId', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
      });

      const mockAssignments = [{ assignee_id: 'user-1' }];
      const mockUserInfo = [{ id: 'user-1', first_name: 'John', last_name: 'Doe' }];

      const mockTaskSelect = vi.fn().mockReturnThis();
      const mockTaskIn = vi.fn().mockReturnThis();
      const mockTaskEq = vi.fn().mockResolvedValue({
        data: mockAssignments,
        error: null,
      });

      const mockUserSelect = vi.fn().mockReturnThis();
      const mockUserIn = vi.fn().mockReturnThis();
      const mockUserOrder = vi.fn().mockResolvedValue({
        data: mockUserInfo,
        error: null,
      });

      mockSupabase.from
        .mockReturnValueOnce({
          select: mockTaskSelect,
        })
        .mockReturnValueOnce({
          select: mockUserSelect,
        });

      mockTaskSelect.mockReturnValue({
        in: mockTaskIn,
      });

      mockTaskIn.mockReturnValue({
        eq: mockTaskEq,
      });

      mockUserSelect.mockReturnValue({
        in: mockUserIn,
      });

      mockUserIn.mockReturnValue({
        order: mockUserOrder,
      });

      const request = new NextRequest('http://localhost:3000/api/schedule/staff?projectIds=1');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockUserInfo);
      expect(mockTaskIn).toHaveBeenCalledWith('tasks.project_id', [1]);
    });

    it('should return empty array when no task assignments found', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
      });

      const mockTaskSelect = vi.fn().mockReturnThis();
      const mockTaskIn = vi.fn().mockReturnThis();
      const mockTaskEq = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockTaskSelect,
      });

      mockTaskSelect.mockReturnValue({
        in: mockTaskIn,
      });

      mockTaskIn.mockReturnValue({
        eq: mockTaskEq,
      });

      const request = new NextRequest('http://localhost:3000/api/schedule/staff?projectIds=1,2');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual([]);
    });

    it('should return empty array when task assignments data is null', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
      });

      const mockTaskSelect = vi.fn().mockReturnThis();
      const mockTaskIn = vi.fn().mockReturnThis();
      const mockTaskEq = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockTaskSelect,
      });

      mockTaskSelect.mockReturnValue({
        in: mockTaskIn,
      });

      mockTaskIn.mockReturnValue({
        eq: mockTaskEq,
      });

      const request = new NextRequest('http://localhost:3000/api/schedule/staff?projectIds=1');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual([]);
    });

    it('should return 500 when task_assignments query fails', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
      });

      const mockTaskSelect = vi.fn().mockReturnThis();
      const mockTaskIn = vi.fn().mockReturnThis();
      const mockTaskEq = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' },
      });

      mockSupabase.from.mockReturnValue({
        select: mockTaskSelect,
      });

      mockTaskSelect.mockReturnValue({
        in: mockTaskIn,
      });

      mockTaskIn.mockReturnValue({
        eq: mockTaskEq,
      });

      const request = new NextRequest('http://localhost:3000/api/schedule/staff?projectIds=1');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch staff');
    });

    it('should return 500 when user_info query fails', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
      });

      const mockAssignments = [{ assignee_id: 'user-1' }];

      const mockTaskSelect = vi.fn().mockReturnThis();
      const mockTaskIn = vi.fn().mockReturnThis();
      const mockTaskEq = vi.fn().mockResolvedValue({
        data: mockAssignments,
        error: null,
      });

      const mockUserSelect = vi.fn().mockReturnThis();
      const mockUserIn = vi.fn().mockReturnThis();
      const mockUserOrder = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Failed to fetch user info' },
      });

      mockSupabase.from
        .mockReturnValueOnce({
          select: mockTaskSelect,
        })
        .mockReturnValueOnce({
          select: mockUserSelect,
        });

      mockTaskSelect.mockReturnValue({
        in: mockTaskIn,
      });

      mockTaskIn.mockReturnValue({
        eq: mockTaskEq,
      });

      mockUserSelect.mockReturnValue({
        in: mockUserIn,
      });

      mockUserIn.mockReturnValue({
        order: mockUserOrder,
      });

      const request = new NextRequest('http://localhost:3000/api/schedule/staff?projectIds=1');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch staff');
    });

    it('should handle unexpected errors gracefully', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
      });

      mockSupabase.from.mockImplementation(() => {
        throw new Error('Unexpected database error');
      });

      const request = new NextRequest('http://localhost:3000/api/schedule/staff?projectIds=1');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch staff');
    });

    it('should deduplicate assigned_to IDs', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
      });

      const mockAssignments = [
        { assignee_id: 'user-1' },
        { assignee_id: 'user-2' },
        { assignee_id: 'user-1' },
        { assignee_id: 'user-2' },
        { assignee_id: 'user-3' },
      ];

      const mockUserInfo = [
        { id: 'user-1', first_name: 'John', last_name: 'Doe' },
        { id: 'user-2', first_name: 'Jane', last_name: 'Smith' },
        { id: 'user-3', first_name: 'Bob', last_name: 'Johnson' },
      ];

      const mockTaskSelect = vi.fn().mockReturnThis();
      const mockTaskIn = vi.fn().mockReturnThis();
      const mockTaskEq = vi.fn().mockResolvedValue({
        data: mockAssignments,
        error: null,
      });

      const mockUserSelect = vi.fn().mockReturnThis();
      const mockUserIn = vi.fn().mockReturnThis();
      const mockUserOrder = vi.fn().mockResolvedValue({
        data: mockUserInfo,
        error: null,
      });

      mockSupabase.from
        .mockReturnValueOnce({
          select: mockTaskSelect,
        })
        .mockReturnValueOnce({
          select: mockUserSelect,
        });

      mockTaskSelect.mockReturnValue({
        in: mockTaskIn,
      });

      mockTaskIn.mockReturnValue({
        eq: mockTaskEq,
      });

      mockUserSelect.mockReturnValue({
        in: mockUserIn,
      });

      mockUserIn.mockReturnValue({
        order: mockUserOrder,
      });

      const request = new NextRequest('http://localhost:3000/api/schedule/staff?projectIds=1');
      await GET(request);

      // Verify that only unique user IDs are passed to user_info query
      expect(mockUserIn).toHaveBeenCalledWith('id', ['user-1', 'user-2', 'user-3']);
    });

    it('should parse comma-separated projectIds correctly', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
      });

      const mockTaskSelect = vi.fn().mockReturnThis();
      const mockTaskIn = vi.fn().mockReturnThis();
      const mockTaskEq = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockTaskSelect,
      });

      mockTaskSelect.mockReturnValue({
        in: mockTaskIn,
      });

      mockTaskIn.mockReturnValue({
        eq: mockTaskEq,
      });

      const request = new NextRequest('http://localhost:3000/api/schedule/staff?projectIds=1,2,3,4');
      await GET(request);

      expect(mockTaskIn).toHaveBeenCalledWith('tasks.project_id', [1, 2, 3, 4]);
    });

    it('should return empty array when user_info returns null data', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
      });

      const mockAssignments = [{ assignee_id: 'user-1' }];

      const mockTaskSelect = vi.fn().mockReturnThis();
      const mockTaskIn = vi.fn().mockReturnThis();
      const mockTaskEq = vi.fn().mockResolvedValue({
        data: mockAssignments,
        error: null,
      });

      const mockUserSelect = vi.fn().mockReturnThis();
      const mockUserIn = vi.fn().mockReturnThis();
      const mockUserOrder = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      mockSupabase.from
        .mockReturnValueOnce({
          select: mockTaskSelect,
        })
        .mockReturnValueOnce({
          select: mockUserSelect,
        });

      mockTaskSelect.mockReturnValue({
        in: mockTaskIn,
      });

      mockTaskIn.mockReturnValue({
        eq: mockTaskEq,
      });

      mockUserSelect.mockReturnValue({
        in: mockUserIn,
      });

      mockUserIn.mockReturnValue({
        order: mockUserOrder,
      });

      const request = new NextRequest('http://localhost:3000/api/schedule/staff?projectIds=1');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual([]);
    });
  });
});
