import {
  updateTaskTitleDB,
  updateTaskDescriptionDB,
  updateTaskStatusDB,
  updateTaskPriorityDB,
  updateTaskDeadlineDB,
  updateTaskNotesDB,
  updateTaskRecurrenceDB,
  addTaskTagDB,
  removeTaskTagDB,
  addTaskAssigneeDB,
  removeTaskAssigneeDB,
  createTask,
  linkSubtaskToParentDB,
  getTaskAttachmentsTotalSize,
  addTaskAttachmentsDB,
  removeTaskAttachmentDB,
  getTaskPermissionDataDB,
  isUserManager,
  addTaskCommentDB,
  updateTaskCommentDB,
  deleteTaskCommentDB,
  getCommentAuthorDB,
  checkUserIsAdmin,
  getTaskById,
} from '@/lib/db/tasks';

import { CreateTaskPayload } from '../types/task-creation';
import { createClient } from '@/lib/supabase/server';

import { SupabaseClient } from '@supabase/supabase-js';
import {
  RawTask,
  RawSubtask,
  RawAttachment,
  RawAssignee,
  RawComment,
  Task,
  TaskComment,
  DetailedTask,
  calculateNextDueDate,
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



// // ============ CONSTANTS ============

export const FILE_UPLOAD_LIMITS = {
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB per file
  MAX_TOTAL_SIZE: 500 * 1024 * 1024, // 500MB total per task
  MAX_FILES: 10,
  ALLOWED_TYPES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'text/plain',
    'text/csv',
  ],
} as const;

export function isAllowedFileType(fileType: string): fileType is (typeof FILE_UPLOAD_LIMITS.ALLOWED_TYPES)[number] {
  return FILE_UPLOAD_LIMITS.ALLOWED_TYPES.includes(fileType as any);
}

// ============ HELPERS ============

/**
 * Format bytes as human-readable size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 bytes';
  const k = 1024;
  const sizes = ['bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 10) / 10 + ' ' + sizes[i];
}

/**
 * Check if user has permission to modify a task
 * User can modify if they are the creator OR an assignee
 */
async function checkTaskPermission(taskId: number, userId: string): Promise<boolean> {
  const permData = await getTaskPermissionDataDB(taskId);
  if (!permData) return false;

  const isCreator = permData.creator_id === userId;
  const isAssignee = permData.assignee_ids.includes(userId);

  return isCreator || isAssignee;
}


// ============ TITLE ============

export async function updateTitle(
  taskId: number,
  newTitle: string,
  userId: string
): Promise<{ id: number; title: string }> {
  // 1. Validate
  if (!newTitle || newTitle.trim().length === 0) {
    throw new Error('Title cannot be empty');
  }
  if (newTitle.length > 200) {
    throw new Error('Title cannot exceed 200 characters');
  }

  // 2. Check permission
  const hasPermission = await checkTaskPermission(taskId, userId);
  if (!hasPermission) {
    throw new Error('You do not have permission to update this task');
  }

  // 3. Update in DB
  const result = await updateTaskTitleDB(taskId, newTitle);

  // TODO: Log activity (ATH002)
  // TODO: Notify assignees

  return result;
}

// ============ DESCRIPTION ============

export async function updateDescription(
  taskId: number,
  newDescription: string,
  userId: string
): Promise<{ id: number; description: string }> {
  // 1. Validate
  if (typeof newDescription !== 'string') {
    throw new Error('Description must be a string');
  }
  if (newDescription.length > 2000) {
    throw new Error('Description cannot exceed 2000 characters');
  }

  // 2. Check permission
  const hasPermission = await checkTaskPermission(taskId, userId);
  if (!hasPermission) {
    throw new Error('You do not have permission to update this task');
  }

  // 3. Update in DB
  const result = await updateTaskDescriptionDB(taskId, newDescription);

  // TODO: Notify assignees

  return result;
}

// ============ STATUS ============

export async function updateStatus(
  taskId: number,
  newStatus: 'To Do' | 'In Progress' | 'Completed' | 'Blocked',
  userId: string
): Promise<{ id: number; status: string }> {
  // 1. Validate status
  const validStatuses = ['To Do', 'In Progress', 'Completed', 'Blocked'];
  if (!validStatuses.includes(newStatus)) {
    throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  // 2. Check permission
  const hasPermission = await checkTaskPermission(taskId, userId);
  if (!hasPermission) {
    throw new Error('You do not have permission to update this task');
  }

  // 3. Get task details BEFORE updating (needed for recurring task logic)
  let taskDetails: DetailedTask | null = null;
  if (newStatus === 'Completed') {
    const rawTaskData = await getTaskById(taskId);
    if (rawTaskData) {
      taskDetails = formatTaskDetails(rawTaskData);
    }
  }

  // 4. Update status in DB
  const result = await updateTaskStatusDB(taskId, newStatus);

  // 5. Handle recurring task creation if task is completed
  if (newStatus === 'Completed' && taskDetails) {
    // Check if this is a recurring task with a deadline
    if (taskDetails.recurrence_interval > 0 && taskDetails.deadline) {
      try {
        // Convert DetailedTask to Task format (for calculateNextDueDate)
        const taskForCalculation: Task = {
          ...taskDetails,
          attachments: taskDetails.attachments.map(a => a.storage_path),
        };

        // Calculate next due date using the existing function
        const taskWithNextDue = calculateNextDueDate(taskForCalculation);

        // Create new recurring task with same properties
        const newTaskPayload: CreateTaskPayload = {
          project_id: taskDetails.project.id,
          title: taskDetails.title,
          description: taskDetails.description || '',
          priority_bucket: taskDetails.priority,
          status: 'To Do',
          assignee_ids: taskDetails.assignees.map(a => a.assignee_id),
          deadline: taskWithNextDue.deadline!,
          notes: taskDetails.notes || undefined,
          tags: taskDetails.tags,
          recurrence_interval: taskDetails.recurrence_interval,
          recurrence_date: taskDetails.recurrence_date || undefined,
        };

        // Create the new recurring task (createTask creates its own supabase client)
        const supabase = await createClient();
        await createTask(supabase, newTaskPayload, taskDetails.creator.creator_id);

        console.log(`[RECURRING] Created new recurring task for task ${taskId} with deadline ${taskWithNextDue.deadline}`);
      } catch (error) {
        console.error('[RECURRING] Failed to create recurring task:', error);
        // Don't fail the status update if recurring task creation fails
        // The status update was successful, just log the error
      }
    }
  }

  // TODO: Log status change (ATH002)
  // TODO: Notify assignees of status change (NSY002)

  return result;
}

// ============ PRIORITY ============

export async function updatePriority(
  taskId: number,
  newPriority: number,
  userId: string,
  userRole?: string
): Promise<{ id: number; priority_bucket: number }> {
  // 1. Validate
  if (typeof newPriority !== 'number' || newPriority < 1 || newPriority > 10) {
    throw new Error('Priority must be a number between 1 and 10');
  }

  // 2. Check permission
  // Any user can update priority, but we log who changed it
  const hasPermission = await checkTaskPermission(taskId, userId);
  if (!hasPermission) {
    throw new Error('You do not have permission to update this task');
  }

  // 3. Update in DB
  const result = await updateTaskPriorityDB(taskId, newPriority);

  // TODO: Notify assignees

  return result;
}

// ============ DEADLINE ============

export async function updateDeadline(
  taskId: number,
  newDeadline: string | null,
  userId: string
): Promise<{ id: number; deadline: string | null }> {
  // 1. Validate
  if (newDeadline !== null && typeof newDeadline !== 'string') {
    throw new Error('Deadline must be a date string or null');
  }

  if (newDeadline) {
    const deadlineDate = new Date(newDeadline);
    if (isNaN(deadlineDate.getTime())) {
      throw new Error('Invalid date format');
    }

    // Warn if deadline is in the past, but allow it
    if (deadlineDate < new Date()) {
      console.warn(`[WARN] Deadline set to past date: ${newDeadline}`);
    }
  }

  // 2. Check permission
  const hasPermission = await checkTaskPermission(taskId, userId);
  if (!hasPermission) {
    throw new Error('You do not have permission to update this task');
  }

  // 3. Update in DB
  const result = await updateTaskDeadlineDB(taskId, newDeadline);

  // TODO: Notify assignees of deadline change (DST007)

  return result;
}

// ============ NOTES ============

export async function updateNotes(
  taskId: number,
  newNotes: string,
  userId: string
): Promise<{ id: number; notes: string }> {
  // 1. Validate
  if (typeof newNotes !== 'string') {
    throw new Error('Notes must be a string');
  }
  if (newNotes.length > 1000) {
    throw new Error('Notes cannot exceed 1000 characters');
  }

  // 2. Check permission
  const hasPermission = await checkTaskPermission(taskId, userId);
  if (!hasPermission) {
    throw new Error('You do not have permission to update this task');
  }

  // 3. Update in DB
  const result = await updateTaskNotesDB(taskId, newNotes);

  return result;
}


// ============ RECURRENCE ============

export async function updateRecurrence(
  taskId: number,
  recurrenceInterval: number,
  recurrenceDate: string | null,
  userId: string
): Promise<{ id: number; recurrence_interval: number; recurrence_date: string | null }> {
  // Check permission
  const hasPermission = await checkTaskPermission(taskId, userId);
  if (!hasPermission) {
    throw new Error('You do not have permission to update this task');
  }

  // Validate recurrence interval
  const validIntervals = [0, 1, 7, 30];
  if (!validIntervals.includes(recurrenceInterval)) {
    throw new Error('Invalid recurrence interval. Must be 0, 1, 7, or 30 days');
  }

  // If setting recurrence, validate date
  if (recurrenceInterval > 0) {
    if (!recurrenceDate) {
      throw new Error('Recurrence date is required when setting up recurrence');
    }

    const dateObj = new Date(recurrenceDate);
    if (isNaN(dateObj.getTime())) {
      throw new Error('Invalid recurrence date');
    }

    // Date should not be in the past
    if (dateObj < new Date()) {
      throw new Error('Recurrence date cannot be in the past');
    }
  }

  // Call DB layer
  const result = await updateTaskRecurrenceDB(taskId, recurrenceInterval, recurrenceDate);

  return result;
}

// ============ TAGS ============

export async function addTag(
  taskId: number,
  tagName: string,
  userId: string
): Promise<string> {
  // 1. Validate
  if (!tagName || typeof tagName !== 'string') {
    throw new Error('Tag name must be a non-empty string');
  }

  const cleanedTag = tagName.trim();
  if (cleanedTag.length === 0) {
    throw new Error('Tag name cannot be empty');
  }

  if (cleanedTag.length > 50) {
    throw new Error('Tag name cannot exceed 50 characters');
  }

  // 2. Check permission
  const hasPermission = await checkTaskPermission(taskId, userId);
  if (!hasPermission) {
    throw new Error('You do not have permission to update this task');
  }

  // 3. Update in DB
  const result = await addTaskTagDB(taskId, cleanedTag);

  return result;
}

export async function removeTag(
  taskId: number,
  tagName: string,
  userId: string
): Promise<string> {
  // 1. Validate
  if (!tagName || typeof tagName !== 'string') {
    throw new Error('Tag name must be a non-empty string');
  }

  // 2. Check permission
  const hasPermission = await checkTaskPermission(taskId, userId);
  if (!hasPermission) {
    throw new Error('You do not have permission to update this task');
  }

  // 3. Update in DB
  const result = await removeTaskTagDB(taskId, tagName);

  return result;
}

// ============ ASSIGNEES ============

export async function addAssignee(
  taskId: number,
  newAssigneeId: string,
  userId: string
): Promise<string> {
  // 1. Validate
  if (!newAssigneeId || typeof newAssigneeId !== 'string') {
    throw new Error('Assignee ID must be a non-empty string');
  }

  // 2. Check permission (creator or any assignee can add someone)
  const hasPermission = await checkTaskPermission(taskId, userId);
  if (!hasPermission) {
    throw new Error('You do not have permission to update assignees for this task');
  }

  // 3. Update in DB
  const result = await addTaskAssigneeDB(taskId, newAssigneeId, userId);

  // TODO: Notify new assignee (NSY002)

  return result;
}

export async function removeAssignee(
  taskId: number,
  assigneeId: string,
  userId: string
): Promise<string> {
  // 1. Validate
  if (!assigneeId || typeof assigneeId !== 'string') {
    throw new Error('Assignee ID must be a non-empty string');
  }

  // 2. Check if user is a manager (permission check happens HERE)
  const isManager = await isUserManager(userId);
  if (!isManager) {
    throw new Error('Only managers can remove assignees from tasks');
  }

  // 3. Call DB layer to remove (no permission check needed there)
  const result = await removeTaskAssigneeDB(taskId, assigneeId);

  return result;
}

// ============ SUBTASKS ============

export async function createSubtask(
  supabase: any,
  parentTaskId: number,
  payload: CreateTaskPayload,
  creatorId: string,
  attachmentFiles?: File[]
): Promise<number> {
  // 1. Create task as usual (without parent_task_id set yet)
  const subtaskId = await createTask(supabase, payload, creatorId, attachmentFiles);

  // 2. Link to parent
  await linkSubtaskToParent(subtaskId, parentTaskId);

  return subtaskId;
}


// ============ ATTACHMENTS ============

const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
];
const MAX_TOTAL_ATTACHMENT_SIZE = 50 * 1024 * 1024; // 50MB total per task

export async function addTaskAttachments(
  taskId: number,
  files: File[],
  userId: string
): Promise<{ id: number; storage_path: string }[]> {
  // Check permission
  const hasPermission = await checkTaskPermission(taskId, userId);
  if (!hasPermission) {
    throw new Error('You do not have permission to update this task');
  }

  // Get existing attachment size for this task
  const existingSize = await getTaskAttachmentsTotalSize(taskId);

  // Validate files
  let totalNewSize = 0;
  for (const file of files) {
    // Check file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      throw new Error(
        `File type not allowed: ${file.type}. Allowed: PDF, images, Word, Excel, TXT`
      );
    }

    totalNewSize += file.size;
  }

  // Check total size (existing + new)
  const totalSize = existingSize + totalNewSize;
  if (totalSize > MAX_TOTAL_ATTACHMENT_SIZE) {
    const remainingMB = ((MAX_TOTAL_ATTACHMENT_SIZE - existingSize) / 1024 / 1024).toFixed(1);
    throw new Error(
      `Total attachment size would exceed 50MB limit. You have ${remainingMB}MB remaining. Trying to add ${(totalNewSize / 1024 / 1024).toFixed(1)}MB.`
    );
  }

  // Call DB layer
  const result = await addTaskAttachmentsDB(taskId, files, userId);

  return result;
}

export async function removeTaskAttachment(
  taskId: number,
  attachmentId: number,
  userId: string
): Promise<{ id: number; removed: true }> {
  // 1. Check permission
  const hasPermission = await checkTaskPermission(taskId, userId);
  if (!hasPermission) {
    throw new Error('You do not have permission to delete attachments from this task');
  }

  // 2. Delete from storage and DB
  const storagePath = await removeTaskAttachmentDB(attachmentId);

  console.log(`[ATTACHMENTS] Removed attachment ${attachmentId} from task ${taskId} (${storagePath})`);

  return { id: attachmentId, removed: true };
}

// ============ COMMENTS ============

export async function addComment(
  taskId: number,
  content: string,
  userId: string
): Promise<{ id: number; content: string; created_at: string; user_id: string }> {
  // Validate content
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    throw new Error('Comment content cannot be empty');
  }

  if (content.trim().length > 5000) {
    throw new Error('Comment cannot exceed 5000 characters');
  }

  // Verify task exists
  const taskData = await getTaskPermissionDataDB(taskId);
  if (!taskData) {
    throw new Error('Task not found');
  }

  // Add the comment
  const result = await addTaskCommentDB(taskId, userId, content.trim());

  return result;
}

export async function updateComment(
  commentId: number,
  newContent: string,
  userId: string
): Promise<{ id: number; content: string; updated_at: string }> {
  // Validate content
  if (!newContent || typeof newContent !== 'string' || newContent.trim().length === 0) {
    throw new Error('Comment content cannot be empty');
  }

  if (newContent.trim().length > 5000) {
    throw new Error('Comment cannot exceed 5000 characters');
  }

  // Check if user is the author
  const authorId = await getCommentAuthorDB(commentId);
  if (!authorId) {
    throw new Error('Comment not found');
  }

  if (authorId !== userId) {
    throw new Error('You can only edit your own comments');
  }

  // Update the comment
  const result = await updateTaskCommentDB(commentId, newContent.trim());

  return result;
}

export async function deleteComment(
  commentId: number,
  userId: string
): Promise<void> {
  // Check if user is admin
  const isAdmin = await checkUserIsAdmin(userId);
  if (!isAdmin) {
    throw new Error('Only admins can delete comments');
  }

  // Delete the comment
  await deleteTaskCommentDB(commentId);
}


export async function linkSubtaskToParent(
  subtaskId: number,
  parentTaskId: number
): Promise<void> {
  // Validation
  if (!Number.isInteger(subtaskId) || subtaskId <= 0) {
    throw new Error('Invalid subtask ID');
  }

  if (!Number.isInteger(parentTaskId) || parentTaskId <= 0) {
    throw new Error('Invalid parent task ID');
  }

  // Prevent self-parenting
  if (subtaskId === parentTaskId) {
    throw new Error('A task cannot be its own parent');
  }

  // Verify both tasks exist
  const subtask = await getTaskPermissionDataDB(subtaskId);
  if (!subtask) {
    throw new Error('Subtask not found');
  }

  const parentTask = await getTaskPermissionDataDB(parentTaskId);
  if (!parentTask) {
    throw new Error('Parent task not found');
  }

  // Call DB layer
  try {
    await linkSubtaskToParentDB(subtaskId, parentTaskId);
  } catch (err) {
    throw new Error(
      `Failed to link subtask to parent: ${err instanceof Error ? err.message : 'Unknown error'}`
    );
  }
}
