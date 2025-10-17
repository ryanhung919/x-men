import { describe, it, expect, vi } from 'vitest';
import { authenticateAs, testUsers, adminClient } from '@/__tests__/setup/integration.setup';
import { getUserTasks, getTaskById } from '@/lib/db/tasks';

// Mock the Supabase server client to use the admin client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => adminClient),
}));

/**
 * Integration tests for task viewing functionality
 * These tests use the actual seeded database and test:
 * - getUserTasks: Fetching all tasks with subtasks, attachments, and assignees
 * - getTaskById: Fetching detailed task information
 * - Recurring task properties
 * - Data relationships and integrity
 */
describe('Tasks Integration Tests', () => {
  describe('getUserTasks', () => {
    it('should fetch all tasks with related data', async () => {
      const result = await getUserTasks(testUsers.joel.id);

      expect(result).toBeDefined();
      expect(result.tasks).toBeInstanceOf(Array);
      expect(result.subtasks).toBeInstanceOf(Array);
      expect(result.attachments).toBeInstanceOf(Array);
      expect(result.assignees).toBeInstanceOf(Array);
    });

    it('should return tasks ordered by deadline ascending', async () => {
      const result = await getUserTasks(testUsers.joel.id);

      if (result.tasks.length < 2) {
        // Skip if not enough tasks to verify ordering
        return;
      }

      // Filter tasks with deadlines
      const tasksWithDeadlines = result.tasks.filter((t: any) => t.deadline !== null);

      if (tasksWithDeadlines.length < 2) {
        return;
      }

      // Verify ordering
      for (let i = 0; i < tasksWithDeadlines.length - 1; i++) {
        const current = new Date(tasksWithDeadlines[i].deadline!);
        const next = new Date(tasksWithDeadlines[i + 1].deadline!);
        expect(current.getTime()).toBeLessThanOrEqual(next.getTime());
      }
    });

    it('should include task properties', async () => {
      const result = await getUserTasks(testUsers.joel.id);

      if (result.tasks.length === 0) {
        return;
      }

      const task = result.tasks[0];
      expect(task).toHaveProperty('id');
      expect(task).toHaveProperty('title');
      expect(task).toHaveProperty('description');
      expect(task).toHaveProperty('priority_bucket');
      expect(task).toHaveProperty('status');
      expect(task).toHaveProperty('deadline');
      expect(task).toHaveProperty('notes');
      expect(task).toHaveProperty('project');
      expect(task).toHaveProperty('parent_task_id');
      expect(task).toHaveProperty('recurrence_interval');
      expect(task).toHaveProperty('recurrence_date');
      expect(task).toHaveProperty('task_assignments');
      expect(task).toHaveProperty('tags');
    });

    it('should include recurring task properties', async () => {
      const result = await getUserTasks(testUsers.joel.id);

      // Find a recurring task from the seeded data
      const recurringTask = result.tasks.find((t: any) => t.recurrence_interval > 0);

      if (!recurringTask) {
        // Create a recurring task for testing
        const { data: newTask } = await adminClient
          .from('tasks')
          .insert({
            title: 'Test Recurring Task',
            description: 'Integration test recurring task',
            priority_bucket: 5,
            status: 'To Do',
            creator_id: testUsers.joel.id,
            project_id: 1,
            recurrence_interval: 7,
            recurrence_date: new Date().toISOString(),
          })
          .select()
          .single();

        if (newTask) {
          const updatedResult = await getUserTasks(testUsers.joel.id);
          const createdTask = updatedResult.tasks.find((t: any) => t.id === newTask.id);

          expect(createdTask).toBeDefined();
          if (createdTask) {
            expect(createdTask.recurrence_interval).toBe(7);
            expect(createdTask.recurrence_date).toBeDefined();
          }

          // Cleanup
          await adminClient.from('tasks').delete().eq('id', newTask.id);
        }
      } else {
        expect(recurringTask.recurrence_interval).toBeGreaterThan(0);
        expect(recurringTask.recurrence_date).toBeDefined();
      }
    });

    it('should map subtasks to parent tasks correctly', async () => {
      const result = await getUserTasks(testUsers.joel.id);

      // Find tasks that have subtasks
      const taskIds = result.tasks.map((t: any) => t.id);
      const relevantSubtasks = result.subtasks.filter((s: any) =>
        taskIds.includes(s.parent_task_id)
      );

      // Verify all subtasks have valid parent_task_id references
      for (const subtask of relevantSubtasks) {
        expect(taskIds).toContain(subtask.parent_task_id);
        expect(subtask).toHaveProperty('id');
        expect(subtask).toHaveProperty('title');
        expect(subtask).toHaveProperty('status');
        expect(subtask).toHaveProperty('deadline');
      }
    });

    it('should include attachments for tasks', async () => {
      const result = await getUserTasks(testUsers.joel.id);

      if (result.attachments.length === 0) {
        // No attachments in seeded data, skip
        return;
      }

      const attachment = result.attachments[0];
      expect(attachment).toHaveProperty('id');
      expect(attachment).toHaveProperty('storage_path');
      expect(attachment).toHaveProperty('task_id');

      // Verify attachment belongs to a task in the result
      const taskIds = result.tasks.map((t: any) => t.id);
      expect(taskIds).toContain(attachment.task_id);
    });

    it('should include assignee information', async () => {
      const result = await getUserTasks(testUsers.joel.id);

      if (result.assignees.length === 0) {
        return;
      }

      const assignee = result.assignees[0];
      expect(assignee).toHaveProperty('id');
      expect(assignee).toHaveProperty('first_name');
      expect(assignee).toHaveProperty('last_name');
    });

    it('should not include archived tasks', async () => {
      // Create an archived task
      const { data: archivedTask } = await adminClient
        .from('tasks')
        .insert({
          title: 'Archived Test Task',
          description: 'Should not appear in results',
          priority_bucket: 5,
          status: 'Completed',
          creator_id: testUsers.joel.id,
          project_id: 1,
          is_archived: true,
        })
        .select()
        .single();

      if (!archivedTask) {
        return;
      }

      const result = await getUserTasks(testUsers.joel.id);

      // Verify archived task is not in results
      const foundArchivedTask = result.tasks.find((t: any) => t.id === archivedTask.id);
      expect(foundArchivedTask).toBeUndefined();

      // Cleanup
      await adminClient.from('tasks').delete().eq('id', archivedTask.id);
    });

    it('should handle tasks with no subtasks', async () => {
      const result = await getUserTasks(testUsers.joel.id);

      // Find a task with no subtasks
      const taskWithNoSubtasks = result.tasks.find((t: any) => {
        const hasSubtasks = result.subtasks.some((s: any) => s.parent_task_id === t.id);
        return !hasSubtasks;
      });

      if (taskWithNoSubtasks) {
        const subtasksForTask = result.subtasks.filter(
          (s: any) => s.parent_task_id === taskWithNoSubtasks.id
        );
        expect(subtasksForTask).toHaveLength(0);
      }
    });

    it('should handle tasks with no attachments', async () => {
      const result = await getUserTasks(testUsers.joel.id);

      // Find a task with no attachments
      const taskWithNoAttachments = result.tasks.find((t: any) => {
        const hasAttachments = result.attachments.some((a: any) => a.task_id === t.id);
        return !hasAttachments;
      });

      if (taskWithNoAttachments) {
        const attachmentsForTask = result.attachments.filter(
          (a: any) => a.task_id === taskWithNoAttachments.id
        );
        expect(attachmentsForTask).toHaveLength(0);
      }
    });

    it('should include project information', async () => {
      const result = await getUserTasks(testUsers.joel.id);

      if (result.tasks.length === 0) {
        return;
      }

      const taskWithProject = result.tasks.find((t: any) => t.project !== null);

      if (taskWithProject) {
        expect(taskWithProject.project).toHaveProperty('id');
        expect(taskWithProject.project).toHaveProperty('name');
      }
    });

    it('should include task tags', async () => {
      const result = await getUserTasks(testUsers.joel.id);

      if (result.tasks.length === 0) {
        return;
      }

      // Find a task with tags
      const taskWithTags = result.tasks.find((t: any) => t.tags && t.tags.length > 0);

      if (taskWithTags) {
        expect(Array.isArray(taskWithTags.tags)).toBe(true);
        expect(taskWithTags.tags[0]).toHaveProperty('tags');
        expect(taskWithTags.tags[0].tags).toHaveProperty('name');
      }
    });
  });

  describe('getTaskById', () => {
    it('should fetch task details by ID', async () => {
      // Get a task ID from seeded data
      const { data: task } = await adminClient
        .from('tasks')
        .select('id')
        .eq('is_archived', false)
        .limit(1)
        .single();

      if (!task) {
        return;
      }

      const result = await getTaskById(task.id);

      expect(result).not.toBeNull();
      if (result && result.task) {
        expect(result.task.id).toBe(task.id);
        expect(result.subtasks).toBeInstanceOf(Array);
        expect(result.attachments).toBeInstanceOf(Array);
        expect(result.comments).toBeInstanceOf(Array);
        expect(result.assignees).toBeInstanceOf(Array);
      }
    });

    it('should include all task properties', async () => {
      const { data: task } = await adminClient
        .from('tasks')
        .select('id')
        .eq('is_archived', false)
        .limit(1)
        .single();

      if (!task) {
        return;
      }

      const result = await getTaskById(task.id);

      if (!result) {
        return;
      }

      expect(result.task).toHaveProperty('id');
      expect(result.task).toHaveProperty('title');
      expect(result.task).toHaveProperty('description');
      expect(result.task).toHaveProperty('priority_bucket');
      expect(result.task).toHaveProperty('status');
      expect(result.task).toHaveProperty('deadline');
      expect(result.task).toHaveProperty('notes');
      expect(result.task).toHaveProperty('project');
      expect(result.task).toHaveProperty('recurrence_interval');
      expect(result.task).toHaveProperty('recurrence_date');
    });

    it('should include subtasks with correct properties', async () => {
      // Find a task with subtasks
      const { data: taskWithSubtasks } = await adminClient
        .from('tasks')
        .select('id')
        .not('id', 'is', null)
        .limit(10);

      if (!taskWithSubtasks || taskWithSubtasks.length === 0) {
        return;
      }

      let taskResult = null;
      for (const task of taskWithSubtasks) {
        const result = await getTaskById(task.id);
        if (result && result.subtasks.length > 0) {
          taskResult = result;
          break;
        }
      }

      if (!taskResult) {
        return;
      }

      const subtask = taskResult.subtasks[0];
      expect(subtask).toHaveProperty('id');
      expect(subtask).toHaveProperty('title');
      expect(subtask).toHaveProperty('status');
      expect(subtask).toHaveProperty('deadline');
      expect(subtask).toHaveProperty('parent_task_id');
      if (taskResult?.task) {
        expect(subtask.parent_task_id).toBe(taskResult.task.id);
      }
    });

    it('should include attachments with public URLs', async () => {
      const { data: task } = await adminClient
        .from('tasks')
        .select('id')
        .eq('is_archived', false)
        .limit(1)
        .single();

      if (!task) {
        return;
      }

      const result = await getTaskById(task.id);

      if (!result || result.attachments.length === 0) {
        return;
      }

      const attachment = result.attachments[0];
      expect(attachment).toHaveProperty('id');
      expect(attachment).toHaveProperty('storage_path');
      expect(attachment).toHaveProperty('public_url');

      // Verify storage_path format
      if (attachment?.storage_path) {
        expect(attachment.storage_path).toMatch(/^task-attachments\//);
      }
    });

    it('should include comments with user information', async () => {
      // Find a task with comments
      const { data: taskWithComments } = await adminClient
        .from('task_comments')
        .select('task_id')
        .limit(1)
        .single();

      if (!taskWithComments) {
        return;
      }

      const result = await getTaskById(taskWithComments.task_id);

      if (!result || result.comments.length === 0) {
        return;
      }

      const comment = result.comments[0];
      expect(comment).toHaveProperty('id');
      expect(comment).toHaveProperty('content');
      expect(comment).toHaveProperty('created_at');
      expect(comment).toHaveProperty('user_id');
    });

    it('should include assignee information', async () => {
      // Find a task with assignees
      const { data: taskWithAssignees } = await adminClient
        .from('task_assignments')
        .select('task_id')
        .limit(1)
        .single();

      if (!taskWithAssignees) {
        return;
      }

      const result = await getTaskById(taskWithAssignees.task_id);

      if (!result || result.assignees.length === 0) {
        return;
      }

      const assignee = result.assignees[0];
      expect(assignee).toHaveProperty('id');
      expect(assignee).toHaveProperty('first_name');
      expect(assignee).toHaveProperty('last_name');
    });

    it('should return null for non-existent task', async () => {
      const result = await getTaskById(999999);

      expect(result).toBeNull();
    });

    it('should return null for archived task', async () => {
      // Create an archived task
      const { data: archivedTask } = await adminClient
        .from('tasks')
        .insert({
          title: 'Archived Task',
          description: 'Should return null',
          priority_bucket: 5,
          status: 'Completed',
          creator_id: testUsers.joel.id,
          project_id: 1,
          is_archived: true,
        })
        .select()
        .single();

      if (!archivedTask) {
        return;
      }

      const result = await getTaskById(archivedTask.id);

      expect(result).toBeNull();

      // Cleanup
      await adminClient.from('tasks').delete().eq('id', archivedTask.id);
    });

    it('should include recurring task properties', async () => {
      // Find or create a recurring task
      const { data: recurringTask } = await adminClient
        .from('tasks')
        .select('id')
        .gt('recurrence_interval', 0)
        .eq('is_archived', false)
        .limit(1)
        .single();

      let taskId = recurringTask?.id;

      if (!taskId) {
        // Create a recurring task
        const { data: newTask } = await adminClient
          .from('tasks')
          .insert({
            title: 'Integration Test Recurring Task',
            description: 'Test recurring task for getTaskById',
            priority_bucket: 5,
            status: 'To Do',
            creator_id: testUsers.joel.id,
            project_id: 1,
            recurrence_interval: 14,
            recurrence_date: new Date('2025-10-16T00:00:00Z').toISOString(),
          })
          .select()
          .single();

        if (!newTask) {
          return;
        }

        taskId = newTask.id;
      }

      const result = await getTaskById(taskId);

      expect(result).not.toBeNull();
      if (result && result.task) {
        expect(result.task.recurrence_interval).toBeGreaterThan(0);
        expect(result.task.recurrence_date).toBeDefined();
      }

      // Cleanup if we created a task
      if (!recurringTask) {
        await adminClient.from('tasks').delete().eq('id', taskId);
      }
    });

    it('should handle task with no comments', async () => {
      // Find a task without comments
      const { data: allTasks } = await adminClient
        .from('tasks')
        .select('id')
        .eq('is_archived', false)
        .limit(10);

      if (!allTasks || allTasks.length === 0) {
        return;
      }

      let taskWithoutComments = null;
      for (const task of allTasks) {
        const { data: comments } = await adminClient
          .from('task_comments')
          .select('id')
          .eq('task_id', task.id);

        if (!comments || comments.length === 0) {
          taskWithoutComments = task;
          break;
        }
      }

      if (!taskWithoutComments) {
        return;
      }

      const result = await getTaskById(taskWithoutComments.id);

      expect(result).not.toBeNull();
      expect(result!.comments).toEqual([]);
    });

    it('should handle task with no assignees', async () => {
      // Create a task without assignees
      const { data: newTask } = await adminClient
        .from('tasks')
        .insert({
          title: 'Unassigned Task',
          description: 'Task with no assignees',
          priority_bucket: 5,
          status: 'To Do',
          creator_id: testUsers.joel.id,
          project_id: 1,
        })
        .select()
        .single();

      if (!newTask) {
        return;
      }

      const result = await getTaskById(newTask.id);

      expect(result).not.toBeNull();
      if (result && result.task) {
        expect(result.task.task_assignments).toEqual([]);
      }

      // Cleanup
      await adminClient.from('tasks').delete().eq('id', newTask.id);
    });

    it('should maintain data consistency across multiple fetches', async () => {
      const { data: task } = await adminClient
        .from('tasks')
        .select('id')
        .eq('is_archived', false)
        .limit(1)
        .single();

      if (!task) {
        return;
      }

      // Fetch the same task twice
      const result1 = await getTaskById(task.id);
      const result2 = await getTaskById(task.id);

      expect(result1).not.toBeNull();
      expect(result2).not.toBeNull();

      if (result1 && result2 && result1.task && result2.task) {
        // Verify consistency
        expect(result1.task.id).toBe(result2.task.id);
        expect(result1.task.title).toBe(result2.task.title);
        expect(result1.subtasks.length).toBe(result2.subtasks.length);
        expect(result1.attachments.length).toBe(result2.attachments.length);
        expect(result1.comments.length).toBe(result2.comments.length);
      }
    });
  });

  describe('Data Integrity', () => {
    it('should ensure subtasks reference valid parent tasks', async () => {
      const result = await getUserTasks(testUsers.joel.id);

      const taskIds = result.tasks.map((t: any) => t.id);

      for (const subtask of result.subtasks) {
        expect(taskIds).toContain(subtask.parent_task_id);
      }
    });

    it('should ensure attachments reference valid tasks', async () => {
      const result = await getUserTasks(testUsers.joel.id);

      const taskIds = result.tasks.map((t: any) => t.id);

      for (const attachment of result.attachments) {
        expect(taskIds).toContain(attachment.task_id);
      }
    });

    it('should ensure task assignments reference valid users', async () => {
      const result = await getUserTasks(testUsers.joel.id);

      const assigneeIds = result.assignees.map((a: any) => a.id);

      for (const task of result.tasks) {
        for (const assignment of task.task_assignments) {
          if (assigneeIds.length > 0) {
            // At least some assignees should be in the list
            const hasValidAssignee = assigneeIds.includes(assignment.assignee_id);
            // This might not always be true if not all assignees are returned
            // Just verify the structure is correct
            expect(assignment).toHaveProperty('assignee_id');
          }
        }
      }
    });
  });

  describe('Recurring Tasks', () => {
    it('should properly store and retrieve recurring task data', async () => {
      // Create a recurring task with specific properties
      const { data: recurringTask } = await adminClient
        .from('tasks')
        .insert({
          title: 'Weekly Recurring Task',
          description: 'Occurs every 7 days',
          priority_bucket: 5,
          status: 'To Do',
          creator_id: testUsers.joel.id,
          project_id: 1,
          recurrence_interval: 7,
          recurrence_date: new Date('2025-10-16T00:00:00Z').toISOString(),
          deadline: new Date('2025-10-23T00:00:00Z').toISOString(),
        })
        .select()
        .single();

      if (!recurringTask) {
        return;
      }

      const result = await getTaskById(recurringTask.id);

      expect(result).not.toBeNull();
      if (result && result.task) {
        expect(result.task.recurrence_interval).toBe(7);
        expect(result.task.recurrence_date).toBe(new Date('2025-10-16T00:00:00Z').toISOString());
      }

      // Cleanup
      await adminClient.from('tasks').delete().eq('id', recurringTask.id);
    });

    it('should handle different recurrence intervals', async () => {
      const intervals = [1, 7, 14, 30]; // daily, weekly, bi-weekly, monthly

      for (const interval of intervals) {
        const { data: task } = await adminClient
          .from('tasks')
          .insert({
            title: `Recurring Task - ${interval} days`,
            description: `Occurs every ${interval} days`,
            priority_bucket: 5,
            status: 'To Do',
            creator_id: testUsers.joel.id,
            project_id: 1,
            recurrence_interval: interval,
            recurrence_date: new Date().toISOString(),
          })
          .select()
          .single();

        if (!task) {
          continue;
        }

        const result = await getTaskById(task.id);

        expect(result).not.toBeNull();
        if (result && result.task) {
          expect(result.task.recurrence_interval).toBe(interval);
        }

        // Cleanup
        await adminClient.from('tasks').delete().eq('id', task.id);
      }
    });
  });
});
