import {
  addAssignee,
  addComment,
  addTag,
  addTaskAttachments,
  calculateNextDueDate,
  deleteComment,
  DetailedTask,
  formatTaskDetails,
  formatTasks,
  linkSubtaskToParent,
  mapTaskAttributes,
  RawAssignee,
  RawAttachment,
  RawComment,
  RawSubtask,
  RawTask,
  removeAssignee,
  removeTag,
  removeTaskAttachment,
  Task,
  updateComment,
  updateDeadline,
  updateDescription,
  updateNotes,
  updatePriority,
  updateRecurrence,
  updateStatus,
  updateTitle,
} from '@/lib/services/tasks';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  addTaskAssigneeDB,
  addTaskAttachmentsDB,
  addTaskCommentDB,
  addTaskTagDB,
  checkUserIsAdmin,
  createTask,
  deleteTaskCommentDB,
  getCommentAuthorDB,
  getTaskAttachmentsTotalSize,
  getTaskById,
  getTaskPermissionDataDB,
  isUserManager,
  linkSubtaskToParentDB,
  removeTaskAssigneeDB,
  removeTaskAttachmentDB,
  removeTaskTagDB,
  updateTaskCommentDB,
  updateTaskDeadlineDB,
  updateTaskDescriptionDB,
  updateTaskNotesDB,
  updateTaskPriorityDB,
  updateTaskRecurrenceDB,
  updateTaskStatusDB,
  updateTaskTitleDB,
} from '@/lib/db/tasks';

// Mock all database functions
vi.mock('@/lib/db/tasks', () => ({
  getTaskPermissionDataDB: vi.fn(),
  updateTaskTitleDB: vi.fn(),
  updateTaskDescriptionDB: vi.fn(),
  updateTaskStatusDB: vi.fn(),
  updateTaskPriorityDB: vi.fn(),
  updateTaskDeadlineDB: vi.fn(),
  updateTaskNotesDB: vi.fn(),
  updateTaskRecurrenceDB: vi.fn(),
  addTaskTagDB: vi.fn(),
  removeTaskTagDB: vi.fn(),
  addTaskAssigneeDB: vi.fn(),
  removeTaskAssigneeDB: vi.fn(),
  addTaskAttachmentsDB: vi.fn(),
  removeTaskAttachmentDB: vi.fn(),
  addTaskCommentDB: vi.fn(),
  updateTaskCommentDB: vi.fn(),
  deleteTaskCommentDB: vi.fn(),
  getCommentAuthorDB: vi.fn(),
  linkSubtaskToParentDB: vi.fn(),
  isUserManager: vi.fn(),
  checkUserIsAdmin: vi.fn(),
  getTaskById: vi.fn(),
  getTaskAttachmentsTotalSize: vi.fn(),
  createTask: vi.fn(),
}));

describe('lib/services/tasks', () => {
  describe('mapTaskAttributes', () => {
    it('should map raw task attributes correctly', () => {
      const rawTask: RawTask = {
        id: 1,
        title: 'Test Task',
        description: 'Test description',
        priority_bucket: 2,
        status: 'In Progress',
        deadline: '2025-12-31T23:59:59.000Z',
        notes: 'Some notes',
        project: { id: 1, name: 'Test Project' },
        parent_task_id: null,
        recurrence_interval: 0,
        recurrence_date: null,
        creator_id: 'user1',
        task_assignments: [],
        tags: [{ tags: { name: 'urgent' } }, { tags: { name: 'backend' } }],
      };

      const result = mapTaskAttributes(rawTask);

      expect(result).toEqual({
        id: 1,
        title: 'Test Task',
        description: 'Test description',
        priority: 2,
        status: 'In Progress',
        deadline: '2025-12-31T23:59:59.000Z',
        notes: 'Some notes',
        recurrence_interval: 0,
        recurrence_date: null,
        project: { id: 1, name: 'Test Project' },
        tags: ['urgent', 'backend'],
        isOverdue: false,
      });
    });

    it('should mark task as overdue when past deadline and not completed', () => {
      const pastDate = new Date('2020-01-01').toISOString();
      const rawTask: RawTask = {
        id: 1,
        title: 'Overdue Task',
        description: null,
        priority_bucket: 1,
        status: 'To Do',
        deadline: pastDate,
        notes: null,
        project: { id: 1, name: 'Project' },
        parent_task_id: null,
        recurrence_interval: 0,
        recurrence_date: null,
        creator_id: 'user1',
        task_assignments: [],
        tags: [],
      };

      const result = mapTaskAttributes(rawTask);

      expect(result.isOverdue).toBe(true);
    });

    it('should not mark completed task as overdue even if past deadline', () => {
      const pastDate = new Date('2020-01-01').toISOString();
      const rawTask: RawTask = {
        id: 1,
        title: 'Completed Task',
        description: null,
        priority_bucket: 1,
        status: 'Completed',
        deadline: pastDate,
        notes: null,
        project: { id: 1, name: 'Project' },
        parent_task_id: null,
        recurrence_interval: 0,
        recurrence_date: null,
        creator_id: 'user1',
        task_assignments: [],
        tags: [],
      };

      const result = mapTaskAttributes(rawTask);

      expect(result.isOverdue).toBe(false);
    });

    it('should handle task with no deadline', () => {
      const rawTask: RawTask = {
        id: 1,
        title: 'No Deadline Task',
        description: null,
        priority_bucket: 1,
        status: 'To Do',
        deadline: null,
        notes: null,
        project: { id: 1, name: 'Project' },
        parent_task_id: null,
        recurrence_interval: 0,
        recurrence_date: null,
        creator_id: 'user1',
        task_assignments: [],
        tags: [],
      };

      const result = mapTaskAttributes(rawTask);

      expect(result.isOverdue).toBe(false);
      expect(result.deadline).toBeNull();
    });

    it('should handle task with recurring properties', () => {
      const rawTask: RawTask = {
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
        creator_id: 'user1',
        task_assignments: [],
        tags: [],
      };

      const result = mapTaskAttributes(rawTask);

      expect(result.recurrence_interval).toBe(7);
      expect(result.recurrence_date).toBe('2025-10-16T00:00:00.000Z');
    });

    it('should handle empty tags array', () => {
      const rawTask: RawTask = {
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
        creator_id: 'user1',
        task_assignments: [],
        tags: [],
      };

      const result = mapTaskAttributes(rawTask);

      expect(result.tags).toEqual([]);
    });
  });

  describe('calculateNextDueDate', () => {
    beforeEach(() => {
      // Mock current date to 2025-10-16 for consistent testing
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-10-16T00:00:00.000Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should calculate next due date based on previous deadline for daily recurring task', () => {
      const task: Task = {
        id: 1,
        title: 'Daily Task',
        description: null,
        priority: 1,
        status: 'To Do',
        deadline: '2025-10-15T00:00:00.000Z', // Previous due date
        notes: null,
        recurrence_interval: 1, // daily
        recurrence_date: '2025-10-10T00:00:00.000Z',
        project: { id: 1, name: 'Project' },
        creator: { creator_id: 'user1', user_info: { first_name: 'Test', last_name: 'User' } },
        subtasks: [],
        assignees: [],
        tags: [],
        attachments: [],
        isOverdue: false,
      };

      const result = calculateNextDueDate(task);

      // Previous deadline 2025-10-15 + 1 day = 2025-10-16
      expect(result.deadline).toBe(new Date('2025-10-16T00:00:00.000Z').toISOString());
      expect(result.isOverdue).toBe(false);
    });

    it('should calculate next due date based on previous deadline for weekly recurring task', () => {
      const task: Task = {
        id: 1,
        title: 'Weekly Task',
        description: null,
        priority: 1,
        status: 'To Do',
        deadline: '2025-10-08T00:00:00.000Z', // Previous due date
        notes: null,
        recurrence_interval: 7, // weekly
        recurrence_date: '2025-10-01T00:00:00.000Z',
        project: { id: 1, name: 'Project' },
        creator: { creator_id: 'user1', user_info: { first_name: 'Test', last_name: 'User' } },
        subtasks: [],
        assignees: [],
        tags: [],
        attachments: [],
        isOverdue: false,
      };

      const result = calculateNextDueDate(task);

      // Previous deadline 2025-10-08 + 7 days = 2025-10-15
      expect(result.deadline).toBe(new Date('2025-10-15T00:00:00.000Z').toISOString());
    });

    it('should calculate next due date based on previous deadline for monthly recurring task', () => {
      const task: Task = {
        id: 1,
        title: 'Monthly Task',
        description: null,
        priority: 1,
        status: 'To Do',
        deadline: '2025-09-10T00:00:00.000Z', // Previous due date
        notes: null,
        recurrence_interval: 30, // monthly
        recurrence_date: '2025-09-10T00:00:00.000Z',
        project: { id: 1, name: 'Project' },
        creator: { creator_id: 'user1', user_info: { first_name: 'Test', last_name: 'User' } },
        subtasks: [],
        assignees: [],
        tags: [],
        attachments: [],
        isOverdue: false,
      };

      const result = calculateNextDueDate(task);

      // Previous deadline 2025-09-10 + 1 calendar month = 2025-10-10
      // Uses calendar month, not 30 days, to prevent drift
      expect(result.deadline).toBe(new Date('2025-10-10T00:00:00.000Z').toISOString());
    });

    it('should handle monthly recurrence staying on same day of month', () => {
      const task: Task = {
        id: 1,
        title: 'Monthly Financial Report',
        description: null,
        priority: 1,
        status: 'To Do',
        deadline: '2025-01-15T00:00:00.000Z', // 15th of January
        notes: null,
        recurrence_interval: 30, // monthly
        recurrence_date: '2025-01-15T00:00:00.000Z',
        project: { id: 1, name: 'Project' },
        creator: { creator_id: 'user1', user_info: { first_name: 'Test', last_name: 'User' } },
        subtasks: [],
        assignees: [],
        tags: [],
        attachments: [],
        isOverdue: false,
      };

      const result = calculateNextDueDate(task);

      // Should stay on 15th of next month (Feb 15, not Feb 14)
      expect(result.deadline).toBe(new Date('2025-02-15T00:00:00.000Z').toISOString());
    });

    it('should handle monthly recurrence edge case: Jan 31 → Feb 28 (non-leap year)', () => {
      const task: Task = {
        id: 1,
        title: 'End of Month Task',
        description: null,
        priority: 1,
        status: 'To Do',
        deadline: '2025-01-31T00:00:00.000Z', // Jan 31
        notes: null,
        recurrence_interval: 30, // monthly
        recurrence_date: '2025-01-31T00:00:00.000Z',
        project: { id: 1, name: 'Project' },
        creator: { creator_id: 'user1', user_info: { first_name: 'Test', last_name: 'User' } },
        subtasks: [],
        assignees: [],
        tags: [],
        attachments: [],
        isOverdue: false,
      };

      const result = calculateNextDueDate(task);

      // Jan 31 + 1 month = Feb 28 (since Feb 31 doesn't exist in 2025)
      // JavaScript automatically adjusts to last valid day of month
      expect(result.deadline).toBe(new Date('2025-02-28T00:00:00.000Z').toISOString());
    });

    it('should handle monthly recurrence edge case: Jan 31 → Feb 29 (leap year)', () => {
      const task: Task = {
        id: 1,
        title: 'End of Month Task',
        description: null,
        priority: 1,
        status: 'To Do',
        deadline: '2024-01-31T00:00:00.000Z', // Jan 31, 2024 (leap year)
        notes: null,
        recurrence_interval: 30, // monthly
        recurrence_date: '2024-01-31T00:00:00.000Z',
        project: { id: 1, name: 'Project' },
        creator: { creator_id: 'user1', user_info: { first_name: 'Test', last_name: 'User' } },
        subtasks: [],
        assignees: [],
        tags: [],
        attachments: [],
        isOverdue: false,
      };

      const result = calculateNextDueDate(task);

      // Jan 31, 2024 + 1 month = Feb 29, 2024 (2024 is a leap year)
      expect(result.deadline).toBe(new Date('2024-02-29T00:00:00.000Z').toISOString());
    });

    it('should handle monthly recurrence across different month lengths', () => {
      const task: Task = {
        id: 1,
        title: 'Monthly Task',
        description: null,
        priority: 1,
        status: 'To Do',
        deadline: '2025-01-30T00:00:00.000Z', // Jan 30
        notes: null,
        recurrence_interval: 30, // monthly
        recurrence_date: '2025-01-30T00:00:00.000Z',
        project: { id: 1, name: 'Project' },
        creator: { creator_id: 'user1', user_info: { first_name: 'Test', last_name: 'User' } },
        subtasks: [],
        assignees: [],
        tags: [],
        attachments: [],
        isOverdue: false,
      };

      const result = calculateNextDueDate(task);

      // Jan 30 + 1 month = Feb 28 (since Feb 30 doesn't exist)
      expect(result.deadline).toBe(new Date('2025-02-28T00:00:00.000Z').toISOString());
    });

    it('should handle overdue task correctly - example from requirements', () => {
      // Example: Task due Sep 29, completed Oct 1, interval 1 day → next due is Sep 30
      const task: Task = {
        id: 1,
        title: 'Overdue Daily Task',
        description: null,
        priority: 1,
        status: 'Completed',
        deadline: '2025-09-29T00:00:00.000Z', // Was due Sep 29
        notes: null,
        recurrence_interval: 1, // daily recurrence
        recurrence_date: '2025-09-29T00:00:00.000Z',
        project: { id: 1, name: 'Project' },
        creator: { creator_id: 'user1', user_info: { first_name: 'Test', last_name: 'User' } },
        subtasks: [],
        assignees: [],
        tags: [],
        attachments: [],
        isOverdue: false,
      };

      // Completed on Oct 1 (today in this test is Oct 16)
      const result = calculateNextDueDate(task);

      // Next due should be Sep 29 + 1 day = Sep 30 (still in the past)
      expect(result.deadline).toBe(new Date('2025-09-30T00:00:00.000Z').toISOString());
    });

    it('should return task unchanged if no recurrence interval', () => {
      const task: Task = {
        id: 1,
        title: 'Non-recurring Task',
        description: null,
        priority: 1,
        status: 'To Do',
        deadline: '2025-10-20T00:00:00.000Z',
        notes: null,
        recurrence_interval: 0,
        recurrence_date: null,
        project: { id: 1, name: 'Project' },
        creator: { creator_id: 'user1', user_info: { first_name: 'Test', last_name: 'User' } },
        subtasks: [],
        assignees: [],
        tags: [],
        attachments: [],
        isOverdue: false,
      };

      const result = calculateNextDueDate(task);

      expect(result).toEqual(task);
      expect(result.deadline).toBe('2025-10-20T00:00:00.000Z');
    });

    it('should return task unchanged if no deadline', () => {
      const task: Task = {
        id: 1,
        title: 'Recurring Task without deadline',
        description: null,
        priority: 1,
        status: 'To Do',
        deadline: null, // No deadline
        notes: null,
        recurrence_interval: 7,
        recurrence_date: '2025-10-01T00:00:00.000Z',
        project: { id: 1, name: 'Project' },
        creator: { creator_id: 'user1', user_info: { first_name: 'Test', last_name: 'User' } },
        subtasks: [],
        assignees: [],
        tags: [],
        attachments: [],
        isOverdue: false,
      };

      const result = calculateNextDueDate(task);

      expect(result).toEqual(task);
      expect(result.deadline).toBeNull();
    });

    it('should mark recurring task as overdue if calculated next due date is in the past', () => {
      // Current time is 2025-10-16
      const task: Task = {
        id: 1,
        title: 'Overdue Recurring Task',
        description: null,
        priority: 1,
        status: 'To Do',
        deadline: '2025-10-01T00:00:00.000Z', // Previous deadline in past
        notes: null,
        recurrence_interval: 7,
        recurrence_date: '2025-10-01T00:00:00.000Z',
        project: { id: 1, name: 'Project' },
        creator: { creator_id: 'user1', user_info: { first_name: 'Test', last_name: 'User' } },
        subtasks: [],
        assignees: [],
        tags: [],
        attachments: [],
        isOverdue: false,
      };

      const result = calculateNextDueDate(task);

      // Previous deadline 2025-10-01 + 7 days = 2025-10-08 (still in past)
      expect(result.deadline).toBe(new Date('2025-10-08T00:00:00.000Z').toISOString());
      expect(result.isOverdue).toBe(true); // Should be marked overdue since Oct 8 < Oct 16
    });

    it('should not mark completed recurring task as overdue', () => {
      const task: Task = {
        id: 1,
        title: 'Completed Recurring Task',
        description: null,
        priority: 1,
        status: 'Completed',
        deadline: '2025-10-01T00:00:00.000Z',
        notes: null,
        recurrence_interval: 7,
        recurrence_date: '2025-10-01T00:00:00.000Z',
        project: { id: 1, name: 'Project' },
        creator: { creator_id: 'user1', user_info: { first_name: 'Test', last_name: 'User' } },
        subtasks: [],
        assignees: [],
        tags: [],
        attachments: [],
        isOverdue: false,
      };

      const result = calculateNextDueDate(task);

      // Even though next due date is in the past, completed tasks aren't marked overdue
      expect(result.isOverdue).toBe(false);
    });

    it('should handle bi-weekly recurring task', () => {
      const task: Task = {
        id: 1,
        title: 'Bi-weekly Task',
        description: null,
        priority: 1,
        status: 'To Do',
        deadline: '2025-10-02T00:00:00.000Z', // Previous due date
        notes: null,
        recurrence_interval: 14, // bi-weekly
        recurrence_date: '2025-10-02T00:00:00.000Z',
        project: { id: 1, name: 'Project' },
        creator: { creator_id: 'user1', user_info: { first_name: 'Test', last_name: 'User' } },
        subtasks: [],
        assignees: [],
        tags: [],
        attachments: [],
        isOverdue: false,
      };

      const result = calculateNextDueDate(task);

      // Previous deadline 2025-10-02 + 14 days = 2025-10-16
      expect(result.deadline).toBe(new Date('2025-10-16T00:00:00.000Z').toISOString());
    });
  });

  describe('formatTasks', () => {
    it('should format tasks with all related data', () => {
      const rawTasks: RawTask[] = [
        {
          id: 1,
          title: 'Task 1',
          description: 'Description 1',
          priority_bucket: 1,
          status: 'To Do',
          deadline: '2025-10-20T00:00:00.000Z',
          notes: 'Notes 1',
          project: { id: 1, name: 'Project A' },
          parent_task_id: null,
          recurrence_interval: 0,
          recurrence_date: null,
          creator_id: 'user1',
          task_assignments: [{ assignee_id: 'user1' }, { assignee_id: 'user2' }],
          tags: [{ tags: { name: 'urgent' } }],
        },
      ];

      const rawSubtasks: RawSubtask[] = [
        {
          id: 2,
          title: 'Subtask 1',
          status: 'To Do',
          deadline: '2025-10-18T00:00:00.000Z',
          parent_task_id: 1,
        },
      ];

      const rawAttachments: RawAttachment[] = [
        {
          id: 1,
          storage_path: 'task-attachments/1/file.pdf',
          task_id: 1,
        },
      ];

      const rawAssignees: RawAssignee[] = [
        { id: 'user1', first_name: 'Alice', last_name: 'Smith' },
        { id: 'user2', first_name: 'Bob', last_name: 'Jones' },
      ];

      const result = formatTasks({
        tasks: rawTasks,
        subtasks: rawSubtasks,
        attachments: rawAttachments,
        assignees: rawAssignees,
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 1,
        title: 'Task 1',
        description: 'Description 1',
        priority: 1,
        status: 'To Do',
        tags: ['urgent'],
      });
      expect(result[0].subtasks).toHaveLength(1);
      expect(result[0].subtasks[0]).toEqual({
        id: 2,
        title: 'Subtask 1',
        status: 'To Do',
        deadline: '2025-10-18T00:00:00.000Z',
      });
      expect(result[0].assignees).toHaveLength(2);
      expect(result[0].assignees[0]).toEqual({
        assignee_id: 'user1',
        user_info: { first_name: 'Alice', last_name: 'Smith' },
      });
      expect(result[0].attachments).toEqual(['task-attachments/1/file.pdf']);
    });

    it('should handle tasks with no subtasks, attachments, or assignees', () => {
      const rawTasks: RawTask[] = [
        {
          id: 1,
          title: 'Simple Task',
          description: null,
          priority_bucket: 2,
          status: 'To Do',
          deadline: null,
          notes: null,
          project: { id: 1, name: 'Project' },
          parent_task_id: null,
          recurrence_interval: 0,
          recurrence_date: null,
          creator_id: 'user1',
          task_assignments: [],
          tags: [],
        },
      ];

      const result = formatTasks({
        tasks: rawTasks,
        subtasks: [],
        attachments: [],
        assignees: [],
      });

      expect(result).toHaveLength(1);
      expect(result[0].subtasks).toEqual([]);
      expect(result[0].assignees).toEqual([]);
      expect(result[0].attachments).toEqual([]);
      expect(result[0].tags).toEqual([]);
    });

    it('should handle unknown assignees gracefully', () => {
      const rawTasks: RawTask[] = [
        {
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
          creator_id: 'user1',
          task_assignments: [{ assignee_id: 'unknown-user' }],
          tags: [],
        },
      ];

      const result = formatTasks({
        tasks: rawTasks,
        subtasks: [],
        attachments: [],
        assignees: [], // No matching assignee
      });

      expect(result[0].assignees).toHaveLength(1);
      expect(result[0].assignees[0]).toEqual({
        assignee_id: 'unknown-user',
        user_info: { first_name: 'Unknown', last_name: 'User' },
      });
    });

    it('should map subtasks to correct parent tasks', () => {
      const rawTasks: RawTask[] = [
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
          creator_id: 'user1',
          task_assignments: [],
          tags: [],
        },
        {
          id: 2,
          title: 'Task 2',
          description: null,
          priority_bucket: 1,
          status: 'To Do',
          deadline: null,
          notes: null,
          project: { id: 1, name: 'Project' },
          parent_task_id: null,
          recurrence_interval: 0,
          recurrence_date: null,
          creator_id: 'user1',
          task_assignments: [],
          tags: [],
        },
      ];

      const rawSubtasks: RawSubtask[] = [
        { id: 3, title: 'Subtask 1-1', status: 'To Do', deadline: null, parent_task_id: 1 },
        { id: 4, title: 'Subtask 1-2', status: 'To Do', deadline: null, parent_task_id: 1 },
        { id: 5, title: 'Subtask 2-1', status: 'To Do', deadline: null, parent_task_id: 2 },
      ];

      const result = formatTasks({
        tasks: rawTasks,
        subtasks: rawSubtasks,
        attachments: [],
        assignees: [],
      });

      expect(result[0].subtasks).toHaveLength(2);
      expect(result[0].subtasks[0].title).toBe('Subtask 1-1');
      expect(result[0].subtasks[1].title).toBe('Subtask 1-2');
      expect(result[1].subtasks).toHaveLength(1);
      expect(result[1].subtasks[0].title).toBe('Subtask 2-1');
    });

    it('should map attachments to correct tasks', () => {
      const rawTasks: RawTask[] = [
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
          creator_id: 'user1',
          task_assignments: [],
          tags: [],
        },
        {
          id: 2,
          title: 'Task 2',
          description: null,
          priority_bucket: 1,
          status: 'To Do',
          deadline: null,
          notes: null,
          project: { id: 1, name: 'Project' },
          parent_task_id: null,
          recurrence_interval: 0,
          recurrence_date: null,
          creator_id: 'user1',
          task_assignments: [],
          tags: [],
        },
      ];

      const rawAttachments: RawAttachment[] = [
        { id: 1, storage_path: 'task-attachments/1/file1.pdf', task_id: 1 },
        { id: 2, storage_path: 'task-attachments/1/file2.pdf', task_id: 1 },
        { id: 3, storage_path: 'task-attachments/2/file3.pdf', task_id: 2 },
      ];

      const result = formatTasks({
        tasks: rawTasks,
        subtasks: [],
        attachments: rawAttachments,
        assignees: [],
      });

      expect(result[0].attachments).toEqual([
        'task-attachments/1/file1.pdf',
        'task-attachments/1/file2.pdf',
      ]);
      expect(result[1].attachments).toEqual(['task-attachments/2/file3.pdf']);
    });

    it('should format multiple tasks correctly', () => {
      const rawTasks: RawTask[] = [
        {
          id: 1,
          title: 'Task 1',
          description: null,
          priority_bucket: 1,
          status: 'To Do',
          deadline: null,
          notes: null,
          project: { id: 1, name: 'Project A' },
          parent_task_id: null,
          recurrence_interval: 7,
          recurrence_date: '2025-10-01T00:00:00.000Z',
          creator_id: 'user1',
          task_assignments: [],
          tags: [],
        },
        {
          id: 2,
          title: 'Task 2',
          description: null,
          priority_bucket: 2,
          status: 'In Progress',
          deadline: null,
          notes: null,
          project: { id: 2, name: 'Project B' },
          parent_task_id: null,
          recurrence_interval: 0,
          recurrence_date: null,
          creator_id: 'user1',
          task_assignments: [],
          tags: [],
        },
      ];

      const result = formatTasks({
        tasks: rawTasks,
        subtasks: [],
        attachments: [],
        assignees: [],
      });

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Task 1');
      expect(result[0].recurrence_interval).toBe(7);
      expect(result[1].title).toBe('Task 2');
      expect(result[1].recurrence_interval).toBe(0);
    });
  });

  describe('formatTaskDetails', () => {
    it('should return null if raw task is null', () => {
      const result = formatTaskDetails({
        task: null,
        subtasks: [],
        attachments: [],
        comments: [],
        assignees: [],
      });

      expect(result).toBeNull();
    });

    it('should format task details with all data', () => {
      const rawTask: RawTask = {
        id: 1,
        title: 'Detailed Task',
        description: 'Full description',
        priority_bucket: 1,
        status: 'In Progress',
        deadline: '2025-10-20T00:00:00.000Z',
        notes: 'Important notes',
        project: { id: 1, name: 'Project A' },
        parent_task_id: null,
        recurrence_interval: 7,
        recurrence_date: '2025-10-16T00:00:00.000Z',
        creator_id: 'user1',
        task_assignments: [{ assignee_id: 'user1' }],
        tags: [{ tags: { name: 'urgent' } }, { tags: { name: 'backend' } }],
      };

      const rawSubtasks: RawSubtask[] = [
        { id: 2, title: 'Subtask 1', status: 'Completed', deadline: null, parent_task_id: 1 },
      ];

      const rawAttachments = [
        {
          id: 1,
          storage_path: 'task-attachments/1/design.pdf',
          public_url: 'https://example.com/design.pdf',
        },
      ];

      const rawComments: RawComment[] = [
        {
          id: 1,
          content: 'Great progress!',
          created_at: '2025-10-15T10:00:00.000Z',
          user_id: 'user2',
        },
      ];

      const rawAssignees: RawAssignee[] = [
        { id: 'user1', first_name: 'Alice', last_name: 'Smith' },
        { id: 'user2', first_name: 'Bob', last_name: 'Jones' },
      ];

      const result = formatTaskDetails({
        task: rawTask,
        subtasks: rawSubtasks,
        attachments: rawAttachments,
        comments: rawComments,
        assignees: rawAssignees,
      });

      expect(result).not.toBeNull();
      expect(result!.id).toBe(1);
      expect(result!.title).toBe('Detailed Task');
      expect(result!.recurrence_interval).toBe(7);
      expect(result!.subtasks).toHaveLength(1);
      expect(result!.attachments).toHaveLength(1);
      expect(result!.attachments[0]).toEqual({
        id: 1,
        storage_path: 'task-attachments/1/design.pdf',
        public_url: 'https://example.com/design.pdf',
      });
      expect(result!.comments).toHaveLength(1);
      expect(result!.comments[0]).toMatchObject({
        id: 1,
        content: 'Great progress!',
        user_id: 'user2',
        user_info: { id: 'user2', first_name: 'Bob', last_name: 'Jones' },
      });
      expect(result!.assignees[0]).toEqual({
        assignee_id: 'user1',
        user_info: { id: 'user1', first_name: 'Alice', last_name: 'Smith' },
      });
    });

    it('should handle task with no comments', () => {
      const rawTask: RawTask = {
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
        creator_id: 'user1',
        task_assignments: [],
        tags: [],
      };

      const result = formatTaskDetails({
        task: rawTask,
        subtasks: [],
        attachments: [],
        comments: [],
        assignees: [],
      });

      expect(result!.comments).toEqual([]);
    });

    it('should handle unknown users in comments', () => {
      const rawTask: RawTask = {
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
        creator_id: 'user1',
        task_assignments: [],
        tags: [],
      };

      const rawComments: RawComment[] = [
        {
          id: 1,
          content: 'Comment from unknown user',
          created_at: '2025-10-15T10:00:00.000Z',
          user_id: 'unknown-user',
        },
      ];

      const result = formatTaskDetails({
        task: rawTask,
        subtasks: [],
        attachments: [],
        comments: rawComments,
        assignees: [], // No matching user
      });

      expect(result!.comments[0].user_info).toEqual({
        id: 'unknown-user',
        first_name: 'Unknown',
        last_name: 'User',
      });
    });

    it('should handle attachments without public URLs', () => {
      const rawTask: RawTask = {
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
        creator_id: 'user1',
        task_assignments: [],
        tags: [],
      };

      const rawAttachments = [
        {
          id: 1,
          storage_path: 'task-attachments/1/file.pdf',
        },
      ];

      const result = formatTaskDetails({
        task: rawTask,
        subtasks: [],
        attachments: rawAttachments,
        comments: [],
        assignees: [],
      });

      expect(result!.attachments[0]).toEqual({
        id: 1,
        storage_path: 'task-attachments/1/file.pdf',
      });
    });

    it('should handle unknown assignees gracefully', () => {
      const rawTask: RawTask = {
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
        creator_id: 'user1',
        task_assignments: [{ assignee_id: 'unknown-user' }],
        tags: [],
      };

      const result = formatTaskDetails({
        task: rawTask,
        subtasks: [],
        attachments: [],
        comments: [],
        assignees: [],
      });

      expect(result!.assignees[0]).toEqual({
        assignee_id: 'unknown-user',
        user_info: {
          id: 'unknown-user',
          first_name: 'Unknown',
          last_name: 'User',
        },
      });
    });
  });

  // Add these tests after the existing formatTaskDetails tests
  
  describe('Task Update Services', () => {
    describe('updateTitle', () => {
      it('should update task title successfully', async () => {
        const mockTaskId = 1;
        const newTitle = 'Updated Title';
        const userId = 'user1';
  
        vi.mocked(getTaskPermissionDataDB).mockResolvedValue({
          creator_id: userId,
          assignee_ids: [],
        });
  
        vi.mocked(updateTaskTitleDB).mockResolvedValue({
          id: mockTaskId,
          title: newTitle,
        });
  
        const result = await updateTitle(mockTaskId, newTitle, userId);
  
        expect(result).toEqual({ id: mockTaskId, title: newTitle });
        expect(getTaskPermissionDataDB).toHaveBeenCalledWith(mockTaskId);
        expect(updateTaskTitleDB).toHaveBeenCalledWith(mockTaskId, newTitle);
      });
  
      it('should throw error when title is empty', async () => {
        await expect(updateTitle(1, '', 'user1')).rejects.toThrow('Title cannot be empty');
        await expect(updateTitle(1, '   ', 'user1')).rejects.toThrow('Title cannot be empty');
      });
  
      it('should throw error when title exceeds 200 characters', async () => {
        const longTitle = 'a'.repeat(201);
        await expect(updateTitle(1, longTitle, 'user1')).rejects.toThrow(
          'Title cannot exceed 200 characters'
        );
      });
  
      it('should throw error when user has no permission', async () => {
        vi.mocked(getTaskPermissionDataDB).mockResolvedValue({
          creator_id: 'user2',
          assignee_ids: ['user3'],
        });
  
        await expect(updateTitle(1, 'New Title', 'user1')).rejects.toThrow(
          'You do not have permission to update this task'
        );
      });
  
      it('should allow creator to update title', async () => {
        vi.mocked(getTaskPermissionDataDB).mockResolvedValue({
          creator_id: 'user1',
          assignee_ids: [],
        });
  
        vi.mocked(updateTaskTitleDB).mockResolvedValue({
          id: 1,
          title: 'New Title',
        });
  
        await expect(updateTitle(1, 'New Title', 'user1')).resolves.not.toThrow();
      });
  
      it('should allow assignee to update title', async () => {
        vi.mocked(getTaskPermissionDataDB).mockResolvedValue({
          creator_id: 'user2',
          assignee_ids: ['user1', 'user3'],
        });
  
        vi.mocked(updateTaskTitleDB).mockResolvedValue({
          id: 1,
          title: 'New Title',
        });
  
        await expect(updateTitle(1, 'New Title', 'user1')).resolves.not.toThrow();
      });
    });
  
    describe('updateDescription', () => {
      it('should update task description successfully', async () => {
        const mockTaskId = 1;
        const newDescription = 'Updated description';
        const userId = 'user1';
  
        vi.mocked(getTaskPermissionDataDB).mockResolvedValue({
          creator_id: userId,
          assignee_ids: [],
        });
  
        vi.mocked(updateTaskDescriptionDB).mockResolvedValue({
          id: mockTaskId,
          description: newDescription,
        });
  
        const result = await updateDescription(mockTaskId, newDescription, userId);
  
        expect(result).toEqual({ id: mockTaskId, description: newDescription });
      });
  
      it('should throw error when description is not a string or null', async () => {
        await expect(updateDescription(1, 123 as any, 'user1')).rejects.toThrow(
          'Description must be a string or null'
        );
      });
  
      it('should throw error when description exceeds 2000 characters', async () => {
        const longDescription = 'a'.repeat(2001);
        await expect(updateDescription(1, longDescription, 'user1')).rejects.toThrow(
          'Description cannot exceed 2000 characters'
        );
      });
  
      it('should throw error when user has no permission', async () => {
        vi.mocked(getTaskPermissionDataDB).mockResolvedValue({
          creator_id: 'user2',
          assignee_ids: [],
        });
  
        await expect(updateDescription(1, 'New Description', 'user1')).rejects.toThrow(
          'You do not have permission to update this task'
        );
      });
  
      it('should allow empty description', async () => {
        vi.mocked(getTaskPermissionDataDB).mockResolvedValue({
          creator_id: 'user1',
          assignee_ids: [],
        });
  
        vi.mocked(updateTaskDescriptionDB).mockResolvedValue({
          id: 1,
          description: '',
        });
  
        const result = await updateDescription(1, '', 'user1');
        expect(result.description).toBe('');
      });
    });
  
    describe('updateStatus', () => {
      it('should update task status successfully', async () => {
        vi.mocked(getTaskPermissionDataDB).mockResolvedValue({
          creator_id: 'user1',
          assignee_ids: [],
        });
  
        vi.mocked(updateTaskStatusDB).mockResolvedValue({
          id: 1,
          status: 'In Progress',
        });
  
        const result = await updateStatus(1, 'In Progress', 'user1');
  
        expect(result).toEqual({ id: 1, status: 'In Progress' });
        expect(updateTaskStatusDB).toHaveBeenCalledWith(1, 'In Progress');
      });
  
      it('should throw error for invalid status', async () => {
        await expect(updateStatus(1, 'Invalid Status' as any, 'user1')).rejects.toThrow(
          'Invalid status. Must be one of: To Do, In Progress, Completed, Blocked'
        );
      });
  
      it('should throw error when user has no permission', async () => {
        vi.mocked(getTaskPermissionDataDB).mockResolvedValue({
          creator_id: 'user2',
          assignee_ids: [],
        });
  
        await expect(updateStatus(1, 'Completed', 'user1')).rejects.toThrow(
          'You do not have permission to update this task'
        );
      });
  
      it('should accept all valid statuses', async () => {
        vi.mocked(getTaskPermissionDataDB).mockResolvedValue({
          creator_id: 'user1',
          assignee_ids: [],
        });
      
        vi.mocked(updateTaskStatusDB).mockImplementation(
          async (id: number, status: string) => ({
            id,
            status,
          })
        );
      
        const validStatuses: Array<'To Do' | 'In Progress' | 'Completed' | 'Blocked'> = [
          'To Do',
          'In Progress',
          'Completed',
          'Blocked',
        ];
      
        for (const status of validStatuses) {
          await expect(updateStatus(1, status, 'user1')).resolves.not.toThrow();
        }
      });
  
      it('should handle recurring task creation on completion', async () => {
        const mockTask: DetailedTask = {
          id: 1,
          title: 'Recurring Task',
          description: 'Test',
          priority: 5,
          status: 'To Do',
          deadline: '2025-10-20T00:00:00.000Z',
          notes: null,
          recurrence_interval: 7,
          recurrence_date: '2025-10-16T00:00:00.000Z',
          project: { id: 1, name: 'Project' },
          creator: { creator_id: 'user1', user_info: { first_name: 'Test', last_name: 'User' } },
          subtasks: [],
          assignees: [
            {
              assignee_id: 'user2',
              user_info: { first_name: 'Alice', last_name: 'Smith' },
            },
          ],
          attachments: [],
          comments: [],
          tags: [],
          isOverdue: false,
        };

        vi.mocked(getTaskPermissionDataDB).mockResolvedValue({
          creator_id: 'user1',
          assignee_ids: ['user2'],
        });

        vi.mocked(updateTaskStatusDB).mockResolvedValue({
          id: 1,
          status: 'Completed',
        });

        vi.mocked(getTaskById).mockResolvedValue({
          task: {
            id: 1,
            title: 'Recurring Task',
            description: 'Test',
            priority_bucket: 5,
            status: 'To Do',
            deadline: '2025-10-20T00:00:00.000Z',
            notes: null,
            recurrence_interval: 7,
            recurrence_date: '2025-10-16T00:00:00.000Z',
            project: { id: 1, name: 'Project' },
            parent_task_id: null,
            creator_id: 'user1',
            task_assignments: [{ assignee_id: 'user2' }],
            tags: [],
          },
          subtasks: [],
          attachments: [],
          comments: [],
          assignees: [{ id: 'user2', first_name: 'Alice', last_name: 'Smith' }],
        } as any);

        // Mock createTask to avoid side effects
        vi.mocked(createTask as any).mockResolvedValue(2);

        await expect(updateStatus(1, 'Completed', 'user1')).resolves.not.toThrow();
      });
    });
  
    describe('updatePriority', () => {
      it('should update task priority successfully', async () => {
        vi.mocked(getTaskPermissionDataDB).mockResolvedValue({
          creator_id: 'user1',
          assignee_ids: [],
        });
  
        vi.mocked(updateTaskPriorityDB).mockResolvedValue({
          id: 1,
          priority_bucket: 8,
        });
  
        const result = await updatePriority(1, 8, 'user1');
  
        expect(result).toEqual({ id: 1, priority_bucket: 8 });
      });
  
      it('should throw error for priority < 1', async () => {
        await expect(updatePriority(1, 0, 'user1')).rejects.toThrow(
          'Priority must be a number between 1 and 10'
        );
      });
  
      it('should throw error for priority > 10', async () => {
        await expect(updatePriority(1, 11, 'user1')).rejects.toThrow(
          'Priority must be a number between 1 and 10'
        );
      });
  
      it('should throw error for non-number priority', async () => {
        await expect(updatePriority(1, 'high' as any, 'user1')).rejects.toThrow(
          'Priority must be a number between 1 and 10'
        );
      });
  
      it('should throw error when user has no permission', async () => {
        vi.mocked(getTaskPermissionDataDB).mockResolvedValue({
          creator_id: 'user2',
          assignee_ids: [],
        });
  
        await expect(updatePriority(1, 5, 'user1')).rejects.toThrow(
          'You do not have permission to update this task'
        );
      });
  
      it('should accept all valid priorities 1-10', async () => {
        vi.mocked(getTaskPermissionDataDB).mockResolvedValue({
          creator_id: 'user1',
          assignee_ids: [],
        });
      
        vi.mocked(updateTaskPriorityDB).mockImplementation(
          async (id: number, priority: number) => ({
            id,
            priority_bucket: priority,
          })
        );
      
        for (let priority = 1; priority <= 10; priority++) {
          await expect(updatePriority(1, priority, 'user1')).resolves.not.toThrow();
        }
      });
    });
  
    describe('updateDeadline', () => {
      it('should update task deadline successfully', async () => {
        const newDeadline = '2025-12-31T23:59:59.000Z';
  
        vi.mocked(getTaskPermissionDataDB).mockResolvedValue({
          creator_id: 'user1',
          assignee_ids: [],
        });
  
        vi.mocked(updateTaskDeadlineDB).mockResolvedValue({
          id: 1,
          deadline: newDeadline,
        });
  
        const result = await updateDeadline(1, newDeadline, 'user1');
  
        expect(result).toEqual({ id: 1, deadline: newDeadline });
      });
  
      it('should allow null deadline', async () => {
        vi.mocked(getTaskPermissionDataDB).mockResolvedValue({
          creator_id: 'user1',
          assignee_ids: [],
        });
  
        vi.mocked(updateTaskDeadlineDB).mockResolvedValue({
          id: 1,
          deadline: null,
        });
  
        const result = await updateDeadline(1, null, 'user1');
  
        expect(result.deadline).toBeNull();
      });
  
      it('should throw error for invalid date string', async () => {
        await expect(updateDeadline(1, 'invalid-date', 'user1')).rejects.toThrow(
          'Invalid date format'
        );
      });
  
      it('should throw error when deadline is not a string or null', async () => {
        await expect(updateDeadline(1, 123 as any, 'user1')).rejects.toThrow(
          'Deadline must be a date string or null'
        );
      });
  
      it('should warn but allow past deadline', async () => {
        const pastDate = '2020-01-01T00:00:00.000Z';
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  
        vi.mocked(getTaskPermissionDataDB).mockResolvedValue({
          creator_id: 'user1',
          assignee_ids: [],
        });
  
        vi.mocked(updateTaskDeadlineDB).mockResolvedValue({
          id: 1,
          deadline: pastDate,
        });
  
        await expect(updateDeadline(1, pastDate, 'user1')).resolves.not.toThrow();
        expect(warnSpy).toHaveBeenCalled();
  
        warnSpy.mockRestore();
      });
  
      it('should throw error when user has no permission', async () => {
        vi.mocked(getTaskPermissionDataDB).mockResolvedValue({
          creator_id: 'user2',
          assignee_ids: [],
        });
  
        await expect(
          updateDeadline(1, '2025-12-31T00:00:00.000Z', 'user1')
        ).rejects.toThrow('You do not have permission to update this task');
      });
    });
  
    describe('updateNotes', () => {
      it('should update task notes successfully', async () => {
        const newNotes = 'Updated notes';
  
        vi.mocked(getTaskPermissionDataDB).mockResolvedValue({
          creator_id: 'user1',
          assignee_ids: [],
        });
  
        vi.mocked(updateTaskNotesDB).mockResolvedValue({
          id: 1,
          notes: newNotes,
        });
  
        const result = await updateNotes(1, newNotes, 'user1');
  
        expect(result).toEqual({ id: 1, notes: newNotes });
      });
  
      it('should throw error when notes is not a string', async () => {
        await expect(updateNotes(1, null as any, 'user1')).rejects.toThrow(
          'Notes must be a string'
        );
      });
  
      it('should throw error when notes exceed 1000 characters', async () => {
        const longNotes = 'a'.repeat(1001);
        await expect(updateNotes(1, longNotes, 'user1')).rejects.toThrow(
          'Notes cannot exceed 1000 characters'
        );
      });
  
      it('should allow empty notes', async () => {
        vi.mocked(getTaskPermissionDataDB).mockResolvedValue({
          creator_id: 'user1',
          assignee_ids: [],
        });
  
        vi.mocked(updateTaskNotesDB).mockResolvedValue({
          id: 1,
          notes: '',
        });
  
        const result = await updateNotes(1, '', 'user1');
        expect(result.notes).toBe('');
      });
  
      it('should throw error when user has no permission', async () => {
        vi.mocked(getTaskPermissionDataDB).mockResolvedValue({
          creator_id: 'user2',
          assignee_ids: [],
        });
  
        await expect(updateNotes(1, 'New Notes', 'user1')).rejects.toThrow(
          'You do not have permission to update this task'
        );
      });
    });
  
    describe('updateRecurrence', () => {
      it('should update task recurrence successfully', async () => {
        const recurrenceInterval = 7;
        const recurrenceDate = '2025-12-20T00:00:00.000Z';
  
        vi.mocked(getTaskPermissionDataDB).mockResolvedValue({
          creator_id: 'user1',
          assignee_ids: [],
        });
  
        vi.mocked(updateTaskRecurrenceDB).mockResolvedValue({
          id: 1,
          recurrence_interval: recurrenceInterval,
          recurrence_date: recurrenceDate,
        });
  
        const result = await updateRecurrence(1, recurrenceInterval, recurrenceDate, 'user1');
  
        expect(result).toEqual({
          id: 1,
          recurrence_interval: recurrenceInterval,
          recurrence_date: recurrenceDate,
        });
      });
  
      it('should accept valid recurrence intervals', async () => {
        vi.mocked(getTaskPermissionDataDB).mockResolvedValue({
          creator_id: 'user1',
          assignee_ids: [],
        });
      
        vi.mocked(updateTaskRecurrenceDB).mockImplementation(
          async (id: number, interval: number, date: string | null) => ({
            id,
            recurrence_interval: interval,
            recurrence_date: date,
          })
        );
      
        const validIntervals = [0, 1, 7, 30];
        for (const interval of validIntervals) {
          await expect(
            updateRecurrence(1, interval, '2025-12-20T00:00:00.000Z', 'user1')
          ).resolves.not.toThrow();
        }
      });
  
      it('should throw error for invalid recurrence interval', async () => {
        vi.mocked(getTaskPermissionDataDB).mockResolvedValue({
          creator_id: 'user1',
          assignee_ids: [],
        });
  
        await expect(updateRecurrence(1, 5, '2025-10-20T00:00:00.000Z', 'user1')).rejects.toThrow(
          'Invalid recurrence interval. Must be 0, 1, 7, or 30 days'
        );
      });
  
      it('should throw error when setting recurrence without date', async () => {
        vi.mocked(getTaskPermissionDataDB).mockResolvedValue({
          creator_id: 'user1',
          assignee_ids: [],
        });
  
        await expect(updateRecurrence(1, 7, null, 'user1')).rejects.toThrow(
          'Recurrence date is required when setting up recurrence'
        );
      });
  
      it('should throw error for invalid recurrence date', async () => {
        vi.mocked(getTaskPermissionDataDB).mockResolvedValue({
          creator_id: 'user1',
          assignee_ids: [],
        });
  
        await expect(updateRecurrence(1, 7, 'invalid-date', 'user1')).rejects.toThrow(
          'Invalid recurrence date'
        );
      });
  
      it('should throw error when recurrence date is in the past', async () => {
        vi.mocked(getTaskPermissionDataDB).mockResolvedValue({
          creator_id: 'user1',
          assignee_ids: [],
        });
  
        await expect(updateRecurrence(1, 7, '2020-01-01T00:00:00.000Z', 'user1')).rejects.toThrow(
          'Recurrence date cannot be in the past'
        );
      });
  
      it('should allow clearing recurrence with interval 0', async () => {
        vi.mocked(getTaskPermissionDataDB).mockResolvedValue({
          creator_id: 'user1',
          assignee_ids: [],
        });
  
        vi.mocked(updateTaskRecurrenceDB).mockResolvedValue({
          id: 1,
          recurrence_interval: 0,
          recurrence_date: null,
        });
  
        await expect(updateRecurrence(1, 0, null, 'user1')).resolves.not.toThrow();
      });
  
      it('should throw error when user has no permission', async () => {
        vi.mocked(getTaskPermissionDataDB).mockResolvedValue({
          creator_id: 'user2',
          assignee_ids: [],
        });
  
        await expect(updateRecurrence(1, 0, null, 'user1')).rejects.toThrow(
          'You do not have permission to update this task'
        );
      });
    });
  
    describe('addTag', () => {
      it('should add tag to task successfully', async () => {
        const tagName = 'urgent';
  
        vi.mocked(getTaskPermissionDataDB).mockResolvedValue({
          creator_id: 'user1',
          assignee_ids: [],
        });
  
        vi.mocked(addTaskTagDB).mockResolvedValue(tagName);
  
        const result = await addTag(1, tagName, 'user1');
  
        expect(result).toBe(tagName);
        expect(addTaskTagDB).toHaveBeenCalledWith(1, tagName);
      });
  
      it('should throw error when tag name is empty', async () => {
        await expect(addTag(1, '', 'user1')).rejects.toThrow('Tag name must be a non-empty string');
        await expect(addTag(1, '   ', 'user1')).rejects.toThrow('Tag name cannot be empty');
      });
  
      it('should throw error when tag name exceeds 50 characters', async () => {
        const longTag = 'a'.repeat(51);
        await expect(addTag(1, longTag, 'user1')).rejects.toThrow(
          'Tag name cannot exceed 50 characters'
        );
      });
  
      it('should throw error when user has no permission', async () => {
        vi.mocked(getTaskPermissionDataDB).mockResolvedValue({
          creator_id: 'user2',
          assignee_ids: [],
        });
  
        await expect(addTag(1, 'urgent', 'user1')).rejects.toThrow(
          'You do not have permission to update this task'
        );
      });
  
      it('should trim tag name', async () => {
        vi.mocked(getTaskPermissionDataDB).mockResolvedValue({
          creator_id: 'user1',
          assignee_ids: [],
        });
  
        vi.mocked(addTaskTagDB).mockResolvedValue('urgent');
  
        await addTag(1, '  urgent  ', 'user1');
  
        expect(addTaskTagDB).toHaveBeenCalledWith(1, 'urgent');
      });
    });
  
    describe('removeTag', () => {
      it('should remove tag from task successfully', async () => {
        const tagName = 'urgent';
  
        vi.mocked(getTaskPermissionDataDB).mockResolvedValue({
          creator_id: 'user1',
          assignee_ids: [],
        });
  
        vi.mocked(removeTaskTagDB).mockResolvedValue(tagName);
  
        const result = await removeTag(1, tagName, 'user1');
  
        expect(result).toBe(tagName);
        expect(removeTaskTagDB).toHaveBeenCalledWith(1, tagName);
      });
  
      it('should throw error when tag name is empty', async () => {
        await expect(removeTag(1, '', 'user1')).rejects.toThrow(
          'Tag name must be a non-empty string'
        );
      });
  
      it('should throw error when user has no permission', async () => {
        vi.mocked(getTaskPermissionDataDB).mockResolvedValue({
          creator_id: 'user2',
          assignee_ids: [],
        });
  
        await expect(removeTag(1, 'urgent', 'user1')).rejects.toThrow(
          'You do not have permission to update this task'
        );
      });
    });
  
    describe('addAssignee', () => {
      it('should add assignee to task successfully', async () => {
        const assigneeId = 'user2';
  
        vi.mocked(getTaskPermissionDataDB).mockResolvedValue({
          creator_id: 'user1',
          assignee_ids: [],
        });
  
        vi.mocked(addTaskAssigneeDB).mockResolvedValue(assigneeId);
  
        const result = await addAssignee(1, assigneeId, 'user1');
  
        expect(result).toBe(assigneeId);
        expect(addTaskAssigneeDB).toHaveBeenCalledWith(1, assigneeId, 'user1');
      });
  
      it('should throw error when assignee ID is empty', async () => {
        await expect(addAssignee(1, '', 'user1')).rejects.toThrow(
          'Assignee ID must be a non-empty string'
        );
      });
  
      it('should throw error when user has no permission', async () => {
        vi.mocked(getTaskPermissionDataDB).mockResolvedValue({
          creator_id: 'user2',
          assignee_ids: [],
        });
  
        await expect(addAssignee(1, 'user3', 'user1')).rejects.toThrow(
          'You do not have permission to update assignees for this task'
        );
      });
    });
  
    describe('removeAssignee', () => {
      it('should remove assignee from task successfully as manager', async () => {
        const assigneeId = 'user2';
  
        vi.mocked(isUserManager).mockResolvedValue(true);
        vi.mocked(removeTaskAssigneeDB).mockResolvedValue(assigneeId);
  
        const result = await removeAssignee(1, assigneeId, 'user1');
  
        expect(result).toBe(assigneeId);
        expect(removeTaskAssigneeDB).toHaveBeenCalledWith(1, assigneeId);
      });
  
      it('should throw error when assignee ID is empty', async () => {
        await expect(removeAssignee(1, '', 'user1')).rejects.toThrow(
          'Assignee ID must be a non-empty string'
        );
      });
  
      it('should throw error when user is not a manager', async () => {
        vi.mocked(isUserManager).mockResolvedValue(false);
  
        await expect(removeAssignee(1, 'user2', 'user1')).rejects.toThrow(
          'Only managers can remove assignees from tasks'
        );
      });
    });
  
    describe('addTaskAttachments', () => {
      it('should add attachments to task successfully', async () => {
        const mockFiles: File[] = [new File(['content'], 'test.pdf', { type: 'application/pdf' })];
  
        vi.mocked(getTaskPermissionDataDB).mockResolvedValue({
          creator_id: 'user1',
          assignee_ids: [],
        });
  
        vi.mocked(getTaskAttachmentsTotalSize).mockResolvedValue(0);
        vi.mocked(addTaskAttachmentsDB).mockResolvedValue([
          { id: 1, storage_path: 'tasks/1/test.pdf' },
        ]);
  
        const result = await addTaskAttachments(1, mockFiles, 'user1');
  
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(1);
      });
  
      it('should throw error when user has no permission', async () => {
        vi.mocked(getTaskPermissionDataDB).mockResolvedValue({
          creator_id: 'user2',
          assignee_ids: [],
        });
  
        const mockFiles = [new File(['content'], 'test.pdf', { type: 'application/pdf' })];
  
        await expect(addTaskAttachments(1, mockFiles, 'user1')).rejects.toThrow(
          'You do not have permission to update this task'
        );
      });
  
      it('should throw error for unsupported file type', async () => {
        vi.mocked(getTaskPermissionDataDB).mockResolvedValue({
          creator_id: 'user1',
          assignee_ids: [],
        });
  
        vi.mocked(getTaskAttachmentsTotalSize).mockResolvedValue(0);
  
        const mockFiles = [new File(['content'], 'test.exe', { type: 'application/x-msdownload' })];
  
        await expect(addTaskAttachments(1, mockFiles, 'user1')).rejects.toThrow(
          'File type not allowed'
        );
      });
  
      it('should throw error when total size exceeds 50MB limit', async () => {
        vi.mocked(getTaskPermissionDataDB).mockResolvedValue({
          creator_id: 'user1',
          assignee_ids: [],
        });
  
        // Simulate 40MB already used
        vi.mocked(getTaskAttachmentsTotalSize).mockResolvedValue(40 * 1024 * 1024);
  
        // Try to add 20MB file (total would be 60MB, exceeding 50MB limit)
        const mockFiles = [
          new File(['x'.repeat(20 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' }),
        ];
  
        await expect(addTaskAttachments(1, mockFiles, 'user1')).rejects.toThrow(
          'Total attachment size would exceed 50MB limit'
        );
      });
    });
  
    describe('removeTaskAttachment', () => {
      it('should remove attachment from task successfully', async () => {
        vi.mocked(getTaskPermissionDataDB).mockResolvedValue({
          creator_id: 'user1',
          assignee_ids: [],
        });
  
        vi.mocked(removeTaskAttachmentDB).mockResolvedValue('tasks/1/test.pdf');
  
        const result = await removeTaskAttachment(1, 1, 'user1');
  
        expect(result).toEqual({ id: 1, removed: true });
        expect(removeTaskAttachmentDB).toHaveBeenCalledWith(1);
      });
  
      it('should throw error when user has no permission', async () => {
        vi.mocked(getTaskPermissionDataDB).mockResolvedValue({
          creator_id: 'user2',
          assignee_ids: [],
        });
  
        await expect(removeTaskAttachment(1, 1, 'user1')).rejects.toThrow(
          'You do not have permission to delete attachments from this task'
        );
      });
    });
  
    describe('addComment', () => {
      it('should add comment to task successfully', async () => {
        const content = 'This is a comment';
  
        vi.mocked(getTaskPermissionDataDB).mockResolvedValue({
          creator_id: 'user1',
          assignee_ids: [],
        });
  
        vi.mocked(addTaskCommentDB).mockResolvedValue({
          id: 1,
          content,
          created_at: '2025-10-16T10:00:00.000Z',
          user_id: 'user1',
        });
  
        const result = await addComment(1, content, 'user1');
  
        expect(result.id).toBe(1);
        expect(result.content).toBe(content);
      });
  
      it('should throw error when comment is empty', async () => {
        await expect(addComment(1, '', 'user1')).rejects.toThrow(
          'Comment content cannot be empty'
        );
        await expect(addComment(1, '   ', 'user1')).rejects.toThrow(
          'Comment content cannot be empty'
        );
      });
  
      it('should throw error when comment exceeds 5000 characters', async () => {
        const longComment = 'a'.repeat(5001);
        await expect(addComment(1, longComment, 'user1')).rejects.toThrow(
          'Comment cannot exceed 5000 characters'
        );
      });
  
      it('should throw error when task does not exist', async () => {
        vi.mocked(getTaskPermissionDataDB).mockResolvedValue(null);
  
        await expect(addComment(999, 'Comment', 'user1')).rejects.toThrow('Task not found');
      });
  
      it('should trim comment content', async () => {
        vi.mocked(getTaskPermissionDataDB).mockResolvedValue({
          creator_id: 'user1',
          assignee_ids: [],
        });
  
        vi.mocked(addTaskCommentDB).mockResolvedValue({
          id: 1,
          content: 'Comment',
          created_at: '2025-10-16T10:00:00.000Z',
          user_id: 'user1',
        });
  
        await addComment(1, '  Comment  ', 'user1');
  
        expect(addTaskCommentDB).toHaveBeenCalledWith(1, 'user1', 'Comment');
      });
    });
  
    describe('updateComment', () => {
      it('should update comment successfully', async () => {
        const newContent = 'Updated comment';
  
        vi.mocked(getCommentAuthorDB).mockResolvedValue('user1');
        vi.mocked(updateTaskCommentDB).mockResolvedValue({
          id: 1,
          content: newContent,
          updated_at: '2025-10-16T11:00:00.000Z',
        });
  
        const result = await updateComment(1, newContent, 'user1');
  
        expect(result.content).toBe(newContent);
      });
  
      it('should throw error when comment is empty', async () => {
        await expect(updateComment(1, '', 'user1')).rejects.toThrow(
          'Comment content cannot be empty'
        );
      });
  
      it('should throw error when comment exceeds 5000 characters', async () => {
        const longComment = 'a'.repeat(5001);
        await expect(updateComment(1, longComment, 'user1')).rejects.toThrow(
          'Comment cannot exceed 5000 characters'
        );
      });
  
      it('should throw error when comment not found', async () => {
        vi.mocked(getCommentAuthorDB).mockResolvedValue(null);
  
        await expect(updateComment(999, 'Comment', 'user1')).rejects.toThrow('Comment not found');
      });
  
      it('should throw error when user is not comment author', async () => {
        vi.mocked(getCommentAuthorDB).mockResolvedValue('user2');
  
        await expect(updateComment(1, 'New content', 'user1')).rejects.toThrow(
          'You can only edit your own comments'
        );
      });
    });
  
    describe('deleteComment', () => {
      it('should delete comment successfully as admin', async () => {
        vi.mocked(checkUserIsAdmin).mockResolvedValue(true);
        vi.mocked(deleteTaskCommentDB).mockResolvedValue(undefined);
  
        await expect(deleteComment(1, 'user1')).resolves.not.toThrow();
        expect(deleteTaskCommentDB).toHaveBeenCalledWith(1);
      });
  
      it('should throw error when user is not admin', async () => {
        vi.mocked(checkUserIsAdmin).mockResolvedValue(false);
  
        await expect(deleteComment(1, 'user1')).rejects.toThrow('Only admins can delete comments');
      });
    });
  
    describe('linkSubtaskToParent', () => {
      it('should link subtask to parent successfully', async () => {
        vi.mocked(getTaskPermissionDataDB).mockResolvedValue({
          creator_id: 'user1',
          assignee_ids: [],
        });
  
        vi.mocked(linkSubtaskToParentDB).mockResolvedValue(undefined);
  
        await expect(linkSubtaskToParent(2, 1)).resolves.not.toThrow();
        expect(linkSubtaskToParentDB).toHaveBeenCalledWith(2, 1);
      });
  
      it('should throw error for invalid subtask ID', async () => {
        await expect(linkSubtaskToParent(0, 1)).rejects.toThrow('Invalid subtask ID');
        await expect(linkSubtaskToParent(-1, 1)).rejects.toThrow('Invalid subtask ID');
      });
  
      it('should throw error for invalid parent task ID', async () => {
        await expect(linkSubtaskToParent(2, 0)).rejects.toThrow('Invalid parent task ID');
        await expect(linkSubtaskToParent(2, -1)).rejects.toThrow('Invalid parent task ID');
      });
  
      it('should prevent self-parenting', async () => {
        await expect(linkSubtaskToParent(1, 1)).rejects.toThrow(
          'A task cannot be its own parent'
        );
      });
  
      it('should throw error when subtask not found', async () => {
        vi.mocked(getTaskPermissionDataDB).mockResolvedValueOnce(null);
  
        await expect(linkSubtaskToParent(999, 1)).rejects.toThrow('Subtask not found');
      });
  
      it('should throw error when parent task not found', async () => {
        vi.mocked(getTaskPermissionDataDB)
          .mockResolvedValueOnce({
            creator_id: 'user1',
            assignee_ids: [],
          })
          .mockResolvedValueOnce(null);
  
        await expect(linkSubtaskToParent(2, 999)).rejects.toThrow('Parent task not found');
      });
    });
  });
});
