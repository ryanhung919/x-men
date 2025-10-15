import { getTasks, getUsersByIds, UserInfo, getWeeklyTaskStatsByUser } from '@/lib/db/report';

// Shared types
export type ReportFormat = 'pdf' | 'xlsx';
export interface ReportFilters {
  projectIds?: number[];
  departmentIds?: number[];
  startDate?: Date;
  endDate?: Date;
}

// Task shape (as used by your DB layer)
interface Task {
  id: number;
  title: string;
  status: 'To Do' | 'In Progress' | 'Completed' | 'Blocked' | string;
  project_id: number;
  parent_task_id?: number | null;
  logged_time: number; // seconds
  deadline?: string | null;
  creator_id?: string;
  created_at: string;
  updated_at?: string | null;
}

// Utility: roll up child logged time to parent
function rollupLoggedTime(tasks: Task[]): Map<number, number> {
  const taskMap = new Map<number, Task>();
  const timeMap = new Map<number, number>();

  tasks.forEach((t) => taskMap.set(t.id, t));

  tasks.forEach((t) => {
    // Start with task's own logged time
    let total = t.logged_time;

    // If this task has a parent, add this task's time to parent's total
    if (t.parent_task_id && taskMap.has(t.parent_task_id)) {
      const parentTotal = timeMap.get(t.parent_task_id) ?? 0;
      timeMap.set(t.parent_task_id, parentTotal + t.logged_time);
    }

    // Set this task's total time
    timeMap.set(t.id, total);
  });

  return timeMap;
}

// Logged Time Report
export interface LoggedTimeReport {
  kind: 'loggedTime';
  totalTime: number; // hours - total across ALL tasks
  avgTime: number; // hours - average per completed task
  completedTasks: number; // count of completed tasks
  overdueTasks: number; // count of overdue incomplete tasks (In Progress/Blocked/To Do)
  blockedTasks: number; // count of blocked tasks
  timeByTask: Map<number, number>; // seconds per task id (with rollup)
  incompleteTime: number; // hours - logged time for incomplete tasks (In Progress + Blocked + To Do)
  onTimeCompletionRate: number; // 0..1 - ratio of on-time completions
  totalDelayHours: number; // hours - sum of hours late for completed tasks
  overdueTime: number; // hours - logged time for overdue incomplete tasks
}

/**
 * Generate logged time report
 * Calculates time metrics, completion rates, and delay analysis
 * 
 * IMPORTANT: This fetches ALL tasks for selected projects/departments,
 * bypassing RLS. Access control should be done at API layer.
 */
export async function generateLoggedTimeReport(filters: ReportFilters): Promise<LoggedTimeReport> {
  const { projectIds, departmentIds, startDate, endDate } = filters;
  
  // Fetch ALL tasks for the selected projects/departments (no RLS filtering)
  const tasks: Task[] = await getTasks({ projectIds, departmentIds, startDate, endDate });

  const taskTimeMap = rollupLoggedTime(tasks);

  // Categorize tasks by status
  const completedTasks = tasks.filter((t) => t.status === 'Completed');
  const blockedTasks = tasks.filter((t) => t.status === 'Blocked');
  const incompleteTasks = tasks.filter((t) => t.status !== 'Completed'); // In Progress + Blocked + To Do

  const now = new Date();

  // Calculate on-time completion rate
  const onTimeTasks = completedTasks.filter((t) => {
    if (!t.updated_at || !t.deadline) return false;
    return new Date(t.updated_at) <= new Date(t.deadline);
  });
  const onTimeCompletionRate = completedTasks.length ? onTimeTasks.length / completedTasks.length : 0;

  // Calculate total delay (lateness) for completed tasks
  const totalDelayHours = completedTasks.reduce((sum, t) => {
    if (!t.updated_at || !t.deadline) return sum;
    const hoursLate = Math.max(
      0,
      (new Date(t.updated_at).getTime() - new Date(t.deadline).getTime()) / 1000 / 3600
    );
    return sum + hoursLate;
  }, 0);

  // Calculate overdue tasks (incomplete tasks past deadline)
  const overdueTasks = incompleteTasks.filter(
    (t) => t.deadline && new Date(t.deadline) < now
  );

  // Calculate logged time for overdue incomplete tasks
  const overdueTime = overdueTasks.reduce((sum, t) => sum + t.logged_time, 0) / 3600;

  // Calculate totals
  const totalLoggedSeconds = tasks.reduce((sum, t) => sum + t.logged_time, 0);

  // Average is calculated only for completed tasks
  const avgLoggedSeconds = completedTasks.length
    ? completedTasks.reduce((sum, t) => sum + t.logged_time, 0) / completedTasks.length
    : 0;

  // Incomplete time includes In Progress, To Do, and Blocked tasks
  const incompleteLoggedSeconds = incompleteTasks.reduce((sum, t) => sum + t.logged_time, 0);

  return {
    kind: 'loggedTime',

    // Total logged time (hours) across ALL tasks (Completed + In Progress + Blocked + To Do)
    totalTime: totalLoggedSeconds / 3600,

    // Average logged time (hours) per COMPLETED task only
    avgTime: avgLoggedSeconds / 3600,

    // Count of tasks with status='Completed'
    completedTasks: completedTasks.length,

    // Count of incomplete tasks (In Progress/Blocked/To Do) that are past their deadline
    overdueTasks: overdueTasks.length,

    // Count of tasks with status='Blocked'
    blockedTasks: blockedTasks.length,

    // Map of task IDs to logged seconds (includes parent task rollup)
    timeByTask: taskTimeMap,

    // Total logged time (hours) for ALL incomplete tasks (In Progress + Blocked + To Do)
    incompleteTime: incompleteLoggedSeconds / 3600,

    // Ratio (0-1) of completed tasks done on-time vs total completed (updated_at <= deadline)
    onTimeCompletionRate,

    // Total hours that completed tasks were late (sum of hours past deadline for completed tasks)
    totalDelayHours,

    // Total logged time (hours) for incomplete tasks that are OVERDUE (subset of incompleteTime)
    overdueTime,
  };
}

// Team Summary Report
export interface WeeklyUserTaskBreakdown {
  week: string; // "2024-W01"
  weekStart: string;
  userId: string;
  userName: string;
  todo: number;
  inProgress: number;
  completed: number;
  blocked: number;
  total: number;
}

export interface TeamSummaryReport {
  kind: 'teamSummary';
  totalTasks: number;
  totalUsers: number;
  weeklyBreakdown: WeeklyUserTaskBreakdown[];
  userTotals: Map<
    string,
    {
      userName: string;
      todo: number;
      inProgress: number;
      completed: number;
      blocked: number;
      total: number;
    }
  >;
  weekTotals: Map<
    string,
    {
      weekStart: string;
      todo: number;
      inProgress: number;
      completed: number;
      blocked: number;
      total: number;
    }
  >;
}

/**
 * Generate team summary report
 * Groups tasks by week and user with status breakdowns
 * 
 * IMPORTANT: Fetches ALL tasks for selected projects/departments (no RLS filtering)
 */
export async function generateTeamSummaryReport(
  filters: ReportFilters
): Promise<TeamSummaryReport> {
  const { projectIds, departmentIds, startDate, endDate } = filters;
  const weeklyStats = await getWeeklyTaskStatsByUser({
    projectIds,
    departmentIds,
    startDate,
    endDate,
  });

  // Calculate user totals
  const userTotals = new Map<
    string,
    {
      userName: string;
      todo: number;
      inProgress: number;
      completed: number;
      blocked: number;
      total: number;
    }
  >();

  // Calculate week totals
  const weekTotals = new Map<
    string,
    {
      weekStart: string;
      todo: number;
      inProgress: number;
      completed: number;
      blocked: number;
      total: number;
    }
  >();

  weeklyStats.forEach((stat) => {
    // Aggregate by user
    if (!userTotals.has(stat.userId)) {
      userTotals.set(stat.userId, {
        userName: stat.userName,
        todo: 0,
        inProgress: 0,
        completed: 0,
        blocked: 0,
        total: 0,
      });
    }
    const userTotal = userTotals.get(stat.userId)!;
    userTotal.todo += stat.todo;
    userTotal.inProgress += stat.inProgress;
    userTotal.completed += stat.completed;
    userTotal.blocked += stat.blocked;
    userTotal.total += stat.total;

    // Aggregate by week
    if (!weekTotals.has(stat.week)) {
      weekTotals.set(stat.week, {
        weekStart: stat.weekStart,
        todo: 0,
        inProgress: 0,
        completed: 0,
        blocked: 0,
        total: 0,
      });
    }
    const weekTotal = weekTotals.get(stat.week)!;
    weekTotal.todo += stat.todo;
    weekTotal.inProgress += stat.inProgress;
    weekTotal.completed += stat.completed;
    weekTotal.blocked += stat.blocked;
    weekTotal.total += stat.total;
  });

  const totalTasks = weeklyStats.reduce((sum, stat) => sum + stat.total, 0);
  const uniqueUsers = new Set(weeklyStats.map((s) => s.userId)).size;

  return {
    kind: 'teamSummary',

    // Total number of tasks across all users and weeks in the filtered date range
    totalTasks,

    // Count of unique users who have tasks in the filtered date range
    totalUsers: uniqueUsers,

    // Array of weekly task breakdowns per user (week, userId, userName, status counts including blocked)
    weeklyBreakdown: weeklyStats,

    // Map of userId to aggregated task counts across all weeks (includes blocked count)
    userTotals,

    // Map of week identifier to aggregated task counts across all users (includes blocked count)
    weekTotals,
  };
}

// Task Completions Report
export interface UserTaskStats {
  userId: string;
  userName: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  todoTasks: number;
  blockedTasks: number;
  completionRate: number; // 0-1
  avgCompletionTime: number; // hours (from created_at to updated_at for completed tasks)
  onTimeCompletions: number;
  lateCompletions: number;
  onTimeRate: number; // 0-1
  totalLoggedTime: number; // hours
  avgLoggedTimePerTask: number; // hours
}

export interface TaskCompletionReport {
  kind: 'taskCompletions';
  totalTasks: number;
  totalCompleted: number;
  totalInProgress: number;
  totalTodo: number;
  totalBlocked: number;
  overallCompletionRate: number; // 0-1
  userStats: UserTaskStats[];
  completedByProject: Map<number, number>;
}

/**
 * Generate task completion report
 * Analyzes completion rates, timing, and per-user statistics
 * 
 * IMPORTANT: Fetches ALL tasks for selected projects/departments (no RLS filtering)
 */
export async function generateTaskCompletionReport(
  filters: ReportFilters
): Promise<TaskCompletionReport> {
  const { projectIds, departmentIds, startDate, endDate } = filters;
  const tasks: Task[] = await getTasks({ projectIds, departmentIds, startDate, endDate });

  // Get user info for display names
  const uniqueUserIds = [...new Set(tasks.map((t) => t.creator_id))].filter(
    (id): id is string => typeof id === 'string'
  );
  const usersData = await getUsersByIds(uniqueUserIds);

  const userNameMap = new Map(
    usersData.map((u: UserInfo) => [u.id, `${u.first_name} ${u.last_name}`])
  );

  // Calculate overall stats
  const totalCompleted = tasks.filter((t) => t.status === 'Completed').length;
  const totalInProgress = tasks.filter((t) => t.status === 'In Progress').length;
  const totalTodo = tasks.filter((t) => t.status === 'To Do').length;
  const totalBlocked = tasks.filter((t) => t.status === 'Blocked').length;
  const overallCompletionRate = tasks.length > 0 ? totalCompleted / tasks.length : 0;

  // Group tasks by creator
  const tasksByUser = new Map<string, Task[]>();
  tasks.forEach((task) => {
    const userId = task.creator_id || 'Unassigned';
    if (!tasksByUser.has(userId)) {
      tasksByUser.set(userId, []);
    }
    tasksByUser.get(userId)!.push(task);
  });

  // Calculate per-user statistics
  const userStats: UserTaskStats[] = Array.from(tasksByUser.entries()).map(
    ([userId, userTasks]) => {
      const completed = userTasks.filter((t) => t.status === 'Completed');
      const inProgress = userTasks.filter((t) => t.status === 'In Progress');
      const todo = userTasks.filter((t) => t.status === 'To Do');
      const blocked = userTasks.filter((t) => t.status === 'Blocked');

      // Calculate average completion time (created_at to updated_at for completed tasks)
      const avgCompletionTime =
        completed.length > 0
          ? completed.reduce((sum, t) => {
              if (t.updated_at && t.created_at) {
                const duration =
                  (new Date(t.updated_at).getTime() - new Date(t.created_at).getTime()) /
                  1000 /
                  3600;
                return sum + duration;
              }
              return sum;
            }, 0) / completed.length
          : 0;

      // Calculate on-time vs late completions
      const onTimeCompletions = completed.filter((t) => {
        if (!t.deadline || !t.updated_at) return false;
        return new Date(t.updated_at) <= new Date(t.deadline);
      }).length;

      const lateCompletions = completed.filter((t) => {
        if (!t.deadline || !t.updated_at) return false;
        return new Date(t.updated_at) > new Date(t.deadline);
      }).length;

      const onTimeRate = completed.length > 0 ? onTimeCompletions / completed.length : 0;

      // Calculate total logged time
      const totalLoggedTime = userTasks.reduce((sum, t) => sum + (t.logged_time || 0), 0) / 3600;
      const avgLoggedTimePerTask = userTasks.length > 0 ? totalLoggedTime / userTasks.length : 0;

      return {
        userId,
        userName:
          userNameMap.get(userId) || (userId === 'Unassigned' ? 'Unassigned' : 'Unknown User'),
        totalTasks: userTasks.length,
        completedTasks: completed.length,
        inProgressTasks: inProgress.length,
        todoTasks: todo.length,
        blockedTasks: blocked.length,
        completionRate: userTasks.length > 0 ? completed.length / userTasks.length : 0,
        avgCompletionTime,
        onTimeCompletions,
        lateCompletions,
        onTimeRate,
        totalLoggedTime,
        avgLoggedTimePerTask,
      };
    }
  );

  // Sort by total tasks descending
  userStats.sort((a, b) => b.totalTasks - a.totalTasks);

  // Calculate completed by project
  const completedByProject = new Map<number, number>();
  tasks.forEach((t) => {
    if (t.status === 'Completed') {
      completedByProject.set(t.project_id, (completedByProject.get(t.project_id) || 0) + 1);
    }
  });

  return {
    kind: 'taskCompletions',

    // Total number of tasks (all statuses) for the filtered projects/date range
    totalTasks: tasks.length,

    // Count of tasks with status='Completed'
    totalCompleted,

    // Count of tasks with status='In Progress'
    totalInProgress,

    // Count of tasks with status='To Do'
    totalTodo,

    // Count of tasks with status='Blocked'
    totalBlocked,

    // Ratio (0-1) of completed tasks vs total tasks
    overallCompletionRate,

    // Array of per-user statistics (sorted by totalTasks descending) including blocked count
    userStats,

    // Map of project_id to count of completed tasks in that project
    completedByProject,
  };
}