import { describe, it, expect, afterEach, vi } from 'vitest';
import { testUsers, adminClient } from '@/__tests__/setup/integration.setup';
import { archiveTask, createTask, getUserTasks, getTaskById } from '@/lib/db/tasks';
import { CreateTaskPayload } from '@/lib/types/task-creation';

// Mock the Supabase server client to use the admin client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => adminClient),
}));

/**
 * Integration tests for Task Archival functionality
 *
 * Acceptance Criteria:
 * AC1: Only managers can archive/unarchive tasks (tested in API route tests)
 * AC2: When a task is archived, all its subtasks are automatically archived
 * AC3: When a task is unarchived, all its subtasks are automatically unarchived
 * AC4: Archived tasks do not appear in the active task list (getUserTasks)
 * AC5: Archived tasks return null when fetched individually (getTaskById)
 * AC6: The archive operation returns the count of affected tasks (parent + subtasks)
 * AC7: Archiving validates inputs properly (task ID must exist, is_archived must be boolean)
 */
describe('Task Archive Integration Tests', () => {
  let createdTaskIds: number[] = [];

  // Helper function to create a task with subtasks using createTask
  async function createTaskWithSubtasks(subtaskCount: number = 2): Promise<{
    parentId: number;
    subtaskIds: number[];
  }> {
    const parentPayload: CreateTaskPayload = {
      project_id: 1,
      title: 'Archive Test Parent Task',
      description: 'Parent task for archive testing',
      priority_bucket: 5,
      status: 'To Do',
      assignee_ids: [testUsers.joel.id],
      deadline: new Date('2025-12-31T23:59:59Z').toISOString(),
    };

    const parentId = await createTask(adminClient, parentPayload, testUsers.joel.id);
    createdTaskIds.push(parentId);

    const subtaskIds: number[] = [];
    for (let i = 0; i < subtaskCount; i++) {
      const subtaskPayload: CreateTaskPayload = {
        project_id: 1,
        title: `Archive Test Subtask ${i + 1}`,
        description: `Subtask ${i + 1} for archive testing`,
        priority_bucket: 5,
        status: i % 2 === 0 ? 'To Do' : 'In Progress',
        assignee_ids: [testUsers.joel.id],
        deadline: new Date('2025-12-31T23:59:59Z').toISOString(),
      };

      const subtaskId = await createTask(adminClient, subtaskPayload, testUsers.joel.id);

      // Update to set parent_task_id
      await adminClient.from('tasks').update({ parent_task_id: parentId }).eq('id', subtaskId);

      subtaskIds.push(subtaskId);
      createdTaskIds.push(subtaskId);
    }

    return { parentId, subtaskIds };
  }

  // Cleanup after each test
  afterEach(async () => {
    // Clean up in reverse order (subtasks first, then parents)
    for (const taskId of createdTaskIds.reverse()) {
      await adminClient.from('task_tags').delete().eq('task_id', taskId);
      await adminClient.from('task_assignments').delete().eq('task_id', taskId);
      await adminClient.from('tasks').delete().eq('id', taskId);
    }
    createdTaskIds = [];
  });

  describe('AC2: Archiving a task archives all its subtasks', () => {
    it('should archive parent task and all subtasks when archiving a task', async () => {
      const { parentId, subtaskIds } = await createTaskWithSubtasks(2);

      // Archive the parent task
      const affectedCount = await archiveTask(parentId, true);

      // Verify 3 tasks were affected (1 parent + 2 subtasks)
      expect(affectedCount).toBe(3);

      // Verify parent task is archived
      const { data: parentTask } = await adminClient
        .from('tasks')
        .select('is_archived')
        .eq('id', parentId)
        .single();

      expect(parentTask?.is_archived).toBe(true);

      // Verify all subtasks are archived
      const { data: subtasks } = await adminClient
        .from('tasks')
        .select('is_archived')
        .in('id', subtaskIds);

      expect(subtasks?.every((s) => s.is_archived === true)).toBe(true);
    });

    it('should return correct count for task with no subtasks', async () => {
      // Create a task without subtasks
      const payload: CreateTaskPayload = {
        project_id: 1,
        title: 'Standalone Task',
        description: 'Task with no subtasks',
        priority_bucket: 5,
        status: 'To Do',
        assignee_ids: [testUsers.joel.id],
        deadline: new Date('2025-12-31T23:59:59Z').toISOString(),
      };

      const taskId = await createTask(adminClient, payload, testUsers.joel.id);
      createdTaskIds.push(taskId);

      // Archive the standalone task
      const affectedCount = await archiveTask(taskId, true);

      // Verify only 1 task was affected
      expect(affectedCount).toBe(1);
    });
  });

  describe('AC3: Unarchiving a task unarchives all its subtasks', () => {
    it('should unarchive parent task and all subtasks when unarchiving', async () => {
      const { parentId, subtaskIds } = await createTaskWithSubtasks(2);

      // First archive the tasks
      await archiveTask(parentId, true);

      // Verify all are archived
      const { data: archivedTasks } = await adminClient
        .from('tasks')
        .select('id, is_archived')
        .in('id', [parentId, ...subtaskIds]);

      expect(archivedTasks?.every((t) => t.is_archived === true)).toBe(true);

      // Now unarchive
      const affectedCount = await archiveTask(parentId, false);

      // Verify 3 tasks were affected
      expect(affectedCount).toBe(3);

      // Verify all tasks are now unarchived
      const { data: unarchivedTasks } = await adminClient
        .from('tasks')
        .select('id, is_archived')
        .in('id', [parentId, ...subtaskIds]);

      expect(unarchivedTasks?.every((t) => t.is_archived === false)).toBe(true);
    });
  });

  describe('AC4: Archived tasks do not appear in getUserTasks', () => {
    it('should not return archived tasks in getUserTasks results', async () => {
      const { parentId } = await createTaskWithSubtasks(2);

      // Get tasks before archiving
      const resultBefore = await getUserTasks(testUsers.joel.id);
      const taskIdsBefore = resultBefore.tasks.map((t: any) => t.id);

      // Verify our test task is present
      expect(taskIdsBefore).toContain(parentId);

      // Archive the parent task
      await archiveTask(parentId, true);

      // Get tasks after archiving
      const resultAfter = await getUserTasks(testUsers.joel.id);
      const taskIdsAfter = resultAfter.tasks.map((t: any) => t.id);

      // Verify archived task is not in results
      expect(taskIdsAfter).not.toContain(parentId);
    });

    it('should show tasks again after unarchiving', async () => {
      const { parentId } = await createTaskWithSubtasks(1);

      // Archive tasks
      await archiveTask(parentId, true);

      // Verify task is not in results
      const resultArchived = await getUserTasks(testUsers.joel.id);
      const archivedTaskIds = resultArchived.tasks.map((t: any) => t.id);
      expect(archivedTaskIds).not.toContain(parentId);

      // Unarchive tasks
      await archiveTask(parentId, false);

      // Verify task is back in results
      const resultUnarchived = await getUserTasks(testUsers.joel.id);
      const unarchivedTaskIds = resultUnarchived.tasks.map((t: any) => t.id);
      expect(unarchivedTaskIds).toContain(parentId);
    });
  });

  describe('AC5: Archived tasks return null when fetched by ID', () => {
    it('should return null when fetching an archived task by ID', async () => {
      const { parentId } = await createTaskWithSubtasks(1);

      // Verify task exists before archiving
      const resultBefore = await getTaskById(parentId);
      expect(resultBefore).not.toBeNull();
      expect(resultBefore?.task?.id).toBe(parentId);

      // Archive the task
      await archiveTask(parentId, true);

      // Try to fetch the archived task
      const resultAfter = await getTaskById(parentId);
      expect(resultAfter).toBeNull();
    });

    it('should return task after unarchiving', async () => {
      const { parentId } = await createTaskWithSubtasks(1);

      // Archive task
      await archiveTask(parentId, true);
      const archivedResult = await getTaskById(parentId);
      expect(archivedResult).toBeNull();

      // Unarchive task
      await archiveTask(parentId, false);
      const unarchivedResult = await getTaskById(parentId);
      expect(unarchivedResult).not.toBeNull();
      expect(unarchivedResult?.task?.id).toBe(parentId);
    });
  });

  describe('AC6: Archive operation returns correct affected count', () => {
    it('should return 1 for task with no subtasks', async () => {
      const payload: CreateTaskPayload = {
        project_id: 1,
        title: 'No Subtask Task',
        description: 'Task without subtasks',
        priority_bucket: 5,
        status: 'To Do',
        assignee_ids: [testUsers.joel.id],
        deadline: new Date('2025-12-31T23:59:59Z').toISOString(),
      };

      const taskId = await createTask(adminClient, payload, testUsers.joel.id);
      createdTaskIds.push(taskId);

      const affectedCount = await archiveTask(taskId, true);
      expect(affectedCount).toBe(1);
    });

    it('should return 3 for task with 2 subtasks', async () => {
      const { parentId } = await createTaskWithSubtasks(2);

      const affectedCount = await archiveTask(parentId, true);
      expect(affectedCount).toBe(3); // 1 parent + 2 subtasks
    });

    it('should return same count for archive and unarchive operations', async () => {
      const { parentId } = await createTaskWithSubtasks(2);

      const archiveCount = await archiveTask(parentId, true);
      const unarchiveCount = await archiveTask(parentId, false);

      expect(archiveCount).toBe(unarchiveCount);
      expect(archiveCount).toBe(3);
    });
  });

  describe('AC7: Archive operation validates inputs properly', () => {
    it('should throw error for non-existent task ID', async () => {
      const nonExistentId = 999999;

      await expect(archiveTask(nonExistentId, true)).rejects.toThrow(
        `Task with ID ${nonExistentId} not found`
      );
    });

    it('should handle archiving already archived task', async () => {
      const { parentId } = await createTaskWithSubtasks(2);

      // Archive once
      await archiveTask(parentId, true);

      // Archive again - should still work and return same count
      const affectedCount = await archiveTask(parentId, true);
      expect(affectedCount).toBe(3);

      // Verify tasks are still archived
      const { data: task } = await adminClient
        .from('tasks')
        .select('is_archived')
        .eq('id', parentId)
        .single();

      expect(task?.is_archived).toBe(true);
    });

    it('should handle unarchiving already unarchived task', async () => {
      const { parentId } = await createTaskWithSubtasks(2);

      // Task is already unarchived by default
      const affectedCount = await archiveTask(parentId, false);
      expect(affectedCount).toBe(3);

      // Verify tasks are still unarchived
      const { data: task } = await adminClient
        .from('tasks')
        .select('is_archived')
        .eq('id', parentId)
        .single();

      expect(task?.is_archived).toBe(false);
    });
  });

  describe('Archive operation edge cases', () => {
    it('should preserve task data when archiving and unarchiving', async () => {
      const { parentId } = await createTaskWithSubtasks(1);

      // Get original task data
      const { data: originalTask } = await adminClient
        .from('tasks')
        .select('*')
        .eq('id', parentId)
        .single();

      // Archive and unarchive
      await archiveTask(parentId, true);
      await archiveTask(parentId, false);

      // Get task data after operations
      const { data: finalTask } = await adminClient
        .from('tasks')
        .select('*')
        .eq('id', parentId)
        .single();

      // Verify all fields except is_archived and updated_at are unchanged
      expect(finalTask?.title).toBe(originalTask?.title);
      expect(finalTask?.description).toBe(originalTask?.description);
      expect(finalTask?.priority_bucket).toBe(originalTask?.priority_bucket);
      expect(finalTask?.status).toBe(originalTask?.status);
      expect(finalTask?.creator_id).toBe(originalTask?.creator_id);
      expect(finalTask?.project_id).toBe(originalTask?.project_id);
    });

    it('should maintain subtask relationships after archive/unarchive cycle', async () => {
      const { parentId, subtaskIds } = await createTaskWithSubtasks(2);

      // Archive and unarchive
      await archiveTask(parentId, true);
      await archiveTask(parentId, false);

      // Verify subtask relationships are maintained
      const { data: finalSubtasks } = await adminClient
        .from('tasks')
        .select('id, parent_task_id')
        .in('id', subtaskIds);

      expect(finalSubtasks?.length).toBe(2);
      expect(finalSubtasks?.every((s) => s.parent_task_id === parentId)).toBe(true);
    });
  });

  describe('Archive operation data integrity', () => {
    it('should not affect task assignments when archiving', async () => {
      const { parentId } = await createTaskWithSubtasks(1);

      // Get assignments before archiving
      const { data: assignmentsBefore } = await adminClient
        .from('task_assignments')
        .select('*')
        .eq('task_id', parentId);

      expect(assignmentsBefore?.length).toBeGreaterThan(0);

      // Archive task
      await archiveTask(parentId, true);

      // Verify assignments still exist
      const { data: assignmentsAfter } = await adminClient
        .from('task_assignments')
        .select('*')
        .eq('task_id', parentId);

      expect(assignmentsAfter?.length).toBe(assignmentsBefore?.length);
    });
  });
});
