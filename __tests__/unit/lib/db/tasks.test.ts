import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getUserTasks, getTaskById } from '@/lib/db/tasks';
import { createMockSupabaseClient } from '@/__tests__/mocks/supabase.mock';
import { authUsersFixtures } from '@/__tests__/fixtures/database.fixtures';

// Mock the Supabase client module
let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => mockSupabaseClient),
}));

describe('lib/db/tasks', () => {
  beforeEach(() => {
    mockSupabaseClient = createMockSupabaseClient();
    vi.clearAllMocks();
  });

  describe('getUserTasks', () => {
    it('should fetch all tasks with related data for a user', async () => {
      const mockTasks = [
        {
          id: 1,
          title: 'Task 1',
          description: 'Description 1',
          priority_bucket: 1,
          status: 'To Do',
          deadline: '2025-10-20T00:00:00.000Z',
          notes: 'Notes',
          project: { id: 1, name: 'Project A' },
          parent_task_id: null,
          recurrence_interval: 0,
          recurrence_date: null,
          task_assignments: [{ assignee_id: 'user1' }],
          tags: [{ tags: { name: 'urgent' } }],
        },
      ];

      const mockSubtasks = [
        {
          id: 2,
          title: 'Subtask 1',
          status: 'To Do',
          deadline: null,
          parent_task_id: 1,
        },
      ];

      const mockAttachments = [
        {
          id: 1,
          storage_path: 'task-attachments/1/file.pdf',
          task_id: 1,
        },
      ];

      const mockUserInfo = [
        { id: 'user1', first_name: 'Alice', last_name: 'Smith' },
      ];

      // Mock the tasks query chain
      const tasksOrderMock = vi.fn().mockResolvedValue({
        data: mockTasks,
        error: null,
      });

      const tasksNeqMock = vi.fn().mockReturnValue({
        order: tasksOrderMock,
      });

      const tasksSelectMock = vi.fn().mockReturnValue({
        neq: tasksNeqMock,
      });

      // Mock subtasks query
      const subtasksNeqMock = vi.fn().mockResolvedValue({
        data: mockSubtasks,
        error: null,
      });

      const subtasksInMock = vi.fn().mockReturnValue({
        neq: subtasksNeqMock,
      });

      const subtasksSelectMock = vi.fn().mockReturnValue({
        in: subtasksInMock,
      });

      // Mock attachments query
      const attachmentsInMock = vi.fn().mockResolvedValue({
        data: mockAttachments,
        error: null,
      });

      const attachmentsSelectMock = vi.fn().mockReturnValue({
        in: attachmentsInMock,
      });

      // Mock RPC call for user info
      const rpcMock = vi.fn().mockResolvedValue({
        data: mockUserInfo,
        error: null,
      });

      // Setup mockSupabaseClient.from to return different mocks based on table name
      mockSupabaseClient.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'tasks') {
          // First call is for main tasks, subsequent calls are for subtasks
          const callCount = (mockSupabaseClient.from as any).mock.calls.filter(
            (call: any[]) => call[0] === 'tasks'
          ).length;
          if (callCount === 1) {
            return {
              select: tasksSelectMock,
            };
          } else {
            return {
              select: subtasksSelectMock,
            };
          }
        }
        if (table === 'task_attachments') {
          return {
            select: attachmentsSelectMock,
          };
        }
        return {};
      });

      mockSupabaseClient.rpc = rpcMock;

      const result = await getUserTasks(authUsersFixtures.alice.id);

      expect(result).toEqual({
        tasks: mockTasks,
        subtasks: mockSubtasks,
        attachments: mockAttachments,
        assignees: mockUserInfo,
      });

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('tasks');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('task_attachments');
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_task_assignees_info', {
        task_ids: [1],
      });
    });

    it('should order tasks by deadline ascending', async () => {
      const mockTasks = [
        {
          id: 1,
          title: 'Task 1',
          description: null,
          priority_bucket: 1,
          status: 'To Do',
          deadline: '2025-10-20T00:00:00.000Z',
          notes: null,
          project: { id: 1, name: 'Project' },
          parent_task_id: null,
          recurrence_interval: 0,
          recurrence_date: null,
          task_assignments: [],
          tags: [],
        },
      ];

      const tasksOrderMock = vi.fn().mockResolvedValue({
        data: mockTasks,
        error: null,
      });

      const tasksNeqMock = vi.fn().mockReturnValue({
        order: tasksOrderMock,
      });

      const tasksSelectMock = vi.fn().mockReturnValue({
        neq: tasksNeqMock,
      });

      mockSupabaseClient.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'tasks') {
          const callCount = (mockSupabaseClient.from as any).mock.calls.filter(
            (call: any[]) => call[0] === 'tasks'
          ).length;
          if (callCount === 1) {
            return {
              select: tasksSelectMock,
            };
          } else {
            return {
              select: vi.fn().mockReturnValue({
                in: vi.fn().mockReturnValue({
                  neq: vi.fn().mockResolvedValue({
                    data: [],
                    error: null,
                  }),
                }),
              }),
            };
          }
        }
        if (table === 'task_attachments') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          };
        }
        return {};
      });

      mockSupabaseClient.rpc = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      await getUserTasks(authUsersFixtures.alice.id);

      expect(tasksOrderMock).toHaveBeenCalledWith('deadline', { ascending: true });
    });

    it('should exclude archived tasks', async () => {
      const mockTasks = [
        {
          id: 1,
          title: 'Active Task',
          description: null,
          priority_bucket: 1,
          status: 'To Do',
          deadline: null,
          notes: null,
          project: { id: 1, name: 'Project' },
          parent_task_id: null,
          recurrence_interval: 0,
          recurrence_date: null,
          task_assignments: [],
          tags: [],
        },
      ];

      const tasksOrderMock = vi.fn().mockResolvedValue({
        data: mockTasks,
        error: null,
      });

      const tasksNeqMock = vi.fn().mockReturnValue({
        order: tasksOrderMock,
      });

      const tasksSelectMock = vi.fn().mockReturnValue({
        neq: tasksNeqMock,
      });

      mockSupabaseClient.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'tasks') {
          const callCount = (mockSupabaseClient.from as any).mock.calls.filter(
            (call: any[]) => call[0] === 'tasks'
          ).length;
          if (callCount === 1) {
            return {
              select: tasksSelectMock,
            };
          } else {
            return {
              select: vi.fn().mockReturnValue({
                in: vi.fn().mockReturnValue({
                  neq: vi.fn().mockResolvedValue({
                    data: [],
                    error: null,
                  }),
                }),
              }),
            };
          }
        }
        if (table === 'task_attachments') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          };
        }
        return {};
      });

      mockSupabaseClient.rpc = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      await getUserTasks(authUsersFixtures.alice.id);

      expect(tasksNeqMock).toHaveBeenCalledWith('is_archived', true);
    });

    it('should handle empty task list', async () => {
      const tasksOrderMock = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const tasksNeqMock = vi.fn().mockReturnValue({
        order: tasksOrderMock,
      });

      const tasksSelectMock = vi.fn().mockReturnValue({
        neq: tasksNeqMock,
      });

      mockSupabaseClient.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'tasks') {
          const callCount = (mockSupabaseClient.from as any).mock.calls.filter(
            (call: any[]) => call[0] === 'tasks'
          ).length;
          if (callCount === 1) {
            return {
              select: tasksSelectMock,
            };
          } else {
            return {
              select: vi.fn().mockReturnValue({
                in: vi.fn().mockReturnValue({
                  neq: vi.fn().mockResolvedValue({
                    data: [],
                    error: null,
                  }),
                }),
              }),
            };
          }
        }
        if (table === 'task_attachments') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          };
        }
        return {};
      });

      const result = await getUserTasks(authUsersFixtures.alice.id);

      expect(result.tasks).toEqual([]);
    });

    it('should throw error when tasks query fails', async () => {
      const mockError = { message: 'Database connection failed' };

      const tasksOrderMock = vi.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      const tasksNeqMock = vi.fn().mockReturnValue({
        order: tasksOrderMock,
      });

      const tasksSelectMock = vi.fn().mockReturnValue({
        neq: tasksNeqMock,
      });

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: tasksSelectMock,
      });

      await expect(getUserTasks(authUsersFixtures.alice.id)).rejects.toThrow(
        'Database connection failed'
      );
    });

    it('should throw error when subtasks query fails', async () => {
      const mockTasks = [
        {
          id: 1,
          title: 'Task 1',
          description: null,
          priority_bucket: 1,
          status: 'To Do',
          deadline: null,
          notes: null,
          project: { id: 1, name: 'Project' },
          parent_task_id: null,
          recurrence_interval: 0,
          recurrence_date: null,
          task_assignments: [],
          tags: [],
        },
      ];

      const mockError = { message: 'Subtasks fetch failed' };

      const tasksOrderMock = vi.fn().mockResolvedValue({
        data: mockTasks,
        error: null,
      });

      const tasksNeqMock = vi.fn().mockReturnValue({
        order: tasksOrderMock,
      });

      const tasksSelectMock = vi.fn().mockReturnValue({
        neq: tasksNeqMock,
      });

      const subtasksNeqMock = vi.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      const subtasksInMock = vi.fn().mockReturnValue({
        neq: subtasksNeqMock,
      });

      const subtasksSelectMock = vi.fn().mockReturnValue({
        in: subtasksInMock,
      });

      mockSupabaseClient.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'tasks') {
          const callCount = (mockSupabaseClient.from as any).mock.calls.filter(
            (call: any[]) => call[0] === 'tasks'
          ).length;
          if (callCount === 1) {
            return {
              select: tasksSelectMock,
            };
          } else {
            return {
              select: subtasksSelectMock,
            };
          }
        }
        return {};
      });

      await expect(getUserTasks(authUsersFixtures.alice.id)).rejects.toThrow(
        'Subtasks fetch failed'
      );
    });

    it('should throw error when attachments query fails', async () => {
      const mockTasks = [
        {
          id: 1,
          title: 'Task 1',
          description: null,
          priority_bucket: 1,
          status: 'To Do',
          deadline: null,
          notes: null,
          project: { id: 1, name: 'Project' },
          parent_task_id: null,
          recurrence_interval: 0,
          recurrence_date: null,
          task_assignments: [],
          tags: [],
        },
      ];

      const mockError = { message: 'Attachments fetch failed' };

      const tasksOrderMock = vi.fn().mockResolvedValue({
        data: mockTasks,
        error: null,
      });

      const tasksNeqMock = vi.fn().mockReturnValue({
        order: tasksOrderMock,
      });

      const tasksSelectMock = vi.fn().mockReturnValue({
        neq: tasksNeqMock,
      });

      const subtasksNeqMock = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const subtasksInMock = vi.fn().mockReturnValue({
        neq: subtasksNeqMock,
      });

      const subtasksSelectMock = vi.fn().mockReturnValue({
        in: subtasksInMock,
      });

      const attachmentsInMock = vi.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      const attachmentsSelectMock = vi.fn().mockReturnValue({
        in: attachmentsInMock,
      });

      mockSupabaseClient.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'tasks') {
          const callCount = (mockSupabaseClient.from as any).mock.calls.filter(
            (call: any[]) => call[0] === 'tasks'
          ).length;
          if (callCount === 1) {
            return {
              select: tasksSelectMock,
            };
          } else {
            return {
              select: subtasksSelectMock,
            };
          }
        }
        if (table === 'task_attachments') {
          return {
            select: attachmentsSelectMock,
          };
        }
        return {};
      });

      await expect(getUserTasks(authUsersFixtures.alice.id)).rejects.toThrow(
        'Attachments fetch failed'
      );
    });

    it('should not call RPC when no tasks exist', async () => {
      const tasksOrderMock = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const tasksNeqMock = vi.fn().mockReturnValue({
        order: tasksOrderMock,
      });

      const tasksSelectMock = vi.fn().mockReturnValue({
        neq: tasksNeqMock,
      });

      mockSupabaseClient.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'tasks') {
          // Need to handle both first call (main tasks) and second call (subtasks)
          const callCount = (mockSupabaseClient.from as any).mock.calls.filter(
            (call: any[]) => call[0] === 'tasks'
          ).length;
          if (callCount === 1) {
            return {
              select: tasksSelectMock,
            };
          } else {
            // Second call for subtasks when taskIds is empty
            return {
              select: vi.fn().mockReturnValue({
                in: vi.fn().mockReturnValue({
                  neq: vi.fn().mockResolvedValue({
                    data: [],
                    error: null,
                  }),
                }),
              }),
            };
          }
        }
        // Mock empty responses for attachments
        if (table === 'task_attachments') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          };
        }
        return {};
      });

      mockSupabaseClient.rpc = vi.fn();

      await getUserTasks(authUsersFixtures.alice.id);

      expect(mockSupabaseClient.rpc).not.toHaveBeenCalled();
    });

    it('should handle recurring tasks', async () => {
      const mockTasks = [
        {
          id: 1,
          title: 'Recurring Task',
          description: null,
          priority_bucket: 1,
          status: 'To Do',
          deadline: '2025-10-20T00:00:00.000Z',
          notes: null,
          project: { id: 1, name: 'Project' },
          parent_task_id: null,
          recurrence_interval: 7,
          recurrence_date: '2025-10-16T00:00:00.000Z',
          task_assignments: [],
          tags: [],
        },
      ];

      const tasksOrderMock = vi.fn().mockResolvedValue({
        data: mockTasks,
        error: null,
      });

      const tasksNeqMock = vi.fn().mockReturnValue({
        order: tasksOrderMock,
      });

      const tasksSelectMock = vi.fn().mockReturnValue({
        neq: tasksNeqMock,
      });

      mockSupabaseClient.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'tasks') {
          // First call for main tasks
          const callCount = (mockSupabaseClient.from as any).mock.calls.filter(
            (call: any[]) => call[0] === 'tasks'
          ).length;
          if (callCount === 1) {
            return {
              select: tasksSelectMock,
            };
          } else {
            // Second call for subtasks
            return {
              select: vi.fn().mockReturnValue({
                in: vi.fn().mockReturnValue({
                  neq: vi.fn().mockResolvedValue({
                    data: [],
                    error: null,
                  }),
                }),
              }),
            };
          }
        }
        if (table === 'task_attachments') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          };
        }
        return {};
      });

      mockSupabaseClient.rpc = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await getUserTasks(authUsersFixtures.alice.id);

      expect(result.tasks[0].recurrence_interval).toBe(7);
      expect(result.tasks[0].recurrence_date).toBe('2025-10-16T00:00:00.000Z');
    });
  });

  describe('getTaskById', () => {
    it('should fetch task details with all related data', async () => {
      const mockTask = {
        id: 1,
        title: 'Detailed Task',
        description: 'Description',
        priority_bucket: 1,
        status: 'To Do',
        deadline: '2025-10-20T00:00:00.000Z',
        notes: 'Notes',
        project: { id: 1, name: 'Project A' },
        parent_task_id: null,
        recurrence_interval: 7,
        recurrence_date: '2025-10-16T00:00:00.000Z',
        task_assignments: [{ assignee_id: 'user1' }],
        tags: [{ tags: { name: 'urgent' } }],
      };

      const mockSubtasks = [
        {
          id: 2,
          title: 'Subtask 1',
          status: 'To Do',
          deadline: null,
          parent_task_id: 1,
        },
      ];

      const mockAttachments = [
        {
          id: 1,
          storage_path: 'task-attachments/1/file.pdf',
        },
      ];

      const mockComments = [
        {
          id: 1,
          content: 'Great work!',
          created_at: '2025-10-15T10:00:00.000Z',
          user_id: 'user2',
        },
      ];

      const mockAssignees = [
        { id: 'user1', first_name: 'Alice', last_name: 'Smith' },
        { id: 'user2', first_name: 'Bob', last_name: 'Jones' },
      ];

      // Mock task query
      const taskSingleMock = vi.fn().mockResolvedValue({
        data: mockTask,
        error: null,
      });

      const taskNeqMock = vi.fn().mockReturnValue({
        single: taskSingleMock,
      });

      const taskEqMock = vi.fn().mockReturnValue({
        neq: taskNeqMock,
      });

      const taskSelectMock = vi.fn().mockReturnValue({
        eq: taskEqMock,
      });

      const taskFromMock = vi.fn().mockReturnValue({
        select: taskSelectMock,
      });

      // Mock subtasks query
      const subtasksNeqMock = vi.fn().mockResolvedValue({
        data: mockSubtasks,
        error: null,
      });

      const subtasksEqMock = vi.fn().mockReturnValue({
        neq: subtasksNeqMock,
      });

      const subtasksSelectMock = vi.fn().mockReturnValue({
        eq: subtasksEqMock,
      });

      const subtasksFromMock = vi.fn().mockReturnValue({
        select: subtasksSelectMock,
      });

      // Mock attachments query
      const attachmentsEqMock = vi.fn().mockResolvedValue({
        data: mockAttachments,
        error: null,
      });

      const attachmentsSelectMock = vi.fn().mockReturnValue({
        eq: attachmentsEqMock,
      });

      const attachmentsFromMock = vi.fn().mockReturnValue({
        select: attachmentsSelectMock,
      });

      // Mock comments query
      const commentsNeqMock = vi.fn().mockResolvedValue({
        data: mockComments,
        error: null,
      });

      const commentsEqMock = vi.fn().mockReturnValue({
        neq: commentsNeqMock,
      });

      const commentsSelectMock = vi.fn().mockReturnValue({
        eq: commentsEqMock,
      });

      const commentsFromMock = vi.fn().mockReturnValue({
        select: commentsSelectMock,
      });

      // Mock storage getPublicUrl
      const mockStorage = {
        from: vi.fn().mockReturnValue({
          getPublicUrl: vi.fn().mockReturnValue({
            data: { publicUrl: 'https://example.com/file.pdf' },
          }),
        }),
      };

      (mockSupabaseClient as any).storage = mockStorage;

      // Mock RPC calls
      const rpcMock = vi.fn()
        .mockResolvedValueOnce({
          data: [mockAssignees[0]],
          error: null,
        })
        .mockResolvedValueOnce({
          data: [mockAssignees[1]],
          error: null,
        });

      mockSupabaseClient.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'tasks') {
          const callCount = (mockSupabaseClient.from as any).mock.calls.filter(
            (call: any[]) => call[0] === 'tasks'
          ).length;
          if (callCount === 1) {
            return taskFromMock();
          } else {
            return subtasksFromMock();
          }
        }
        if (table === 'task_attachments') {
          return attachmentsFromMock();
        }
        if (table === 'task_comments') {
          return commentsFromMock();
        }
        if (table === 'user_info') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [mockAssignees[1]],
                error: null,
              }),
            }),
          };
        }
        return {};
      });

      mockSupabaseClient.rpc = rpcMock;

      const result = await getTaskById(1);

      expect(result).not.toBeNull();
      if (result) {
        expect(result.task).toEqual(mockTask);
        expect(result.subtasks).toEqual(mockSubtasks);
        expect(result.attachments).toHaveLength(1);
        expect(result.attachments[0].public_url).toBe('https://example.com/file.pdf');
        expect(result.comments).toEqual(mockComments);
        expect(result.assignees).toBeDefined();
      }
    });

    it('should return null when task is not found', async () => {
      const taskSingleMock = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      const taskNeqMock = vi.fn().mockReturnValue({
        single: taskSingleMock,
      });

      const taskEqMock = vi.fn().mockReturnValue({
        neq: taskNeqMock,
      });

      const taskSelectMock = vi.fn().mockReturnValue({
        eq: taskEqMock,
      });

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: taskSelectMock,
      });

      const result = await getTaskById(999);

      expect(result).toBeNull();
    });

    it('should exclude archived tasks', async () => {
      const taskSingleMock = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      const taskNeqMock = vi.fn().mockReturnValue({
        single: taskSingleMock,
      });

      const taskEqMock = vi.fn().mockReturnValue({
        neq: taskNeqMock,
      });

      const taskSelectMock = vi.fn().mockReturnValue({
        eq: taskEqMock,
      });

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: taskSelectMock,
      });

      await getTaskById(1);

      expect(taskNeqMock).toHaveBeenCalledWith('is_archived', true);
    });

    it('should handle task with no attachments', async () => {
      const mockTask = {
        id: 1,
        title: 'Task',
        description: null,
        priority_bucket: 1,
        status: 'To Do',
        deadline: null,
        notes: null,
        project: { id: 1, name: 'Project' },
        parent_task_id: null,
        recurrence_interval: 0,
        recurrence_date: null,
        task_assignments: [],
        tags: [],
      };

      const taskSingleMock = vi.fn().mockResolvedValue({
        data: mockTask,
        error: null,
      });

      const taskNeqMock = vi.fn().mockReturnValue({
        single: taskSingleMock,
      });

      const taskEqMock = vi.fn().mockReturnValue({
        neq: taskNeqMock,
      });

      const taskSelectMock = vi.fn().mockReturnValue({
        eq: taskEqMock,
      });

      const taskFromMock = vi.fn().mockReturnValue({
        select: taskSelectMock,
      });

      const subtasksNeqMock = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const subtasksEqMock = vi.fn().mockReturnValue({
        neq: subtasksNeqMock,
      });

      const subtasksSelectMock = vi.fn().mockReturnValue({
        eq: subtasksEqMock,
      });

      const subtasksFromMock = vi.fn().mockReturnValue({
        select: subtasksSelectMock,
      });

      const attachmentsEqMock = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const attachmentsSelectMock = vi.fn().mockReturnValue({
        eq: attachmentsEqMock,
      });

      const attachmentsFromMock = vi.fn().mockReturnValue({
        select: attachmentsSelectMock,
      });

      const commentsNeqMock = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const commentsEqMock = vi.fn().mockReturnValue({
        neq: commentsNeqMock,
      });

      const commentsSelectMock = vi.fn().mockReturnValue({
        eq: commentsEqMock,
      });

      const commentsFromMock = vi.fn().mockReturnValue({
        select: commentsSelectMock,
      });

      mockSupabaseClient.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'tasks') {
          const callCount = (mockSupabaseClient.from as any).mock.calls.filter(
            (call: any[]) => call[0] === 'tasks'
          ).length;
          if (callCount === 1) {
            return taskFromMock();
          } else {
            return subtasksFromMock();
          }
        }
        if (table === 'task_attachments') {
          return attachmentsFromMock();
        }
        if (table === 'task_comments') {
          return commentsFromMock();
        }
        return {};
      });

      const result = await getTaskById(1);

      expect(result).not.toBeNull();
      if (result) {
        expect(result.attachments).toEqual([]);
      }
    });

    it('should generate public URLs for attachments', async () => {
      const mockTask = {
        id: 1,
        title: 'Task',
        description: null,
        priority_bucket: 1,
        status: 'To Do',
        deadline: null,
        notes: null,
        project: { id: 1, name: 'Project' },
        parent_task_id: null,
        recurrence_interval: 0,
        recurrence_date: null,
        task_assignments: [],
        tags: [],
      };

      const mockAttachments = [
        { id: 1, storage_path: 'task-attachments/1/file1.pdf' },
        { id: 2, storage_path: 'task-attachments/1/file2.pdf' },
      ];

      const taskSingleMock = vi.fn().mockResolvedValue({
        data: mockTask,
        error: null,
      });

      const taskNeqMock = vi.fn().mockReturnValue({
        single: taskSingleMock,
      });

      const taskEqMock = vi.fn().mockReturnValue({
        neq: taskNeqMock,
      });

      const taskSelectMock = vi.fn().mockReturnValue({
        eq: taskEqMock,
      });

      const taskFromMock = vi.fn().mockReturnValue({
        select: taskSelectMock,
      });

      const subtasksNeqMock = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const subtasksEqMock = vi.fn().mockReturnValue({
        neq: subtasksNeqMock,
      });

      const subtasksSelectMock = vi.fn().mockReturnValue({
        eq: subtasksEqMock,
      });

      const subtasksFromMock = vi.fn().mockReturnValue({
        select: subtasksSelectMock,
      });

      const attachmentsEqMock = vi.fn().mockResolvedValue({
        data: mockAttachments,
        error: null,
      });

      const attachmentsSelectMock = vi.fn().mockReturnValue({
        eq: attachmentsEqMock,
      });

      const attachmentsFromMock = vi.fn().mockReturnValue({
        select: attachmentsSelectMock,
      });

      const commentsNeqMock = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const commentsEqMock = vi.fn().mockReturnValue({
        neq: commentsNeqMock,
      });

      const commentsSelectMock = vi.fn().mockReturnValue({
        eq: commentsEqMock,
      });

      const commentsFromMock = vi.fn().mockReturnValue({
        select: commentsSelectMock,
      });

      const mockStorage = {
        from: vi.fn().mockReturnValue({
          getPublicUrl: vi
            .fn()
            .mockReturnValueOnce({
              data: { publicUrl: 'https://example.com/file1.pdf' },
            })
            .mockReturnValueOnce({
              data: { publicUrl: 'https://example.com/file2.pdf' },
            }),
        }),
      };

      (mockSupabaseClient as any).storage = mockStorage;

      mockSupabaseClient.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'tasks') {
          const callCount = (mockSupabaseClient.from as any).mock.calls.filter(
            (call: any[]) => call[0] === 'tasks'
          ).length;
          if (callCount === 1) {
            return taskFromMock();
          } else {
            return subtasksFromMock();
          }
        }
        if (table === 'task_attachments') {
          return attachmentsFromMock();
        }
        if (table === 'task_comments') {
          return commentsFromMock();
        }
        return {};
      });

      const result = await getTaskById(1);

      expect(result).not.toBeNull();
      if (result) {
        expect(result.attachments).toHaveLength(2);
        expect(result.attachments[0].public_url).toBe('https://example.com/file1.pdf');
        expect(result.attachments[1].public_url).toBe('https://example.com/file2.pdf');
        expect(mockStorage.from).toHaveBeenCalledWith('task-attachments');
      }
    });

    it('should handle recurring task properties', async () => {
      const mockTask = {
        id: 1,
        title: 'Recurring Task',
        description: null,
        priority_bucket: 1,
        status: 'To Do',
        deadline: '2025-10-20T00:00:00.000Z',
        notes: null,
        project: { id: 1, name: 'Project' },
        parent_task_id: null,
        recurrence_interval: 14,
        recurrence_date: '2025-10-16T00:00:00.000Z',
        task_assignments: [],
        tags: [],
      };

      const taskSingleMock = vi.fn().mockResolvedValue({
        data: mockTask,
        error: null,
      });

      const taskNeqMock = vi.fn().mockReturnValue({
        single: taskSingleMock,
      });

      const taskEqMock = vi.fn().mockReturnValue({
        neq: taskNeqMock,
      });

      const taskSelectMock = vi.fn().mockReturnValue({
        eq: taskEqMock,
      });

      const taskFromMock = vi.fn().mockReturnValue({
        select: taskSelectMock,
      });

      const subtasksNeqMock = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const subtasksEqMock = vi.fn().mockReturnValue({
        neq: subtasksNeqMock,
      });

      const subtasksSelectMock = vi.fn().mockReturnValue({
        eq: subtasksEqMock,
      });

      const subtasksFromMock = vi.fn().mockReturnValue({
        select: subtasksSelectMock,
      });

      const attachmentsEqMock = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const attachmentsSelectMock = vi.fn().mockReturnValue({
        eq: attachmentsEqMock,
      });

      const attachmentsFromMock = vi.fn().mockReturnValue({
        select: attachmentsSelectMock,
      });

      const commentsNeqMock = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const commentsEqMock = vi.fn().mockReturnValue({
        neq: commentsNeqMock,
      });

      const commentsSelectMock = vi.fn().mockReturnValue({
        eq: commentsEqMock,
      });

      const commentsFromMock = vi.fn().mockReturnValue({
        select: commentsSelectMock,
      });

      mockSupabaseClient.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'tasks') {
          const callCount = (mockSupabaseClient.from as any).mock.calls.filter(
            (call: any[]) => call[0] === 'tasks'
          ).length;
          if (callCount === 1) {
            return taskFromMock();
          } else {
            return subtasksFromMock();
          }
        }
        if (table === 'task_attachments') {
          return attachmentsFromMock();
        }
        if (table === 'task_comments') {
          return commentsFromMock();
        }
        return {};
      });

      const result = await getTaskById(1);

      expect(result).not.toBeNull();
      if (result && result.task) {
        expect(result.task.recurrence_interval).toBe(14);
        expect(result.task.recurrence_date).toBe('2025-10-16T00:00:00.000Z');
      }
    });
  });
});
