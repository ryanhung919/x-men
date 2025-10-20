export type RawTask = {
  id: number;
  title: string;
  description: string | null;
  priority_bucket: number;
  status: string;
  deadline: string | null;
  notes: string | null;
  project: { id: number; name: string };
  parent_task_id: number | null;
  recurrence_interval: number;
  recurrence_date: string | null;
  creator_id: string;
  task_assignments: { assignee_id: string }[];
  tags: { tags: { name: string } }[];
};

export type RawSubtask = {
  id: number;
  title: string;
  status: string;
  deadline: string | null;
  parent_task_id: number;
};

export type RawAttachment = {
  id: number;
  storage_path: string;
  task_id: number;
};

export type RawAssignee = {
  id: string;
  first_name: string;
  last_name: string;
};

export type RawComment = {
  id: number;
  content: string;
  created_at: string;
  user_id: string;
};

export type Task = {
  id: number;
  title: string;
  description: string | null;
  priority: number;
  status: 'To Do' | 'In Progress' | 'Completed' | 'Blocked';
  deadline: string | null;
  notes: string | null;
  recurrence_interval: number;
  recurrence_date: string | null;
  project: { id: number; name: string };
  creator: { creator_id: string; user_info: { first_name: string; last_name: string } };
  subtasks: { id: number; title: string; status: string; deadline: string | null }[];
  assignees: { assignee_id: string; user_info: { first_name: string; last_name: string } }[];
  tags: string[];
  attachments: string[];
  isOverdue: boolean;
};

export type TaskComment = {
  id: number;
  content: string;
  created_at: string;
  user_id: string;
  user_info: RawAssignee;
};

export type DetailedTask = Omit<Task, 'attachments'> & {
  attachments: { id: number; storage_path: string; public_url?: string }[];
  comments: TaskComment[];
};

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
 * Calculates the next due date for recurring tasks based on the recurrence interval.
 *
 * For recurring tasks (recurrence_interval > 0), this function calculates the next due date
 * by adding the interval to the previous deadline, regardless of when the task was completed.
 * This ensures consistent scheduling based on the original due date.
 *
 * Implementation follows the requirement: "the due date is based on the calculation from the
 * previous due date"
 *
 * @param task - The task to calculate the next due date for
 * @returns A new Task object with updated deadline and isOverdue status if recurring,
 *          or the original task if not recurring
 *
 * @example
 * // Task due Sep 29, completed Oct 1, interval 1 day → next due is Sep 30
 * const recurringTask = { ...task, recurrence_interval: 1, deadline: '2024-09-29' };
 * const updated = calculateNextDueDate(recurringTask);
 * console.log(updated.deadline); // '2024-09-30T00:00:00.000Z'
 *
 * @example
 * // Non-recurring task remains unchanged
 * const normalTask = { ...task, recurrence_interval: 0 };
 * const result = calculateNextDueDate(normalTask);
 * // result === normalTask
 */
export function calculateNextDueDate(task: Task): Task {
  // For recurring tasks, calculate next due date based on previous deadline + interval
  // This follows the requirement: "the due date is based on the calculation from the previous due date"
  // Example: Task due Sep 29, completed Oct 1, interval 1 day → next due is Sep 30
  if (task.recurrence_interval > 0 && task.deadline) {
    const previousDeadline = new Date(task.deadline);
    const intervalMs = task.recurrence_interval * 24 * 60 * 60 * 1000;
    const nextDue = new Date(previousDeadline.getTime() + intervalMs);
    return {
      ...task,
      deadline: nextDue.toISOString(),
      isOverdue: nextDue < new Date() && task.status !== 'Completed',
    };
  }
  return task;
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