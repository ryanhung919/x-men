import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getUserTasksService,
  getTaskByIdService,
  createTaskService,
  archiveTaskService,
} from '@/lib/services/tasks';
import * as taskDb from '@/lib/db/tasks';
import { getRolesForUserClient } from '@/lib/db/roles';
import type { CreateTaskPayload } from '@/lib/types/task-creation';

// Mock the DB layer
vi.mock('@/lib/db/tasks', () => ({
  getUserTasks: vi.fn(),
  getTaskById: vi.fn(),
  createTask: vi.fn(),
  archiveTask: vi.fn(),
}));

// Mock roles
vi.mock('@/lib/db/roles', () => ({
  getRolesForUserClient: vi.fn(),
}));

describe('lib/services/tasks - Service Layer Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserTasksService', () => {
    it('should fetch and format user tasks', async () => {
      const userId = 'user-123';
      const mockRawData = {
        tasks: [
          {
            id: 1,
            title: 'Test Task',
            description: 'Test',
            priority_bucket: 1,
            status: 'To Do',
            deadline: null,
            notes: null,
            project: { id: 1, name: 'Project' },
            parent_task_id: null,
            recurrence_interval: 0,
            recurrence_date: null,
            creator_id: userId,
            task_assignments: [],
            tags: [],
          },
        ],
        subtasks: [],
        attachments: [],
        assignees: [{ id: userId, first_name: 'John', last_name: 'Doe' }],
      };

      (taskDb.getUserTasks as any).mockResolvedValue(mockRawData);

      const result = await getUserTasksService(userId);

      expect(taskDb.getUserTasks).toHaveBeenCalledWith(userId);
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Test Task');
      expect(result[0].creator).toBeDefined();
    });
  });

  describe('getTaskByIdService', () => {
    it('should fetch and format task details by ID', async () => {
      const taskId = 123;
      const mockRawData = {
        task: {
          id: taskId,
          title: 'Detailed Task',
          description: 'Description',
          priority_bucket: 2,
          status: 'In Progress',
          deadline: '2025-12-31T00:00:00.000Z',
          notes: 'Notes',
          project: { id: 1, name: 'Project' },
          parent_task_id: null,
          recurrence_interval: 0,
          recurrence_date: null,
          creator_id: 'user-123',
          task_assignments: [],
          tags: [],
        },
        subtasks: [],
        attachments: [],
        comments: [],
        assignees: [{ id: 'user-123', first_name: 'John', last_name: 'Doe' }],
      };

      (taskDb.getTaskById as any).mockResolvedValue(mockRawData);

      const result = await getTaskByIdService(taskId);

      expect(taskDb.getTaskById).toHaveBeenCalledWith(taskId);
      expect(result).not.toBeNull();
      expect(result!.id).toBe(taskId);
      expect(result!.title).toBe('Detailed Task');
    });

    it('should return null when task does not exist', async () => {
      (taskDb.getTaskById as any).mockResolvedValue(null);

      const result = await getTaskByIdService(999);

      expect(result).toBeNull();
    });
  });

  describe('createTaskService', () => {
    const mockSupabase = {
      auth: { getUser: vi.fn() },
    } as any;

    it('should create task with valid payload', async () => {
      const payload: CreateTaskPayload = {
        project_id: 1,
        title: 'New Task',
        description: 'Description',
        priority_bucket: 5,
        status: 'To Do',
        assignee_ids: ['user-1', 'user-2'],
        deadline: '2025-12-31',
        tags: ['urgent'],
      };

      (taskDb.createTask as any).mockResolvedValue(123);

      const result = await createTaskService(mockSupabase, payload, 'creator-1');

      expect(taskDb.createTask).toHaveBeenCalledWith(
        mockSupabase,
        payload,
        'creator-1',
        undefined
      );
      expect(result).toBe(123);
    });

    it('should throw error when no assignees provided', async () => {
      const payload: CreateTaskPayload = {
        project_id: 1,
        title: 'Task',
        description: 'Desc',
        priority_bucket: 5,
        status: 'To Do',
        assignee_ids: [],
        deadline: '2025-12-31',
      };

      await expect(
        createTaskService(mockSupabase, payload, 'creator-1')
      ).rejects.toThrow('At least one assignee is required');
    });

    it('should throw error when more than 5 assignees', async () => {
      const payload: CreateTaskPayload = {
        project_id: 1,
        title: 'Task',
        description: 'Desc',
        priority_bucket: 5,
        status: 'To Do',
        assignee_ids: ['u1', 'u2', 'u3', 'u4', 'u5', 'u6'],
        deadline: '2025-12-31',
      };

      await expect(
        createTaskService(mockSupabase, payload, 'creator-1')
      ).rejects.toThrow('Cannot assign more than 5 users to a task');
    });

    it('should throw error when priority bucket is out of range (low)', async () => {
      const payload: CreateTaskPayload = {
        project_id: 1,
        title: 'Task',
        description: 'Desc',
        priority_bucket: 0,
        status: 'To Do',
        assignee_ids: ['user-1'],
        deadline: '2025-12-31',
      };

      await expect(
        createTaskService(mockSupabase, payload, 'creator-1')
      ).rejects.toThrow('Priority bucket must be between 1 and 10');
    });

    it('should throw error when priority bucket is out of range (high)', async () => {
      const payload: CreateTaskPayload = {
        project_id: 1,
        title: 'Task',
        description: 'Desc',
        priority_bucket: 11,
        status: 'To Do',
        assignee_ids: ['user-1'],
        deadline: '2025-12-31',
      };

      await expect(
        createTaskService(mockSupabase, payload, 'creator-1')
      ).rejects.toThrow('Priority bucket must be between 1 and 10');
    });

    it('should handle duplicate assignee IDs', async () => {
      const payload: CreateTaskPayload = {
        project_id: 1,
        title: 'Task',
        description: 'Desc',
        priority_bucket: 5,
        status: 'To Do',
        assignee_ids: ['user-1', 'user-1', 'user-2'],
        deadline: '2025-12-31',
      };

      (taskDb.createTask as any).mockResolvedValue(123);

      await createTaskService(mockSupabase, payload, 'creator-1');

      expect(taskDb.createTask).toHaveBeenCalled();
    });

    it('should pass attachment files to DB layer', async () => {
      const payload: CreateTaskPayload = {
        project_id: 1,
        title: 'Task',
        description: 'Desc',
        priority_bucket: 5,
        status: 'To Do',
        assignee_ids: ['user-1'],
        deadline: '2025-12-31',
      };

      const mockFiles = [new File(['content'], 'test.pdf')] as File[];
      (taskDb.createTask as any).mockResolvedValue(123);

      await createTaskService(mockSupabase, payload, 'creator-1', mockFiles);

      expect(taskDb.createTask).toHaveBeenCalledWith(
        mockSupabase,
        payload,
        'creator-1',
        mockFiles
      );
    });
  });

  describe('archiveTaskService', () => {
    const mockSupabase = {
      auth: { getUser: vi.fn() },
    } as any;

    it('should archive task when user is a manager', async () => {
      (getRolesForUserClient as any).mockResolvedValue(['manager', 'staff']);
      (taskDb.archiveTask as any).mockResolvedValue(3);

      const result = await archiveTaskService(mockSupabase, 'user-123', 456, true);

      expect(getRolesForUserClient).toHaveBeenCalledWith(mockSupabase, 'user-123');
      expect(taskDb.archiveTask).toHaveBeenCalledWith(456, true);
      expect(result).toBe(3);
    });

    it('should unarchive task when user is a manager', async () => {
      (getRolesForUserClient as any).mockResolvedValue(['manager']);
      (taskDb.archiveTask as any).mockResolvedValue(1);

      const result = await archiveTaskService(mockSupabase, 'user-123', 789, false);

      expect(taskDb.archiveTask).toHaveBeenCalledWith(789, false);
      expect(result).toBe(1);
    });

    it('should throw error when user is not a manager', async () => {
      (getRolesForUserClient as any).mockResolvedValue(['staff']);

      await expect(
        archiveTaskService(mockSupabase, 'user-123', 456, true)
      ).rejects.toThrow('Only managers can archive tasks');

      expect(taskDb.archiveTask).not.toHaveBeenCalled();
    });

    it('should throw error when user has no roles', async () => {
      (getRolesForUserClient as any).mockResolvedValue([]);

      await expect(
        archiveTaskService(mockSupabase, 'user-123', 456, true)
      ).rejects.toThrow('Only managers can archive tasks');
    });
  });
});
