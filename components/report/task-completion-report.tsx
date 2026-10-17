'use client';

import { useEffect, useState } from 'react';
import {
  ReportMetrics,
  ReportError,
  StatusComparison,
  StatusLegend,
} from '@/components/report/report-comparison';
import type {
  TaskCompletionReport as TaskCompletionReportType,
  KPI,
  ChartData,
} from '@/components/report/export-buttons';
import { TaskCompletionReportSkeleton } from '@/components/report/report-skeletons';

interface Props {
  departmentIds?: number[];
  projectIds?: number[];
  startDate?: string;
  endDate?: string;
  onDataLoaded?: (data: TaskCompletionReportType) => void;
}

interface UserStats {
  userId: string;
  userName: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  todoTasks: number;
  blockedTasks: number;
  completionRate: number;
  avgCompletionTime: number;
  onTimeCompletions: number;
  lateCompletions: number;
  onTimeRate: number;
  totalLoggedTime: number;
  avgLoggedTimePerTask: number;
}

interface ReportData {
  totalTasks: number;
  totalCompleted: number;
  totalInProgress: number;
  totalTodo: number;
  totalBlocked: number;
  overallCompletionRate: number;
  userStats: UserStats[];
}

const round = (value: number, decimals: number = 2): number => {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

export function TaskCompletionsChart({
  departmentIds = [],
  projectIds = [],
  startDate,
  endDate,
  onDataLoaded,
}: Props) {
  const [data, setData] = useState<ReportData | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!departmentIds.length && !projectIds.length) {
      setData(null);
      return;
    }

    const controller = new AbortController();
    const fetchData = async () => {
      setError(false);
      try {
        const params = new URLSearchParams({
          action: 'task',
          departmentIds: departmentIds.join(','),
          projectIds: projectIds.join(','),
        });

        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);

        const res = await fetch(`/api/reports?${params}`, { signal: controller.signal });
        if (!res.ok) throw new Error('Failed to fetch task completions');

        const json = await res.json();
        if (controller.signal.aborted) return;
        if (json && json.kind === 'taskCompletions') {
          const newData: ReportData = {
            totalTasks: json.totalTasks || 0,
            totalCompleted: json.totalCompleted || 0,
            totalInProgress: json.totalInProgress || 0,
            totalTodo: json.totalTodo || 0,
            totalBlocked: json.totalBlocked || 0,
            overallCompletionRate: json.overallCompletionRate || 0,
            userStats: json.userStats || [],
          };

          setData(newData);

          // Generate export data
          if (onDataLoaded) {
            const kpis: KPI[] = [
              { label: 'Total Tasks', value: newData.totalTasks, unit: 'tasks' },
              { label: 'Completed', value: newData.totalCompleted, unit: 'tasks' },
              { label: 'In Progress', value: newData.totalInProgress, unit: 'tasks' },
              { label: 'To Do', value: newData.totalTodo, unit: 'tasks' },
              { label: 'Blocked', value: newData.totalBlocked, unit: 'tasks' },
              {
                label: 'Overall Completion Rate',
                value: round(newData.overallCompletionRate * 100, 1),
                unit: '%',
              },
            ];

            const charts: ChartData[] = [
              {
                type: 'pie',
                title: 'Task Status Distribution',
                data: [
                  { label: 'Completed', value: newData.totalCompleted },
                  { label: 'In Progress', value: newData.totalInProgress },
                  { label: 'To Do', value: newData.totalTodo },
                  { label: 'Blocked', value: newData.totalBlocked },
                ],
              },
              {
                type: 'bar',
                title: 'Top 10 Users by Total Tasks',
                data: newData.userStats.slice(0, 10).map((u) => ({
                  label: u.userName,
                  value: u.totalTasks,
                })),
              },
              {
                type: 'bar',
                title: 'Top 10 Users by Completion Rate',
                data: newData.userStats
                  .filter((u) => u.totalTasks > 0)
                  .sort((a, b) => b.completionRate - a.completionRate)
                  .slice(0, 10)
                  .map((u) => ({
                    label: u.userName,
                    value: round(u.completionRate * 100, 1),
                  })),
              },
            ];

            const exportData: TaskCompletionReportType = {
              kind: 'taskCompletions',
              totalTasks: newData.totalTasks,
              totalCompleted: newData.totalCompleted,
              totalInProgress: newData.totalInProgress,
              totalTodo: newData.totalTodo,
              totalBlocked: newData.totalBlocked,
              overallCompletionRate: newData.overallCompletionRate,
              userStats: newData.userStats,
              completedByProject: new Map(),
              kpis,
              charts,
            };
            onDataLoaded(exportData);
          }
        }
      } catch {
        if (controller.signal.aborted) return;
        setError(true);
        setData(null);
      }
    };

    fetchData();
    return () => controller.abort();
  }, [departmentIds, projectIds, startDate, endDate, retry, onDataLoaded]);

  if (error) return <ReportError retry={() => setRetry((value) => value + 1)} />;

  const displayData = data;

  if (!displayData) {
    return <TaskCompletionReportSkeleton />;
  }

  const maximum = Math.max(...displayData.userStats.map((user) => user.totalTasks), 1);
  return (
    <section className="space-y-5" aria-label="Task completions report">
      <ReportMetrics
        items={[
          { label: 'Tasks in scope', value: displayData.totalTasks },
          {
            label: 'Completed',
            value: displayData.totalCompleted,
            note: `${round(displayData.overallCompletionRate * 100, 1)}% completion`,
          },
          { label: 'In progress', value: displayData.totalInProgress },
          { label: 'To do', value: displayData.totalTodo },
          { label: 'Blocked', value: displayData.totalBlocked, problem: true },
        ]}
      />
      <div className="overflow-hidden rounded-2xl border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
          <div>
            <h2 className="text-base font-semibold tracking-tight">Completion by creator</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Created tasks, compared on a shared scale
            </p>
          </div>
          <StatusLegend />
        </div>
        <div className="hidden grid-cols-[180px_minmax(180px,1fr)_100px_110px_100px] gap-5 border-y bg-muted/30 px-6 py-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground lg:grid">
          <span>Creator</span>
          <span>Task distribution</span>
          <span className="text-right">Completion</span>
          <span className="text-right">Avg cycle</span>
          <span className="text-right">Logged time</span>
        </div>
        <div className="divide-y">
          {displayData.userStats.map((user) => (
            <div key={user.userId} className="p-5 sm:px-6">
              <div className="grid items-center gap-4 lg:grid-cols-[180px_minmax(180px,1fr)_100px_110px_100px] lg:gap-5">
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex size-9 shrink-0 items-center justify-center rounded-full bg-positive-soft text-xs font-medium text-positive"
                  >
                    {user.userName
                      .split(' ')
                      .map((part) => part[0])
                      .slice(0, 2)
                      .join('')}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{user.userName}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {user.totalTasks} created tasks
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <StatusComparison
                    maximum={maximum}
                    counts={{
                      completed: user.completedTasks,
                      inProgress: user.inProgressTasks,
                      todo: user.todoTasks,
                      blocked: user.blockedTasks,
                    }}
                  />
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
                    <span>{user.completedTasks} done</span>
                    <span>{user.inProgressTasks} active</span>
                    <span>{user.todoTasks} to do</span>
                    <span className={user.blockedTasks ? 'text-problem' : ''}>
                      {user.blockedTasks} blocked
                    </span>
                  </div>
                </div>
                <div className="flex justify-between text-sm lg:block lg:text-right">
                  <span className="text-xs text-muted-foreground lg:hidden">Completion</span>
                  <span className="font-medium tabular-nums text-positive">
                    {round(user.completionRate * 100, 1)}%
                  </span>
                </div>
                <div className="flex justify-between text-sm lg:block lg:text-right">
                  <span className="text-xs text-muted-foreground lg:hidden">Average cycle</span>
                  <span className="tabular-nums">
                    {round(user.avgCompletionTime, 1)}{' '}
                    <span className="text-xs text-muted-foreground">h</span>
                  </span>
                </div>
                <div className="flex justify-between text-sm lg:block lg:text-right">
                  <span className="text-xs text-muted-foreground lg:hidden">Logged time</span>
                  <span className="tabular-nums">
                    {round(user.totalLoggedTime, 1)}{' '}
                    <span className="text-xs text-muted-foreground">h</span>
                  </span>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-muted-foreground lg:pl-[228px]">
                <span>
                  <span className="text-positive">{user.onTimeCompletions}</span> on time
                </span>
                <span>
                  <span className={user.lateCompletions ? 'text-problem' : ''}>
                    {user.lateCompletions}
                  </span>{' '}
                  late
                </span>
                <span>{round(user.onTimeRate * 100, 1)}% on-time rate</span>
                <span>{round(user.avgLoggedTimePerTask, 1)} h logged / task</span>
              </div>
            </div>
          ))}
          {!displayData.userStats.length && (
            <p className="p-10 text-center text-sm text-muted-foreground">
              No created tasks match this scope.
            </p>
          )}
        </div>
        <p className="border-t px-6 py-4 text-[10px] leading-relaxed text-muted-foreground">
          Cycle duration uses creation to latest update for completed tasks. On-time compares latest
          update with deadline; completed tasks without a deadline remain in the rate’s denominator.
        </p>
      </div>
    </section>
  );
}
