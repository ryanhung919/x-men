'use client';

import { useEffect, useState } from 'react';
import {
  ReportMetrics,
  ReportError,
  StatusComparison,
  StatusLegend,
} from '@/components/report/report-comparison';
import type {
  TeamSummaryReport as TeamSummaryReportType,
  KPI,
  ChartData,
} from '@/components/report/export-buttons';
import { TeamSummaryReportSkeleton } from '@/components/report/report-skeletons';

interface Props {
  departmentIds?: number[];
  projectIds?: number[];
  startDate?: string;
  endDate?: string;
  onDataLoaded?: (data: TeamSummaryReportType) => void;
}

interface WeeklyData {
  week: string;
  weekStart: string;
  todo: number;
  inProgress: number;
  completed: number;
  blocked: number;
  total: number;
}

interface UserData {
  userId: string;
  userName: string;
  todo: number;
  inProgress: number;
  completed: number;
  blocked: number;
  total: number;
  completionRate: number;
}

interface ReportData {
  totalTasks: number;
  totalUsers: number;
  weeklyTotals: WeeklyData[];
  userTotals: UserData[];
}

const round = (value: number, decimals: number = 1): number => {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

// Format week label as date range (e.g., "Jan 8 - 14")
const formatWeekLabel = (weekStart: string): string => {
  // Parse as Singapore time (UTC+8)
  const startDate = new Date(weekStart);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6); // Add 6 days for week end

  // Month names array
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  const startMonth = months[startDate.getMonth()];
  const startDay = startDate.getDate();
  const endMonth = months[endDate.getMonth()];
  const endDay = endDate.getDate();

  // If same month, show "Jan 8-14"
  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}-${endDay}`;
  }
  // If different months, show "Jan 30 - Feb 5"
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
};

export function TeamSummaryChart({
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
          action: 'team',
          departmentIds: departmentIds.join(','),
          projectIds: projectIds.join(','),
        });

        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);

        const res = await fetch(`/api/reports?${params}`, { signal: controller.signal });
        if (!res.ok) throw new Error('Failed to fetch team summary');

        const json = await res.json();
        if (controller.signal.aborted) return;
        if (json && json.kind === 'teamSummary') {
          // Transform weekly data
          const weeklyTotals: WeeklyData[] = [];
          if (json.weekTotals) {
            Object.entries(json.weekTotals).forEach(([week, data]: [string, any]) => {
              weeklyTotals.push({
                week,
                weekStart: data.weekStart,
                todo: data.todo,
                inProgress: data.inProgress,
                completed: data.completed,
                blocked: data.blocked,
                total: data.total,
              });
            });
          }

          // Transform user data
          const userTotals: UserData[] = [];
          const userTotalsMap = new Map<
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

          if (json.userTotals) {
            Object.entries(json.userTotals).forEach(([userId, data]: [string, any]) => {
              const total = data.total || 1;
              userTotals.push({
                userId,
                userName: data.userName,
                todo: data.todo,
                inProgress: data.inProgress,
                completed: data.completed,
                blocked: data.blocked,
                total: data.total,
                completionRate: (data.completed / total) * 100,
              });

              userTotalsMap.set(userId, {
                userName: data.userName,
                todo: data.todo,
                inProgress: data.inProgress,
                completed: data.completed,
                blocked: data.blocked,
                total: data.total,
              });
            });
          }

          // Sort by total tasks descending
          userTotals.sort((a, b) => b.total - a.total);
          weeklyTotals.sort((a, b) => a.week.localeCompare(b.week));

          const newData: ReportData = {
            totalTasks: json.totalTasks || 0,
            totalUsers: json.totalUsers || 0,
            weeklyTotals,
            userTotals,
          };

          setData(newData);

          // Generate export data
          if (onDataLoaded) {
            const kpis: KPI[] = [
              { label: 'Total Tasks', value: newData.totalTasks, unit: 'tasks' },
              { label: 'Active Users', value: newData.totalUsers, unit: 'users' },
              { label: 'Weeks Tracked', value: weeklyTotals.length, unit: 'weeks' },
              {
                label: 'Avg Tasks per User',
                value:
                  newData.totalUsers > 0 ? round(newData.totalTasks / newData.totalUsers, 1) : 0,
                unit: 'tasks/user',
              },
            ];

            const charts: ChartData[] = [];

            // Weekly trend chart (total tasks per week)
            if (weeklyTotals.length > 0) {
              charts.push({
                type: 'bar',
                title: 'Total Tasks by Week',
                data: weeklyTotals.map((w) => ({
                  label: w.week,
                  value: w.total,
                })),
              });

              // Status breakdown for latest week
              const latestWeek = weeklyTotals[weeklyTotals.length - 1];
              charts.push({
                type: 'pie',
                title: `Status Distribution (${latestWeek.week})`,
                data: [
                  { label: 'Completed', value: latestWeek.completed },
                  { label: 'In Progress', value: latestWeek.inProgress },
                  { label: 'To Do', value: latestWeek.todo },
                  { label: 'Blocked', value: latestWeek.blocked },
                ],
              });
            }

            // Top users by total tasks
            charts.push({
              type: 'bar',
              title: 'Top 10 Users by Total Tasks',
              data: userTotals.slice(0, 10).map((u) => ({
                label: u.userName,
                value: u.total,
              })),
            });

            // Weekly breakdown data for export
            const weeklyBreakdown = json.weeklyBreakdown || [];

            const exportData: TeamSummaryReportType = {
              kind: 'teamSummary',
              totalTasks: newData.totalTasks,
              totalUsers: newData.totalUsers,
              weeklyBreakdown,
              userTotals: userTotalsMap,
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
    return <TeamSummaryReportSkeleton />;
  }

  const maximum = Math.max(...displayData.userTotals.map((user) => user.total), 1);
  const weeklyMaximum = Math.max(...displayData.weeklyTotals.map((week) => week.total), 1);
  return (
    <section className="space-y-5" aria-label="Team summary report">
      <ReportMetrics
        items={[
          {
            label: 'Tasks in scope',
            value: displayData.totalTasks,
            note: 'Across selected projects',
          },
          {
            label: 'Contributors',
            value: displayData.totalUsers,
            note: 'People who created tasks',
          },
          {
            label: 'Weeks tracked',
            value: displayData.weeklyTotals.length,
            note: 'Grouped by creation date',
          },
          {
            label: 'Tasks / contributor',
            value: displayData.totalUsers
              ? round(displayData.totalTasks / displayData.totalUsers, 1)
              : 0,
          },
        ]}
      />
      <div className="rounded-2xl border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold tracking-tight">Weekly work distribution</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Tasks created each week, grouped by current status
            </p>
          </div>
          <StatusLegend />
        </div>
        {displayData.weeklyTotals.length ? (
          <div className="mt-6 flex gap-3">
            <div
              aria-hidden="true"
              className="mt-[30px] flex h-[180px] shrink-0 flex-col justify-between pb-0 text-[10px] tabular-nums text-muted-foreground"
            >
              <span>{weeklyMaximum}</span>
              <span>{round(weeklyMaximum / 2, 1)}</span>
              <span>0</span>
            </div>
            <div className="min-w-0 flex-1 overflow-x-auto">
              <div
                className="flex h-[242px] min-w-full items-end gap-3 border-b border-border/50"
                style={{ minWidth: `${Math.max(displayData.weeklyTotals.length * 70, 250)}px` }}
              >
                {displayData.weeklyTotals.map((week) => (
                  <div
                    key={week.week}
                    className="flex h-full flex-1 flex-col items-center justify-end gap-3"
                  >
                    <figure
                      aria-label={`${formatWeekLabel(week.weekStart)}: ${week.completed} completed, ${week.inProgress} in progress, ${week.todo} to do, ${week.blocked} blocked; ${week.total} total`}
                      className="relative flex w-full max-w-16 flex-col justify-end"
                      style={{ height: 210 }}
                    >
                      <span
                        className="absolute left-1/2 -translate-x-1/2 text-[10px] font-medium tabular-nums"
                        style={{ bottom: `${(week.total / weeklyMaximum) * 180 + 8}px` }}
                      >
                        {week.total}
                      </span>
                      <div
                        className="flex w-full flex-col-reverse overflow-hidden rounded-t-md"
                        style={{ height: `${(week.total / weeklyMaximum) * 180}px` }}
                      >
                        {[
                          { value: week.completed, color: 'var(--chart-1)', name: 'Completed' },
                          { value: week.inProgress, color: 'var(--chart-2)', name: 'In progress' },
                          { value: week.todo, color: 'var(--muted-foreground)', name: 'To do' },
                          { value: week.blocked, color: 'var(--chart-problem)', name: 'Blocked' },
                        ].map(({ value, color, name }) => (
                          <span
                            key={name}
                            title={`${name}: ${value}`}
                            style={{
                              height: `${(value / Math.max(week.total, 1)) * 100}%`,
                              background: color,
                            }}
                          />
                        ))}
                      </div>
                    </figure>
                    <span className="h-5 whitespace-nowrap text-[10px] text-muted-foreground">
                      {formatWeekLabel(week.weekStart)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="py-14 text-center text-sm text-muted-foreground">
            No weekly activity matches this scope.
          </p>
        )}
      </div>
      <div className="overflow-hidden rounded-2xl border bg-card">
        <div className="p-5 sm:p-6">
          <h2 className="text-base font-semibold tracking-tight">Work distribution by creator</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Shared scale · task counts across selected weeks
          </p>
        </div>
        <div className="hidden grid-cols-[200px_1fr_90px_100px] gap-6 border-y bg-muted/30 px-6 py-3 text-[10px] uppercase tracking-wider text-muted-foreground md:grid">
          <span>Creator</span>
          <span>Task distribution</span>
          <span className="text-right">Total</span>
          <span className="text-right">Completion</span>
        </div>
        <div className="divide-y">
          {displayData.userTotals.map((user) => (
            <div
              key={user.userId}
              className="grid items-center gap-4 p-5 sm:px-6 md:grid-cols-[200px_1fr_90px_100px] md:gap-6"
            >
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
                <span className="truncate text-sm font-medium">{user.userName}</span>
              </div>
              <div>
                <StatusComparison
                  maximum={maximum}
                  counts={{
                    completed: user.completed,
                    inProgress: user.inProgress,
                    todo: user.todo,
                    blocked: user.blocked,
                  }}
                />
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
                  <span>{user.completed} done</span>
                  <span>{user.inProgress} active</span>
                  <span>{user.todo} to do</span>
                  <span className={user.blocked ? 'text-problem' : ''}>{user.blocked} blocked</span>
                </div>
              </div>
              <div className="flex justify-between text-sm md:block md:text-right">
                <span className="text-xs text-muted-foreground md:hidden">Total tasks</span>
                <span className="tabular-nums">{user.total}</span>
              </div>
              <div className="flex justify-between text-sm md:block md:text-right">
                <span className="text-xs text-muted-foreground md:hidden">Completion</span>
                <span className="font-medium tabular-nums text-positive">
                  {round(user.completionRate, 1)}%
                </span>
              </div>
            </div>
          ))}
          {!displayData.userTotals.length && (
            <p className="p-10 text-center text-sm text-muted-foreground">
              No contributors match this scope.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
