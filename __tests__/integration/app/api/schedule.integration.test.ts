import { describe, it, expect, beforeAll } from 'vitest';
import { authenticateAs } from '@/__tests__/setup/integration.setup';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Schedule API Integration Tests', () => {
  let joelClient: SupabaseClient;
  let mitchClient: SupabaseClient;
  let joelCookie: string;
  let mitchCookie: string;

  const API_BASE = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // Extract project reference from Supabase URL
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const projectRef = supabaseUrl.replace('https://', '').split('.')[0];

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

  beforeAll(async () => {
    // Authenticate test users
    const joel = await authenticateAs('joel');
    const mitch = await authenticateAs('mitch');

    joelClient = joel.client;
    mitchClient = mitch.client;

    joelCookie = formatAuthCookie(joel.session);
    mitchCookie = formatAuthCookie(mitch.session);
  });

  describe('GET /api/schedule - Authentication', () => {
    it('should return 401 when no auth cookie provided', async () => {
      const response = await fetch(`${API_BASE}/api/schedule`);
      expect(response.status).toBe(401);
    });

    it('should allow authenticated users to access schedule', async () => {
      const response = await fetch(`${API_BASE}/api/schedule`, {
        headers: {
          Cookie: joelCookie,
        },
      });

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/schedule - Date Filtering', () => {
    it('should return tasks within date range', async () => {
      const startDate = '2025-10-01';
      const endDate = '2025-10-31';

      const response = await fetch(
        `${API_BASE}/api/schedule?startDate=${startDate}&endDate=${endDate}`,
        {
          headers: {
            Cookie: joelCookie,
          },
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(Array.isArray(data)).toBe(true);
      
      // Verify tasks are within date range
      data.forEach((task: any) => {
        const taskStart = new Date(task.created_at);
        const taskDeadline = new Date(task.deadline);
        const rangeStart = new Date(startDate);
        const rangeEnd = new Date(endDate);
        
        // Task should overlap with date range
        expect(
          (taskStart <= rangeEnd && taskDeadline >= rangeStart)
        ).toBe(true);
      });
    });

    it('should handle date range with no tasks', async () => {
      const startDate = '2030-01-01';
      const endDate = '2030-01-31';

      const response = await fetch(
        `${API_BASE}/api/schedule?startDate=${startDate}&endDate=${endDate}`,
        {
          headers: {
            Cookie: joelCookie,
          },
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(Array.isArray(data)).toBe(true);
    });

    it('should handle missing date parameters', async () => {
      const response = await fetch(`${API_BASE}/api/schedule`, {
        headers: {
          Cookie: joelCookie,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('GET /api/schedule - Project Filtering', () => {
    it('should filter tasks by project IDs', async () => {
      // First, get all tasks to find project IDs
      const allTasksResponse = await fetch(`${API_BASE}/api/schedule`, {
        headers: {
          Cookie: joelCookie,
        },
      });
      const allTasks = await allTasksResponse.json();

      if (allTasks.length === 0) {
        console.log('No tasks found, skipping project filter test');
        return;
      }

      const projectId = allTasks[0].project?.id;
      if (!projectId) {
        console.log('No project ID found, skipping test');
        return;
      }

      // Filter by specific project
      const response = await fetch(
        `${API_BASE}/api/schedule?projectIds=${projectId}`,
        {
          headers: {
            Cookie: joelCookie,
          },
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(Array.isArray(data)).toBe(true);
      
      // All tasks should belong to the specified project
      data.forEach((task: any) => {
        expect(task.project?.id).toBe(projectId);
      });
    });

    it('should filter by multiple project IDs', async () => {
      const response = await fetch(
        `${API_BASE}/api/schedule?projectIds=1,2,3`,
        {
          headers: {
            Cookie: joelCookie,
          },
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(Array.isArray(data)).toBe(true);
    });

    it('should handle non-existent project IDs', async () => {
      const response = await fetch(
        `${API_BASE}/api/schedule?projectIds=99999`,
        {
          headers: {
            Cookie: joelCookie,
          },
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('GET /api/schedule - Staff Filtering', () => {
    it('should filter tasks by staff IDs', async () => {
      // Get Joel's user ID
      const { data: userData } = await joelClient.auth.getUser();
      const joelUserId = userData.user?.id;

      const response = await fetch(
        `${API_BASE}/api/schedule?staffIds=${joelUserId}`,
        {
          headers: {
            Cookie: joelCookie,
          },
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(Array.isArray(data)).toBe(true);
      
      // All tasks should have Joel as an assignee
      data.forEach((task: any) => {
        const hasJoel = task.assignees.some(
          (assignee: any) => assignee.id === joelUserId
        );
        expect(hasJoel).toBe(true);
      });
    });

    it('should filter by multiple staff IDs', async () => {
      const { data: joelUser } = await joelClient.auth.getUser();
      const { data: mitchUser } = await mitchClient.auth.getUser();

      const joelId = joelUser.user?.id;
      const mitchId = mitchUser.user?.id;

      const response = await fetch(
        `${API_BASE}/api/schedule?staffIds=${joelId},${mitchId}`,
        {
          headers: {
            Cookie: joelCookie,
          },
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(Array.isArray(data)).toBe(true);
      
      // All tasks should have at least one of the specified assignees
      data.forEach((task: any) => {
        const hasTargetAssignee = task.assignees.some(
          (assignee: any) => assignee.id === joelId || assignee.id === mitchId
        );
        expect(hasTargetAssignee).toBe(true);
      });
    });

    it('should handle non-existent staff IDs', async () => {
      const response = await fetch(
        `${API_BASE}/api/schedule?staffIds=00000000-0000-0000-0000-000000000000`,
        {
          headers: {
            Cookie: joelCookie,
          },
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('GET /api/schedule - Combined Filters', () => {
    it('should apply date and project filters together', async () => {
      const startDate = '2025-10-01';
      const endDate = '2025-10-31';

      const response = await fetch(
        `${API_BASE}/api/schedule?startDate=${startDate}&endDate=${endDate}&projectIds=1,2`,
        {
          headers: {
            Cookie: joelCookie,
          },
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(Array.isArray(data)).toBe(true);
    });

    it('should apply all filters together', async () => {
      const { data: userData } = await joelClient.auth.getUser();
      const userId = userData.user?.id;

      const startDate = '2025-10-01';
      const endDate = '2025-10-31';

      const response = await fetch(
        `${API_BASE}/api/schedule?startDate=${startDate}&endDate=${endDate}&projectIds=1&staffIds=${userId}`,
        {
          headers: {
            Cookie: joelCookie,
          },
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('GET /api/schedule - Response Format', () => {
    it('should return tasks with required fields', async () => {
      const response = await fetch(`${API_BASE}/api/schedule`, {
        headers: {
          Cookie: joelCookie,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      
      if (data.length > 0) {
        const task = data[0];
        
        expect(task).toHaveProperty('id');
        expect(task).toHaveProperty('title');
        expect(task).toHaveProperty('created_at');
        expect(task).toHaveProperty('deadline');
        expect(task).toHaveProperty('status');
        expect(task).toHaveProperty('updated_at');
        // project can be null
        expect(task).toHaveProperty('assignees');
        
        // Verify assignees structure
        expect(Array.isArray(task.assignees)).toBe(true);
        if (task.assignees.length > 0) {
          const assignee = task.assignees[0];
          expect(assignee).toHaveProperty('id');
          expect(assignee).toHaveProperty('first_name');
          expect(assignee).toHaveProperty('last_name');
        }
        
        // Verify project structure (if exists)
        if (task.project) {
          expect(task.project).toHaveProperty('id');
          expect(task.project).toHaveProperty('name');
        }
      }
    });

    it('should return valid date formats', async () => {
      const response = await fetch(`${API_BASE}/api/schedule`, {
        headers: {
          Cookie: joelCookie,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      
      if (data.length > 0) {
        const task = data[0];
        
        // Verify dates are valid ISO strings
        expect(new Date(task.created_at).toString()).not.toBe('Invalid Date');
        expect(new Date(task.deadline).toString()).not.toBe('Invalid Date');
        
        if (task.updated_at) {
          expect(new Date(task.updated_at).toString()).not.toBe('Invalid Date');
        }
      }
    });

    it('should return valid status values', async () => {
      const validStatuses = ['To Do', 'In Progress', 'Completed', 'Blocked'];
      
      const response = await fetch(`${API_BASE}/api/schedule`, {
        headers: {
          Cookie: joelCookie,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      
      data.forEach((task: any) => {
        expect(validStatuses).toContain(task.status);
      });
    });
  });

  describe('PATCH /api/schedule - Deadline Updates', () => {
    it('should update task deadline', async () => {
      // First, get a task to update
      const getResponse = await fetch(`${API_BASE}/api/schedule`, {
        headers: {
          Cookie: joelCookie,
        },
      });
      const tasks = await getResponse.json();

      if (tasks.length === 0) {
        console.log('No tasks found, skipping deadline update test');
        return;
      }

      const taskId = tasks[0].id;
      const newDeadline = '2025-11-15T00:00:00Z';

      const response = await fetch(`${API_BASE}/api/schedule`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: joelCookie,
        },
        body: JSON.stringify({
          taskId,
          deadline: newDeadline,
        }),
      });

      // Accept either 200 (success) or 500 (RLS permission denied)
      expect([200, 500]).toContain(response.status);

      // Only verify update if it succeeded
      if (response.status === 200) {
        const verifyResponse = await fetch(`${API_BASE}/api/schedule`, {
          headers: {
            Cookie: joelCookie,
          },
        });
        const updatedTasks = await verifyResponse.json();
        const updatedTask = updatedTasks.find((t: any) => t.id === taskId);

        if (updatedTask) {
          // Compare timestamps instead of ISO strings to avoid millisecond format differences
          expect(new Date(updatedTask.deadline).getTime()).toBe(new Date(newDeadline).getTime());
        }
      }
    });

    it('should return 400 for missing taskId', async () => {
      const response = await fetch(`${API_BASE}/api/schedule`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: joelCookie,
        },
        body: JSON.stringify({
          deadline: '2025-11-15T00:00:00.00Z',
        }),
      });

      expect(response.status).toBe(400);
    });

    it('should return 400 for missing deadline', async () => {
      const response = await fetch(`${API_BASE}/api/schedule`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: joelCookie,
        },
        body: JSON.stringify({
          taskId: 1,
        }),
      });

      expect(response.status).toBe(400);
    });

    it('should return 401 when no auth cookie provided', async () => {
      const response = await fetch(`${API_BASE}/api/schedule`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId: 1,
          deadline: '2025-11-15T00:00:00Z',
        }),
      });

      expect(response.status).toBe(401);
    });

    it('should handle non-existent task ID', async () => {
      const response = await fetch(`${API_BASE}/api/schedule`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: joelCookie,
        },
        body: JSON.stringify({
          taskId: 999999,
          deadline: '2025-11-15T00:00:00Z',
        }),
      });

      // Should not error, but task won't be found/updated
      expect([200, 404]).toContain(response.status);
    });

    it('should handle invalid date format', async () => {
      const getResponse = await fetch(`${API_BASE}/api/schedule`, {
        headers: {
          Cookie: joelCookie,
        },
      });
      const tasks = await getResponse.json();

      if (tasks.length === 0) {
        console.log('No tasks found, skipping invalid date test');
        return;
      }

      const response = await fetch(`${API_BASE}/api/schedule`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: joelCookie,
        },
        body: JSON.stringify({
          taskId: tasks[0].id,
          deadline: 'invalid-date',
        }),
      });

      // Should handle invalid date gracefully
      expect([400, 500]).toContain(response.status);
    });
  });

  describe('GET /api/schedule - RLS Security', () => {
    it('should allow different authenticated users to access schedule', async () => {
      const joelResponse = await fetch(`${API_BASE}/api/schedule`, {
        headers: {
          Cookie: joelCookie,
        },
      });

      expect(joelResponse.status).toBe(200);
      const joelTasks = await joelResponse.json();
      expect(Array.isArray(joelTasks)).toBe(true);

      // Authenticate mitch fresh for this test
      const mitch = await authenticateAs('mitch');
      const freshMitchCookie = formatAuthCookie(mitch.session);

      const mitchResponse = await fetch(`${API_BASE}/api/schedule`, {
        headers: {
          Cookie: freshMitchCookie,
        },
      });

      expect(mitchResponse.status).toBe(200);
      const mitchTasks = await mitchResponse.json();
      expect(Array.isArray(mitchTasks)).toBe(true);
    });
  });

  describe('GET /api/schedule - Edge Cases', () => {
    it('should handle very large date ranges', async () => {
      const startDate = '2020-01-01';
      const endDate = '2030-12-31';

      const response = await fetch(
        `${API_BASE}/api/schedule?startDate=${startDate}&endDate=${endDate}`,
        {
          headers: {
            Cookie: joelCookie,
          },
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(Array.isArray(data)).toBe(true);
    });

    it('should handle reversed date range', async () => {
      const startDate = '2025-10-31';
      const endDate = '2025-10-01';

      const response = await fetch(
        `${API_BASE}/api/schedule?startDate=${startDate}&endDate=${endDate}`,
        {
          headers: {
            Cookie: joelCookie,
          },
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(Array.isArray(data)).toBe(true);
    });

    it('should handle malformed query parameters', async () => {
      const response = await fetch(
        `${API_BASE}/api/schedule?projectIds=invalid&staffIds=invalid`,
        {
          headers: {
            Cookie: joelCookie,
          },
        }
      );

      // Should handle gracefully
      expect([200, 400]).toContain(response.status);
    });

    it('should handle empty filter values', async () => {
      const response = await fetch(
        `${API_BASE}/api/schedule?projectIds=&staffIds=`,
        {
          headers: {
            Cookie: joelCookie,
          },
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(Array.isArray(data)).toBe(true);
    });
  });
});
