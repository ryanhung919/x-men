import { adminClient, authenticateAs, testUsers } from '@/__tests__/setup/integration.setup';
import type { SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

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

  // afterAll(async () => {
  //   // Cleanup created tasks
  //   if (createdTaskIds.length > 0) {
  //     await adminClient
  //       .from('tasks')
  //       .delete()
  //       .in('id', createdTaskIds);
  //   }
  // });
  afterAll(async () => {
    if (createdTaskIds.length === 0) return;
  
    try {
      console.log(`Cleaning up ${createdTaskIds.length} test tasks...`);
  
      // Delete in correct order to handle foreign key constraints
      
      // 1. Delete task comments
      await adminClient
        .from('task_comments')
        .delete()
        .in('task_id', createdTaskIds);
      console.log('✓ Deleted task comments');
  
      // 2. Delete attachments from storage
      for (const taskId of createdTaskIds) {
        const { data: attachments } = await adminClient
          .from('task_attachments')
          .select('storage_path')
          .eq('task_id', taskId);
  
        if (attachments?.length) {
          const paths = attachments.map((a: any) => a.storage_path);
          await adminClient.storage
            .from('task-attachments')
            .remove(paths)
            .catch((err) => console.warn(`Storage cleanup error: ${err.message}`));
        }
      }
      console.log('✓ Deleted attachments from storage');
  
      // 3. Delete attachment records
      await adminClient
        .from('task_attachments')
        .delete()
        .in('task_id', createdTaskIds);
      console.log('✓ Deleted attachment records');
  
      // 4. Delete task assignments
      await adminClient
        .from('task_assignments')
        .delete()
        .in('task_id', createdTaskIds);
      console.log('✓ Deleted task assignments');
  
      // 5. Delete task tags
      await adminClient
        .from('task_tags')
        .delete()
        .in('task_id', createdTaskIds);
      console.log('✓ Deleted task tags');
  
      // 6. Delete subtasks first
      const { data: subtasks } = await adminClient
        .from('tasks')
        .select('id')
        .in('parent_task_id', createdTaskIds);
  
      if (subtasks?.length) {
        const subtaskIds = subtasks.map((s: any) => s.id);
        
        // Delete subtask dependencies
        await adminClient
          .from('task_comments')
          .delete()
          .in('task_id', subtaskIds);
        
        await adminClient
          .from('task_assignments')
          .delete()
          .in('task_id', subtaskIds);
        
        await adminClient
          .from('task_tags')
          .delete()
          .in('task_id', subtaskIds);
  
        // Delete subtasks
        await adminClient
          .from('tasks')
          .delete()
          .in('id', subtaskIds);
        
        console.log(`✓ Deleted ${subtaskIds.length} subtasks`);
      }
  
      // 7. Delete main tasks
      const { error: deleteError } = await adminClient
        .from('tasks')
        .delete()
        .in('id', createdTaskIds);
  
      if (deleteError) {
        console.error('❌ Error deleting tasks:', deleteError);
      } else {
        console.log(`✓ Deleted ${createdTaskIds.length} main tasks`);
        console.log('✅ Cleanup complete!');
      }
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
    }
  }, 60000); // 60 second timeout for cleanup

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

  describe('PATCH /api/tasks/[id] - Update Task', () => {
    let testTaskId: number;

    beforeEach(async () => {
      // Create a fresh test task for each test
      const formData = new FormData();
      formData.append('taskData', JSON.stringify({
        project_id: testProjectId,
        title: 'Test Task for Updates',
        description: 'Original description',
        priority_bucket: 5,
        status: 'To Do',
        assignee_ids: [testUsers.joel.id, testUsers.mitch.id],
        deadline: '2025-12-31T23:59:59Z',
        notes: 'Original notes',
      }));

      const response = await fetch(`${API_BASE}/api/tasks`, {
        method: 'POST',
        headers: { Cookie: joelCookie },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create test task: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      testTaskId = data.taskId;
      createdTaskIds.push(testTaskId);
    }, 180000); // 3 minute timeout for beforeEach

    // ============ UPDATE TITLE ============
    describe('updateTitle', () => {
      it('should update task title successfully', async () => {
        const newTitle = 'Updated Task Title';

        const response = await fetch(`${API_BASE}/api/tasks/${testTaskId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Cookie: joelCookie,
          },
          body: JSON.stringify({
            action: 'updateTitle',
            title: newTitle,
          }),
        });

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.title).toBe(newTitle);

        // Verify in database
        const { data: verified } = await adminClient
          .from('tasks')
          .select('title')
          .eq('id', testTaskId)
          .single();

        expect(verified?.title).toBe(newTitle);
      });

      it('should return 400 when title is missing', async () => {
        const response = await fetch(`${API_BASE}/api/tasks/${testTaskId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Cookie: joelCookie,
          },
          body: JSON.stringify({
            action: 'updateTitle',
          }),
        });

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toBe('Title required');
      });

      it('should return 401 when not authenticated', async () => {
        const response = await fetch(`${API_BASE}/api/tasks/${testTaskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'updateTitle',
            title: 'New Title',
          }),
        });

        expect(response.status).toBe(401);
      });
    });

    // ============ UPDATE DESCRIPTION ============
    describe('updateDescription', () => {
      it('should update task description successfully', async () => {
        const newDescription = 'Updated description with more details';

        const response = await fetch(`${API_BASE}/api/tasks/${testTaskId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Cookie: joelCookie,
          },
          body: JSON.stringify({
            action: 'updateDescription',
            description: newDescription,
          }),
        });

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.description).toBe(newDescription);
      });

      it('should allow empty description', async () => {
        const response = await fetch(`${API_BASE}/api/tasks/${testTaskId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Cookie: joelCookie,
          },
          body: JSON.stringify({
            action: 'updateDescription',
            description: '',
          }),
        });

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.description).toBe('');
      });

      it('should allow null description', async () => {
        const response = await fetch(`${API_BASE}/api/tasks/${testTaskId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Cookie: joelCookie,
          },
          body: JSON.stringify({
            action: 'updateDescription',
            description: null,
          }),
        });

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.description).toBeNull();
      });
    });

    // ============ UPDATE STATUS ============
    describe('updateStatus', () => {
      it('should update task status successfully', async () => {
        const newStatus = 'In Progress';

        const response = await fetch(`${API_BASE}/api/tasks/${testTaskId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Cookie: joelCookie,
          },
          body: JSON.stringify({
            action: 'updateStatus',
            status: newStatus,
          }),
        });

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.status).toBe(newStatus);
      });

      it('should support all valid statuses', async () => {
        const statuses = ['To Do', 'In Progress', 'Completed', 'Blocked'];

        for (const status of statuses) {
          const response = await fetch(`${API_BASE}/api/tasks/${testTaskId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Cookie: joelCookie,
            },
            body: JSON.stringify({
              action: 'updateStatus',
              status,
            }),
          });

          expect(response.status).toBe(200);
          const data = await response.json();
          expect(data.status).toBe(status);
        }
      });

      it('should return 400 when status is missing', async () => {
        const response = await fetch(`${API_BASE}/api/tasks/${testTaskId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Cookie: joelCookie,
          },
          body: JSON.stringify({
            action: 'updateStatus',
          }),
        });

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toBe('Status required');
      });
    });

    // ============ UPDATE PRIORITY ============
    describe('updatePriority', () => {
      it('should update task priority successfully', async () => {
        const newPriority = 9;

        const response = await fetch(`${API_BASE}/api/tasks/${testTaskId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Cookie: joelCookie,
          },
          body: JSON.stringify({
            action: 'updatePriority',
            priority_bucket: newPriority,
          }),
        });

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.priority_bucket).toBe(newPriority);
      });

      it('should support priority range 1-10', async () => {
        for (let priority = 1; priority <= 10; priority++) {
          const response = await fetch(`${API_BASE}/api/tasks/${testTaskId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Cookie: joelCookie,
            },
            body: JSON.stringify({
              action: 'updatePriority',
              priority_bucket: priority,
            }),
          });

          expect(response.status).toBe(200);
          const data = await response.json();
          expect(data.priority_bucket).toBe(priority);
        }
      });

      it('should return 400 when priority is missing', async () => {
        const response = await fetch(`${API_BASE}/api/tasks/${testTaskId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Cookie: joelCookie,
          },
          body: JSON.stringify({
            action: 'updatePriority',
          }),
        });

        expect(response.status).toBe(400);
      });
    });

    // ============ UPDATE DEADLINE ============
    describe('updateDeadline', () => {
      it('should update task deadline successfully', async () => {
        const newDeadline = '2026-06-30T23:59:59Z';

        const response = await fetch(`${API_BASE}/api/tasks/${testTaskId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Cookie: joelCookie,
          },
          body: JSON.stringify({
            action: 'updateDeadline',
            deadline: newDeadline,
          }),
        });

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.deadline).toBeTruthy();
      });

      it('should allow null deadline', async () => {
        const response = await fetch(`${API_BASE}/api/tasks/${testTaskId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Cookie: joelCookie,
          },
          body: JSON.stringify({
            action: 'updateDeadline',
            deadline: null,
          }),
        });

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.deadline).toBeNull();
      });
    });

    // ============ UPDATE NOTES ============
    describe('updateNotes', () => {
      it('should update task notes successfully', async () => {
        const newNotes = 'Updated notes with important information';

        const response = await fetch(`${API_BASE}/api/tasks/${testTaskId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Cookie: joelCookie,
          },
          body: JSON.stringify({
            action: 'updateNotes',
            notes: newNotes,
          }),
        });

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.notes).toBe(newNotes);
      });

      it('should allow empty notes', async () => {
        const response = await fetch(`${API_BASE}/api/tasks/${testTaskId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Cookie: joelCookie,
          },
          body: JSON.stringify({
            action: 'updateNotes',
            notes: '',
          }),
        });

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.notes).toBe('');
      });
    });

    // ============ UPDATE RECURRENCE ============
    describe('updateRecurrence', () => {
      it('should update recurrence interval successfully', async () => {
        const response = await fetch(`${API_BASE}/api/tasks/${testTaskId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Cookie: joelCookie,
          },
          body: JSON.stringify({
            action: 'updateRecurrence',
            recurrenceInterval: 7,
            recurrenceDate: '2026-01-20T00:00:00Z',
          }),
        });

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.recurrence.recurrence_interval).toBe(7);
      });

      it('should support different recurrence intervals', async () => {
        const intervals = [0, 1, 7, 30];

        for (const interval of intervals) {
          const response = await fetch(`${API_BASE}/api/tasks/${testTaskId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Cookie: joelCookie,
            },
            body: JSON.stringify({
              action: 'updateRecurrence',
              recurrenceInterval: interval,
              recurrenceDate: interval > 0 ? '2026-01-20T00:00:00Z' : null,
            }),
          });

          expect(response.status).toBe(200);
          const data = await response.json();
          expect(data.recurrence.recurrence_interval).toBe(interval);
        }
      });

      it('should return 400 when recurrence interval is missing', async () => {
        const response = await fetch(`${API_BASE}/api/tasks/${testTaskId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Cookie: joelCookie,
          },
          body: JSON.stringify({
            action: 'updateRecurrence',
            recurrenceDate: '2025-10-20T00:00:00Z',
          }),
        });

        expect(response.status).toBe(400);
      });
    });

    // ============ ADD ASSIGNEE ============
    describe('addAssignee', () => {
      it('should add assignee to task successfully', async () => {
        const response = await fetch(`${API_BASE}/api/tasks/${testTaskId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Cookie: joelCookie,
          },
          body: JSON.stringify({
            action: 'addAssignee',
            assignee_id: testUsers.kester.id,
          }),
        });

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.assignee_id).toBe(testUsers.kester.id);

        // Verify in database
        const { data: assignment } = await adminClient
          .from('task_assignments')
          .select('*')
          .eq('task_id', testTaskId)
          .eq('assignee_id', testUsers.kester.id)
          .single();

        expect(assignment).toBeDefined();
      });

      it('should return 400 when assignee_id is missing', async () => {
        const response = await fetch(`${API_BASE}/api/tasks/${testTaskId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Cookie: joelCookie,
          },
          body: JSON.stringify({
            action: 'addAssignee',
          }),
        });

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toBe('Assignee ID required');
      });
    });

    // ============ REMOVE ASSIGNEE ============
    describe('removeAssignee', () => {
      it('should remove assignee from task successfully', async () => {
        // First verify the assignee exists
        const { data: assignments } = await adminClient
          .from('task_assignments')
          .select('*')
          .eq('task_id', testTaskId)
          .eq('assignee_id', testUsers.mitch.id);

        expect(assignments?.length).toBeGreaterThan(0);

        // Remove the assignee
        const response = await fetch(`${API_BASE}/api/tasks/${testTaskId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Cookie: joelCookie,
          },
          body: JSON.stringify({
            action: 'removeAssignee',
            assignee_id: testUsers.mitch.id,
          }),
        });

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);

        // Verify removed from database
        const { data: afterRemoval } = await adminClient
          .from('task_assignments')
          .select('*')
          .eq('task_id', testTaskId)
          .eq('assignee_id', testUsers.mitch.id);

        expect(afterRemoval?.length).toBe(0);
      });
    });

    // ============ ADD TAG ============
    describe('addTag', () => {
      it('should add tag to task successfully', async () => {
        const response = await fetch(`${API_BASE}/api/tasks/${testTaskId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Cookie: joelCookie,
          },
          body: JSON.stringify({
            action: 'addTag',
            tag_name: 'urgent',
          }),
        });

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.tag).toBe('urgent');
      });

      it('should return 400 when tag_name is missing', async () => {
        const response = await fetch(`${API_BASE}/api/tasks/${testTaskId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Cookie: joelCookie,
          },
          body: JSON.stringify({
            action: 'addTag',
          }),
        });

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toBe('Tag name required');
      });
    });

    // ============ REMOVE TAG ============
    describe('removeTag', () => {
      it('should remove tag from task successfully', async () => {
        // First add a tag
        await fetch(`${API_BASE}/api/tasks/${testTaskId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Cookie: joelCookie,
          },
          body: JSON.stringify({
            action: 'addTag',
            tag_name: 'test-tag',
          }),
        });

        // Then remove it
        const response = await fetch(`${API_BASE}/api/tasks/${testTaskId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Cookie: joelCookie,
          },
          body: JSON.stringify({
            action: 'removeTag',
            tag_name: 'test-tag',
          }),
        });

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
      });
    });

    // ============ ADD ATTACHMENTS ============
    describe('addAttachments', () => {
      it('should add attachments to task successfully', async () => {
        const formData = new FormData();
        formData.append('action', 'addAttachments');
        formData.append('file_0', new File(['test content'], 'test.txt', { type: 'text/plain' }));

        const response = await fetch(`${API_BASE}/api/tasks/${testTaskId}`, {
          method: 'PATCH',
          headers: {
            Cookie: joelCookie,
          },
          body: formData,
        });

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.attachments).toBeDefined();
        expect(Array.isArray(data.attachments)).toBe(true);
      });

      it('should return 400 when no files provided', async () => {
        const formData = new FormData();
        formData.append('action', 'addAttachments');

        const response = await fetch(`${API_BASE}/api/tasks/${testTaskId}`, {
          method: 'PATCH',
          headers: {
            Cookie: joelCookie,
          },
          body: formData,
        });

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toBe('No files provided');
      });
    });

    // ============ REMOVE ATTACHMENT ============
    describe('removeAttachment', () => {
      it('should remove attachment from task successfully', async () => {
        // First add an attachment
        const formData = new FormData();
        formData.append('action', 'addAttachments');
        formData.append('file_0', new File(['test content'], 'test.txt', { type: 'text/plain' }));

        const addResponse = await fetch(`${API_BASE}/api/tasks/${testTaskId}`, {
          method: 'PATCH',
          headers: {
            Cookie: joelCookie,
          },
          body: formData,
        });

        const addData = await addResponse.json();
        const attachmentId = addData.attachments[0].id;

        // Then remove it
        const removeResponse = await fetch(`${API_BASE}/api/tasks/${testTaskId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Cookie: joelCookie,
          },
          body: JSON.stringify({
            action: 'removeAttachment',
            attachment_id: attachmentId,
          }),
        });

        expect(removeResponse.status).toBe(200);
        const removeData = await removeResponse.json();
        expect(removeData.success).toBe(true);
      });
    });

    // ============ ADD COMMENT ============
    describe('addComment', () => {
      it('should add comment to task successfully', async () => {
        const response = await fetch(`${API_BASE}/api/tasks/${testTaskId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Cookie: joelCookie,
          },
          body: JSON.stringify({
            action: 'addComment',
            content: 'This is a test comment',
          }),
        });

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.comment).toBeDefined();
        expect(data.comment.content).toBe('This is a test comment');
      });

      it('should return 400 when comment content is missing', async () => {
        const response = await fetch(`${API_BASE}/api/tasks/${testTaskId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Cookie: joelCookie,
          },
          body: JSON.stringify({
            action: 'addComment',
          }),
        });

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toBe('Comment content required');
      });

      it('should return 400 when comment content is empty', async () => {
        const response = await fetch(`${API_BASE}/api/tasks/${testTaskId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Cookie: joelCookie,
          },
          body: JSON.stringify({
            action: 'addComment',
            content: '   ',
          }),
        });

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toBe('Comment content required');
      });
    });

    // ============ UPDATE COMMENT ============
    describe('updateComment', () => {
      it('should update comment successfully', async () => {
        // First add a comment
        const addResponse = await fetch(`${API_BASE}/api/tasks/${testTaskId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Cookie: joelCookie,
          },
          body: JSON.stringify({
            action: 'addComment',
            content: 'Original comment',
          }),
        });

        const addData = await addResponse.json();
        const commentId = addData.comment.id;

        // Then update it
        const updateResponse = await fetch(`${API_BASE}/api/tasks/${testTaskId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Cookie: joelCookie,
          },
          body: JSON.stringify({
            action: 'updateComment',
            commentId,
            content: 'Updated comment',
          }),
        });

        expect(updateResponse.status).toBe(200);
        const updateData = await updateResponse.json();
        expect(updateData.success).toBe(true);
        expect(updateData.comment.content).toBe('Updated comment');
      });
    });

    // ============ DELETE COMMENT ============
    describe('deleteComment', () => {
      it('should delete comment successfully', async () => {
        // First add a comment
        const addResponse = await fetch(`${API_BASE}/api/tasks/${testTaskId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Cookie: joelCookie,
          },
          body: JSON.stringify({
            action: 'addComment',
            content: 'Comment to delete',
          }),
        });

        const addData = await addResponse.json();
        const commentId = addData.comment.id;

        // Then delete it
        const deleteResponse = await fetch(`${API_BASE}/api/tasks/${testTaskId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Cookie: joelCookie,
          },
          body: JSON.stringify({
            action: 'deleteComment',
            commentId,
          }),
        });

        expect(deleteResponse.status).toBe(200);
        const deleteData = await deleteResponse.json();
        expect(deleteData.success).toBe(true);
        expect(deleteData.message).toBe('Comment deleted successfully');
      });
    });

    // ============ LINK SUBTASK ============
    describe('linkSubtask', () => {
      it('should link subtask to parent task successfully', async () => {
        // Create a subtask
        const formData = new FormData();
        formData.append('taskData', JSON.stringify({
          project_id: testProjectId,
          title: 'Subtask',
          description: 'A subtask',
          priority_bucket: 5,
          status: 'To Do',
          assignee_ids: [testUsers.joel.id],
          deadline: '2025-12-31T23:59:59Z',
        }));

        const createResponse = await fetch(`${API_BASE}/api/tasks`, {
          method: 'POST',
          headers: { Cookie: joelCookie },
          body: formData,
        });

        const createData = await createResponse.json();
        const subtaskId = createData.taskId;

        // Link it to parent
        const linkResponse = await fetch(`${API_BASE}/api/tasks/${testTaskId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Cookie: joelCookie,
          },
          body: JSON.stringify({
            action: 'linkSubtask',
            subtaskId,
          }),
        });

        expect(linkResponse.status).toBe(200);
        const linkData = await linkResponse.json();
        expect(linkData.success).toBe(true);

        // Verify in database
        const { data: verified } = await adminClient
          .from('tasks')
          .select('parent_task_id')
          .eq('id', subtaskId)
          .single();

        expect(verified?.parent_task_id).toBe(testTaskId);
      });

      it('should return 400 when subtaskId is missing', async () => {
        const response = await fetch(`${API_BASE}/api/tasks/${testTaskId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Cookie: joelCookie,
          },
          body: JSON.stringify({
            action: 'linkSubtask',
          }),
        });

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toBe('Subtask ID required');
      });
    });

    // ============ INVALID TASK ID ============
    describe('Invalid Task ID', () => {
      it('should return 400 for invalid task ID', async () => {
        const response = await fetch(`${API_BASE}/api/tasks/invalid`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Cookie: joelCookie,
          },
          body: JSON.stringify({
            action: 'updateTitle',
            title: 'New Title',
          }),
        });

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toBe('Invalid task ID');
      });

      it('should return 400 for invalid action', async () => {
        const response = await fetch(`${API_BASE}/api/tasks/${testTaskId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Cookie: joelCookie,
          },
          body: JSON.stringify({
            action: 'invalidAction',
          }),
        });

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toBe('Invalid action');
      });
    });
  });
});
