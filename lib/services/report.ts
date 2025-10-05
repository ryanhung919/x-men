import { getTasks } from '@/lib/db/report';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

export type ReportType = 'loggedTime' | 'teamSummary' | 'taskCompletions';

interface ReportOptions {
  projectIds?: number[];
  startDate?: Date; // optional, fallback handled in getTasks
  endDate?: Date; // optional
  type: ReportType;
}

interface ExportOptions extends ReportOptions {
  format: 'pdf' | 'xlsx';
}

interface Task {
  id: number;
  title: string;
  status: 'To Do' | 'In Progress' | 'Done' | string;
  project_id: number;
  parent_task_id?: number | null;
  logged_time: number; // seconds
  deadline?: string;
  creator_id?: string;
  created_at: string;
  updated_at?: string;
}

export interface LoggedTimeReport {
  totalTime: number;
  avgTime: number;
  completedCount: number;
  overdueCount: number;
  timeByTask: Map<number, number>;
  wipTime: number;
  onTimeRate: number;
  totalLateness: number;
  overdueLoggedTime: number;
}

export interface TeamSummaryReport {
  // Add fields returned by teamSummary logic, e.g.:
  // totalTasks: number;
  // tasksByCreator: Map<string, number>;
  // ... other fields
}

export interface TaskCompletionReport {
  // Add fields returned by taskCompletion logic, e.g.:
  // completionRate: number;
  // completedByProject: Map<number, number>;
  // ... other fields
}

export type GeneratedReport = LoggedTimeReport | TeamSummaryReport | TaskCompletionReport;


// --- Rollup subtasks to parent tasks ---
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

export async function generateReport(
  opts: ReportOptions & { type: 'loggedTime' }
): Promise<LoggedTimeReport>;

export async function generateReport(
  opts: ReportOptions & { type: 'teamSummary' }
): Promise<TeamSummaryReport>;

export async function generateReport(
  opts: ReportOptions & { type: 'taskCompletions' }
): Promise<TaskCompletionReport>;
export async function generateReport(
  opts: ReportOptions
): Promise<LoggedTimeReport | TeamSummaryReport | TaskCompletionReport>;


// --- Generate report data ---
export async function generateReport(opts: ReportOptions): Promise<LoggedTimeReport | TeamSummaryReport | TaskCompletionReport> {
  const { projectIds, startDate, endDate, type } = opts;

  const tasks: Task[] = await getTasks({ projectIds, startDate, endDate });

  if (type === 'loggedTime') {
    const taskTimeMap = rollupLoggedTime(tasks);

    const completedTasks = tasks.filter((t) => t.status === 'Done');
    const wipTasks = tasks.filter((t) => t.status !== 'Done');

    const now = new Date();

    // On-time completion rate
    const onTimeTasks = completedTasks.filter((t) => {
      if (!t.updated_at || !t.deadline) return false;
      return new Date(t.updated_at) <= new Date(t.deadline);
    });
    const onTimeRate = completedTasks.length ? onTimeTasks.length / completedTasks.length : 0;

    // Lateness in hours
    const totalLateness = completedTasks.reduce((sum, t) => {
      if (!t.updated_at || !t.deadline) return sum;
      const late = Math.max(
        0,
        (new Date(t.updated_at).getTime() - new Date(t.deadline).getTime()) / 1000 / 3600
      );
      return sum + late;
    }, 0);

    // Overdue logged time
    const overdueLoggedTime =
      wipTasks
        .filter((t) => t.deadline && new Date(t.deadline) < now)
        .reduce((sum, t) => sum + t.logged_time, 0) / 3600;

    const totalLoggedSeconds = tasks.reduce((sum, t) => sum + t.logged_time, 0);
    const avgLogged = completedTasks.length
      ? completedTasks.reduce((sum, t) => sum + t.logged_time, 0) / completedTasks.length
      : 0;

    const overdueTasks = wipTasks.filter((t) => t.deadline && new Date(t.deadline) < now);

    return {
      totalTime: totalLoggedSeconds / 3600,
      avgTime: avgLogged / 3600,
      completedCount: completedTasks.length,
      overdueCount: overdueTasks.length,
      timeByTask: taskTimeMap,
      wipTime: wipTasks.reduce((sum, t) => sum + t.logged_time, 0) / 3600,
      onTimeRate,
      totalLateness,
      overdueLoggedTime,
    };
  }

  // if (type === "teamSummary") {
  //   const statusCounts = ["To Do", "In Progress", "Done"].map((status: string) => ({
  //     status,
  //     count: tasks.filter((t: Task) => t.status === status).length,
  //   }));

  //   const topPerformers = tasks
  //     .filter((t: Task) => t.status === "Done")
  //     .reduce((acc: Record<string, number>, t: Task) => {
  //       if (!t.assignee_id) return acc;
  //       acc[t.assignee_id] = (acc[t.assignee_id] ?? 0) + 1;
  //       return acc;
  //     }, {});

  //   const overdueCount = tasks.filter(
  //     (t: Task) => t.deadline && new Date(t.deadline) < new Date() && t.status !== "Done"
  //   ).length;

  //   return { statusCounts, topPerformers, overdueCount, totalTasks: tasks.length };
  // }

  // if (type === "taskCompletions") {
  //   const completionsPerProject: Record<number, number> = {};
  //   const completionsPerUser: Record<string, number> = {};

  //   tasks.forEach((t: Task) => {
  //     if (t.status === "Done") {
  //       completionsPerProject[t.project_id] = (completionsPerProject[t.project_id] ?? 0) + 1;
  //       if (t.creator_id) completionsPerUser[t.creator_id] = (completionsPerUser[t.creator_id] ?? 0) + 1;
  //     }
  //   });

  //   return { completionsPerProject, completionsPerUser };
  // }

  return {};
}

// --- Export functions ---
export async function exportReport(reportData: any, opts: ExportOptions) {
  const { type, format } = opts;

  if (format === 'pdf') {
    const doc = new jsPDF();
    doc.text(`${type} Report`, 10, 10);
    doc.text(JSON.stringify(reportData, null, 2), 10, 20);
    return { buffer: doc.output('arraybuffer'), mime: 'application/pdf' };
  }

  if (format === 'xlsx') {
    const ws = XLSX.utils.json_to_sheet(
      Array.isArray(reportData) ? reportData : Object.values(reportData)
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return {
      buffer: buf,
      mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  throw new Error('Unsupported export format');
}
