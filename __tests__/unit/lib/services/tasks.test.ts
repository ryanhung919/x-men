import { describe, it, expect, beforeEach } from 'vitest';
import {
  mapTaskAttributes,
  calculateNextDueDate,
  formatTasks,
  formatTaskDetails,
  RawTask,
  RawSubtask,
  RawAttachment,
  RawAssignee,
  RawComment,
  Task,
} from '@/lib/services/tasks';

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
        subtasks: [],
        assignees: [],
        tags: [],
        attachments: [],
        isOverdue: false,
      };

      const result = calculateNextDueDate(task);

      // Previous deadline 2025-09-10 + 30 days = 2025-10-10
      expect(result.deadline).toBe(new Date('2025-10-10T00:00:00.000Z').toISOString());
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
});
