/**
 * Task-related type definitions.
 *
 * This file contains ONLY types and pure utility functions (no server imports).
 * Safe to import in both Client and Server Components.
 */

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
