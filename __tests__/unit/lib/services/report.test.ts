import { describe, it, expect, vi, beforeEach } from 'vitest';
import { tasks } from '@/__tests__/fixtures/database.fixtures';

// Mock dependencies
vi.mock('@/lib/db/report', () => ({
  getTasks: vi.fn(),
  getUsersByIds: vi.fn(),
  getWeeklyTaskStatsByUser: vi.fn(),
}));

// Dynamic import after mocks
const { generateLoggedTimeReport, generateTeamSummaryReport, generateTaskCompletionReport } =
  await import('@/lib/services/report');
const { getTasks, getUsersByIds, getWeeklyTaskStatsByUser } = await import('@/lib/db/report');

describe('lib/services/report', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUsersByIds).mockResolvedValue([]);
    vi.mocked(getWeeklyTaskStatsByUser).mockResolvedValue([]);
  });

  describe('generateLoggedTimeReport', () => {
    it('should generate logged time report with correct metrics', async () => {
      const mockTasks = [
        {
          ...tasks[0],
          status: 'Completed',
          logged_time: 3600, // 1 hour
          deadline: '2024-01-15T00:00:00Z',
          updated_at: '2024-01-14T00:00:00Z', // On time
        },
        {
          ...tasks[1],
          status: 'Completed',
          logged_time: 7200, // 2 hours
          deadline: '2024-01-20T00:00:00Z',
          updated_at: '2024-01-22T00:00:00Z', // Late by 2 days
        },
        {
          ...tasks[2],
          status: 'In Progress',
          logged_time: 1800, // 0.5 hours
          deadline: '2024-01-01T00:00:00Z', // Overdue
        },
      ];

      vi.mocked(getTasks).mockResolvedValue(mockTasks as any);

      const result = await generateLoggedTimeReport({
        projectIds: [1],
      });

      expect(result).toHaveProperty('kind', 'loggedTime');
      expect(result).toHaveProperty('totalTime');
      expect(result).toHaveProperty('avgTime');
      expect(result).toHaveProperty('completedCount', 2);
      expect(result).toHaveProperty('overdueCount', 1);
      expect(result).toHaveProperty('onTimeRate');
      expect(result).toHaveProperty('totalLateness');
      expect(result).toHaveProperty('wipTime');
      expect(result).toHaveProperty('overdueLoggedTime');

      // Verify calculations
      expect(result.completedCount).toBe(2);
      expect(result.overdueCount).toBe(1);
      expect(result.onTimeRate).toBe(0.5); // 1 out of 2 on time
    });

    it('should calculate total time correctly', async () => {
      const mockTasks = [
        { ...tasks[0], logged_time: 3600, status: 'Completed' },
        { ...tasks[1], logged_time: 7200, status: 'Completed' },
      ];

      vi.mocked(getTasks).mockResolvedValue(mockTasks as any);

      const result = await generateLoggedTimeReport({});

      // Total: (3600 + 7200) / 3600 = 3 hours
      expect(result.totalTime).toBe(3);
      expect(result.kind).toBe('loggedTime');
    });

    it('should calculate average time correctly', async () => {
      const mockTasks = [
        { ...tasks[0], logged_time: 3600, status: 'Completed' },
        { ...tasks[1], logged_time: 7200, status: 'Completed' },
        { ...tasks[2], logged_time: 1800, status: 'In Progress' },
      ];

      vi.mocked(getTasks).mockResolvedValue(mockTasks as any);

      const result = await generateLoggedTimeReport({});

      // Avg for completed: (3600 + 7200) / 2 / 3600 = 1.5 hours
      expect(result.avgTime).toBe(1.5);
    });

    it('should handle tasks with no deadline', async () => {
      const mockTasks = [{ ...tasks[0], status: 'Completed', logged_time: 3600, deadline: null }];

      vi.mocked(getTasks).mockResolvedValue(mockTasks as any);

      const result = await generateLoggedTimeReport({});

      expect(result.onTimeRate).toBe(0); // No deadlines to compare
    });

    it('should handle empty task list', async () => {
      vi.mocked(getTasks).mockResolvedValue([]);

      const result = await generateLoggedTimeReport({});

      expect(result.totalTime).toBe(0);
      expect(result.avgTime).toBe(0);
      expect(result.completedCount).toBe(0);
      expect(result.overdueCount).toBe(0);
    });

    it('should rollup logged time for subtasks to parent', async () => {
      const mockTasks = [
        {
          ...tasks[0],
          id: 1,
          logged_time: 3600,
          parent_task_id: null,
          status: 'Completed',
        },
        {
          ...tasks[1],
          id: 2,
          logged_time: 1800,
          parent_task_id: 1,
          status: 'Completed',
        },
      ];

      vi.mocked(getTasks).mockResolvedValue(mockTasks as any);

      const result = await generateLoggedTimeReport({});

      // Parent should have its own time + subtask time
      expect(result.timeByTask.get(1)).toBe(3600 + 1800);
      expect(result.timeByTask.get(2)).toBe(1800);
    });

    it('should calculate overdue logged time correctly', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const mockTasks = [
        {
          ...tasks[0],
          status: 'In Progress',
          logged_time: 7200, // 2 hours
          deadline: yesterday.toISOString(),
        },
      ];

      vi.mocked(getTasks).mockResolvedValue(mockTasks as any);

      const result = await generateLoggedTimeReport({});

      expect(result.overdueLoggedTime).toBe(2);
    });

    it('should calculate lateness in hours', async () => {
      const mockTasks = [
        {
          ...tasks[0],
          status: 'Completed',
          logged_time: 3600,
          deadline: '2024-01-15T00:00:00Z',
          updated_at: '2024-01-15T12:00:00Z', // 12 hours late
        },
      ];

      vi.mocked(getTasks).mockResolvedValue(mockTasks as any);

      const result = await generateLoggedTimeReport({});

      expect(result.totalLateness).toBeGreaterThan(0);
    });

    it('should pass filters to getTasks', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');
      const projectIds = [1, 2];

      vi.mocked(getTasks).mockResolvedValue([]);

      await generateLoggedTimeReport({
        projectIds,
        startDate,
        endDate,
      });

      expect(getTasks).toHaveBeenCalledWith({
        projectIds,
        startDate,
        endDate,
      });
    });
  });

  describe('generateTeamSummaryReport', () => {
    it('should generate team summary report with weekly breakdown', async () => {
      const mockWeeklyStats = [
        {
          week: '2024-W02',
          weekStart: '2024-01-08T00:00:00Z',
          userId: 'user1',
          userName: 'John Doe',
          todo: 2,
          inProgress: 3,
          completed: 5,
          blocked: 0,
          total: 10,
        },
        {
          week: '2024-W02',
          weekStart: '2024-01-08T00:00:00Z',
          userId: 'user2',
          userName: 'Jane Smith',
          todo: 1,
          inProgress: 2,
          completed: 2,
          blocked: 0,
          total: 5,
        },
      ];

      vi.mocked(getWeeklyTaskStatsByUser).mockResolvedValue(mockWeeklyStats as any);

      const result = await generateTeamSummaryReport({});

      expect(result).toHaveProperty('kind', 'teamSummary');
      expect(result).toHaveProperty('totalTasks', 15);
      expect(result).toHaveProperty('totalUsers', 2);
      expect(result).toHaveProperty('weeklyBreakdown');
      expect(result).toHaveProperty('userTotals');
      expect(result).toHaveProperty('weekTotals');

      expect(result.weeklyBreakdown).toEqual(mockWeeklyStats);
    });

    it('should aggregate user totals correctly', async () => {
      const mockWeeklyStats = [
        {
          week: '2024-W01',
          weekStart: '2024-01-01T00:00:00Z',
          userId: 'user1',
          userName: 'John Doe',
          todo: 1,
          inProgress: 2,
          completed: 3,
          blocked: 0,
          total: 6,
        },
        {
          week: '2024-W02',
          weekStart: '2024-01-08T00:00:00Z',
          userId: 'user1',
          userName: 'John Doe',
          todo: 2,
          inProgress: 1,
          completed: 1,
          blocked: 0,
          total: 4,
        },
      ];

      vi.mocked(getWeeklyTaskStatsByUser).mockResolvedValue(mockWeeklyStats as any);

      const result = await generateTeamSummaryReport({});

      const user1Total = result.userTotals.get('user1');
      expect(user1Total).toBeDefined();
      expect(user1Total?.userName).toBe('John Doe');
      expect(user1Total?.todo).toBe(3); // 1 + 2
      expect(user1Total?.inProgress).toBe(3); // 2 + 1
      expect(user1Total?.completed).toBe(4); // 3 + 1
      expect(user1Total?.blocked).toBe(0);
      expect(user1Total?.total).toBe(10); // 6 + 4
    });

    it('should aggregate week totals correctly', async () => {
      const mockWeeklyStats = [
        {
          week: '2024-W02',
          weekStart: '2024-01-08T00:00:00Z',
          userId: 'user1',
          userName: 'John Doe',
          todo: 2,
          inProgress: 3,
          completed: 5,
          blocked: 1,
          total: 11,
        },
        {
          week: '2024-W02',
          weekStart: '2024-01-08T00:00:00Z',
          userId: 'user2',
          userName: 'Jane Smith',
          todo: 1,
          inProgress: 2,
          completed: 2,
          blocked: 0,
          total: 5,
        },
      ];

      vi.mocked(getWeeklyTaskStatsByUser).mockResolvedValue(mockWeeklyStats as any);

      const result = await generateTeamSummaryReport({});

      const weekTotal = result.weekTotals.get('2024-W02');
      expect(weekTotal).toBeDefined();
      expect(weekTotal?.weekStart).toBe('2024-01-08T00:00:00Z');
      expect(weekTotal?.todo).toBe(3); // 2 + 1
      expect(weekTotal?.inProgress).toBe(5); // 3 + 2
      expect(weekTotal?.completed).toBe(7); // 5 + 2
      expect(weekTotal?.blocked).toBe(1); // 1 + 0
      expect(weekTotal?.total).toBe(16); // 11 + 5
    });

    it('should handle multiple users across multiple weeks', async () => {
      const mockWeeklyStats = [
        {
          week: '2024-W01',
          weekStart: '2024-01-01T00:00:00Z',
          userId: 'user1',
          userName: 'John Doe',
          todo: 1,
          inProgress: 1,
          completed: 1,
          blocked: 0,
          total: 3,
        },
        {
          week: '2024-W02',
          weekStart: '2024-01-08T00:00:00Z',
          userId: 'user1',
          userName: 'John Doe',
          todo: 2,
          inProgress: 2,
          completed: 2,
          blocked: 0,
          total: 6,
        },
        {
          week: '2024-W01',
          weekStart: '2024-01-01T00:00:00Z',
          userId: 'user2',
          userName: 'Jane Smith',
          todo: 0,
          inProgress: 1,
          completed: 2,
          blocked: 0,
          total: 3,
        },
      ];

      vi.mocked(getWeeklyTaskStatsByUser).mockResolvedValue(mockWeeklyStats as any);

      const result = await generateTeamSummaryReport({});

      expect(result.totalUsers).toBe(2);
      expect(result.userTotals.size).toBe(2);
      expect(result.weekTotals.size).toBe(2);

      const user1Total = result.userTotals.get('user1');
      expect(user1Total?.total).toBe(9); // 3 + 6

      const week1Total = result.weekTotals.get('2024-W01');
      expect(week1Total?.total).toBe(6); // 3 + 3
    });

    it('should handle tasks with blocked status', async () => {
      const mockWeeklyStats = [
        {
          week: '2024-W02',
          weekStart: '2024-01-08T00:00:00Z',
          userId: 'user1',
          userName: 'John Doe',
          todo: 1,
          inProgress: 1,
          completed: 1,
          blocked: 2,
          total: 5,
        },
      ];

      vi.mocked(getWeeklyTaskStatsByUser).mockResolvedValue(mockWeeklyStats as any);

      const result = await generateTeamSummaryReport({});

      const user1Total = result.userTotals.get('user1');
      expect(user1Total?.blocked).toBe(2);

      const weekTotal = result.weekTotals.get('2024-W02');
      expect(weekTotal?.blocked).toBe(2);
    });

    it('should handle empty weekly stats', async () => {
      vi.mocked(getWeeklyTaskStatsByUser).mockResolvedValue([]);

      const result = await generateTeamSummaryReport({});

      expect(result.totalTasks).toBe(0);
      expect(result.totalUsers).toBe(0);
      expect(result.weeklyBreakdown).toEqual([]);
      expect(result.userTotals.size).toBe(0);
      expect(result.weekTotals.size).toBe(0);
    });

    it('should handle Unassigned user', async () => {
      const mockWeeklyStats = [
        {
          week: '2024-W02',
          weekStart: '2024-01-08T00:00:00Z',
          userId: 'Unassigned',
          userName: 'Unassigned',
          todo: 3,
          inProgress: 0,
          completed: 0,
          blocked: 0,
          total: 3,
        },
      ];

      vi.mocked(getWeeklyTaskStatsByUser).mockResolvedValue(mockWeeklyStats as any);

      const result = await generateTeamSummaryReport({});

      const unassignedTotal = result.userTotals.get('Unassigned');
      expect(unassignedTotal).toBeDefined();
      expect(unassignedTotal?.userName).toBe('Unassigned');
      expect(unassignedTotal?.total).toBe(3);
    });

    it('should pass filters to getWeeklyTaskStatsByUser', async () => {
      const projectIds = [1, 2];
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      vi.mocked(getWeeklyTaskStatsByUser).mockResolvedValue([]);

      await generateTeamSummaryReport({ projectIds, startDate, endDate });

      expect(getWeeklyTaskStatsByUser).toHaveBeenCalledWith({
        projectIds,
        startDate,
        endDate,
      });
    });

    it('should calculate total tasks correctly', async () => {
      const mockWeeklyStats = [
        {
          week: '2024-W02',
          weekStart: '2024-01-08T00:00:00Z',
          userId: 'user1',
          userName: 'John Doe',
          todo: 2,
          inProgress: 3,
          completed: 5,
          blocked: 0,
          total: 10,
        },
        {
          week: '2024-W02',
          weekStart: '2024-01-08T00:00:00Z',
          userId: 'user2',
          userName: 'Jane Smith',
          todo: 3,
          inProgress: 2,
          completed: 3,
          blocked: 1,
          total: 9,
        },
      ];

      vi.mocked(getWeeklyTaskStatsByUser).mockResolvedValue(mockWeeklyStats as any);

      const result = await generateTeamSummaryReport({});

      expect(result.totalTasks).toBe(19); // 10 + 9
    });
  });

  describe('generateTaskCompletionReport', () => {
    it('should generate task completion report with correct overall stats', async () => {
      const mockTasks = [
        { ...tasks[0], status: 'Completed', project_id: 1, creator_id: 'user1' },
        { ...tasks[1], status: 'Completed', project_id: 1, creator_id: 'user1' },
        { ...tasks[2], status: 'In Progress', project_id: 2, creator_id: 'user2' },
        { ...tasks[3], status: 'To Do', project_id: 2, creator_id: 'user2' },
      ];

      vi.mocked(getTasks).mockResolvedValue(mockTasks as any);

      const result = await generateTaskCompletionReport({});

      expect(result).toHaveProperty('kind', 'taskCompletions');
      expect(result).toHaveProperty('totalTasks', 4);
      expect(result).toHaveProperty('totalCompleted', 2);
      expect(result).toHaveProperty('totalInProgress', 1);
      expect(result).toHaveProperty('totalTodo', 1);
      expect(result).toHaveProperty('overallCompletionRate', 0.5);
      expect(result).toHaveProperty('userStats');
      expect(result).toHaveProperty('completedByProject');
    });

    it('should calculate per-user statistics correctly', async () => {
      const mockTasks = [
        {
          ...tasks[0],
          status: 'Completed',
          creator_id: 'user1',
          logged_time: 3600,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
          deadline: '2024-01-03T00:00:00Z',
        },
        {
          ...tasks[1],
          status: 'In Progress',
          creator_id: 'user1',
          logged_time: 1800,
        },
        {
          ...tasks[2],
          status: 'Completed',
          creator_id: 'user2',
          logged_time: 7200,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-05T00:00:00Z',
          deadline: '2024-01-04T00:00:00Z',
        },
      ];

      vi.mocked(getTasks).mockResolvedValue(mockTasks as any);
      vi.mocked(getUsersByIds).mockResolvedValue([
        { id: 'user1', first_name: 'John', last_name: 'Doe' },
        { id: 'user2', first_name: 'Jane', last_name: 'Smith' },
      ]);

      const result = await generateTaskCompletionReport({});

      expect(result.userStats).toHaveLength(2);

      const user1Stats = result.userStats.find((s) => s.userId === 'user1');
      expect(user1Stats).toMatchObject({
        userName: 'John Doe',
        totalTasks: 2,
        completedTasks: 1,
        inProgressTasks: 1,
        todoTasks: 0,
        completionRate: 0.5,
        onTimeCompletions: 1,
        lateCompletions: 0,
        onTimeRate: 1,
      });

      const user2Stats = result.userStats.find((s) => s.userId === 'user2');
      expect(user2Stats).toMatchObject({
        userName: 'Jane Smith',
        totalTasks: 1,
        completedTasks: 1,
        lateCompletions: 1,
        onTimeRate: 0,
      });
    });

    it('should calculate average completion time correctly', async () => {
      const mockTasks = [
        {
          ...tasks[0],
          status: 'Completed',
          creator_id: 'user1',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T12:00:00Z', // 12 hours
        },
        {
          ...tasks[1],
          status: 'Completed',
          creator_id: 'user1',
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-03T00:00:00Z', // 24 hours
        },
      ];

      vi.mocked(getTasks).mockResolvedValue(mockTasks as any);

      const result = await generateTaskCompletionReport({});

      const userStats = result.userStats[0];
      expect(userStats.avgCompletionTime).toBe(18); // (12 + 24) / 2 = 18 hours
    });

    it('should calculate logged time statistics correctly', async () => {
      const mockTasks = [
        { ...tasks[0], status: 'Completed', creator_id: 'user1', logged_time: 3600 },
        { ...tasks[1], status: 'In Progress', creator_id: 'user1', logged_time: 7200 },
      ];

      vi.mocked(getTasks).mockResolvedValue(mockTasks as any);

      const result = await generateTaskCompletionReport({});

      const userStats = result.userStats[0];
      expect(userStats.totalLoggedTime).toBe(3); // (3600 + 7200) / 3600 = 3 hours
      expect(userStats.avgLoggedTimePerTask).toBe(1.5); // 3 / 2 = 1.5 hours
    });

    it('should handle tasks with no creator (Unassigned)', async () => {
      const mockTasks = [
        { ...tasks[0], status: 'Completed', creator_id: undefined },
        { ...tasks[1], status: 'To Do', creator_id: null },
      ];

      vi.mocked(getTasks).mockResolvedValue(mockTasks as any);

      const result = await generateTaskCompletionReport({});

      const unassignedStats = result.userStats.find((s) => s.userId === 'Unassigned');
      expect(unassignedStats).toBeDefined();
      expect(unassignedStats?.userName).toBe('Unassigned');
      expect(unassignedStats?.totalTasks).toBe(2);
    });

    it('should aggregate completions per project correctly', async () => {
      const mockTasks = [
        { ...tasks[0], status: 'Completed', project_id: 1 },
        { ...tasks[1], status: 'Completed', project_id: 2 },
        { ...tasks[2], status: 'Completed', project_id: 2 },
        { ...tasks[3], status: 'In Progress', project_id: 3 },
      ];

      vi.mocked(getTasks).mockResolvedValue(mockTasks as any);

      const result = await generateTaskCompletionReport({});

      expect(result.completedByProject.get(1)).toBe(1);
      expect(result.completedByProject.get(2)).toBe(2);
      expect(result.completedByProject.get(3)).toBeUndefined();
    });

    it('should sort users by total tasks descending', async () => {
      const mockTasks = [
        { ...tasks[0], status: 'Completed', creator_id: 'user1' },
        { ...tasks[1], status: 'Completed', creator_id: 'user2' },
        { ...tasks[2], status: 'Completed', creator_id: 'user2' },
        { ...tasks[3], status: 'Completed', creator_id: 'user2' },
      ];

      vi.mocked(getTasks).mockResolvedValue(mockTasks as any);

      const result = await generateTaskCompletionReport({});

      expect(result.userStats[0].userId).toBe('user2');
      expect(result.userStats[0].totalTasks).toBe(3);
      expect(result.userStats[1].userId).toBe('user1');
      expect(result.userStats[1].totalTasks).toBe(1);
    });

    it('should handle all completed tasks', async () => {
      const mockTasks = [
        { ...tasks[0], status: 'Completed', project_id: 1 },
        { ...tasks[1], status: 'Completed', project_id: 1 },
      ];

      vi.mocked(getTasks).mockResolvedValue(mockTasks as any);

      const result = await generateTaskCompletionReport({});

      expect(result.overallCompletionRate).toBe(1);
      expect(result.totalCompleted).toBe(2);
      expect(result.totalInProgress).toBe(0);
      expect(result.totalTodo).toBe(0);
    });

    it('should handle no completed tasks', async () => {
      const mockTasks = [
        { ...tasks[0], status: 'To Do', project_id: 1 },
        { ...tasks[1], status: 'In Progress', project_id: 1 },
      ];

      vi.mocked(getTasks).mockResolvedValue(mockTasks as any);

      const result = await generateTaskCompletionReport({});

      expect(result.overallCompletionRate).toBe(0);
      expect(result.completedByProject.size).toBe(0);
    });

    it('should handle empty task list', async () => {
      vi.mocked(getTasks).mockResolvedValue([]);

      const result = await generateTaskCompletionReport({});

      expect(result.totalTasks).toBe(0);
      expect(result.overallCompletionRate).toBe(0);
      expect(result.userStats).toEqual([]);
      expect(result.completedByProject.size).toBe(0);
    });

    it('should pass filters to getTasks', async () => {
      const projectIds = [1];
      const startDate = new Date('2024-01-01');

      vi.mocked(getTasks).mockResolvedValue([]);

      await generateTaskCompletionReport({ projectIds, startDate });

      expect(getTasks).toHaveBeenCalledWith({
        projectIds,
        startDate,
        endDate: undefined,
      });
    });
  });
});
