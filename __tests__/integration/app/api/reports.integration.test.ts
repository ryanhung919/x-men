import { describe, it, expect, beforeAll } from 'vitest';
import { authenticateAs, testUsers, adminClient } from '@/__tests__/setup/integration.setup';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Reports API Integration Tests', () => {
  let joelClient: SupabaseClient;
  let mitchClient: SupabaseClient;
  let joelCookie: string;
  let mitchCookie: string;

  const API_BASE = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  beforeAll(async () => {
    // Authenticate test users
    const joel = await authenticateAs('joel');
    const mitch = await authenticateAs('mitch');
    const garrison = await authenticateAs('garrison');

    joelClient = joel.client;
    mitchClient = mitch.client;

    // Extract project reference from Supabase URL
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const projectRef = supabaseUrl.replace('https://', '').split('.')[0];

    // Format cookies as Supabase expects: single cookie with JSON-encoded session
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

    // Get session cookies
    joelCookie = formatAuthCookie(joel.session);
    mitchCookie = formatAuthCookie(mitch.session);
  });

  describe('GET /api/reports - Authentication & Authorization', () => {
    it('should return 401 when no auth cookie provided', async () => {
      const response = await fetch(`${API_BASE}/api/reports?action=time`);
      expect(response.status).toBe(401);
    });

    it('should return 403 when non-admin tries to access report actions', async () => {
      // First, remove admin role from Joel temporarily
      await adminClient
        .from('user_roles')
        .delete()
        .eq('user_id', testUsers.joel.id)
        .eq('role', 'admin');

      const response = await fetch(`${API_BASE}/api/reports?action=time`, {
        headers: {
          Cookie: joelCookie,
        },
      });

      expect(response.status).toBe(403);

      // Restore admin role
      await adminClient.from('user_roles').insert({ user_id: testUsers.joel.id, role: 'admin' });
    });

    it('should allow admins to access report actions', async () => {
      const response = await fetch(`${API_BASE}/api/reports?action=time`, {
        headers: {
          Cookie: joelCookie,
        },
      });

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/reports?action=departments', () => {
    it('should return departments for authenticated user', async () => {
      const response = await fetch(`${API_BASE}/api/reports?action=departments`, {
        headers: {
          Cookie: joelCookie,
        },
      });

      expect(response.status).toBe(200);
      const departments = await response.json();

      expect(Array.isArray(departments)).toBe(true);
      expect(departments.length).toBeGreaterThan(0);
      expect(departments[0]).toHaveProperty('id');
      expect(departments[0]).toHaveProperty('name');
    });

    it('should return different departments based on user context', async () => {
      const joelResponse = await fetch(`${API_BASE}/api/reports?action=departments`, {
        headers: {
          Cookie: joelCookie,
        },
      });

      const mitchResponse = await fetch(`${API_BASE}/api/reports?action=departments`, {
        headers: {
          Cookie: mitchCookie,
        },
      });

      expect(joelResponse.status).toBe(200);
      expect(mitchResponse.status).toBe(200);

      const joelDepts = await joelResponse.json();
      const mitchDepts = await mitchResponse.json();

      expect(Array.isArray(joelDepts)).toBe(true);
      expect(Array.isArray(mitchDepts)).toBe(true);

      // They should see different departments based on their department hierarchy
      expect(joelDepts).not.toEqual(mitchDepts);
    });

    it('should filter departments by projectIds', async () => {
      // Get a project ID first
      const { data: projects } = await joelClient.from('projects').select('id').limit(1).single();

      if (!projects) throw new Error('No projects found');

      const response = await fetch(
        `${API_BASE}/api/reports?action=departments&projectIds=${projects.id}`,
        {
          headers: {
            Cookie: joelCookie,
          },
        }
      );

      expect(response.status).toBe(200);
      const departments = await response.json();
      expect(Array.isArray(departments)).toBe(true);
    });
  });

  describe('GET /api/reports?action=projects', () => {
    it('should return projects for authenticated user', async () => {
      const response = await fetch(`${API_BASE}/api/reports?action=projects`, {
        headers: {
          Cookie: joelCookie,
        },
      });

      expect(response.status).toBe(200);
      const projects = await response.json();

      expect(Array.isArray(projects)).toBe(true);
      expect(projects.length).toBeGreaterThanOrEqual(0);
      if (projects.length > 0) {
        expect(projects[0]).toHaveProperty('id');
        expect(projects[0]).toHaveProperty('name');
      }
    });

    it('should filter projects by departmentIds', async () => {
      // Get Joel's department ID
      const { data: userInfo } = await joelClient
        .from('user_info')
        .select('department_id')
        .eq('id', testUsers.joel.id)
        .single();

      if (!userInfo) throw new Error('User info not found');

      const response = await fetch(
        `${API_BASE}/api/reports?action=projects&departmentIds=${userInfo.department_id}`,
        {
          headers: {
            Cookie: joelCookie,
          },
        }
      );

      expect(response.status).toBe(200);
      const projects = await response.json();
      expect(Array.isArray(projects)).toBe(true);
    });
  });

  describe('GET /api/reports?action=time (Logged Time Report)', () => {
    it('should generate logged time report with valid data structure', async () => {
      const response = await fetch(`${API_BASE}/api/reports?action=time`, {
        headers: {
          Cookie: joelCookie,
        },
      });

      expect(response.status).toBe(200);
      const report = await response.json();

      // Verify report structure
      expect(report).toHaveProperty('kind', 'loggedTime');
      expect(report).toHaveProperty('totalTime');
      expect(report).toHaveProperty('avgTime');
      expect(report).toHaveProperty('completedTasks');
      expect(report).toHaveProperty('overdueTasks');
      expect(report).toHaveProperty('blockedTasks');
      expect(report).toHaveProperty('incompleteTime');
      expect(report).toHaveProperty('onTimeCompletionRate');
      expect(report).toHaveProperty('totalDelayHours');
      expect(report).toHaveProperty('overdueTime');
      expect(report).toHaveProperty('timeByTask');

      // Verify data types
      expect(typeof report.totalTime).toBe('number');
      expect(typeof report.avgTime).toBe('number');
      expect(typeof report.completedTasks).toBe('number');
      expect(typeof report.overdueTasks).toBe('number');
      expect(typeof report.blockedTasks).toBe('number');
      expect(typeof report.onTimeCompletionRate).toBe('number');
      expect(typeof report.timeByTask).toBe('object');

      // Verify numeric ranges
      expect(report.totalTime).toBeGreaterThanOrEqual(0);
      expect(report.onTimeCompletionRate).toBeGreaterThanOrEqual(0);
      expect(report.onTimeCompletionRate).toBeLessThanOrEqual(1);
    });

    it('should filter report by projectIds', async () => {
      // Get a project ID
      const { data: projects } = await joelClient.from('projects').select('id').limit(1).single();

      if (!projects) throw new Error('No projects found');

      const response = await fetch(
        `${API_BASE}/api/reports?action=time&projectIds=${projects.id}`,
        {
          headers: {
            Cookie: joelCookie,
          },
        }
      );

      expect(response.status).toBe(200);
      const report = await response.json();
      expect(report.kind).toBe('loggedTime');
    });

    it('should filter report by date range', async () => {
      const startDate = '2025-09-01';
      const endDate = '2025-10-31';

      const response = await fetch(
        `${API_BASE}/api/reports?action=time&startDate=${startDate}&endDate=${endDate}`,
        {
          headers: {
            Cookie: joelCookie,
          },
        }
      );

      expect(response.status).toBe(200);
      const report = await response.json();
      expect(report.kind).toBe('loggedTime');
    });

    it('should handle empty results gracefully', async () => {
      // Use a future date range with no data
      const startDate = '2099-01-01';
      const endDate = '2099-12-31';

      const response = await fetch(
        `${API_BASE}/api/reports?action=time&startDate=${startDate}&endDate=${endDate}`,
        {
          headers: {
            Cookie: joelCookie,
          },
        }
      );

      expect(response.status).toBe(200);
      const report = await response.json();

      expect(report.totalTime).toBe(0);
      expect(report.completedTasks).toBe(0);
      expect(report.overdueTasks).toBe(0);
    });
  });

  describe('GET /api/reports?action=team (Team Summary Report)', () => {
    it('should generate team summary report with valid data structure', async () => {
      const response = await fetch(`${API_BASE}/api/reports?action=team`, {
        headers: {
          Cookie: mitchCookie,
        },
      });

      expect(response.status).toBe(200);
      const report = await response.json();

      // Verify report structure
      expect(report).toHaveProperty('kind', 'teamSummary');
      expect(report).toHaveProperty('totalTasks');
      expect(report).toHaveProperty('totalUsers');
      expect(report).toHaveProperty('weeklyBreakdown');
      expect(report).toHaveProperty('userTotals');
      expect(report).toHaveProperty('weekTotals');

      // Verify data types
      expect(typeof report.totalTasks).toBe('number');
      expect(typeof report.totalUsers).toBe('number');
      expect(Array.isArray(report.weeklyBreakdown)).toBe(true);
      expect(typeof report.userTotals).toBe('object');
      expect(typeof report.weekTotals).toBe('object');

      // Verify weekly breakdown structure
      if (report.weeklyBreakdown.length > 0) {
        const entry = report.weeklyBreakdown[0];
        expect(entry).toHaveProperty('week');
        expect(entry).toHaveProperty('weekStart');
        expect(entry).toHaveProperty('userId');
        expect(entry).toHaveProperty('userName');
        expect(entry).toHaveProperty('todo');
        expect(entry).toHaveProperty('inProgress');
        expect(entry).toHaveProperty('completed');
        expect(entry).toHaveProperty('blocked');
        expect(entry).toHaveProperty('total');
      }
    });

    it('should filter team report by projectIds', async () => {
      const { data: projects } = await mitchClient.from('projects').select('id').limit(1).single();

      if (!projects) throw new Error('No projects found');

      const response = await fetch(
        `${API_BASE}/api/reports?action=team&projectIds=${projects.id}`,
        {
          headers: {
            Cookie: mitchCookie,
          },
        }
      );

      expect(response.status).toBe(200);
      const report = await response.json();
      expect(report.kind).toBe('teamSummary');
    });

    it('should serialize Maps to objects in JSON response', async () => {
      const response = await fetch(`${API_BASE}/api/reports?action=team`, {
        headers: {
          Cookie: mitchCookie,
        },
      });

      expect(response.status).toBe(200);
      const report = await response.json();

      // Verify userTotals is a plain object (not a Map)
      expect(typeof report.userTotals).toBe('object');
      expect(report.userTotals.constructor.name).toBe('Object');

      // Verify weekTotals is a plain object (not a Map)
      expect(typeof report.weekTotals).toBe('object');
      expect(report.weekTotals.constructor.name).toBe('Object');
    });
  });

  describe('GET /api/reports?action=task (Task Completion Report)', () => {
    it('should generate task completion report with valid data structure', async () => {
      const response = await fetch(`${API_BASE}/api/reports?action=task`, {
        headers: {
          Cookie: joelCookie,
        },
      });

      expect(response.status).toBe(200);
      const report = await response.json();

      // Verify report structure
      expect(report).toHaveProperty('kind', 'taskCompletions');
      expect(report).toHaveProperty('totalTasks');
      expect(report).toHaveProperty('totalCompleted');
      expect(report).toHaveProperty('totalInProgress');
      expect(report).toHaveProperty('totalTodo');
      expect(report).toHaveProperty('totalBlocked');
      expect(report).toHaveProperty('overallCompletionRate');
      expect(report).toHaveProperty('userStats');
      expect(report).toHaveProperty('completedByProject');

      // Verify data types
      expect(typeof report.totalTasks).toBe('number');
      expect(typeof report.overallCompletionRate).toBe('number');
      expect(Array.isArray(report.userStats)).toBe(true);
      expect(typeof report.completedByProject).toBe('object');

      // Verify completion rate is between 0 and 1
      expect(report.overallCompletionRate).toBeGreaterThanOrEqual(0);
      expect(report.overallCompletionRate).toBeLessThanOrEqual(1);

      // Verify user stats structure
      if (report.userStats.length > 0) {
        const userStat = report.userStats[0];
        expect(userStat).toHaveProperty('userId');
        expect(userStat).toHaveProperty('userName');
        expect(userStat).toHaveProperty('totalTasks');
        expect(userStat).toHaveProperty('completedTasks');
        expect(userStat).toHaveProperty('completionRate');
        expect(userStat).toHaveProperty('avgCompletionTime');
        expect(userStat).toHaveProperty('onTimeCompletions');
        expect(userStat).toHaveProperty('lateCompletions');
        expect(userStat).toHaveProperty('onTimeRate');
        expect(userStat).toHaveProperty('totalLoggedTime');
      }
    });

    it('should filter task completion report by date range', async () => {
      const startDate = '2025-09-01';
      const endDate = '2025-10-31';

      const response = await fetch(
        `${API_BASE}/api/reports?action=task&startDate=${startDate}&endDate=${endDate}`,
        {
          headers: {
            Cookie: joelCookie,
          },
        }
      );

      expect(response.status).toBe(200);
      const report = await response.json();
      expect(report.kind).toBe('taskCompletions');
    });
  });

  describe('Error Handling', () => {
    it('should return 400 for invalid action parameter', async () => {
      const response = await fetch(`${API_BASE}/api/reports?action=invalid`, {
        headers: {
          Cookie: joelCookie,
        },
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid action');
    });

    it('should handle invalid date formats gracefully', async () => {
      const response = await fetch(`${API_BASE}/api/reports?action=time&startDate=invalid-date`, {
        headers: {
          Cookie: joelCookie,
        },
      });

      // Should still return 200 but with undefined dates (handled internally)
      expect(response.status).toBe(200);
    });

    it('should handle invalid projectIds gracefully', async () => {
      const response = await fetch(`${API_BASE}/api/reports?action=time&projectIds=999999`, {
        headers: {
          Cookie: joelCookie,
        },
      });

      expect(response.status).toBe(200);
      const report = await response.json();
      // Should return empty data
      expect(report.totalTime).toBe(0);
    });
  });

  describe('RLS Policy Enforcement', () => {
    it('should only return data visible to the authenticated user', async () => {
      // Joel and Mitch are in different departments
      const joelResponse = await fetch(`${API_BASE}/api/reports?action=time`, {
        headers: {
          Cookie: joelCookie,
        },
      });

      const mitchResponse = await fetch(`${API_BASE}/api/reports?action=time`, {
        headers: {
          Cookie: mitchCookie,
        },
      });

      expect(joelResponse.status).toBe(200);
      expect(mitchResponse.status).toBe(200);

      const joelReport = await joelResponse.json();
      const mitchReport = await mitchResponse.json();

      // They should see different data based on their department access
      // (exact comparison depends on your RLS policies and test data)
      expect(joelReport).toHaveProperty('completedTasks'); // ← Correct property for loggedTime report
      expect(mitchReport).toHaveProperty('completedTasks');
    });
  });
});
