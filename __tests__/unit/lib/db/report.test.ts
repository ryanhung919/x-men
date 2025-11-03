import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockSupabaseClient } from '@/__tests__/mocks/supabase.mock';
import { tasks, projectsFixtures } from '@/__tests__/fixtures/database.fixtures';

// Mock the Supabase client module BEFORE importing
let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => mockSupabaseClient),
}));

// Dynamic import AFTER mock setup
const { getTasks, getUsersByIds, getWeeklyTaskStatsByUser } = await import('@/lib/db/report');

describe('lib/db/report', () => {
  beforeEach(() => {
    mockSupabaseClient = createMockSupabaseClient();
  });

  describe('getTasks', () => {
    it('should return all non-archived tasks when no filters provided', async () => {
      const mockEq = vi.fn().mockResolvedValue({
        data: tasks,
        error: null,
      });

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: mockEq,
        }),
      });

      const result = await getTasks({});

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('tasks');
      expect(mockEq).toHaveBeenCalledWith('is_archived', false);
      expect(result).toEqual(tasks);
      expect(result).toHaveLength(tasks.length);
    });

    it('should filter by single projectId and exclude archived tasks', async () => {
      const filteredTasks = tasks.filter((task) => task.project_id === projectsFixtures.alpha.id);

      const mockEq = vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({
          data: filteredTasks,
          error: null,
        }),
      });

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: mockEq,
        }),
      });

      const result = await getTasks({ projectIds: [projectsFixtures.alpha.id] });

      expect(mockEq).toHaveBeenCalledWith('is_archived', false);
      expect(result).toEqual(filteredTasks);
    });

    it('should filter by multiple projectIds and exclude archived tasks', async () => {
      const projectIds = [projectsFixtures.alpha.id, projectsFixtures.beta.id];
      const filteredTasks = tasks.filter((task) => projectIds.includes(task.project_id));

      const mockEq = vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({
          data: filteredTasks,
          error: null,
        }),
      });

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: mockEq,
        }),
      });

      const result = await getTasks({ projectIds });

      expect(mockEq).toHaveBeenCalledWith('is_archived', false);
      expect(result).toHaveLength(filteredTasks.length);
    });

    it('should filter by startDate and exclude archived tasks', async () => {
      const startDate = new Date('2024-01-01');

      const mockEq = vi.fn().mockReturnValue({
        gte: vi.fn().mockResolvedValue({
          data: tasks,
          error: null,
        }),
      });

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: mockEq,
        }),
      });

      const result = await getTasks({ startDate });

      expect(mockEq).toHaveBeenCalledWith('is_archived', false);
      expect(result).toEqual(tasks);
    });

    it('should filter by endDate and exclude archived tasks', async () => {
      const endDate = new Date('2024-12-31');

      const mockEq = vi.fn().mockReturnValue({
        lte: vi.fn().mockResolvedValue({
          data: tasks,
          error: null,
        }),
      });

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: mockEq,
        }),
      });

      const result = await getTasks({ endDate });

      expect(mockEq).toHaveBeenCalledWith('is_archived', false);
      expect(result).toEqual(tasks);
    });

    it('should filter by date range (startDate and endDate) and exclude archived tasks', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      const mockEq = vi.fn().mockReturnValue({
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockResolvedValue({
          data: tasks,
          error: null,
        }),
      });

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: mockEq,
        }),
      });

      const result = await getTasks({ startDate, endDate });

      expect(mockEq).toHaveBeenCalledWith('is_archived', false);
      expect(result).toEqual(tasks);
    });

    it('should handle combined filters (projectIds and date range) and exclude archived tasks', async () => {
      const projectIds = [projectsFixtures.alpha.id];
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      const mockEq = vi.fn().mockReturnValue({
        in: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockResolvedValue({
          data: tasks,
          error: null,
        }),
      });

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: mockEq,
        }),
      });

      await getTasks({ projectIds, startDate, endDate });

      expect(mockEq).toHaveBeenCalledWith('is_archived', false);
    });

    it('should return empty array if no tasks found', async () => {
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      });

      const result = await getTasks({});

      expect(result).toEqual([]);
    });

    it('should return empty array if data is null', async () => {
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      });

      const result = await getTasks({});

      expect(result).toEqual([]);
    });

    it('should throw error if query fails', async () => {
      const mockError = new Error('Database query failed');

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: mockError,
          }),
        }),
      });

      await expect(getTasks({})).rejects.toThrow('Database query failed');
    });

    it('should not apply projectIds filter when array is empty', async () => {
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: tasks,
            error: null,
          }),
        }),
      });

      const result = await getTasks({ projectIds: [] });

      expect(result).toEqual(tasks);
    });

    it('should select correct task fields including is_archived', async () => {
      const mockEq = vi.fn().mockResolvedValue({
        data: tasks,
        error: null,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      await getTasks({});

      expect(mockSelect).toHaveBeenCalledWith(expect.stringContaining('id'));
      expect(mockSelect).toHaveBeenCalledWith(expect.stringContaining('title'));
      expect(mockSelect).toHaveBeenCalledWith(expect.stringContaining('status'));
      expect(mockSelect).toHaveBeenCalledWith(expect.stringContaining('is_archived'));
    });
  });

  describe('getUsersByIds', () => {
    it('should return user info for valid user IDs', async () => {
      const userIds = ['user1', 'user2'];
      const mockUsers = [
        { id: 'user1', first_name: 'John', last_name: 'Doe' },
        { id: 'user2', first_name: 'Jane', last_name: 'Smith' },
      ];

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: mockUsers,
            error: null,
          }),
        }),
      });

      const result = await getUsersByIds(userIds);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_info');
      expect(result).toEqual(mockUsers);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no user IDs provided', async () => {
      const result = await getUsersByIds([]);

      expect(result).toEqual([]);
      expect(mockSupabaseClient.from).not.toHaveBeenCalled();
    });

    it('should select correct user fields', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      await getUsersByIds(['user1']);

      expect(mockSelect).toHaveBeenCalledWith('id, first_name, last_name');
    });

    it('should filter by user IDs using in clause', async () => {
      const userIds = ['user1', 'user2', 'user3'];
      const mockIn = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: mockIn,
        }),
      });

      await getUsersByIds(userIds);

      expect(mockIn).toHaveBeenCalledWith('id', userIds);
    });

    it('should return empty array if data is null', async () => {
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      });

      const result = await getUsersByIds(['user1']);

      expect(result).toEqual([]);
    });

    it('should throw error if query fails', async () => {
      const mockError = new Error('User query failed');

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: null,
            error: mockError,
          }),
        }),
      });

      await expect(getUsersByIds(['user1'])).rejects.toThrow('User query failed');
    });

    it('should handle single user ID', async () => {
      const mockUser = [{ id: 'user1', first_name: 'John', last_name: 'Doe' }];

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: mockUser,
            error: null,
          }),
        }),
      });

      const result = await getUsersByIds(['user1']);

      expect(result).toEqual(mockUser);
      expect(result).toHaveLength(1);
    });

    it('should handle partial results when some users not found', async () => {
      const mockUsers = [{ id: 'user1', first_name: 'John', last_name: 'Doe' }];

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: mockUsers,
            error: null,
          }),
        }),
      });

      const result = await getUsersByIds(['user1', 'user2', 'user3']);

      expect(result).toEqual(mockUsers);
      expect(result).toHaveLength(1); // Only user1 was found
    });
  });

  describe('getWeeklyTaskStatsByUser', () => {
    it('should return weekly task stats grouped by user and exclude archived tasks', async () => {
      const mockTasks = [
        {
          id: 1,
          status: 'Completed',
          creator_id: 'user1',
          created_at: '2024-01-08T10:00:00Z',
          is_archived: false,
        },
        {
          id: 2,
          status: 'In Progress',
          creator_id: 'user1',
          created_at: '2024-01-08T11:00:00Z',
          is_archived: false,
        },
        {
          id: 3,
          status: 'To Do',
          creator_id: 'user2',
          created_at: '2024-01-08T12:00:00Z',
          is_archived: false,
        },
      ];

      const mockUsers = [
        { id: 'user1', first_name: 'John', last_name: 'Doe' },
        { id: 'user2', first_name: 'Jane', last_name: 'Smith' },
      ];

      mockSupabaseClient.from = vi.fn((table: string) => {
        if (table === 'user_info') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: mockUsers,
                error: null,
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: mockTasks,
              error: null,
            }),
          }),
        };
      });

      const result = await getWeeklyTaskStatsByUser({});

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('week');
      expect(result[0]).toHaveProperty('weekStart');
      expect(result[0]).toHaveProperty('userId');
      expect(result[0]).toHaveProperty('userName');
      expect(result[0]).toHaveProperty('todo');
      expect(result[0]).toHaveProperty('inProgress');
      expect(result[0]).toHaveProperty('completed');
      expect(result[0]).toHaveProperty('blocked');
      expect(result[0]).toHaveProperty('total');
    });

    it('should aggregate tasks by status correctly and exclude archived', async () => {
      const mockTasks = [
        {
          id: 1,
          status: 'Completed',
          creator_id: 'user1',
          created_at: '2024-01-08T10:00:00Z',
          is_archived: false,
        },
        {
          id: 2,
          status: 'Completed',
          creator_id: 'user1',
          created_at: '2024-01-08T11:00:00Z',
          is_archived: false,
        },
        {
          id: 3,
          status: 'In Progress',
          creator_id: 'user1',
          created_at: '2024-01-08T12:00:00Z',
          is_archived: false,
        },
        {
          id: 4,
          status: 'To Do',
          creator_id: 'user1',
          created_at: '2024-01-08T13:00:00Z',
          is_archived: false,
        },
        {
          id: 5,
          status: 'Blocked',
          creator_id: 'user1',
          created_at: '2024-01-08T14:00:00Z',
          is_archived: false,
        },
      ];

      const mockUsers = [{ id: 'user1', first_name: 'John', last_name: 'Doe' }];

      mockSupabaseClient.from = vi.fn((table: string) => {
        if (table === 'user_info') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: mockUsers,
                error: null,
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: mockTasks,
              error: null,
            }),
          }),
        };
      });

      const result = await getWeeklyTaskStatsByUser({});

      const user1Stats = result.find((s) => s.userId === 'user1');
      expect(user1Stats).toBeDefined();
      expect(user1Stats?.completed).toBe(2);
      expect(user1Stats?.inProgress).toBe(1);
      expect(user1Stats?.todo).toBe(1);
      expect(user1Stats?.blocked).toBe(1);
      expect(user1Stats?.total).toBe(5);
    });

    it('should group tasks by week correctly', async () => {
      const mockTasks = [
        {
          id: 1,
          status: 'Completed',
          creator_id: 'user1',
          created_at: '2024-01-01T10:00:00Z',
          is_archived: false,
        },
        {
          id: 2,
          status: 'Completed',
          creator_id: 'user1',
          created_at: '2024-01-08T10:00:00Z',
          is_archived: false,
        },
        {
          id: 3,
          status: 'Completed',
          creator_id: 'user1',
          created_at: '2024-01-15T10:00:00Z',
          is_archived: false,
        },
      ];

      const mockUsers = [{ id: 'user1', first_name: 'John', last_name: 'Doe' }];

      mockSupabaseClient.from = vi.fn((table: string) => {
        if (table === 'user_info') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: mockUsers,
                error: null,
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: mockTasks,
              error: null,
            }),
          }),
        };
      });

      const result = await getWeeklyTaskStatsByUser({});

      expect(result.length).toBe(3); // 3 different weeks
      expect(new Set(result.map((r) => r.week)).size).toBe(3);
    });

    it('should handle multiple users in same week', async () => {
      const mockTasks = [
        {
          id: 1,
          status: 'Completed',
          creator_id: 'user1',
          created_at: '2024-01-08T10:00:00Z',
          is_archived: false,
        },
        {
          id: 2,
          status: 'In Progress',
          creator_id: 'user2',
          created_at: '2024-01-08T11:00:00Z',
          is_archived: false,
        },
      ];

      const mockUsers = [
        { id: 'user1', first_name: 'John', last_name: 'Doe' },
        { id: 'user2', first_name: 'Jane', last_name: 'Smith' },
      ];

      mockSupabaseClient.from = vi.fn((table: string) => {
        if (table === 'user_info') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: mockUsers,
                error: null,
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: mockTasks,
              error: null,
            }),
          }),
        };
      });

      const result = await getWeeklyTaskStatsByUser({});

      expect(result.length).toBe(2);
      const user1Week = result.find((r) => r.userId === 'user1');
      const user2Week = result.find((r) => r.userId === 'user2');

      expect(user1Week?.week).toBe(user2Week?.week);
      expect(user1Week?.completed).toBe(1);
      expect(user2Week?.inProgress).toBe(1);
    });

    it('should handle tasks with no creator (Unassigned)', async () => {
      const mockTasks = [
        {
          id: 1,
          status: 'To Do',
          creator_id: undefined,
          created_at: '2024-01-08T10:00:00Z',
          is_archived: false,
        },
      ];

      mockSupabaseClient.from = vi.fn((table: string) => {
        if (table === 'user_info') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: mockTasks,
              error: null,
            }),
          }),
        };
      });

      const result = await getWeeklyTaskStatsByUser({});

      expect(result.length).toBe(1);
      expect(result[0].userId).toBe('Unassigned');
      expect(result[0].userName).toBe('Unassigned');
    });

    it('should filter by projectIds and exclude archived', async () => {
      const projectIds = [projectsFixtures.alpha.id];

      const mockEq = vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: mockEq,
        }),
      });

      await getWeeklyTaskStatsByUser({ projectIds });

      expect(mockEq).toHaveBeenCalledWith('is_archived', false);
    });

    it('should filter by date range and exclude archived', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      const mockEq = vi.fn().mockReturnValue({
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: mockEq,
        }),
      });

      await getWeeklyTaskStatsByUser({ startDate, endDate });

      expect(mockEq).toHaveBeenCalledWith('is_archived', false);
    });

    it('should return empty array for no tasks', async () => {
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      });

      const result = await getWeeklyTaskStatsByUser({});

      expect(result).toEqual([]);
    });

    it('should sort results by week then by user name', async () => {
      const mockTasks = [
        {
          id: 1,
          status: 'Completed',
          creator_id: 'user2',
          created_at: '2024-01-15T10:00:00Z',
          is_archived: false,
        },
        {
          id: 2,
          status: 'Completed',
          creator_id: 'user1',
          created_at: '2024-01-08T10:00:00Z',
          is_archived: false,
        },
        {
          id: 3,
          status: 'Completed',
          creator_id: 'user2',
          created_at: '2024-01-08T10:00:00Z',
          is_archived: false,
        },
      ];

      const mockUsers = [
        { id: 'user1', first_name: 'Alice', last_name: 'Anderson' },
        { id: 'user2', first_name: 'Bob', last_name: 'Brown' },
      ];

      mockSupabaseClient.from = vi.fn((table: string) => {
        if (table === 'user_info') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: mockUsers,
                error: null,
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: mockTasks,
              error: null,
            }),
          }),
        };
      });

      const result = await getWeeklyTaskStatsByUser({});

      expect(result[0].week < result[2].week).toBe(true);
      if (result[0].week === result[1].week) {
        expect(result[0].userName.localeCompare(result[1].userName)).toBeLessThan(0);
      }
    });

    it('should throw error if query fails', async () => {
      const mockError = new Error('Database query failed');

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: mockError,
          }),
        }),
      });

      await expect(getWeeklyTaskStatsByUser({})).rejects.toThrow('Database query failed');
    });
  });
});