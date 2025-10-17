'use client';

import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Pie, PieChart } from 'recharts';
import { User } from 'lucide-react';
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

// Chart configs
const statusConfig = {
  completed: { label: 'Completed', color: 'var(--chart-1)' },
  inProgress: { label: 'In Progress', color: 'var(--chart-4)' },
  todo: { label: 'To Do', color: 'var(--chart-5)' },
  blocked: { label: 'Blocked', color: 'var(--destructive)' },
} satisfies ChartConfig;

export function TaskCompletionsChart({
  departmentIds = [],
  projectIds = [],
  startDate,
  endDate,
  onDataLoaded,
}: Props) {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const prevDataRef = useRef<ReportData | null>(null);

  useEffect(() => {
    if (!departmentIds.length) {
      setData(null);
      prevDataRef.current = null;
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          action: 'task',
          departmentIds: departmentIds.join(','),
          projectIds: projectIds.join(','),
        });

        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);

        const res = await fetch(`/api/reports?${params}`);
        if (!res.ok) throw new Error('Failed to fetch task completions');

        const json = await res.json();
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

          prevDataRef.current = newData;
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
      } catch (err) {
        console.error(err);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [departmentIds, projectIds, startDate, endDate]);

  const displayData = loading && prevDataRef.current ? prevDataRef.current : data;

  if (!displayData) {
    return <TaskCompletionReportSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Overall Summary Card */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="text-lg">Team Overview</CardTitle>
          <CardDescription>Aggregate task completion statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Total Tasks</div>
              <div className="text-2xl font-bold">{displayData.totalTasks}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Completed</div>
              <div className="text-2xl font-bold" style={{ color: 'var(--chart-1)' }}>
                {displayData.totalCompleted}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">In Progress</div>
              <div className="text-2xl font-bold" style={{ color: 'var(--chart-4)' }}>
                {displayData.totalInProgress}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">To Do</div>
              <div className="text-2xl font-bold" style={{ color: 'var(--chart-5)' }}>
                {displayData.totalTodo}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Blocked</div>
              <div className="text-2xl font-bold" style={{ color: 'var(--destructive)' }}>
                {displayData.totalBlocked}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Completion Rate</div>
              <div className="text-2xl font-bold">
                {round(displayData.overallCompletionRate * 100, 1)}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {displayData.userStats.map((user) => (
          <Card key={user.userId} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">{user.userName}</CardTitle>
              </div>
              <CardDescription className="text-xs">
                {user.totalTasks} task{user.totalTasks !== 1 ? 's' : ''} assigned
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Task Status Distribution */}
              <div>
                <div className="text-xs font-medium mb-2">Task Status</div>
                <ChartContainer config={statusConfig} className="h-[120px] w-full">
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                    <Pie
                      data={[
                        {
                          name: 'completed',
                          value: user.completedTasks,
                          fill: statusConfig.completed.color,
                        },
                        {
                          name: 'inProgress',
                          value: user.inProgressTasks,
                          fill: statusConfig.inProgress.color,
                        },
                        {
                          name: 'todo',
                          value: user.todoTasks,
                          fill: statusConfig.todo.color,
                        },
                        {
                          name: 'blocked',
                          value: user.blockedTasks,
                          fill: statusConfig.blocked.color,
                        },
                      ]}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={25}
                      outerRadius={45}
                    />
                  </PieChart>
                </ChartContainer>
                <div className="grid grid-cols-4 gap-2 text-xs mt-2">
                  <div className="text-center">
                    <div className="font-medium" style={{ color: 'var(--chart-1)' }}>
                      {user.completedTasks}
                    </div>
                    <div className="text-muted-foreground">Done</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium" style={{ color: 'var(--chart-4)' }}>
                      {user.inProgressTasks}
                    </div>
                    <div className="text-muted-foreground">In Progress</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium" style={{ color: 'var(--chart-5)' }}>
                      {user.todoTasks}
                    </div>
                    <div className="text-muted-foreground">To Do</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium" style={{ color: 'var(--destructive)' }}>
                      {user.blockedTasks}
                    </div>
                    <div className="text-muted-foreground">Blocked</div>
                  </div>
                </div>
              </div>

              {/* Completion Rate */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Completion Rate</span>
                  <span className="font-medium">{round(user.completionRate * 100, 1)}%</span>
                </div>
                <Progress value={user.completionRate * 100} />
              </div>

              {/* On-Time Performance */}
              {user.completedTasks >= 0 && (
                <div>
                  <div className="text-xs font-medium mb-2">On-Time Performance</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-muted-foreground">On-Time</div>
                      <div className="font-medium text-green-600">{user.onTimeCompletions}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Late</div>
                      <div className="font-medium text-red-600">{user.lateCompletions}</div>
                    </div>
                  </div>
                  <Progress value={user.onTimeRate * 100} className="mt-2" />
                  <div className="text-xs text-center mt-1 text-muted-foreground">
                    {round(user.onTimeRate * 100, 1)}% on-time
                  </div>
                </div>
              )}

              {/* Time Metrics */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t">
                <div>
                  <div className="text-xs text-muted-foreground">Average Task Cycle Duration</div>
                  <div className="text-sm font-medium">{round(user.avgCompletionTime, 1)}h</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Total Logged Hours</div>
                  <div className="text-sm font-medium">{round(user.totalLoggedTime, 1)}h</div>
                </div>
              </div>

              {loading && (
                <div className="absolute inset-0 animate-pulse bg-black/5 rounded-lg pointer-events-none" />
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {displayData.userStats.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No user statistics available for the selected filters
        </div>
      )}
    </div>
  );
}
