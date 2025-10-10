import { getTasks } from '@/lib/db/report';

// Shared types
export type ReportFormat = 'pdf' | 'xlsx';
export interface ReportFilters {
  projectIds?: number[];
  startDate?: Date;
  endDate?: Date;
}

// Task shape (as used by your DB layer)
interface Task {
  id: number;
  title: string;
  status: 'To Do' | 'In Progress' | 'Completed' | string;
  project_id: number;
  parent_task_id?: number | null;
  logged_time: number; // seconds
  deadline?: string | null;
  creator_id?: string;
  created_at: string;
  updated_at?: string | null;
}

// Utility: roll up child to parent
function rollupLoggedTime(tasks: Task[]): Map<number, number> {
  const taskMap = new Map<number, Task>();
  const timeMap = new Map<number, number>();
  tasks.forEach((t) => taskMap.set(t.id, t));
  tasks.forEach((t) => {
    const total = t.logged_time;
    if (t.parent_task_id && taskMap.has(t.parent_task_id)) {
      const parentTotal = timeMap.get(t.parent_task_id) ?? 0;
      timeMap.set(t.parent_task_id, parentTotal + t.logged_time);
    }
    timeMap.set(t.id, total);
  });
  return timeMap;
}

// Logged Time Report
export interface LoggedTimeReport {
  kind: 'loggedTime';
  totalTime: number; // hours
  avgTime: number; // hours
  completedCount: number;
  overdueCount: number;
  timeByTask: Map<number, number>; // seconds per task id (pre-division), or keep hours if preferred
  wipTime: number; // hours
  onTimeRate: number; // 0..1
  totalLateness: number; // hours
  overdueLoggedTime: number; // hours
}

export async function generateLoggedTimeReport(filters: ReportFilters): Promise<LoggedTimeReport> {
  const { projectIds, startDate, endDate } = filters;
  const tasks: Task[] = await getTasks({ projectIds, startDate, endDate });

  const taskTimeMap = rollupLoggedTime(tasks);
  const completedTasks = tasks.filter((t) => t.status === 'Completed');
  const wipTasks = tasks.filter((t) => t.status !== 'Completed');
  const now = new Date();

  const onTimeTasks = completedTasks.filter((t) => {
    if (!t.updated_at || !t.deadline) return false;
    return new Date(t.updated_at) <= new Date(t.deadline);
  });
  const onTimeRate = completedTasks.length ? onTimeTasks.length / completedTasks.length : 0;

  const totalLateness = completedTasks.reduce((sum, t) => {
    if (!t.updated_at || !t.deadline) return sum;
    const hoursLate = Math.max(
      0,
      (new Date(t.updated_at).getTime() - new Date(t.deadline).getTime()) / 1000 / 3600
    );
    return sum + hoursLate;
  }, 0);

  const overdueLoggedTime =
    wipTasks
      .filter((t) => t.deadline && new Date(t.deadline) < now)
      .reduce((sum, t) => sum + t.logged_time, 0) / 3600;

  const totalLoggedSeconds = tasks.reduce((sum, t) => sum + t.logged_time, 0);
  const avgLoggedSeconds = completedTasks.length
    ? completedTasks.reduce((sum, t) => sum + t.logged_time, 0) / completedTasks.length
    : 0;

  const overdueTasks = wipTasks.filter((t) => t.deadline && new Date(t.deadline) < now);

  return {
    kind: 'loggedTime',

    // Total logged time (hours) across ALL tasks (completed + WIP + overdue)
    totalTime: totalLoggedSeconds / 3600,

    // Average logged time (hours) per COMPLETED task only
    avgTime: avgLoggedSeconds / 3600,

    // Count of tasks with status='Completed'
    completedCount: completedTasks.length,

    // Count of WIP tasks that are past their deadline
    overdueCount: overdueTasks.length,

    // Map of task IDs to logged seconds (includes parent task rollup)
    timeByTask: taskTimeMap,

    // Total logged time (hours) for ALL non-completed tasks (includes both overdue and non-overdue WIP)
    wipTime: wipTasks.reduce((sum, t) => sum + t.logged_time, 0) / 3600,

    // Ratio (0-1) of completed tasks done on-time vs total completed (updated_at <= deadline)
    onTimeRate,

    // Total hours that completed tasks were late (sum of hours past deadline for completed tasks)
    totalLateness,

    // Total logged time (hours) for WIP tasks that are OVERDUE (subset of wipTime)
    overdueLoggedTime,
  };
}

// Team Summary Report (example shape — tailor to your needs)
export interface TeamSummaryReport {
  kind: 'teamSummary';
  totalTasks: number;
  tasksByCreator: Map<string, number>;
}

export async function generateTeamSummaryReport(
  filters: ReportFilters
): Promise<TeamSummaryReport> {
  const { projectIds, startDate, endDate } = filters;
  const tasks: Task[] = await getTasks({ projectIds, startDate, endDate });

  const tasksByCreator = new Map<string, number>();
  for (const t of tasks) {
    const key = t.creator_id ?? 'unknown';
    tasksByCreator.set(key, (tasksByCreator.get(key) ?? 0) + 1);
  }

  return {
    kind: 'teamSummary',
    totalTasks: tasks.length,
    tasksByCreator,
  };
}

// Task Completions Report (example shape — tailor to your needs)
export interface TaskCompletionReport {
  kind: 'taskCompletions';
  completionRate: number; // completed / total
  completedByProject: Map<number, number>;
}

export async function generateTaskCompletionReport(
  filters: ReportFilters
): Promise<TaskCompletionReport> {
  const { projectIds, startDate, endDate } = filters;
  const tasks: Task[] = await getTasks({ projectIds, startDate, endDate });

  const total = tasks.length || 1;
  const completed = tasks.filter((t) => t.status === 'Completed').length;
  const completionRate = completed / total;

  const completedByProject = new Map<number, number>();
  for (const t of tasks) {
    if (t.status === 'Completed') {
      completedByProject.set(t.project_id, (completedByProject.get(t.project_id) ?? 0) + 1);
    }
  }

  return {
    kind: 'taskCompletions',
    completionRate,
    completedByProject,
  };
}
