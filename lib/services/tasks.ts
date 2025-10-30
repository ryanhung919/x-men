import { SupabaseClient } from '@supabase/supabase-js';
import { CreateTaskPayload } from '../types/task-creation';
import {
  RawTask,
  RawSubtask,
  RawAttachment,
  RawAssignee,
  RawComment,
  Task,
  TaskComment,
  DetailedTask,
} from '../types/tasks';

// Re-export types for backward compatibility
export type {
  RawTask,
  RawSubtask,
  RawAttachment,
  RawAssignee,
  RawComment,
  Task,
  TaskComment,
  DetailedTask,
};

// Re-export calculateNextDueDate for backward compatibility
export { calculateNextDueDate } from '../types/tasks';

// Import DB and service dependencies (server-only, imported dynamically in functions)
import * as taskDb from '../db/tasks';
import { getRolesForUserClient } from '../db/roles';

/**
 * Maps a RawTask from the database to the Task type used in the application.
 *
 * This function transforms the raw database task format into a more usable format:
 * - Renames priority_bucket to priority
 * - Converts nested tag structure to simple string array
 * - Calculates if the task is overdue based on deadline and status
 *
 * @param task - The raw task object from the database
 * @returns A partial Task object without subtasks, assignees, and attachments arrays
 *
 * @example
 * const rawTask = await fetchTaskFromDB();
 * const mappedTask = mapTaskAttributes(rawTask);
 * console.log(`Priority: ${mappedTask.priority}, Overdue: ${mappedTask.isOverdue}`);
 */
export function mapTaskAttributes(task: RawTask): Omit<Task, 'subtasks' | 'assignees' | 'attachments' | 'creator'> {
  const isOverdue = task.deadline ? new Date(task.deadline) < new Date() && task.status !== 'Completed' : false;

  return {
    id: task.id,
    title: task.title,
    description: task.description,
    priority: task.priority_bucket,
    status: task.status as Task['status'],
    deadline: task.deadline,
    notes: task.notes,
    recurrence_interval: task.recurrence_interval,
    recurrence_date: task.recurrence_date,
    project: task.project,
    tags: task.tags.map((t) => t.tags.name),
    isOverdue,
  };
}

/**
 * Formats raw task data from the database into a structured Task array.
 *
 * This function combines multiple related data sources into a cohesive Task structure:
 * - Maps each task with its attributes using mapTaskAttributes()
 * - Associates subtasks with their parent tasks
 * - Links attachments to tasks by task_id
 * - Joins assignee user information with task assignments
 * - Provides default "Unknown User" for missing assignee information
 *
 * @param rawData - An object containing:
 *   - tasks: Array of RawTask objects from database
 *   - subtasks: Array of RawSubtask objects
 *   - attachments: Array of RawAttachment objects with task_id references
 *   - assignees: Array of RawAssignee objects with user information
 *
 * @returns Array of fully formatted Task objects with all related data included
 *
 * @example
 * const rawData = await getUserTasks('user-123');
 * const formattedTasks = formatTasks(rawData);
 * formattedTasks.forEach(task => {
 *   console.log(`${task.title}: ${task.subtasks.length} subtasks, ${task.assignees.length} assignees`);
 * });
 */
export function formatTasks(
  rawData: {
    tasks: RawTask[];
    subtasks: RawSubtask[];
    attachments: RawAttachment[];
    assignees: RawAssignee[];
  }
): Task[] {
  const subtasksMap = new Map<number, RawSubtask[]>();
  rawData.subtasks.forEach((subtask: RawSubtask) => {
    if (!subtasksMap.has(subtask.parent_task_id)) {
      subtasksMap.set(subtask.parent_task_id, []);
    }
    subtasksMap.get(subtask.parent_task_id)!.push({
      id: subtask.id,
      title: subtask.title,
      status: subtask.status,
      deadline: subtask.deadline,
      parent_task_id: subtask.parent_task_id,
    });
  });

  const attachmentsMap = new Map<number, RawAttachment[]>();
  rawData.attachments.forEach((attachment: RawAttachment) => {
    if (!attachmentsMap.has(attachment.task_id)) {
      attachmentsMap.set(attachment.task_id, []);
    }
    attachmentsMap.get(attachment.task_id)!.push({
      id: attachment.id,
      storage_path: attachment.storage_path,
      task_id: attachment.task_id,
    });
  });

  const userInfoMap = new Map<string, RawAssignee>(
    rawData.assignees.map((user) => [user.id, user])
  );

  return rawData.tasks.map((task) => {
    const mappedTask = mapTaskAttributes(task);

    // Map creator info
    const creatorUser = userInfoMap.get(task.creator_id);
    const creator = {
      creator_id: task.creator_id,
      user_info: creatorUser
        ? { first_name: creatorUser.first_name, last_name: creatorUser.last_name }
        : { first_name: 'Unknown', last_name: 'User' },
    };

    const assignees = task.task_assignments.map((a) => {
      const user = userInfoMap.get(a.assignee_id);
      return {
        assignee_id: a.assignee_id,
        user_info: user
          ? { first_name: user.first_name, last_name: user.last_name }
          : { first_name: 'Unknown', last_name: 'User' },
      };
    });

    const formattedSubtasks = (subtasksMap.get(task.id) || []).map((s) => ({
      id: s.id,
      title: s.title,
      status: s.status,
      deadline: s.deadline,
    }));

    return {
      ...mappedTask,
      creator,
      subtasks: formattedSubtasks,
      assignees,
      attachments: (attachmentsMap.get(task.id) || []).map((a) => a.storage_path),
    };
  });
}

/**
 * Formats detailed task data for a single task including comments and attachment URLs.
 *
 * Similar to formatTasks() but specialized for a single task with additional detail:
 * - Includes task comments with user information
 * - Attachments include public URLs (not just storage paths)
 * - Returns null if the task doesn't exist
 * - Maps all assignee and commenter user information
 * - Provides "Unknown User" fallback for missing user data
 *
 * This function is typically used for task detail pages where comprehensive
 * information is needed.
 *
 * @param rawData - An object containing:
 *   - task: A single RawTask object or null if not found
 *   - subtasks: Array of RawSubtask objects for this task
 *   - attachments: Array with id, storage_path, and public_url
 *   - comments: Array of RawComment objects
 *   - assignees: Array of RawAssignee objects with full user information
 *
 * @returns A DetailedTask object with all related data, or null if task doesn't exist
 *
 * @example
 * const rawTaskData = await getTaskById(42);
 * const detailedTask = formatTaskDetails(rawTaskData);
 * if (detailedTask) {
 *   console.log(`${detailedTask.title} has ${detailedTask.comments.length} comments`);
 *   detailedTask.attachments.forEach(att => console.log(att.public_url));
 * }
 */
export function formatTaskDetails(
  rawData: {
    task: RawTask | null;
    subtasks: RawSubtask[];
    attachments: { id: number; storage_path: string; public_url?: string }[];
    comments: RawComment[];
    assignees: RawAssignee[];
  }
): DetailedTask | null {
  if (!rawData.task) return null;

  const mappedTask = mapTaskAttributes(rawData.task);
  const userInfoMap = new Map<string, RawAssignee>(
    rawData.assignees.map((user) => [user.id, user])
  );

  // Map creator info
  const creatorUser = userInfoMap.get(rawData.task.creator_id);
  const creator = {
    creator_id: rawData.task.creator_id,
    user_info: creatorUser
      ? { first_name: creatorUser.first_name, last_name: creatorUser.last_name }
      : { first_name: 'Unknown', last_name: 'User' },
  };

  const assignees = rawData.task.task_assignments.map((a) => ({
    assignee_id: a.assignee_id,
    user_info: userInfoMap.get(a.assignee_id) || {
      id: a.assignee_id,
      first_name: 'Unknown',
      last_name: 'User',
    },
  }));

  const formattedSubtasks = rawData.subtasks.map((s) => ({
    id: s.id,
    title: s.title,
    status: s.status,
    deadline: s.deadline,
  }));

  const comments = rawData.comments.map((c) => ({
    id: c.id,
    content: c.content,
    created_at: c.created_at,
    user_id: c.user_id,
    user_info: userInfoMap.get(c.user_id) || {
      id: c.user_id,
      first_name: 'Unknown',
      last_name: 'User',
    },
  }));

  return {
    ...mappedTask,
    creator,
    subtasks: formattedSubtasks,
    assignees,
    attachments: rawData.attachments,
    comments,
  };
}

// ============================================================================
// BUSINESS LOGIC LAYER - READ OPERATIONS
// ============================================================================

/**
 * Service layer function to get all tasks for a user.
 *
 * Fetches raw data from DB and formats it for the UI.
 * This is the single entry point for getting user tasks - API should call this,
 * not the DB layer directly.
 *
 * @param userId - UUID of the user whose tasks to fetch
 * @returns Array of formatted Task objects ready for UI consumption
 * @throws {Error} If there's a database error during fetching
 */
export async function getUserTasksService(userId: string): Promise<Task[]> {
  // Fetch raw data from DB
  const rawData = await taskDb.getUserTasks(userId);

  // Format for UI
  return formatTasks(rawData);
}

/**
 * Service layer function to get a single task by ID with full details.
 *
 * Fetches raw data from DB and formats it for the UI, including comments
 * and attachment URLs.
 *
 * @param taskId - Numeric ID of the task to fetch
 * @returns Formatted DetailedTask object or null if not found
 * @throws {Error} If there's a database error during fetching
 */
export async function getTaskByIdService(taskId: number): Promise<DetailedTask | null> {
  // Fetch raw data from DB
  const rawData = await taskDb.getTaskById(taskId);

  if (!rawData) {
    return null;
  }

  // Format for UI
  return formatTaskDetails(rawData);
}

// ============================================================================
// BUSINESS LOGIC LAYER - WRITE OPERATIONS
// ============================================================================

/**
 * Service layer function to create a task with all related data.
 *
 * Handles:
 * - Business validation (assignee count, priority range)
 * - Orchestration of multiple DB operations (task, tags, attachments)
 * - Future: notifications, webhooks, audit logging
 *
 * @param supabase - Authenticated Supabase client
 * @param payload - Task creation payload with all task details
 * @param creatorId - UUID of the user creating the task
 * @param attachmentFiles - Optional array of files to attach
 * @returns The ID of the newly created task
 * @throws {Error} If validation fails or DB operations fail
 */
export async function createTaskService(
  supabase: SupabaseClient,
  payload: CreateTaskPayload,
  creatorId: string,
  attachmentFiles?: File[]
): Promise<number> {
  // Business validation
  const uniqueAssigneeIds = Array.from(new Set(payload.assignee_ids));

  if (uniqueAssigneeIds.length === 0) {
    throw new Error('At least one assignee is required');
  }

  if (uniqueAssigneeIds.length > 5) {
    throw new Error('Cannot assign more than 5 users to a task');
  }

  if (payload.priority_bucket < 1 || payload.priority_bucket > 10) {
    throw new Error('Priority bucket must be between 1 and 10');
  }

  // Orchestrate task creation (all DB operations)
  const taskId = await taskDb.createTask(
    supabase,
    payload,
    creatorId,
    attachmentFiles
  );

  // Future: Add side effects here
  // await notificationService.notifyAssignees(taskId, uniqueAssigneeIds);
  // await auditService.logTaskCreation(creatorId, taskId);

  return taskId;
}

/**
 * Service layer function to archive or unarchive a task.
 *
 * Handles:
 * - Authorization (only managers can archive)
 * - Business logic (cascade to subtasks)
 * - Future: audit logging, notifications
 *
 * @param supabase - Authenticated Supabase client
 * @param userId - UUID of the user performing the action
 * @param taskId - ID of the task to archive/unarchive
 * @param isArchived - True to archive, false to restore
 * @returns Number of tasks affected (parent + subtasks)
 * @throws {Error} If user is not authorized or DB operation fails
 */
export async function archiveTaskService(
  supabase: SupabaseClient,
  userId: string,
  taskId: number,
  isArchived: boolean
): Promise<number> {
  // Authorization check
  const roles = await getRolesForUserClient(supabase, userId);

  if (!roles.includes('manager')) {
    throw new Error('Only managers can archive tasks');
  }

  // Execute archive operation
  const affectedCount = await taskDb.archiveTask(taskId, isArchived);

  // Future: Add side effects here
  // await auditService.logArchive(userId, taskId, isArchived, affectedCount);
  // await notificationService.notifyArchive(taskId, isArchived);

  return affectedCount;
}