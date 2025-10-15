import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  authUsersFixtures,
  projectsFixtures,
  departmentsFixtures,
} from '@/__tests__/fixtures/database.fixtures';
import { createMockSupabaseClient } from '@/__tests__/mocks/supabase.mock';

// Mock all dependencies
let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => mockSupabaseClient),
}));

vi.mock('@/lib/services/report', () => ({
  generateLoggedTimeReport: vi.fn(),
  generateTeamSummaryReport: vi.fn(),
  generateTaskCompletionReport: vi.fn(),
}));

vi.mock('@/lib/services/filter', () => ({
  filterDepartments: vi.fn(),
  filterProjects: vi.fn(),
}));

// Dynamic imports after mocks
const { GET } = await import('@/app/api/reports/route');
const { generateLoggedTimeReport, generateTeamSummaryReport, generateTaskCompletionReport } =
  await import('@/lib/services/report');
const { filterDepartments, filterProjects } = await import('@/lib/services/filter');

describe('app/api/reports/route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseClient = createMockSupabaseClient();
  });

  // Helper to create mock NextRequest
  function createMockRequest(url: string): NextRequest {
    return new NextRequest(new URL(url, 'http://localhost:3000'));
  }

  function mockUserRoles(userId: string, roles: string[]) {
    mockSupabaseClient.from = vi.fn().mockReturnThis();
    mockSupabaseClient.select = vi.fn().mockReturnThis();
    mockSupabaseClient.eq = vi.fn().mockResolvedValue({
      data: roles.map((role) => ({ role })),
      error: null,
    });
  }

  describe('GET /api/reports', () => {
    describe('action=departments', () => {
      it('should return departments for authenticated user', async () => {
        const mockDepartments = [departmentsFixtures.engineering, departmentsFixtures.finance];

        mockSupabaseClient.auth = {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: authUsersFixtures.alice.id } },
            error: null,
          }),
        } as any;

        vi.mocked(filterDepartments).mockResolvedValue(mockDepartments);

        const request = createMockRequest('/api/reports?action=departments');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toEqual(mockDepartments);
        expect(filterDepartments).toHaveBeenCalledWith(authUsersFixtures.alice.id, undefined);
      });

      it('should filter departments by projectIds', async () => {
        const projectIds = [projectsFixtures.alpha.id, projectsFixtures.beta.id];
        const mockDepartments = [departmentsFixtures.engineering];

        mockSupabaseClient.auth = {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: authUsersFixtures.alice.id } },
            error: null,
          }),
        } as any;

        vi.mocked(filterDepartments).mockResolvedValue(mockDepartments);

        const request = createMockRequest(
          `/api/reports?action=departments&projectIds=${projectIds.join(',')}`
        );
        const response = await GET(request);
        const data = await response.json();

        expect(data).toEqual(mockDepartments);
        expect(filterDepartments).toHaveBeenCalledWith(authUsersFixtures.alice.id, projectIds);
      });

      it('should return 401 for unauthenticated user', async () => {
        mockSupabaseClient.auth = {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: new Error('Not authenticated'),
          }),
        } as any;

        const request = createMockRequest('/api/reports?action=departments');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Unauthorized');
      });
    });

    describe('action=projects', () => {
      it('should return projects for authenticated user', async () => {
        const mockProjects = [projectsFixtures.alpha, projectsFixtures.beta];

        mockSupabaseClient.auth = {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: authUsersFixtures.alice.id } },
            error: null,
          }),
        } as any;

        vi.mocked(filterProjects).mockResolvedValue(mockProjects);

        const request = createMockRequest('/api/reports?action=projects');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toHaveLength(2);
        expect(data[0]).toMatchObject({
          id: projectsFixtures.alpha.id,
          name: projectsFixtures.alpha.name,
        });
        expect(filterProjects).toHaveBeenCalledWith(authUsersFixtures.alice.id, undefined);
      });

      it('should filter projects by departmentIds', async () => {
        const departmentIds = [departmentsFixtures.engineering.id, departmentsFixtures.finance.id];
        const mockProjects = [projectsFixtures.alpha];

        mockSupabaseClient.auth = {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: authUsersFixtures.alice.id } },
            error: null,
          }),
        } as any;

        vi.mocked(filterProjects).mockResolvedValue(mockProjects);

        const request = createMockRequest(
          `/api/reports?action=projects&departmentIds=${departmentIds.join(',')}`
        );
        const response = await GET(request);
        const data = await response.json();

        expect(data).toHaveLength(1);
        expect(data[0]).toMatchObject({
          id: projectsFixtures.alpha.id,
          name: projectsFixtures.alpha.name,
        });
        expect(filterProjects).toHaveBeenCalledWith(authUsersFixtures.alice.id, departmentIds);
      });
    });

    describe('action=time (loggedTime report)', () => {
      it('should generate logged time report with JSON response', async () => {
        const mockReportData = {
          kind: 'loggedTime' as const,
          totalTime: 10,
          avgTime: 5,
          completedTasks: 3,
          overdueTasks: 1,
          blockedTasks: 0,
          timeByTask: new Map(),
          incompleteTime: 2,
          onTimeCompletionRate: 0.8,
          totalDelayHours: 1.5,
          overdueTime: 0.5,
        };

        mockSupabaseClient.auth = {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: authUsersFixtures.alice.id } },
            error: null,
          }),
        } as any;
        mockUserRoles(authUsersFixtures.alice.id, ['admin']);

        vi.mocked(generateLoggedTimeReport).mockResolvedValue(mockReportData);

        const request = createMockRequest('/api/reports?action=time');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toMatchObject({
          kind: 'loggedTime',
          totalTime: 10,
          avgTime: 5,
          completedTasks: 3,
          overdueTasks: 1,
          blockedTasks: 0,
        });
        expect(generateLoggedTimeReport).toHaveBeenCalledWith({
          projectIds: undefined,
          startDate: undefined,
          endDate: undefined,
        });
      });

      it('should generate report with filters', async () => {
        const projectIds = [projectsFixtures.alpha.id];
        const startDate = '2024-01-01';
        const endDate = '2024-12-31';
        const mockReportData = {
          kind: 'loggedTime' as const,
          totalTime: 10,
          avgTime: 5,
          completedTasks: 3,
          overdueTasks: 0,
          blockedTasks: 0,
          timeByTask: new Map(),
          incompleteTime: 0,
          onTimeCompletionRate: 1,
          totalDelayHours: 0,
          overdueTime: 0,
        };

        mockSupabaseClient.auth = {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: authUsersFixtures.alice.id } },
            error: null,
          }),
        } as any;
        mockUserRoles(authUsersFixtures.alice.id, ['admin']);

        vi.mocked(generateLoggedTimeReport).mockResolvedValue(mockReportData);

        const request = createMockRequest(
          `/api/reports?action=time&projectIds=${projectIds.join(
            ','
          )}&startDate=${startDate}&endDate=${endDate}`
        );
        const response = await GET(request);
        const data = await response.json();

        expect(data).toMatchObject({
          kind: 'loggedTime',
          totalTime: 10,
        });
        expect(generateLoggedTimeReport).toHaveBeenCalledWith({
          projectIds,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
        });
      });

      it('should default to time action when no action specified', async () => {
        const mockReportData = {
          kind: 'loggedTime' as const,
          totalTime: 0,
          avgTime: 0,
          completedTasks: 0,
          overdueTasks: 0,
          blockedTasks: 0,
          timeByTask: new Map(),
          incompleteTime: 0,
          onTimeCompletionRate: 0,
          totalDelayHours: 0,
          overdueTime: 0,
        };

        mockSupabaseClient.auth = {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: authUsersFixtures.alice.id } },
            error: null,
          }),
        } as any;
        mockUserRoles(authUsersFixtures.alice.id, ['admin']);

        vi.mocked(generateLoggedTimeReport).mockResolvedValue(mockReportData);

        const request = createMockRequest('/api/reports');
        const response = await GET(request);

        expect(response.status).toBe(200);
        expect(generateLoggedTimeReport).toHaveBeenCalled();
      });
    });

    describe('action=team (teamSummary report)', () => {
      it('should generate team summary report with weekly breakdown', async () => {
        const mockReportData = {
          kind: 'teamSummary' as const,
          totalTasks: 15,
          totalUsers: 3,
          weeklyBreakdown: [
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
          ],
          userTotals: new Map([
            [
              'user1',
              {
                userName: 'John Doe',
                todo: 2,
                inProgress: 3,
                completed: 5,
                blocked: 0,
                total: 10,
              },
            ],
            [
              'user2',
              {
                userName: 'Jane Smith',
                todo: 1,
                inProgress: 2,
                completed: 2,
                blocked: 0,
                total: 5,
              },
            ],
          ]),
          weekTotals: new Map([
            [
              '2024-W02',
              {
                weekStart: '2024-01-08T00:00:00Z',
                todo: 3,
                inProgress: 5,
                completed: 7,
                blocked: 0,
                total: 15,
              },
            ],
          ]),
        };

        mockSupabaseClient.auth = {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: authUsersFixtures.alice.id } },
            error: null,
          }),
        } as any;
        mockUserRoles(authUsersFixtures.alice.id, ['admin']);

        vi.mocked(generateTeamSummaryReport).mockResolvedValue(mockReportData);

        const request = createMockRequest('/api/reports?action=team');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toMatchObject({
          kind: 'teamSummary',
          totalTasks: 15,
          totalUsers: 3,
        });
        expect(data.weeklyBreakdown).toBeDefined();
        expect(data.weeklyBreakdown).toHaveLength(1);
        expect(generateTeamSummaryReport).toHaveBeenCalledWith({
          projectIds: undefined,
          startDate: undefined,
          endDate: undefined,
        });
      });

      it('should pass filters to team summary report', async () => {
        const projectIds = [1, 2];
        const startDate = '2024-01-01';
        const endDate = '2024-12-31';
        const mockReportData = {
          kind: 'teamSummary' as const,
          totalTasks: 5,
          totalUsers: 2,
          weeklyBreakdown: [],
          userTotals: new Map(),
          weekTotals: new Map(),
        };

        mockSupabaseClient.auth = {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: authUsersFixtures.alice.id } },
            error: null,
          }),
        } as any;
        mockUserRoles(authUsersFixtures.alice.id, ['admin']);

        vi.mocked(generateTeamSummaryReport).mockResolvedValue(mockReportData);

        const request = createMockRequest(
          `/api/reports?action=team&projectIds=${projectIds.join(
            ','
          )}&startDate=${startDate}&endDate=${endDate}`
        );
        await GET(request);

        expect(generateTeamSummaryReport).toHaveBeenCalledWith({
          projectIds,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
        });
      });

      it('should handle empty weekly breakdown', async () => {
        const mockReportData = {
          kind: 'teamSummary' as const,
          totalTasks: 0,
          totalUsers: 0,
          weeklyBreakdown: [],
          userTotals: new Map(),
          weekTotals: new Map(),
        };

        mockSupabaseClient.auth = {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: authUsersFixtures.alice.id } },
            error: null,
          }),
        } as any;
        mockUserRoles(authUsersFixtures.alice.id, ['admin']);

        vi.mocked(generateTeamSummaryReport).mockResolvedValue(mockReportData);

        const request = createMockRequest('/api/reports?action=team');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.weeklyBreakdown).toEqual([]);
        expect(data.totalTasks).toBe(0);
        expect(data.totalUsers).toBe(0);
      });

      it('should serialize Maps to objects in JSON response', async () => {
        const mockReportData = {
          kind: 'teamSummary' as const,
          totalTasks: 10,
          totalUsers: 2,
          weeklyBreakdown: [],
          userTotals: new Map([
            [
              'user1',
              {
                userName: 'John Doe',
                todo: 5,
                inProgress: 3,
                completed: 2,
                blocked: 0,
                total: 10,
              },
            ],
          ]),
          weekTotals: new Map([
            [
              '2024-W02',
              {
                weekStart: '2024-01-08T00:00:00Z',
                todo: 5,
                inProgress: 3,
                completed: 2,
                blocked: 0,
                total: 10,
              },
            ],
          ]),
        };

        mockSupabaseClient.auth = {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: authUsersFixtures.alice.id } },
            error: null,
          }),
        } as any;
        mockUserRoles(authUsersFixtures.alice.id, ['admin']);

        vi.mocked(generateTeamSummaryReport).mockResolvedValue(mockReportData);

        const request = createMockRequest('/api/reports?action=team');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);

        // Verify Maps are serialized as objects
        expect(data.userTotals).toBeDefined();
        expect(typeof data.userTotals).toBe('object');
        expect(data.userTotals.user1).toEqual({
          userName: 'John Doe',
          todo: 5,
          inProgress: 3,
          completed: 2,
          blocked: 0,
          total: 10,
        });

        expect(data.weekTotals).toBeDefined();
        expect(typeof data.weekTotals).toBe('object');
        expect(data.weekTotals['2024-W02']).toEqual({
          weekStart: '2024-01-08T00:00:00Z',
          todo: 5,
          inProgress: 3,
          completed: 2,
          blocked: 0,
          total: 10,
        });
      });

      it('should handle multiple weeks with multiple users', async () => {
        const mockReportData = {
          kind: 'teamSummary' as const,
          totalTasks: 30,
          totalUsers: 3,
          weeklyBreakdown: [
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
              inProgress: 3,
              completed: 5,
              blocked: 1,
              total: 11,
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
          ],
          userTotals: new Map([
            [
              'user1',
              {
                userName: 'John Doe',
                todo: 3,
                inProgress: 5,
                completed: 8,
                blocked: 1,
                total: 17,
              },
            ],
            [
              'user2',
              {
                userName: 'Jane Smith',
                todo: 0,
                inProgress: 1,
                completed: 2,
                blocked: 0,
                total: 3,
              },
            ],
          ]),
          weekTotals: new Map([
            [
              '2024-W01',
              {
                weekStart: '2024-01-01T00:00:00Z',
                todo: 1,
                inProgress: 3,
                completed: 5,
                blocked: 0,
                total: 9,
              },
            ],
            [
              '2024-W02',
              {
                weekStart: '2024-01-08T00:00:00Z',
                todo: 2,
                inProgress: 3,
                completed: 5,
                blocked: 1,
                total: 11,
              },
            ],
          ]),
        };

        mockSupabaseClient.auth = {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: authUsersFixtures.alice.id } },
            error: null,
          }),
        } as any;
        mockUserRoles(authUsersFixtures.alice.id, ['admin']);

        vi.mocked(generateTeamSummaryReport).mockResolvedValue(mockReportData);

        const request = createMockRequest('/api/reports?action=team');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.totalTasks).toBe(30);
        expect(data.totalUsers).toBe(3);
        expect(data.weeklyBreakdown).toHaveLength(3);

        // Verify weekly breakdown contains correct structure
        expect(data.weeklyBreakdown[0]).toMatchObject({
          week: expect.any(String),
          weekStart: expect.any(String),
          userId: expect.any(String),
          userName: expect.any(String),
          todo: expect.any(Number),
          inProgress: expect.any(Number),
          completed: expect.any(Number),
          blocked: expect.any(Number),
          total: expect.any(Number),
        });
      });

      it('should handle report generation errors', async () => {
        mockSupabaseClient.auth = {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: authUsersFixtures.alice.id } },
            error: null,
          }),
        } as any;
        mockUserRoles(authUsersFixtures.alice.id, ['admin']);

        vi.mocked(generateTeamSummaryReport).mockRejectedValue(
          new Error('Database connection failed')
        );

        const request = createMockRequest('/api/reports?action=team');
        const response = await GET(request);

        expect(response.status).toBe(500);
        const data = await response.json();
        expect(data.error).toBe('Server error');
      });
    });

    describe('action=task (taskCompletion report)', () => {
      it('should generate task completion report with all fields', async () => {
        const mockReportData = {
          kind: 'taskCompletions' as const,
          totalTasks: 10,
          totalCompleted: 6,
          totalInProgress: 3,
          totalTodo: 1,
          totalBlocked: 0,
          overallCompletionRate: 0.6,
          userStats: [
            {
              userId: 'user1',
              userName: 'John Doe',
              totalTasks: 5,
              completedTasks: 3,
              inProgressTasks: 2,
              todoTasks: 0,
              blockedTasks: 0,
              completionRate: 0.6,
              avgCompletionTime: 24,
              onTimeCompletions: 2,
              lateCompletions: 1,
              onTimeRate: 0.67,
              totalLoggedTime: 10,
              avgLoggedTimePerTask: 2,
            },
          ],
          completedByProject: new Map([
            [1, 4],
            [2, 2],
          ]),
        };

        mockSupabaseClient.auth = {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: authUsersFixtures.alice.id } },
            error: null,
          }),
        } as any;
        mockUserRoles(authUsersFixtures.alice.id, ['admin']);

        vi.mocked(generateTaskCompletionReport).mockResolvedValue(mockReportData);

        const request = createMockRequest('/api/reports?action=task');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toMatchObject({
          kind: 'taskCompletions',
          totalTasks: 10,
          totalCompleted: 6,
          totalInProgress: 3,
          totalTodo: 1,
          totalBlocked: 0,
          overallCompletionRate: 0.6,
        });
        expect(data.userStats).toHaveLength(1);
        expect(data.userStats[0]).toMatchObject({
          userId: 'user1',
          userName: 'John Doe',
          completionRate: 0.6,
        });
        expect(generateTaskCompletionReport).toHaveBeenCalledWith({
          projectIds: undefined,
          startDate: undefined,
          endDate: undefined,
        });
      });

      it('should pass filters to task completion report', async () => {
        const projectIds = [1];
        const startDate = '2024-01-01';
        const endDate = '2024-12-31';
        const mockReportData = {
          kind: 'taskCompletions' as const,
          totalTasks: 5,
          totalCompleted: 3,
          totalInProgress: 1,
          totalTodo: 1,
          totalBlocked: 0,
          overallCompletionRate: 0.6,
          userStats: [],
          completedByProject: new Map(),
        };

        mockSupabaseClient.auth = {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: authUsersFixtures.alice.id } },
            error: null,
          }),
        } as any;
        mockUserRoles(authUsersFixtures.alice.id, ['admin']);

        vi.mocked(generateTaskCompletionReport).mockResolvedValue(mockReportData);

        const request = createMockRequest(
          `/api/reports?action=task&projectIds=${projectIds.join(
            ','
          )}&startDate=${startDate}&endDate=${endDate}`
        );
        await GET(request);

        expect(generateTaskCompletionReport).toHaveBeenCalledWith({
          projectIds,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
        });
      });

      it('should handle empty user stats', async () => {
        const mockReportData = {
          kind: 'taskCompletions' as const,
          totalTasks: 0,
          totalCompleted: 0,
          totalInProgress: 0,
          totalTodo: 0,
          totalBlocked: 0,
          overallCompletionRate: 0,
          userStats: [],
          completedByProject: new Map(),
        };

        mockSupabaseClient.auth = {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: authUsersFixtures.alice.id } },
            error: null,
          }),
        } as any;
        mockUserRoles(authUsersFixtures.alice.id, ['admin']);

        vi.mocked(generateTaskCompletionReport).mockResolvedValue(mockReportData);

        const request = createMockRequest('/api/reports?action=task');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.userStats).toEqual([]);
      });
    });

    describe('error handling', () => {
      it('should return 400 for invalid action', async () => {
        mockSupabaseClient.auth = {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: authUsersFixtures.alice.id } },
            error: null,
          }),
        } as any;

        const request = createMockRequest('/api/reports?action=invalid');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data).toHaveProperty('error', 'Invalid action');
      });

      it('should return 500 on server error', async () => {
        mockSupabaseClient.auth = {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: authUsersFixtures.alice.id } },
            error: null,
          }),
        } as any;

        vi.mocked(filterDepartments).mockRejectedValue(new Error('Database connection failed'));

        const request = createMockRequest('/api/reports?action=departments');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data).toHaveProperty('error', 'Server error');
        expect(data).toHaveProperty('details');
      });
    });

    describe('parameter parsing', () => {
      it('should parse comma-separated projectIds correctly', async () => {
        mockSupabaseClient.auth = {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: authUsersFixtures.alice.id } },
            error: null,
          }),
        } as any;

        vi.mocked(filterDepartments).mockResolvedValue([]);

        const request = createMockRequest('/api/reports?action=departments&projectIds=1,2,3');
        await GET(request);

        expect(filterDepartments).toHaveBeenCalledWith(authUsersFixtures.alice.id, [1, 2, 3]);
      });

      it('should filter out invalid numbers from comma-separated params', async () => {
        mockSupabaseClient.auth = {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: authUsersFixtures.alice.id } },
            error: null,
          }),
        } as any;

        vi.mocked(filterDepartments).mockResolvedValue([]);

        const request = createMockRequest(
          '/api/reports?action=departments&projectIds=1,invalid,2,NaN,3'
        );
        await GET(request);

        expect(filterDepartments).toHaveBeenCalledWith(authUsersFixtures.alice.id, [1, 2, 3]);
      });

      it('should handle empty comma-separated params', async () => {
        mockSupabaseClient.auth = {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: authUsersFixtures.alice.id } },
            error: null,
          }),
        } as any;

        vi.mocked(filterDepartments).mockResolvedValue([]);

        const request = createMockRequest('/api/reports?action=departments&projectIds=');
        await GET(request);

        // Empty string results in undefined after parseArrayParam
        const calls = vi.mocked(filterDepartments).mock.calls[0];
        expect(calls[0]).toBe(authUsersFixtures.alice.id);
        expect(calls[1]).toBeUndefined();
      });

      it('should parse date strings correctly', async () => {
        mockSupabaseClient.auth = {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: authUsersFixtures.alice.id } },
            error: null,
          }),
        } as any;
        mockUserRoles(authUsersFixtures.alice.id, ['admin']);

        vi.mocked(generateLoggedTimeReport).mockResolvedValue({
          kind: 'loggedTime' as const,
          totalTime: 0,
          avgTime: 0,
          completedTasks: 0,
          overdueTasks: 0,
          blockedTasks: 0,
          timeByTask: new Map(),
          incompleteTime: 0,
          onTimeCompletionRate: 0,
          totalDelayHours: 0,
          overdueTime: 0,
        });

        const request = createMockRequest(
          '/api/reports?action=time&startDate=2024-01-01T00:00:00Z&endDate=2024-12-31T23:59:59Z'
        );
        await GET(request);

        expect(generateLoggedTimeReport).toHaveBeenCalledWith(
          expect.objectContaining({
            startDate: new Date('2024-01-01T00:00:00Z'),
            endDate: new Date('2024-12-31T23:59:59Z'),
          })
        );
      });

      it('should handle invalid date strings', async () => {
        mockSupabaseClient.auth = {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: authUsersFixtures.alice.id } },
            error: null,
          }),
        } as any;
        mockUserRoles(authUsersFixtures.alice.id, ['admin']);

        vi.mocked(generateLoggedTimeReport).mockResolvedValue({
          kind: 'loggedTime',
          totalTime: 0,
          avgTime: 0,
          completedTasks: 0,
          overdueTasks: 0,
          blockedTasks: 0,
          timeByTask: new Map(),
          incompleteTime: 0,
          onTimeCompletionRate: 0,
          totalDelayHours: 0,
          overdueTime: 0,
        });

        const request = createMockRequest('/api/reports?action=time&startDate=invalid-date');
        await GET(request);

        expect(generateLoggedTimeReport).toHaveBeenCalledWith({
          projectIds: undefined,
          startDate: undefined, // Invalid date becomes undefined
          endDate: undefined,
        });
      });
    });
  });
});
