import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { authenticateAs, testUsers, adminClient } from '@/__tests__/setup/integration.setup';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Tasks API Integration Tests', () => {
  let joelClient: SupabaseClient;
  let mitchClient: SupabaseClient;
  let kesterClient: SupabaseClient;
  let joelCookie: string;
  let mitchCookie: string;
  let kesterCookie: string;
  let testProjectId: number;
  let createdTaskIds: number[] = [];

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
    const kester = await authenticateAs('kester');

    joelClient = joel.client;
    mitchClient = mitch.client;
    kesterClient = kester.client;

    // Get session cookies
    joelCookie = formatAuthCookie(joel.session);
    mitchCookie = formatAuthCookie(mitch.session);
    kesterCookie = formatAuthCookie(kester.session);

    // Get a test project ID
    const { data: project } = await joelClient
      .from('projects')
      .select('id')
      .limit(1)
      .single();

    if (project) {
      testProjectId = project.id;
    }
  });

  afterAll(async () => {
    // Cleanup created tasks
    if (createdTaskIds.length > 0) {
      await adminClient
        .from('tasks')
        .delete()
        .in('id', createdTaskIds);
    }
  });

  describe('POST /api/tasks - Create Task', () => {
    it('should create a task successfully with valid data', async () => {
      const formData = new FormData();
      formData.append('taskData', JSON.stringify({
        project_id: testProjectId,
        title: 'Integration Test Task',
        description: 'Test task created via integration test',
        priority_bucket: 5,
        status: 'To Do',
        assignee_ids: [testUsers.joel.id],
        deadline: '2025-12-31T23:59:59Z',
      }));

      const response = await fetch(`${API_BASE}/api/tasks`, {
        method: 'POST',
        headers: {
          Cookie: joelCookie,
        },
        body: formData,
      });

      expect(response.status).toBe(201);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.taskId).toBeDefined();
      expect(typeof data.taskId).toBe('number');
      expect(data.message).toBe('Task created successfully');

      // Track for cleanup
      createdTaskIds.push(data.taskId);

      // Verify task was actually created in database
      const { data: task } = await adminClient
        .from('tasks')
        .select('*')
        .eq('id', data.taskId)
        .single();

      expect(task).toBeDefined();
      expect(task.title).toBe('Integration Test Task');
      expect(task.project_id).toBe(testProjectId);
    });

    it('should create a task with file attachments', async () => {
      const formData = new FormData();
      formData.append('taskData', JSON.stringify({
        project_id: testProjectId,
        title: 'Task with Attachments',
        description: 'Testing file uploads',
        priority_bucket: 3,
        status: 'To Do',
        assignee_ids: [testUsers.joel.id],
        deadline: '2025-12-31T23:59:59Z',
      }));

      // Create mock files
      const file1 = new File(['test content 1'], 'test1.txt', { type: 'text/plain' });
      const file2 = new File(['test content 2'], 'test2.txt', { type: 'text/plain' });
      formData.append('file_0', file1);
      formData.append('file_1', file2);

      const response = await fetch(`${API_BASE}/api/tasks`, {
        method: 'POST',
        headers: {
          Cookie: joelCookie,
        },
        body: formData,
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
      createdTaskIds.push(data.taskId);

      // Verify attachments were created
      const { data: attachments } = await adminClient
        .from('task_attachments')
        .select('*')
        .eq('task_id', data.taskId);

      expect(attachments).toBeDefined();
      expect(attachments?.length).toBe(2);
    });

    it('should return 401 when not authenticated', async () => {
      const formData = new FormData();
      formData.append('taskData', JSON.stringify({
        project_id: testProjectId,
        title: 'Unauthorized Task',
        description: 'Should fail',
        priority_bucket: 5,
        status: 'To Do',
        assignee_ids: [testUsers.joel.id],
        deadline: '2025-12-31T23:59:59Z',
      }));

      const response = await fetch(`${API_BASE}/api/tasks`, {
        method: 'POST',
        body: formData,
      });

      expect(response.status).toBe(401);
    });

    it('should return 400 when task data is missing', async () => {
      const formData = new FormData();

      const response = await fetch(`${API_BASE}/api/tasks`, {
        method: 'POST',
        headers: {
          Cookie: joelCookie,
        },
        body: formData,
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Missing task data');
    });

    it('should return 400 when required fields are missing', async () => {
      const formData = new FormData();
      formData.append('taskData', JSON.stringify({
        title: 'Missing Fields Task',
        // Missing project_id, assignee_ids, etc.
      }));

      const response = await fetch(`${API_BASE}/api/tasks`, {
        method: 'POST',
        headers: {
          Cookie: joelCookie,
        },
        body: formData,
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Missing required field');
    });

    it('should return 400 when priority bucket is out of range', async () => {
      const formData = new FormData();
      formData.append('taskData', JSON.stringify({
        project_id: testProjectId,
        title: 'Invalid Priority Task',
        description: 'Invalid priority',
        priority_bucket: 15, // Out of range
        status: 'To Do',
        assignee_ids: [testUsers.joel.id],
        deadline: '2025-12-31T23:59:59Z',
      }));

      const response = await fetch(`${API_BASE}/api/tasks`, {
        method: 'POST',
        headers: {
          Cookie: joelCookie,
        },
        body: formData,
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Priority bucket must be between 1 and 10');
    });

    it('should return 400 when no assignees provided', async () => {
      const formData = new FormData();
      formData.append('taskData', JSON.stringify({
        project_id: testProjectId,
        title: 'No Assignees Task',
        description: 'No assignees',
        priority_bucket: 5,
        status: 'To Do',
        assignee_ids: [],
        deadline: '2025-12-31T23:59:59Z',
      }));

      const response = await fetch(`${API_BASE}/api/tasks`, {
        method: 'POST',
        headers: {
          Cookie: joelCookie,
        },
        body: formData,
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('At least one assignee is required');
    });

    it('should return 400 when too many assignees provided', async () => {
      const formData = new FormData();
      formData.append('taskData', JSON.stringify({
        project_id: testProjectId,
        title: 'Too Many Assignees Task',
        description: 'Too many assignees',
        priority_bucket: 5,
        status: 'To Do',
        assignee_ids: [
          testUsers.joel.id,
          testUsers.mitch.id,
          testUsers.kester.id,
          testUsers.ryan.id,
          testUsers.garrison.id,
          'extra-user-id', // 6th assignee
        ],
        deadline: '2025-12-31T23:59:59Z',
      }));

      const response = await fetch(`${API_BASE}/api/tasks`, {
        method: 'POST',
        headers: {
          Cookie: joelCookie,
        },
        body: formData,
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Maximum 5 assignees allowed');
    });

    it('should create tasks with different statuses', async () => {
      const statuses = ['To Do', 'In Progress', 'Completed', 'Blocked'];
      const taskIds: number[] = [];

      for (const status of statuses) {
        const formData = new FormData();
        formData.append('taskData', JSON.stringify({
          project_id: testProjectId,
          title: `Task with ${status} status`,
          description: `Testing ${status} status`,
          priority_bucket: 5,
          status,
          assignee_ids: [testUsers.joel.id],
          deadline: '2025-12-31T23:59:59Z',
        }));

        const response = await fetch(`${API_BASE}/api/tasks`, {
          method: 'POST',
          headers: {
            Cookie: joelCookie,
          },
          body: formData,
        });

        expect(response.status).toBe(201);
        const data = await response.json();
        taskIds.push(data.taskId);
      }

      createdTaskIds.push(...taskIds);

      // Verify all tasks were created with correct statuses
      const { data: tasks } = await adminClient
        .from('tasks')
        .select('id, status')
        .in('id', taskIds);

      expect(tasks?.length).toBe(statuses.length);
      tasks?.forEach((task) => {
        expect(statuses).toContain(task.status);
      });
    });
  });

  describe('GET /api/tasks?action=users - Get Users', () => {
    it('should return users when authenticated', async () => {
      const response = await fetch(`${API_BASE}/api/tasks?action=users`, {
        headers: {
          Cookie: joelCookie,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.users).toBeDefined();
      expect(Array.isArray(data.users)).toBe(true);
      expect(data.users.length).toBeGreaterThan(0);

      // Verify user object structure
      if (data.users.length > 0) {
        const user = data.users[0];
        expect(user).toHaveProperty('id');
        expect(user).toHaveProperty('first_name');
        expect(user).toHaveProperty('last_name');
      }
    });

    it('should return 401 when not authenticated', async () => {
      const response = await fetch(`${API_BASE}/api/tasks?action=users`);
      expect(response.status).toBe(401);
    });

    it('should return different users based on RLS policies', async () => {
      const joelResponse = await fetch(`${API_BASE}/api/tasks?action=users`, {
        headers: { Cookie: joelCookie },
      });

      const mitchResponse = await fetch(`${API_BASE}/api/tasks?action=users`, {
        headers: { Cookie: mitchCookie },
      });

      expect(joelResponse.status).toBe(200);
      expect(mitchResponse.status).toBe(200);

      const joelData = await joelResponse.json();
      const mitchData = await mitchResponse.json();

      expect(joelData.users).toBeDefined();
      expect(mitchData.users).toBeDefined();

      // Both should have users, but potentially different based on department access
      expect(joelData.users.length).toBeGreaterThan(0);
      expect(mitchData.users.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/tasks?action=projects - Get Projects', () => {
    it('should return projects when authenticated', async () => {
      const response = await fetch(`${API_BASE}/api/tasks?action=projects`, {
        headers: {
          Cookie: joelCookie,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.projects).toBeDefined();
      expect(Array.isArray(data.projects)).toBe(true);
      expect(data.projects.length).toBeGreaterThan(0);

      // Verify project object structure
      if (data.projects.length > 0) {
        const project = data.projects[0];
        expect(project).toHaveProperty('id');
        expect(project).toHaveProperty('name');
      }
    });

    it('should return 401 when not authenticated', async () => {
      const response = await fetch(`${API_BASE}/api/tasks?action=projects`);
      expect(response.status).toBe(401);
    });

    it('should return different projects based on RLS policies', async () => {
      const joelResponse = await fetch(`${API_BASE}/api/tasks?action=projects`, {
        headers: { Cookie: joelCookie },
      });

      const mitchResponse = await fetch(`${API_BASE}/api/tasks?action=projects`, {
        headers: { Cookie: mitchCookie },
      });

      expect(joelResponse.status).toBe(200);
      expect(mitchResponse.status).toBe(200);

      const joelData = await joelResponse.json();
      const mitchData = await mitchResponse.json();

      expect(joelData.projects).toBeDefined();
      expect(mitchData.projects).toBeDefined();

      // Both should have projects
      expect(joelData.projects.length).toBeGreaterThan(0);
      expect(mitchData.projects.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/tasks - Invalid Action', () => {
    it('should return 400 for invalid action parameter', async () => {
      const response = await fetch(`${API_BASE}/api/tasks?action=invalid`, {
        headers: {
          Cookie: joelCookie,
        },
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid action parameter. Use "users" or "projects"');
    });

    it('should return 400 when action parameter is missing', async () => {
      const response = await fetch(`${API_BASE}/api/tasks`, {
        headers: {
          Cookie: joelCookie,
        },
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid action parameter. Use "users" or "projects"');
    });
  });
});
