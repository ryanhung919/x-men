// lib/services/tasks.ts
export type RawTask = {
  id: number;
  title: string;
  description: string | null;
  priority_bucket: number; // 1–10
  status: string;
  deadline: string | null;
  notes: string | null;
  recurrence_interval: number;
  recurrence_date: string | null;
  project: { id: number; name: string };
  subtasks: { id: number; title: string; status: string; deadline: string | null }[];
  assignees: { assignee_id: string; user_info: { first_name: string; last_name: string } }[];
  tags: { tags: { name: string } }[];
  attachments: { id: number; storage_path: string }[];
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
  subtasks: { id: number; title: string; status: string; deadline: string | null }[];
  assignees: { assignee_id: string; user_info: { first_name: string; last_name: string } }[];
  tags: string[];
  attachments: string[];
  isOverdue: boolean;
};

export function mapTaskAttributes(task: RawTask): Task {
  const isOverdue = task.deadline ? new Date(task.deadline) < new Date() && task.status !== 'Completed' : false;

  return {
    ...task,
    priority: task.priority_bucket, // Pass priority_bucket directly
    status: task.status as Task['status'],
    isOverdue,
    assignees: task.assignees,
    tags: task.tags.map((t) => t.tags.name),
    attachments: task.attachments.map((a) => a.storage_path),
  };
}

export function calculateNextDueDate(task: Task): Task {
  if (task.recurrence_interval > 0 && task.recurrence_date) {
    const anchor = new Date(task.recurrence_date);
    const now = new Date();
    const intervalMs = task.recurrence_interval * 24 * 60 * 60 * 1000;
    const timeDiff = now.getTime() - anchor.getTime();
    const periodsPassed = Math.floor(timeDiff / intervalMs);
    const nextDue = new Date(anchor.getTime() + (periodsPassed + 1) * intervalMs);
    return {
      ...task,
      deadline: nextDue.toISOString(),
      isOverdue: new Date(nextDue) < new Date() && task.status !== 'Completed',
    };
  }
  return task;
}