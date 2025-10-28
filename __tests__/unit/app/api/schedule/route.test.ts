import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PATCH } from '@/app/api/schedule/route';
import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getScheduleTasks } from '@/lib/db/tasks';

vi.mock('@/lib/supabase/server');
vi.mock('@/lib/db/tasks');

describe('app/api/schedule/route', () => {
  const mockSupabase = {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
  });

  describe('GET /api/schedule', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      const request = new NextRequest('http://localhost:3000/api/schedule');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return tasks for authenticated user', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockTasks = [
        {
          id: 1,
          title: 'Task 1',
          created_at: '2025-10-01',
          deadline: '2025-10-31',
          status: 'In Progress',
          updated_at: '2025-10-20',
          project_name: 'Project A',
          assignees: [{ id: 'user-123', first_name: 'John', last_name: 'Doe' }],
        },
      ];

      vi.mocked(getScheduleTasks).mockResolvedValue(mockTasks);

      const request = new NextRequest('http://localhost:3000/api/schedule');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockTasks);
      expect(getScheduleTasks).toHaveBeenCalledWith(undefined, undefined, undefined, undefined);
    });

    it('should parse and pass date parameters', async () => {
      const mockUser = { id: 'user-123' };
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      vi.mocked(getScheduleTasks).mockResolvedValue([]);

      const url = 'http://localhost:3000/api/schedule?startDate=2025-10-01T00:00:00Z&endDate=2025-10-31T23:59:59Z';
      const request = new NextRequest(url);
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(getScheduleTasks).toHaveBeenCalledWith(
        new Date('2025-10-01T00:00:00Z'),
        new Date('2025-10-31T23:59:59Z'),
        undefined,
        undefined
      );
    });

    it('should parse and pass project IDs', async () => {
      const mockUser = { id: 'user-123' };
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      vi.mocked(getScheduleTasks).mockResolvedValue([]);

      const url = 'http://localhost:3000/api/schedule?projectIds=1,2,3';
      const request = new NextRequest(url);
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(getScheduleTasks).toHaveBeenCalledWith(
        undefined,
        undefined,
        [1, 2, 3],
        undefined
      );
    });

    it('should parse and pass staff IDs', async () => {
      const mockUser = { id: 'user-123' };
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      vi.mocked(getScheduleTasks).mockResolvedValue([]);

      const url = 'http://localhost:3000/api/schedule?staffIds=user-1,user-2,user-3';
      const request = new NextRequest(url);
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(getScheduleTasks).toHaveBeenCalledWith(
        undefined,
        undefined,
        undefined,
        ['user-1', 'user-2', 'user-3']
      );
    });

    it('should filter out invalid project IDs', async () => {
      const mockUser = { id: 'user-123' };
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      vi.mocked(getScheduleTasks).mockResolvedValue([]);

      const url = 'http://localhost:3000/api/schedule?projectIds=1,invalid,2,NaN,3';
      const request = new NextRequest(url);
      const response = await GET(request);

      expect(getScheduleTasks).toHaveBeenCalledWith(
        undefined,
        undefined,
        [1, 2, 3],
        undefined
      );
    });

    it('should handle empty staff IDs gracefully', async () => {
      const mockUser = { id: 'user-123' };
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      vi.mocked(getScheduleTasks).mockResolvedValue([]);

      const url = 'http://localhost:3000/api/schedule?staffIds=,,';
      const request = new NextRequest(url);
      const response = await GET(request);

      expect(getScheduleTasks).toHaveBeenCalledWith(
        undefined,
        undefined,
        undefined,
        undefined
      );
    });

    it('should return 500 when getScheduleTasks throws error', async () => {
      const mockUser = { id: 'user-123' };
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      vi.mocked(getScheduleTasks).mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/schedule');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch schedule data');
    });

    it('should pass all parameters together', async () => {
      const mockUser = { id: 'user-123' };
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      vi.mocked(getScheduleTasks).mockResolvedValue([]);

      const url = 'http://localhost:3000/api/schedule?startDate=2025-10-01&endDate=2025-10-31&projectIds=1,2&staffIds=user-1,user-2';
      const request = new NextRequest(url);
      await GET(request);

      expect(getScheduleTasks).toHaveBeenCalledWith(
        new Date('2025-10-01'),
        new Date('2025-10-31'),
        [1, 2],
        ['user-1', 'user-2']
      );
    });
  });

  describe('PATCH /api/schedule', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      const request = new NextRequest('http://localhost:3000/api/schedule', {
        method: 'PATCH',
        body: JSON.stringify({ taskId: 1, deadline: '2025-11-01' }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 when taskId is missing', async () => {
      const mockUser = { id: 'user-123' };
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/schedule', {
        method: 'PATCH',
        body: JSON.stringify({ deadline: '2025-11-01' }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing taskId or deadline');
    });

    it('should return 400 when deadline is missing', async () => {
      const mockUser = { id: 'user-123' };
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/schedule', {
        method: 'PATCH',
        body: JSON.stringify({ taskId: 1 }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing taskId or deadline');
    });

    it('should update task deadline successfully', async () => {
      const mockUser = { id: 'user-123' };
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue({ error: null });

      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
      });
      mockUpdate.mockReturnValue({
        eq: mockEq,
      });

      const request = new NextRequest('http://localhost:3000/api/schedule', {
        method: 'PATCH',
        body: JSON.stringify({ taskId: 1, deadline: '2025-11-01T00:00:00Z' }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('tasks');
      expect(mockUpdate).toHaveBeenCalledWith({
        deadline: new Date('2025-11-01T00:00:00Z').toISOString(),
      });
      expect(mockEq).toHaveBeenCalledWith('id', 1);
    });

    it('should return 500 when update fails', async () => {
      const mockUser = { id: 'user-123' };
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue({
        error: { message: 'Update failed' },
      });

      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
      });
      mockUpdate.mockReturnValue({
        eq: mockEq,
      });

      const request = new NextRequest('http://localhost:3000/api/schedule', {
        method: 'PATCH',
        body: JSON.stringify({ taskId: 1, deadline: '2025-11-01' }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to update deadline');
    });

    it('should handle malformed JSON body', async () => {
      const mockUser = { id: 'user-123' };
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/schedule', {
        method: 'PATCH',
        body: 'invalid json',
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing taskId or deadline');
    });

    it('should handle exception during update', async () => {
      const mockUser = { id: 'user-123' };
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const request = new NextRequest('http://localhost:3000/api/schedule', {
        method: 'PATCH',
        body: JSON.stringify({ taskId: 1, deadline: '2025-11-01' }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to update deadline');
    });
  });
});
