import { authUsersFixtures } from '@/__tests__/fixtures/database.fixtures';
import { createMockSupabaseClient } from '@/__tests__/mocks/supabase.mock';
import { addTaskAssigneeDB, addTaskAttachmentsDB, addTaskCommentDB, addTaskTagDB, createTask, deleteTaskCommentDB, getAllProjects, getAllUsers, getCommentAuthorDB, getTaskById, getUserTasks, linkSubtaskToParentDB, removeTaskAssigneeDB, removeTaskAttachmentDB, removeTaskTagDB, updateTaskCommentDB, updateTaskDeadlineDB, updateTaskDescriptionDB, updateTaskNotesDB, updateTaskPriorityDB, updateTaskRecurrenceDB, updateTaskStatusDB, updateTaskTitleDB } from '@/lib/db/tasks';
import { CreateTaskPayload } from '@/lib/types/task-creation';
import { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Polyfill File API for Node.js environment
if (typeof File === 'undefined') {
  global.File = class File extends Blob {
    name: string;
    lastModified: number;
    type: string;

    constructor(bits: BlobPart[], name: string, options?: FilePropertyBag) {
      super(bits, options);
      this.name = name;
      this.type = options?.type || '';
      this.lastModified = options?.lastModified ?? Date.now();
    }

    get [Symbol.toStringTag]() {
      return 'File';
    }
  } as any;
}

// Mock the Supabase client module
let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => mockSupabaseClient),
}));

// Mock the service role client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
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
          creator_id: 'creator-1',
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
          creator_id: 'creator-1',
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
          creator_id: 'creator-1',
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
          creator_id: 'creator-1',
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
          creator_id: 'creator-1',
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
          creator_id: 'creator-1',
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
        creator_id: 'creator-1',
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
        return {};
      });

      const result = await getTaskById(1);

      expect(result).not.toBeNull();
      if (result && result.task) {
        expect(result.task.recurrence_interval).toBe(14);
        expect(result.task.recurrence_date).toBe('2025-10-16T00:00:00.000Z');
      }
    });

    it('should log error and continue when subtasks query fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

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
        creator_id: 'creator-1',
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

      const subtasksError = { message: 'Subtasks fetch failed' };
      const subtasksNeqMock = vi.fn().mockResolvedValue({
        data: null,
        error: subtasksError,
      });

      const subtasksEqMock = vi.fn().mockReturnValue({
        neq: subtasksNeqMock,
      });

      const subtasksSelectMock = vi.fn().mockReturnValue({
        eq: subtasksEqMock,
      });

      mockSupabaseClient.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'tasks') {
          const callCount = (mockSupabaseClient.from as any).mock.calls.filter(
            (call: any[]) => call[0] === 'tasks'
          ).length;
          if (callCount === 1) {
            return { select: taskSelectMock };
          } else {
            return { select: subtasksSelectMock };
          }
        }
        if (table === 'task_attachments') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        if (table === 'task_comments') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                neq: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          };
        }
        if (table === 'user_info') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        return {};
      });

      mockSupabaseClient.rpc = vi.fn().mockResolvedValue({ data: [], error: null });

      const result = await getTaskById(1);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching subtasks:', subtasksError);
      expect(result).not.toBeNull();
      expect(result?.subtasks).toEqual([]);

      consoleErrorSpy.mockRestore();
    });

    it('should log error and continue when attachments query fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

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
        creator_id: 'creator-1',
        task_assignments: [],
        tags: [],
      };

      const taskSingleMock = vi.fn().mockResolvedValue({
        data: mockTask,
        error: null,
      });

      const attachmentsError = { message: 'Attachments fetch failed' };

      mockSupabaseClient.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'tasks') {
          const callCount = (mockSupabaseClient.from as any).mock.calls.filter(
            (call: any[]) => call[0] === 'tasks'
          ).length;
          if (callCount === 1) {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  neq: vi.fn().mockReturnValue({ single: taskSingleMock }),
                }),
              }),
            };
          } else {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  neq: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            };
          }
        }
        if (table === 'task_attachments') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: attachmentsError }),
            }),
          };
        }
        if (table === 'task_comments') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                neq: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          };
        }
        if (table === 'user_info') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        return {};
      });

      mockSupabaseClient.rpc = vi.fn().mockResolvedValue({ data: [], error: null });

      const result = await getTaskById(1);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching attachments:', attachmentsError);
      expect(result).not.toBeNull();
      expect(result?.attachments).toEqual([]);

      consoleErrorSpy.mockRestore();
    });

    it('should log error and continue when comments query fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

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
        creator_id: 'creator-1',
        task_assignments: [],
        tags: [],
      };

      const commentsError = { message: 'Comments fetch failed' };

      mockSupabaseClient.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'tasks') {
          const callCount = (mockSupabaseClient.from as any).mock.calls.filter(
            (call: any[]) => call[0] === 'tasks'
          ).length;
          if (callCount === 1) {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  neq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: mockTask, error: null }),
                  }),
                }),
              }),
            };
          } else {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  neq: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            };
          }
        }
        if (table === 'task_attachments') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        if (table === 'task_comments') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                neq: vi.fn().mockResolvedValue({ data: null, error: commentsError }),
              }),
            }),
          };
        }
        if (table === 'user_info') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        return {};
      });

      mockSupabaseClient.rpc = vi.fn().mockResolvedValue({ data: [], error: null });

      const result = await getTaskById(1);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching comments:', commentsError);
      expect(result).not.toBeNull();
      expect(result?.comments).toEqual([]);

      consoleErrorSpy.mockRestore();
    });

    it('should log error and continue when assignee info RPC fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

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
        creator_id: 'creator-1',
        task_assignments: [{ assignee_id: 'user-1' }],
        tags: [],
      };

      const assigneeError = { message: 'RPC failed' };

      mockSupabaseClient.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'tasks') {
          const callCount = (mockSupabaseClient.from as any).mock.calls.filter(
            (call: any[]) => call[0] === 'tasks'
          ).length;
          if (callCount === 1) {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  neq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: mockTask, error: null }),
                  }),
                }),
              }),
            };
          } else {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  neq: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            };
          }
        }
        if (table === 'task_attachments') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        if (table === 'task_comments') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                neq: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          };
        }
        if (table === 'user_info') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        return {};
      });

      mockSupabaseClient.rpc = vi.fn().mockResolvedValue({ data: null, error: assigneeError });

      const result = await getTaskById(1);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching assignee user info:', assigneeError);
      expect(result).not.toBeNull();

      consoleErrorSpy.mockRestore();
    });

    it('should log error and continue when additional user info query fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

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
        creator_id: 'creator-1',
        task_assignments: [{ assignee_id: 'user-1' }],
        tags: [],
      };

      const userInfoError = { message: 'User info fetch failed' };

      mockSupabaseClient.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'tasks') {
          const callCount = (mockSupabaseClient.from as any).mock.calls.filter(
            (call: any[]) => call[0] === 'tasks'
          ).length;
          if (callCount === 1) {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  neq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: mockTask, error: null }),
                  }),
                }),
              }),
            };
          } else {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  neq: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            };
          }
        }
        if (table === 'task_attachments') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        if (table === 'task_comments') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                neq: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          };
        }
        if (table === 'user_info') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ data: null, error: userInfoError }),
            }),
          };
        }
        return {};
      });

      // RPC returns empty to trigger the user_info query path
      mockSupabaseClient.rpc = vi.fn().mockResolvedValue({ data: [], error: null });

      const result = await getTaskById(1);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching additional user info:', userInfoError);
      expect(result).not.toBeNull();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('createTask', () => {
    it('should create a task with assignments using stored procedure', async () => {
      const taskId = 123;
      const creatorId = 'user-123';
      const payload: CreateTaskPayload = {
        project_id: 1,
        title: 'New Task',
        description: 'Task description',
        priority_bucket: 5,
        status: 'To Do',
        assignee_ids: ['user-456'],
        deadline: '2025-12-31T23:59:59Z',
        notes: 'Some notes',
        tags: ['tag1', 'tag2'],
        recurrence_interval: 7,
        recurrence_date: '2025-10-20T00:00:00Z',
      };

      // Mock RPC call for create_task_with_assignments
      mockSupabaseClient.rpc = vi.fn().mockResolvedValue({
        data: taskId,
        error: null,
      });

      // Mock tags insert and select
      const tagsInsertSelectMock = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      const tagsInsertMock = vi.fn().mockReturnValue({
        select: tagsInsertSelectMock,
      });

      const tagsInMock = vi.fn().mockResolvedValue({
        data: [
          { id: 1, name: 'tag1' },
          { id: 2, name: 'tag2' },
        ],
        error: null,
      });

      const tagsSelectMock = vi.fn().mockReturnValue({
        in: tagsInMock,
      });

      const taskTagsInsertMock = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      mockSupabaseClient.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'tags') {
          const callCount = (mockSupabaseClient.from as any).mock.calls.filter(
            (call: any[]) => call[0] === 'tags'
          ).length;
          if (callCount === 1 || callCount === 2) {
            return {
              insert: tagsInsertMock,
            };
          } else {
            return {
              select: tagsSelectMock,
            };
          }
        }
        if (table === 'task_tags') {
          return {
            insert: taskTagsInsertMock,
          };
        }
        return {};
      });

      const result = await createTask(mockSupabaseClient as any as SupabaseClient, payload, creatorId);

      expect(result).toBe(taskId);
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        'create_task_with_assignments',
        expect.objectContaining({
          p_title: payload.title,
          p_description: payload.description,
          p_priority_bucket: payload.priority_bucket,
          p_status: payload.status,
          p_deadline: payload.deadline,
          p_notes: payload.notes,
          p_project_id: payload.project_id,
          p_creator_id: creatorId,
          p_recurrence_interval: 7,
          p_recurrence_date: payload.recurrence_date,
          p_assignee_ids: ['user-456'], // Only the selected assignees
        })
      );
    });

    it('should use only selected assignees, not including creator', async () => {
      const taskId = 123;
      const creatorId = 'user-123';
      const payload: CreateTaskPayload = {
        project_id: 1,
        title: 'New Task',
        description: 'Task description',
        priority_bucket: 5,
        status: 'To Do',
        assignee_ids: ['user-456', 'user-789'],
        deadline: '2025-12-31T23:59:59Z',
      };

      mockSupabaseClient.rpc = vi.fn().mockResolvedValue({
        data: taskId,
        error: null,
      });

      await createTask(mockSupabaseClient as any as SupabaseClient, payload, creatorId);

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        'create_task_with_assignments',
        expect.objectContaining({
          p_assignee_ids: ['user-456', 'user-789'], // Only selected assignees, no creator
        })
      );
    });

    it('should deduplicate assignees if same user selected multiple times', async () => {
      const taskId = 123;
      const creatorId = 'user-123';
      const payload: CreateTaskPayload = {
        project_id: 1,
        title: 'New Task',
        description: 'Task description',
        priority_bucket: 5,
        status: 'To Do',
        assignee_ids: ['user-456', 'user-456', 'user-789'], // Duplicate user-456
        deadline: '2025-12-31T23:59:59Z',
      };

      mockSupabaseClient.rpc = vi.fn().mockResolvedValue({
        data: taskId,
        error: null,
      });

      await createTask(mockSupabaseClient as any as SupabaseClient, payload, creatorId);

      const call = (mockSupabaseClient.rpc as any).mock.calls[0][1];
      const assigneeIds = call.p_assignee_ids;

      expect(assigneeIds).toHaveLength(2); // Only 2 unique assignees
      expect(assigneeIds.filter((id: string) => id === 'user-456')).toHaveLength(1);
    });

    it('should throw error if more than 5 assignees', async () => {
      const creatorId = 'user-123';
      const payload: CreateTaskPayload = {
        project_id: 1,
        title: 'New Task',
        description: 'Task description',
        priority_bucket: 5,
        status: 'To Do',
        assignee_ids: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6'],
        deadline: '2025-12-31T23:59:59Z',
      };

      await expect(createTask(mockSupabaseClient as any as SupabaseClient, payload, creatorId)).rejects.toThrow(
        'Cannot assign more than 5 users to a task'
      );
    });

    it('should handle task creation without tags', async () => {
      const taskId = 123;
      const creatorId = 'user-123';
      const payload: CreateTaskPayload = {
        project_id: 1,
        title: 'New Task',
        description: 'Task description',
        priority_bucket: 5,
        status: 'To Do',
        assignee_ids: ['user-456'],
        deadline: '2025-12-31T23:59:59Z',
      };

      mockSupabaseClient.rpc = vi.fn().mockResolvedValue({
        data: taskId,
        error: null,
      });

      const result = await createTask(mockSupabaseClient as any as SupabaseClient, payload, creatorId);

      expect(result).toBe(taskId);
      expect(mockSupabaseClient.from).not.toHaveBeenCalledWith('tags');
    });

    it('should handle task creation with null notes and recurrence_date', async () => {
      const taskId = 123;
      const creatorId = 'user-123';
      const payload: CreateTaskPayload = {
        project_id: 1,
        title: 'New Task',
        description: 'Task description',
        priority_bucket: 5,
        status: 'To Do',
        assignee_ids: ['user-456'],
        deadline: '2025-12-31T23:59:59Z',
        notes: undefined,
        recurrence_date: undefined,
      };

      mockSupabaseClient.rpc = vi.fn().mockResolvedValue({
        data: taskId,
        error: null,
      });

      await createTask(mockSupabaseClient as any as SupabaseClient, payload, creatorId);

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        'create_task_with_assignments',
        expect.objectContaining({
          p_notes: null,
          p_recurrence_date: null,
        })
      );
    });

    it('should throw error if RPC call fails', async () => {
      const creatorId = 'user-123';
      const payload: CreateTaskPayload = {
        project_id: 1,
        title: 'New Task',
        description: 'Task description',
        priority_bucket: 5,
        status: 'To Do',
        assignee_ids: ['user-456'],
        deadline: '2025-12-31T23:59:59Z',
      };

      mockSupabaseClient.rpc = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      await expect(createTask(mockSupabaseClient as any as SupabaseClient, payload, creatorId)).rejects.toThrow(
        'Failed to create task: Database error'
      );
    });

    it('should upload file attachments to storage', async () => {
      const taskId = 123;
      const creatorId = 'user-123';
      const payload: CreateTaskPayload = {
        project_id: 1,
        title: 'New Task',
        description: 'Task description',
        priority_bucket: 5,
        status: 'To Do',
        assignee_ids: ['user-456'],
        deadline: '2025-12-31T23:59:59Z',
      };

      const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });

      mockSupabaseClient.rpc = vi.fn().mockResolvedValue({
        data: taskId,
        error: null,
      });

      const uploadMock = vi.fn().mockResolvedValue({ error: null });
      const attachmentInsertMock = vi.fn().mockResolvedValue({ error: null });

      (mockSupabaseClient as any).storage = {
        from: vi.fn().mockReturnValue({
          upload: uploadMock,
        }),
      };

      mockSupabaseClient.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'task_attachments') {
          return {
            insert: attachmentInsertMock,
          };
        }
        return {};
      });

      const result = await createTask(mockSupabaseClient as any as SupabaseClient, payload, creatorId, [mockFile]);

      expect(result).toBe(taskId);
      expect(uploadMock).toHaveBeenCalled();
      expect(attachmentInsertMock).toHaveBeenCalledWith({
        task_id: taskId,
        storage_path: expect.stringContaining('tasks/123/'),
        uploaded_by: creatorId,
      });
    });

    it('should continue with other files if one upload fails', async () => {
      const taskId = 123;
      const creatorId = 'user-123';
      const payload: CreateTaskPayload = {
        project_id: 1,
        title: 'New Task',
        description: 'Task description',
        priority_bucket: 5,
        status: 'To Do',
        assignee_ids: ['user-456'],
        deadline: '2025-12-31T23:59:59Z',
      };

      const mockFile1 = new File(['test content 1'], 'test1.pdf', { type: 'application/pdf' });
      const mockFile2 = new File(['test content 2'], 'test2.pdf', { type: 'application/pdf' });

      mockSupabaseClient.rpc = vi.fn().mockResolvedValue({
        data: taskId,
        error: null,
      });

      const uploadMock = vi
        .fn()
        .mockResolvedValueOnce({ error: { message: 'Upload failed' } })
        .mockResolvedValueOnce({ error: null });

      const attachmentInsertMock = vi.fn().mockResolvedValue({ error: null });

      (mockSupabaseClient as any).storage = {
        from: vi.fn().mockReturnValue({
          upload: uploadMock,
        }),
      };

      mockSupabaseClient.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'task_attachments') {
          return {
            insert: attachmentInsertMock,
          };
        }
        return {};
      });

      const result = await createTask(mockSupabaseClient as any as SupabaseClient, payload, creatorId, [mockFile1, mockFile2]);

      expect(result).toBe(taskId);
      expect(uploadMock).toHaveBeenCalledTimes(2);
      expect(attachmentInsertMock).toHaveBeenCalledTimes(1); // Only second file succeeded
    });

    it('should log error and continue when tag fetch fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const taskId = 123;
      const creatorId = 'user-123';
      const payload: CreateTaskPayload = {
        project_id: 1,
        title: 'New Task',
        description: 'Task description',
        priority_bucket: 5,
        status: 'To Do',
        assignee_ids: ['user-456'],
        deadline: '2025-12-31T23:59:59Z',
        tags: ['tag1', 'tag2'],
      };

      mockSupabaseClient.rpc = vi.fn().mockResolvedValue({
        data: taskId,
        error: null,
      });

      const tagFetchError = { message: 'Tag fetch failed' };

      const tagsInsertSelectMock = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      const tagsInsertMock = vi.fn().mockReturnValue({
        select: tagsInsertSelectMock,
      });

      const tagsInMock = vi.fn().mockResolvedValue({
        data: null,
        error: tagFetchError,
      });

      const tagsSelectMock = vi.fn().mockReturnValue({
        in: tagsInMock,
      });

      mockSupabaseClient.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'tags') {
          const callCount = (mockSupabaseClient.from as any).mock.calls.filter(
            (call: any[]) => call[0] === 'tags'
          ).length;
          if (callCount <= 2) {
            return {
              insert: tagsInsertMock,
            };
          } else {
            return {
              select: tagsSelectMock,
            };
          }
        }
        return {};
      });

      const result = await createTask(mockSupabaseClient as any as SupabaseClient, payload, creatorId);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching tags:', tagFetchError);
      expect(result).toBe(taskId);

      consoleErrorSpy.mockRestore();
    });

    it('should log error and continue when task tag linking fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const taskId = 123;
      const creatorId = 'user-123';
      const payload: CreateTaskPayload = {
        project_id: 1,
        title: 'New Task',
        description: 'Task description',
        priority_bucket: 5,
        status: 'To Do',
        assignee_ids: ['user-456'],
        deadline: '2025-12-31T23:59:59Z',
        tags: ['tag1', 'tag2'],
      };

      mockSupabaseClient.rpc = vi.fn().mockResolvedValue({
        data: taskId,
        error: null,
      });

      const taskTagError = { message: 'Task tag linking failed' };

      const tagsInsertSelectMock = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      const tagsInsertMock = vi.fn().mockReturnValue({
        select: tagsInsertSelectMock,
      });

      const tagsInMock = vi.fn().mockResolvedValue({
        data: [
          { id: 1, name: 'tag1' },
          { id: 2, name: 'tag2' },
        ],
        error: null,
      });

      const tagsSelectMock = vi.fn().mockReturnValue({
        in: tagsInMock,
      });

      const taskTagsInsertMock = vi.fn().mockResolvedValue({
        data: null,
        error: taskTagError,
      });

      mockSupabaseClient.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'tags') {
          const callCount = (mockSupabaseClient.from as any).mock.calls.filter(
            (call: any[]) => call[0] === 'tags'
          ).length;
          if (callCount <= 2) {
            return {
              insert: tagsInsertMock,
            };
          } else {
            return {
              select: tagsSelectMock,
            };
          }
        }
        if (table === 'task_tags') {
          return {
            insert: taskTagsInsertMock,
          };
        }
        return {};
      });

      const result = await createTask(mockSupabaseClient as any as SupabaseClient, payload, creatorId);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error linking tags to task:', taskTagError);
      expect(result).toBe(taskId);

      consoleErrorSpy.mockRestore();
    });

    it('should log error and cleanup storage when attachment record creation fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const taskId = 123;
      const creatorId = 'user-123';
      const payload: CreateTaskPayload = {
        project_id: 1,
        title: 'New Task',
        description: 'Task description',
        priority_bucket: 5,
        status: 'To Do',
        assignee_ids: ['user-456'],
        deadline: '2025-12-31T23:59:59Z',
      };

      const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });

      mockSupabaseClient.rpc = vi.fn().mockResolvedValue({
        data: taskId,
        error: null,
      });

      const uploadMock = vi.fn().mockResolvedValue({ error: null });
      const removeMock = vi.fn().mockResolvedValue({ error: null });

      const attachmentError = { message: 'Attachment record creation failed' };
      const attachmentInsertMock = vi.fn().mockResolvedValue({ error: attachmentError });

      (mockSupabaseClient as any).storage = {
        from: vi.fn().mockReturnValue({
          upload: uploadMock,
          remove: removeMock,
        }),
      };

      mockSupabaseClient.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'task_attachments') {
          return {
            insert: attachmentInsertMock,
          };
        }
        return {};
      });

      const result = await createTask(mockSupabaseClient as any as SupabaseClient, payload, creatorId, [mockFile]);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        `Error creating attachment record for ${mockFile.name}:`,
        expect.objectContaining({
          error: attachmentError,
          taskId: taskId,
          storagePath: expect.stringContaining('tasks/123/'),
          uploadedBy: creatorId,
        })
      );
      expect(removeMock).toHaveBeenCalledWith([expect.stringContaining('tasks/123/')]);
      expect(result).toBe(taskId);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('getAllUsers', () => {
    it('should fetch all users ordered by first name', async () => {
      const mockUsers = [
        { id: 'user-1', first_name: 'Alice', last_name: 'Smith' },
        { id: 'user-2', first_name: 'Bob', last_name: 'Jones' },
        { id: 'user-3', first_name: 'Charlie', last_name: 'Brown' },
      ];

      const orderMock = vi.fn().mockResolvedValue({
        data: mockUsers,
        error: null,
      });

      const selectMock = vi.fn().mockReturnValue({
        order: orderMock,
      });

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: selectMock,
      });

      const result = await getAllUsers();

      expect(result).toEqual(mockUsers);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_info');
      expect(selectMock).toHaveBeenCalledWith('id, first_name, last_name');
      expect(orderMock).toHaveBeenCalledWith('first_name', { ascending: true });
    });

    it('should throw error when fetch fails', async () => {
      const mockError = { message: 'Database connection failed' };

      const orderMock = vi.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      const selectMock = vi.fn().mockReturnValue({
        order: orderMock,
      });

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: selectMock,
      });

      await expect(getAllUsers()).rejects.toThrow('Failed to fetch users: Database connection failed');
    });

    it('should handle empty user list', async () => {
      const orderMock = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const selectMock = vi.fn().mockReturnValue({
        order: orderMock,
      });

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: selectMock,
      });

      const result = await getAllUsers();

      expect(result).toEqual([]);
    });
  });

  describe('getAllProjects', () => {
    it('should fetch all non-archived projects ordered by name', async () => {
      const mockProjects = [
        { id: 1, name: 'Project A' },
        { id: 2, name: 'Project B' },
        { id: 3, name: 'Project C' },
      ];

      const orderMock = vi.fn().mockResolvedValue({
        data: mockProjects,
        error: null,
      });

      const eqMock = vi.fn().mockReturnValue({
        order: orderMock,
      });

      const selectMock = vi.fn().mockReturnValue({
        eq: eqMock,
      });

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: selectMock,
      });

      const result = await getAllProjects();

      expect(result).toEqual(mockProjects);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('projects');
      expect(selectMock).toHaveBeenCalledWith('id, name');
      expect(eqMock).toHaveBeenCalledWith('is_archived', false);
      expect(orderMock).toHaveBeenCalledWith('name', { ascending: true });
    });

    it('should exclude archived projects', async () => {
      const mockProjects = [
        { id: 1, name: 'Active Project' },
        { id: 2, name: 'Another Active Project' },
      ];

      const orderMock = vi.fn().mockResolvedValue({
        data: mockProjects,
        error: null,
      });

      const eqMock = vi.fn().mockReturnValue({
        order: orderMock,
      });

      const selectMock = vi.fn().mockReturnValue({
        eq: eqMock,
      });

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: selectMock,
      });

      await getAllProjects();

      expect(eqMock).toHaveBeenCalledWith('is_archived', false);
    });

    it('should throw error when fetch fails', async () => {
      const mockError = { message: 'Database connection failed' };

      const orderMock = vi.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      const eqMock = vi.fn().mockReturnValue({
        order: orderMock,
      });

      const selectMock = vi.fn().mockReturnValue({
        eq: eqMock,
      });

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: selectMock,
      });

      await expect(getAllProjects()).rejects.toThrow('Failed to fetch projects: Database connection failed');
    });

    it('should handle empty projects list', async () => {
      const orderMock = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const eqMock = vi.fn().mockReturnValue({
        order: orderMock,
      });

      const selectMock = vi.fn().mockReturnValue({
        eq: eqMock,
      });

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: selectMock,
      });

      const result = await getAllProjects();

      expect(result).toEqual([]);
    });
  });

  describe('updateTaskTitleDB', () => {
    it('should update task title successfully', async () => {
      const mockUpdatedTask = { id: 1, title: 'Updated Title' };

      const singleMock = vi.fn().mockResolvedValue({
        data: mockUpdatedTask,
        error: null,
      });

      const selectMock = vi.fn().mockReturnValue({
        single: singleMock,
      });

      const eqMock = vi.fn().mockReturnValue({
        select: selectMock,
      });

      const updateMock = vi.fn().mockReturnValue({
        eq: eqMock,
      });

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        update: updateMock,
      });

      const result = await updateTaskTitleDB(1, 'Updated Title');

      expect(result).toEqual(mockUpdatedTask);
      expect(updateMock).toHaveBeenCalledWith({
        title: 'Updated Title',
        updated_at: expect.any(String),
      });
    });

    it('should throw error when update fails', async () => {
      const mockError = { message: 'Update failed' };

      const singleMock = vi.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      const selectMock = vi.fn().mockReturnValue({
        single: singleMock,
      });

      const eqMock = vi.fn().mockReturnValue({
        select: selectMock,
      });

      const updateMock = vi.fn().mockReturnValue({
        eq: eqMock,
      });

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        update: updateMock,
      });

      await expect(updateTaskTitleDB(1, 'Updated Title')).rejects.toThrow(
        'Failed to update task title: Update failed'
      );
    });
  });

  describe('addTaskAssigneeDB', () => {
    it('should add a single assignee to a task', async () => {
      const taskId = 1;
      const assigneeId = 'user-123';
      const currentUserId = 'user-current';

      // Mock count query
      const countSelectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          count: 2,
          error: null,
        }),
      });

      // Mock single query: .select('id').eq('task_id', taskId).eq('assignee_id', assigneeId).single()
      const secondEqMock = vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      });

      const firstEqMock = vi.fn().mockReturnValue({
        eq: secondEqMock,
      });

      const selectMock = vi.fn().mockReturnValue({
        eq: firstEqMock,
      });

      const insertMock = vi.fn().mockResolvedValue({
        error: null,
      });

      let callCount = 0;
      mockSupabaseClient.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'task_assignments') {
          callCount++;
          if (callCount === 1) {
            return {
              select: countSelectMock,
            };
          } else if (callCount === 2) {
            return {
              select: selectMock,
            };
          } else {
            return {
              insert: insertMock,
            };
          }
        }
        return {};
      });

      const result = await addTaskAssigneeDB(taskId, assigneeId, currentUserId);

      expect(result).toBe(assigneeId);
      expect(insertMock).toHaveBeenCalledWith({
        task_id: taskId,
        assignee_id: assigneeId,
        assignor_id: currentUserId,
      });
    });

    it('should throw error if task already has 5 assignees', async () => {
      const taskId = 1;
      const assigneeId = 'user-123';
      const currentUserId = 'user-current';

      const countSelectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          count: 5,
          error: null,
        }),
      });

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: countSelectMock,
      });

      await expect(addTaskAssigneeDB(taskId, assigneeId, currentUserId)).rejects.toThrow(
        'Cannot exceed 5 total assignees'
      );
    });

    it('should throw error if assignee already assigned', async () => {
      const taskId = 1;
      const assigneeId = 'user-123';
      const currentUserId = 'user-current';

      const countSelectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          count: 2,
          error: null,
        }),
      });

      const secondEqMock = vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 1 },
          error: null,
        }),
      });

      const firstEqMock = vi.fn().mockReturnValue({
        eq: secondEqMock,
      });

      const selectMock = vi.fn().mockReturnValue({
        eq: firstEqMock,
      });

      let callCount = 0;
      mockSupabaseClient.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'task_assignments') {
          callCount++;
          if (callCount === 1) {
            return { select: countSelectMock };
          } else {
            return { select: selectMock };
          }
        }
        return {};
      });

      await expect(addTaskAssigneeDB(taskId, assigneeId, currentUserId)).rejects.toThrow(
        'User already assigned to this task'
      );
    });

    it('should throw error when insert fails', async () => {
      const taskId = 1;
      const assigneeId = 'user-123';
      const currentUserId = 'user-current';

      const countSelectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          count: 2,
          error: null,
        }),
      });

      const secondEqMock = vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      });

      const firstEqMock = vi.fn().mockReturnValue({
        eq: secondEqMock,
      });

      const selectMock = vi.fn().mockReturnValue({
        eq: firstEqMock,
      });

      const insertMock = vi.fn().mockResolvedValue({
        error: { message: 'Insert failed' },
      });

      let callCount = 0;
      mockSupabaseClient.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'task_assignments') {
          callCount++;
          if (callCount === 1) {
            return { select: countSelectMock };
          } else if (callCount === 2) {
            return { select: selectMock };
          } else {
            return { insert: insertMock };
          }
        }
        return {};
      });

      await expect(addTaskAssigneeDB(taskId, assigneeId, currentUserId)).rejects.toThrow(
        'Failed to add assignee: Insert failed'
      );
    });
  });

  describe('addTaskTagDB', () => {
    it('should add a tag to a task', async () => {
      const taskId = 1;
      const tagName = 'urgent';

      const tagInsertMock = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      const tagSingleMock = vi.fn().mockResolvedValue({
        data: { id: 1 },
        error: null,
      });

      const tagEqMock = vi.fn().mockReturnValue({
        single: tagSingleMock,
      });

      const tagSelectMock = vi.fn().mockReturnValue({
        eq: tagEqMock,
      });

      const linkCheckSingleMock = vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      });

      const linkCheckSecondEqMock = vi.fn().mockReturnValue({
        single: linkCheckSingleMock,
      });

      const linkCheckFirstEqMock = vi.fn().mockReturnValue({
        eq: linkCheckSecondEqMock,
      });

      const linkCheckSelectMock = vi.fn().mockReturnValue({
        eq: linkCheckFirstEqMock,
      });

      const linkInsertMock = vi.fn().mockResolvedValue({
        error: null,
      });

      let fromCallCount = 0;
      mockSupabaseClient.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'tags') {
          fromCallCount++;
          if (fromCallCount === 1) {
            return { insert: tagInsertMock };
          } else {
            return { select: tagSelectMock };
          }
        }
        if (table === 'task_tags') {
          return {
            select: linkCheckSelectMock,
            insert: linkInsertMock,
          };
        }
        return {};
      });

      const result = await addTaskTagDB(taskId, tagName);

      expect(result).toBe(tagName);
      expect(linkInsertMock).toHaveBeenCalledWith({ task_id: taskId, tag_id: 1 });
    });

    it('should throw error if tag already linked', async () => {
      const taskId = 1;
      const tagName = 'urgent';

      const tagSingleMock = vi.fn().mockResolvedValue({
        data: { id: 1 },
        error: null,
      });

      const tagEqMock = vi.fn().mockReturnValue({
        single: tagSingleMock,
      });

      const tagSelectMock = vi.fn().mockReturnValue({
        eq: tagEqMock,
      });

      const linkCheckSingleMock = vi.fn().mockResolvedValue({
        data: { id: 1 },
        error: null,
      });

      const linkCheckSecondEqMock = vi.fn().mockReturnValue({
        single: linkCheckSingleMock,
      });

      const linkCheckFirstEqMock = vi.fn().mockReturnValue({
        eq: linkCheckSecondEqMock,
      });

      const linkCheckSelectMock = vi.fn().mockReturnValue({
        eq: linkCheckFirstEqMock,
      });

      mockSupabaseClient.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'tags') {
          return { select: tagSelectMock };
        }
        if (table === 'task_tags') {
          return { select: linkCheckSelectMock };
        }
        return {};
      });

      await expect(addTaskTagDB(taskId, tagName)).rejects.toThrow('Tag already linked to this task');
    });
  });

  describe('removeTaskTagDB', () => {
    it('should remove a tag from a task', async () => {
      const taskId = 1;
      const tagName = 'urgent';

      const tagSingleMock = vi.fn().mockResolvedValue({
        data: { id: 1 },
        error: null,
      });

      const tagEqMock = vi.fn().mockReturnValue({
        single: tagSingleMock,
      });

      const tagSelectMock = vi.fn().mockReturnValue({
        eq: tagEqMock,
      });

      const linkSecondEqMock = vi.fn().mockResolvedValue({
        error: null,
      });

      const linkFirstEqMock = vi.fn().mockReturnValue({
        eq: linkSecondEqMock,
      });

      const linkDeleteMock = vi.fn().mockReturnValue({
        eq: linkFirstEqMock,
      });

      mockSupabaseClient.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'tags') {
          return { select: tagSelectMock };
        }
        if (table === 'task_tags') {
          return { delete: linkDeleteMock };
        }
        return {};
      });

      const result = await removeTaskTagDB(taskId, tagName);

      expect(result).toBe(tagName);
      expect(linkSecondEqMock).toHaveBeenCalled();
    });

    it('should throw error if tag not found', async () => {
      const taskId = 1;
      const tagName = 'urgent';

      const tagSingleMock = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      const tagEqMock = vi.fn().mockReturnValue({
        single: tagSingleMock,
      });

      const tagSelectMock = vi.fn().mockReturnValue({
        eq: tagEqMock,
      });

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: tagSelectMock,
      });

      await expect(removeTaskTagDB(taskId, tagName)).rejects.toThrow('Tag not found');
    });
  });

  describe('addTaskAttachmentsDB', () => {
    it('should upload and create attachment records', async () => {
      const taskId = 1;
      const userId = 'user-123';
      const mockFile = new File(['content'], 'file.pdf', { type: 'application/pdf' });
  
      const taskSingleMock = vi.fn().mockResolvedValue({
        data: { id: taskId },
        error: null,
      });
  
      const taskEqMock = vi.fn().mockReturnValue({
        single: taskSingleMock,
      });
  
      const taskSelectMock = vi.fn().mockReturnValue({
        eq: taskEqMock,
      });
  
      const uploadMock = vi.fn().mockResolvedValue({
        error: null,
      });
  
      // FIX: Return single object, not array
      const attachmentSingleMock = vi.fn().mockResolvedValue({
        data: { id: 1, storage_path: 'tasks/1/file.pdf' },
        error: null,
      });
  
      const attachmentSelectMock = vi.fn().mockReturnValue({
        single: attachmentSingleMock,
      });
  
      const attachmentInsertMock = vi.fn().mockReturnValue({
        select: attachmentSelectMock,
      });
  
      mockSupabaseClient.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'tasks') {
          return { select: taskSelectMock };
        }
        if (table === 'task_attachments') {
          return { insert: attachmentInsertMock };
        }
        return {};
      });
  
      (mockSupabaseClient as any).storage = {
        from: vi.fn().mockReturnValue({
          upload: uploadMock,
        }),
      };
  
      const result = await addTaskAttachmentsDB(taskId, [mockFile], userId);
  
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });
  
    it('should continue if one file upload fails', async () => {
      const taskId = 1;
      const userId = 'user-123';
      const mockFile1 = new File(['content1'], 'file1.pdf');
      const mockFile2 = new File(['content2'], 'file2.pdf');
  
      const taskSingleMock = vi.fn().mockResolvedValue({
        data: { id: taskId },
        error: null,
      });
  
      const taskEqMock = vi.fn().mockReturnValue({
        single: taskSingleMock,
      });
  
      const taskSelectMock = vi.fn().mockReturnValue({
        eq: taskEqMock,
      });
  
      const uploadMock = vi
        .fn()
        .mockResolvedValueOnce({ error: { message: 'Upload failed' } })
        .mockResolvedValueOnce({ error: null });
  
      // FIX: Return single object, not array
      const attachmentSingleMock = vi.fn().mockResolvedValue({
        data: { id: 1, storage_path: 'tasks/1/file2.pdf' },
        error: null,
      });
  
      const attachmentSelectMock = vi.fn().mockReturnValue({
        single: attachmentSingleMock,
      });
  
      const attachmentInsertMock = vi.fn().mockReturnValue({
        select: attachmentSelectMock,
      });
  
      mockSupabaseClient.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'tasks') {
          return { select: taskSelectMock };
        }
        if (table === 'task_attachments') {
          return { insert: attachmentInsertMock };
        }
        return {};
      });
  
      (mockSupabaseClient as any).storage = {
        from: vi.fn().mockReturnValue({
          upload: uploadMock,
        }),
      };
  
      const result = await addTaskAttachmentsDB(taskId, [mockFile1, mockFile2], userId);
  
      expect(result).toHaveLength(1);
    });
  });

  describe('addTaskCommentDB', () => {
    it('should add a comment to a task', async () => {
      const taskId = 1;
      const userId = 'user-123';
      const content = 'Great work!';

      const singleMock = vi.fn().mockResolvedValue({
        data: {
          id: 1,
          content,
          created_at: '2025-10-20T10:00:00Z',
          user_id: userId,
        },
        error: null,
      });

      const selectMock = vi.fn().mockReturnValue({
        single: singleMock,
      });

      const insertMock = vi.fn().mockReturnValue({
        select: selectMock,
      });

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        insert: insertMock,
      });

      const result = await addTaskCommentDB(taskId, userId, content);

      expect(result.id).toBe(1);
      expect(result.content).toBe(content);
    });

    it('should throw error when insert fails', async () => {
      const taskId = 1;
      const userId = 'user-123';
      const content = 'Comment';

      const singleMock = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Insert failed' },
      });

      const selectMock = vi.fn().mockReturnValue({
        single: singleMock,
      });

      const insertMock = vi.fn().mockReturnValue({
        select: selectMock,
      });

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        insert: insertMock,
      });

      await expect(addTaskCommentDB(taskId, userId, content)).rejects.toThrow(
        'Failed to add comment: Insert failed'
      );
    });
  });

  describe('updateTaskCommentDB', () => {
    it('should update a comment', async () => {
      const commentId = 1;
      const newContent = 'Updated comment';

      const singleMock = vi.fn().mockResolvedValue({
        data: {
          id: commentId,
          content: newContent,
          updated_at: '2025-10-20T11:00:00Z',
        },
        error: null,
      });

      const selectMock = vi.fn().mockReturnValue({
        single: singleMock,
      });

      const eqMock = vi.fn().mockReturnValue({
        select: selectMock,
      });

      const updateMock = vi.fn().mockReturnValue({
        eq: eqMock,
      });

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        update: updateMock,
      });

      const result = await updateTaskCommentDB(commentId, newContent);

      expect(result.id).toBe(commentId);
      expect(result.content).toBe(newContent);
    });

    it('should throw error when update fails', async () => {
      const commentId = 1;
      const newContent = 'Updated';

      const singleMock = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Update failed' },
      });

      const selectMock = vi.fn().mockReturnValue({
        single: singleMock,
      });

      const eqMock = vi.fn().mockReturnValue({
        select: selectMock,
      });

      const updateMock = vi.fn().mockReturnValue({
        eq: eqMock,
      });

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        update: updateMock,
      });

      await expect(updateTaskCommentDB(commentId, newContent)).rejects.toThrow(
        'Failed to update comment: Update failed'
      );
    });
  });

  describe('linkSubtaskToParentDB', () => {
    it('should link a subtask to its parent task', async () => {
      const subtaskId = 2;
      const parentTaskId = 1;

      const eqMock = vi.fn().mockResolvedValue({
        error: null,
      });

      const updateMock = vi.fn().mockReturnValue({
        eq: eqMock,
      });

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        update: updateMock,
      });

      await expect(linkSubtaskToParentDB(subtaskId, parentTaskId)).resolves.not.toThrow();

      expect(updateMock).toHaveBeenCalledWith({ parent_task_id: parentTaskId });
    });

    it('should throw error when update fails', async () => {
      const subtaskId = 2;
      const parentTaskId = 1;

      const eqMock = vi.fn().mockResolvedValue({
        error: { message: 'Update failed' },
      });

      const updateMock = vi.fn().mockReturnValue({
        eq: eqMock,
      });

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        update: updateMock,
      });

      await expect(linkSubtaskToParentDB(subtaskId, parentTaskId)).rejects.toThrow(
        'Failed to link subtask to parent: Update failed'
      );
    });
  });

  describe('updateTaskDescriptionDB', () => {
    it('should update task description successfully', async () => {
      const mockUpdatedTask = { id: 1, description: 'Updated Description' };

      const singleMock = vi.fn().mockResolvedValue({
        data: mockUpdatedTask,
        error: null,
      });

      const selectMock = vi.fn().mockReturnValue({
        single: singleMock,
      });

      const eqMock = vi.fn().mockReturnValue({
        select: selectMock,
      });

      const updateMock = vi.fn().mockReturnValue({
        eq: eqMock,
      });

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        update: updateMock,
      });

      const result = await updateTaskDescriptionDB(1, 'Updated Description');

      expect(result).toEqual(mockUpdatedTask);
      expect(updateMock).toHaveBeenCalledWith({
        description: 'Updated Description',
        updated_at: expect.any(String),
      });
    });

    it('should throw error when update fails', async () => {
      const mockError = { message: 'Update failed' };

      const singleMock = vi.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      const selectMock = vi.fn().mockReturnValue({
        single: singleMock,
      });

      const eqMock = vi.fn().mockReturnValue({
        select: selectMock,
      });

      const updateMock = vi.fn().mockReturnValue({
        eq: eqMock,
      });

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        update: updateMock,
      });

      await expect(updateTaskDescriptionDB(1, 'Updated Description')).rejects.toThrow(
        'Failed to update task description: Update failed'
      );
    });
  });

  describe('updateTaskStatusDB', () => {
    it('should update task status successfully', async () => {
      const mockUpdatedTask = { id: 1, status: 'In Progress' };

      const singleMock = vi.fn().mockResolvedValue({
        data: mockUpdatedTask,
        error: null,
      });

      const selectMock = vi.fn().mockReturnValue({
        single: singleMock,
      });

      const eqMock = vi.fn().mockReturnValue({
        select: selectMock,
      });

      const updateMock = vi.fn().mockReturnValue({
        eq: eqMock,
      });

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        update: updateMock,
      });

      const result = await updateTaskStatusDB(1, 'In Progress');

      expect(result).toEqual(mockUpdatedTask);
      expect(updateMock).toHaveBeenCalledWith({
        status: 'In Progress',
        updated_at: expect.any(String),
      });
    });

    it('should handle all valid statuses', async () => {
      const statuses: Array<'To Do' | 'In Progress' | 'Completed' | 'Blocked'> = [
        'To Do',
        'In Progress',
        'Completed',
        'Blocked',
      ];

      for (const status of statuses) {
        const mockUpdatedTask = { id: 1, status };

        const singleMock = vi.fn().mockResolvedValue({
          data: mockUpdatedTask,
          error: null,
        });

        const selectMock = vi.fn().mockReturnValue({
          single: singleMock,
        });

        const eqMock = vi.fn().mockReturnValue({
          select: selectMock,
        });

        const updateMock = vi.fn().mockReturnValue({
          eq: eqMock,
        });

        mockSupabaseClient.from = vi.fn().mockReturnValue({
          update: updateMock,
        });

        const result = await updateTaskStatusDB(1, status);

        expect(result.status).toBe(status);
      }
    });

    it('should throw error when update fails', async () => {
      const mockError = { message: 'Update failed' };

      const singleMock = vi.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      const selectMock = vi.fn().mockReturnValue({
        single: singleMock,
      });

      const eqMock = vi.fn().mockReturnValue({
        select: selectMock,
      });

      const updateMock = vi.fn().mockReturnValue({
        eq: eqMock,
      });

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        update: updateMock,
      });

      await expect(updateTaskStatusDB(1, 'In Progress')).rejects.toThrow(
        'Failed to update task status: Update failed'
      );
    });
  });

  describe('updateTaskPriorityDB', () => {
    it('should update task priority successfully', async () => {
      const mockUpdatedTask = { id: 1, priority_bucket: 7 };

      const singleMock = vi.fn().mockResolvedValue({
        data: mockUpdatedTask,
        error: null,
      });

      const selectMock = vi.fn().mockReturnValue({
        single: singleMock,
      });

      const eqMock = vi.fn().mockReturnValue({
        select: selectMock,
      });

      const updateMock = vi.fn().mockReturnValue({
        eq: eqMock,
      });

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        update: updateMock,
      });

      const result = await updateTaskPriorityDB(1, 7);

      expect(result).toEqual(mockUpdatedTask);
      expect(updateMock).toHaveBeenCalledWith({
        priority_bucket: 7,
        updated_at: expect.any(String),
      });
    });

    it('should handle priority range 1-10', async () => {
      for (let priority = 1; priority <= 10; priority++) {
        const mockUpdatedTask = { id: 1, priority_bucket: priority };

        const singleMock = vi.fn().mockResolvedValue({
          data: mockUpdatedTask,
          error: null,
        });

        const selectMock = vi.fn().mockReturnValue({
          single: singleMock,
        });

        const eqMock = vi.fn().mockReturnValue({
          select: selectMock,
        });

        const updateMock = vi.fn().mockReturnValue({
          eq: eqMock,
        });

        mockSupabaseClient.from = vi.fn().mockReturnValue({
          update: updateMock,
        });

        const result = await updateTaskPriorityDB(1, priority);

        expect(result.priority_bucket).toBe(priority);
      }
    });

    it('should throw error when update fails', async () => {
      const mockError = { message: 'Update failed' };

      const singleMock = vi.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      const selectMock = vi.fn().mockReturnValue({
        single: singleMock,
      });

      const eqMock = vi.fn().mockReturnValue({
        select: selectMock,
      });

      const updateMock = vi.fn().mockReturnValue({
        eq: eqMock,
      });

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        update: updateMock,
      });

      await expect(updateTaskPriorityDB(1, 5)).rejects.toThrow(
        'Failed to update task priority: Update failed'
      );
    });
  });

  describe('updateTaskDeadlineDB', () => {
    it('should update task deadline successfully with date string', async () => {
      const mockUpdatedTask = { id: 1, deadline: '2025-12-31T23:59:59+08:00' };

      const singleMock = vi.fn().mockResolvedValue({
        data: mockUpdatedTask,
        error: null,
      });

      const selectMock = vi.fn().mockReturnValue({
        single: singleMock,
      });

      const eqMock = vi.fn().mockReturnValue({
        select: selectMock,
      });

      const updateMock = vi.fn().mockReturnValue({
        eq: eqMock,
      });

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        update: updateMock,
      });

      const result = await updateTaskDeadlineDB(1, '2025-12-31T23:59:59Z');

      expect(result).toEqual(mockUpdatedTask);
      expect(updateMock).toHaveBeenCalledWith({
        deadline: expect.stringContaining('+08:00'),
        updated_at: expect.any(String),
      });
    });

    it('should update task deadline to null', async () => {
      const mockUpdatedTask = { id: 1, deadline: null };

      const singleMock = vi.fn().mockResolvedValue({
        data: mockUpdatedTask,
        error: null,
      });

      const selectMock = vi.fn().mockReturnValue({
        single: singleMock,
      });

      const eqMock = vi.fn().mockReturnValue({
        select: selectMock,
      });

      const updateMock = vi.fn().mockReturnValue({
        eq: eqMock,
      });

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        update: updateMock,
      });

      const result = await updateTaskDeadlineDB(1, null);

      expect(result).toEqual(mockUpdatedTask);
      expect(updateMock).toHaveBeenCalledWith({
        deadline: null,
        updated_at: expect.any(String),
      });
    });

    it('should convert deadline to SGT timezone (+08:00)', async () => {
      const mockUpdatedTask = { id: 1, deadline: '2025-12-31T23:59:59+08:00' };

      const singleMock = vi.fn().mockResolvedValue({
        data: mockUpdatedTask,
        error: null,
      });

      const selectMock = vi.fn().mockReturnValue({
        single: singleMock,
      });

      const eqMock = vi.fn().mockReturnValue({
        select: selectMock,
      });

      const updateMock = vi.fn().mockReturnValue({
        eq: eqMock,
      });

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        update: updateMock,
      });

      await updateTaskDeadlineDB(1, '2025-12-31T23:59:59Z');

      const updateCall = (updateMock as any).mock.calls[0][0];
      expect(updateCall.deadline).toMatch(/\+08:00$/);
    });

    it('should throw error when update fails', async () => {
      const mockError = { message: 'Update failed' };

      const singleMock = vi.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      const selectMock = vi.fn().mockReturnValue({
        single: singleMock,
      });

      const eqMock = vi.fn().mockReturnValue({
        select: selectMock,
      });

      const updateMock = vi.fn().mockReturnValue({
        eq: eqMock,
      });

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        update: updateMock,
      });

      await expect(updateTaskDeadlineDB(1, '2025-12-31T23:59:59Z')).rejects.toThrow(
        'Failed to update task deadline: Update failed'
      );
    });
  });

  describe('updateTaskNotesDB', () => {
    it('should update task notes successfully', async () => {
      const mockUpdatedTask = { id: 1, notes: 'Updated notes' };

      const singleMock = vi.fn().mockResolvedValue({
        data: mockUpdatedTask,
        error: null,
      });

      const selectMock = vi.fn().mockReturnValue({
        single: singleMock,
      });

      const eqMock = vi.fn().mockReturnValue({
        select: selectMock,
      });

      const updateMock = vi.fn().mockReturnValue({
        eq: eqMock,
      });

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        update: updateMock,
      });

      const result = await updateTaskNotesDB(1, 'Updated notes');

      expect(result).toEqual(mockUpdatedTask);
      expect(updateMock).toHaveBeenCalledWith({
        notes: 'Updated notes',
        updated_at: expect.any(String),
      });
    });

    it('should handle empty notes', async () => {
      const mockUpdatedTask = { id: 1, notes: '' };

      const singleMock = vi.fn().mockResolvedValue({
        data: mockUpdatedTask,
        error: null,
      });

      const selectMock = vi.fn().mockReturnValue({
        single: singleMock,
      });

      const eqMock = vi.fn().mockReturnValue({
        select: selectMock,
      });

      const updateMock = vi.fn().mockReturnValue({
        eq: eqMock,
      });

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        update: updateMock,
      });

      const result = await updateTaskNotesDB(1, '');

      expect(result).toEqual(mockUpdatedTask);
    });

    it('should throw error when update fails', async () => {
      const mockError = { message: 'Update failed' };

      const singleMock = vi.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      const selectMock = vi.fn().mockReturnValue({
        single: singleMock,
      });

      const eqMock = vi.fn().mockReturnValue({
        select: selectMock,
      });

      const updateMock = vi.fn().mockReturnValue({
        eq: eqMock,
      });

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        update: updateMock,
      });

      await expect(updateTaskNotesDB(1, 'Updated notes')).rejects.toThrow(
        'Failed to update task notes: Update failed'
      );
    });
  });

  describe('updateTaskRecurrenceDB', () => {
    it('should update task recurrence with interval and date', async () => {
      const mockUpdatedTask = {
        id: 1,
        recurrence_interval: 7,
        recurrence_date: '2025-10-20T00:00:00Z',
      };

      const singleMock = vi.fn().mockResolvedValue({
        data: mockUpdatedTask,
        error: null,
      });

      const selectMock = vi.fn().mockReturnValue({
        single: singleMock,
      });

      const eqMock = vi.fn().mockReturnValue({
        select: selectMock,
      });

      const updateMock = vi.fn().mockReturnValue({
        eq: eqMock,
      });

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        update: updateMock,
      });

      const result = await updateTaskRecurrenceDB(1, 7, '2025-10-20T00:00:00Z');

      expect(result).toEqual(mockUpdatedTask);
      expect(updateMock).toHaveBeenCalledWith({
        recurrence_interval: 7,
        recurrence_date: '2025-10-20T00:00:00Z',
        updated_at: expect.any(String),
      });
    });

    it('should clear recurrence when interval is 0', async () => {
      const mockUpdatedTask = {
        id: 1,
        recurrence_interval: 0,
        recurrence_date: null,
      };

      const singleMock = vi.fn().mockResolvedValue({
        data: mockUpdatedTask,
        error: null,
      });

      const selectMock = vi.fn().mockReturnValue({
        single: singleMock,
      });

      const eqMock = vi.fn().mockReturnValue({
        select: selectMock,
      });

      const updateMock = vi.fn().mockReturnValue({
        eq: eqMock,
      });

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        update: updateMock,
      });

      const result = await updateTaskRecurrenceDB(1, 0, null);

      expect(result.recurrence_interval).toBe(0);
      expect(result.recurrence_date).toBeNull();
      expect(updateMock).toHaveBeenCalledWith({
        recurrence_interval: 0,
        recurrence_date: null,
        updated_at: expect.any(String),
      });
    });

    it('should handle different recurrence intervals', async () => {
      const intervals = [1, 7, 14, 30]; // daily, weekly, bi-weekly, monthly

      for (const interval of intervals) {
        const mockUpdatedTask = {
          id: 1,
          recurrence_interval: interval,
          recurrence_date: '2025-10-20T00:00:00Z',
        };

        const singleMock = vi.fn().mockResolvedValue({
          data: mockUpdatedTask,
          error: null,
        });

        const selectMock = vi.fn().mockReturnValue({
          single: singleMock,
        });

        const eqMock = vi.fn().mockReturnValue({
          select: selectMock,
        });

        const updateMock = vi.fn().mockReturnValue({
          eq: eqMock,
        });

        mockSupabaseClient.from = vi.fn().mockReturnValue({
          update: updateMock,
        });

        const result = await updateTaskRecurrenceDB(1, interval, '2025-10-20T00:00:00Z');

        expect(result.recurrence_interval).toBe(interval);
      }
    });

    it('should throw error when update fails', async () => {
      const mockError = { message: 'Update failed' };

      const singleMock = vi.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      const selectMock = vi.fn().mockReturnValue({
        single: singleMock,
      });

      const eqMock = vi.fn().mockReturnValue({
        select: selectMock,
      });

      const updateMock = vi.fn().mockReturnValue({
        eq: eqMock,
      });

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        update: updateMock,
      });

      await expect(updateTaskRecurrenceDB(1, 7, '2025-10-20T00:00:00Z')).rejects.toThrow(
        'Failed to update task recurrence: Update failed'
      );
    });
  });

  // ============ ASSIGNEES ============

  describe('removeTaskAssigneeDB', () => {
    it('should remove an assignee from a task', async () => {
      const taskId = 1;
      const assigneeId = 'user-123';

      const countMock = vi.fn().mockResolvedValue({
        count: 2,
        error: null,
      });

      const deleteMock = vi.fn().mockResolvedValue({
        error: null,
      });

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: countMock,
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: deleteMock,
          }),
        }),
      });

      const result = await removeTaskAssigneeDB(taskId, assigneeId);

      expect(result).toBe(assigneeId);
      expect(deleteMock).toHaveBeenCalled();
    });

    it('should throw error if only 1 assignee remains', async () => {
      const taskId = 1;
      const assigneeId = 'user-123';

      const countMock = vi.fn().mockResolvedValue({
        count: 1,
        error: null,
      });

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: countMock,
        }),
      });

      await expect(removeTaskAssigneeDB(taskId, assigneeId)).rejects.toThrow(
        'Cannot remove assignee. A task must have at least 1 assignee.'
      );
    });

    it('should throw error when delete fails', async () => {
      const taskId = 1;
      const assigneeId = 'user-123';

      const countMock = vi.fn().mockResolvedValue({
        count: 2,
        error: null,
      });

      const deleteMock = vi.fn().mockResolvedValue({
        error: { message: 'Delete failed' },
      });

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: countMock,
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: deleteMock,
          }),
        }),
      });

      await expect(removeTaskAssigneeDB(taskId, assigneeId)).rejects.toThrow(
        'Failed to remove assignee: Delete failed'
      );
    });
  });

  // ============ ATTACHMENTS ============

  describe('removeTaskAttachmentDB', () => {
    it('should remove attachment from storage and database', async () => {
      const attachmentId = 1;
      const storagePath = 'tasks/1/file.pdf';

      const fetchMock = vi.fn().mockResolvedValue({
        data: { storage_path: storagePath },
        error: null,
      });

      const removeMock = vi.fn().mockResolvedValue({
        error: null,
      });

      const deleteMock = vi.fn().mockResolvedValue({
        error: null,
      });

      mockSupabaseClient.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'task_attachments') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: fetchMock,
              }),
            }),
            delete: vi.fn().mockReturnValue({
              eq: deleteMock,
            }),
          };
        }
        return {};
      });

      (mockSupabaseClient as any).storage = {
        from: vi.fn().mockReturnValue({
          remove: removeMock,
        }),
      };

      const result = await removeTaskAttachmentDB(attachmentId);

      expect(result).toBe(storagePath);
      expect(removeMock).toHaveBeenCalledWith([storagePath]);
      expect(deleteMock).toHaveBeenCalled();
    });

    it('should throw error if attachment not found', async () => {
      const attachmentId = 1;

      const fetchMock = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: fetchMock,
          }),
        }),
      });

      await expect(removeTaskAttachmentDB(attachmentId)).rejects.toThrow('Attachment not found');
    });
  });

  // ============ COMMENTS ============

  describe('deleteTaskCommentDB', () => {
    it('should delete a comment', async () => {
      const commentId = 1;

      const deleteMock = vi.fn().mockResolvedValue({
        error: null,
      });

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: deleteMock,
        }),
      });

      await expect(deleteTaskCommentDB(commentId)).resolves.not.toThrow();
      expect(deleteMock).toHaveBeenCalled();
    });

    it('should throw error when delete fails', async () => {
      const commentId = 1;

      const deleteMock = vi.fn().mockResolvedValue({
        error: { message: 'Delete failed' },
      });

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: deleteMock,
        }),
      });

      await expect(deleteTaskCommentDB(commentId)).rejects.toThrow('Failed to delete comment: Delete failed');
    });
  });

  describe('getCommentAuthorDB', () => {
    it('should fetch comment author user ID', async () => {
      const commentId = 1;
      const userId = 'user-123';

      const selectMock = vi.fn().mockResolvedValue({
        data: { user_id: userId },
        error: null,
      });

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: selectMock,
          }),
        }),
      });

      const result = await getCommentAuthorDB(commentId);

      expect(result).toBe(userId);
    });

    it('should return null if comment not found', async () => {
      const commentId = 1;

      const selectMock = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: selectMock,
          }),
        }),
      });

      const result = await getCommentAuthorDB(commentId);

      expect(result).toBeNull();
    });
  });
});
