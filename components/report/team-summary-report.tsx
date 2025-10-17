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
import { Bar, BarChart, XAxis, YAxis, Legend } from 'recharts';
import { Users, TrendingUp, Calendar } from 'lucide-react';
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

// Chart configs matching your existing style
const statusConfig = {
  todo: { label: 'To Do', color: 'var(--chart-5)' },
  inProgress: { label: 'In Progress', color: 'var(--chart-4)' },
  completed: { label: 'Completed', color: 'var(--chart-1)' },
  blocked: { label: 'Blocked', color: 'var(--destructive)' },
} satisfies ChartConfig;

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
          action: 'team',
          departmentIds: departmentIds.join(','),
          projectIds: projectIds.join(','),
        });

        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);

        const res = await fetch(`/api/reports?${params}`);
        if (!res.ok) throw new Error('Failed to fetch team summary');

        const json = await res.json();
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

          prevDataRef.current = newData;
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
    return <TeamSummaryReportSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Overall Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{displayData.totalTasks}</div>
            <p className="text-xs text-muted-foreground mt-1">Across all selected projects</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{displayData.totalUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">Users with assigned tasks</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Time Period</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{displayData.weeklyTotals.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Weeks of data</p>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Trend Chart */}
      {displayData.weeklyTotals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Weekly Task Status Trend</CardTitle>
            <CardDescription>
              Task distribution across weeks, showing status breakdown
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={statusConfig} className="h-[300px] w-full">
              <BarChart
                data={displayData.weeklyTotals.map((w) => ({
                  week: formatWeekLabel(w.weekStart),
                  'To Do': w.todo,
                  'In Progress': w.inProgress,
                  Completed: w.completed,
                  Blocked: w.blocked,
                }))}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <XAxis
                  dataKey="week"
                  tickLine={false}
                  axisLine={false}
                  className="text-xs"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tickLine={false} axisLine={false} className="text-xs" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Bar
                  dataKey="To Do"
                  stackId="status"
                  fill={statusConfig.todo.color}
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="In Progress"
                  stackId="status"
                  fill={statusConfig.inProgress.color}
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="Completed"
                  stackId="status"
                  fill={statusConfig.completed.color}
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="Blocked"
                  stackId="status"
                  fill={statusConfig.blocked.color}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* User Performance Cards */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Team Member Performance</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {displayData.userTotals.map((user) => (
            <Card key={user.userId}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">{user.userName}</CardTitle>
                </div>
                <CardDescription className="text-xs">
                  {user.total} task{user.total !== 1 ? 's' : ''} total
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Task Status Breakdown */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Completed</span>
                    <span className="font-medium" style={{ color: 'var(--chart-1)' }}>
                      {user.completed}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">In Progress</span>
                    <span className="font-medium" style={{ color: 'var(--chart-4)' }}>
                      {user.inProgress}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">To Do</span>
                    <span className="font-medium" style={{ color: 'var(--chart-5)' }}>
                      {user.todo}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Blocked</span>
                    <span className="font-medium" style={{ color: 'var(--destructive)' }}>
                      {user.blocked}
                    </span>
                  </div>
                </div>

                {/* Completion Rate */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-muted-foreground">Completion Rate</span>
                    <span className="font-medium">{round(user.completionRate, 1)}%</span>
                  </div>
                  <Progress value={user.completionRate} />
                </div>

                {/* Stacked Progress Bar */}
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Task Distribution</div>
                  <div className="relative h-2 w-full overflow-hidden rounded-full bg-primary/20">
                    <div className="h-full flex transition-all">
                      {user.completed > 0 && (
                        <div
                          className="h-full transition-all"
                          style={{
                            width: `${(user.completed / user.total) * 100}%`,
                            backgroundColor: 'var(--chart-1)',
                          }}
                          title={`Completed: ${user.completed}`}
                        />
                      )}
                      {user.inProgress > 0 && (
                        <div
                          className="h-full transition-all"
                          style={{
                            width: `${(user.inProgress / user.total) * 100}%`,
                            backgroundColor: 'var(--chart-4)',
                          }}
                          title={`In Progress: ${user.inProgress}`}
                        />
                      )}
                      {user.todo > 0 && (
                        <div
                          className="h-full transition-all"
                          style={{
                            width: `${(user.todo / user.total) * 100}%`,
                            backgroundColor: 'var(--chart-5)',
                          }}
                          title={`To Do: ${user.todo}`}
                        />
                      )}
                      {user.blocked > 0 && (
                        <div
                          className="h-full transition-all"
                          style={{
                            width: `${(user.blocked / user.total) * 100}%`,
                            backgroundColor: 'var(--destructive)',
                          }}
                          title={`Blocked: ${user.blocked}`}
                        />
                      )}
                    </div>
                  </div>
                </div>

                {loading && (
                  <div className="absolute inset-0 animate-pulse bg-black/5 rounded-lg pointer-events-none" />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {displayData.userTotals.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No user statistics available for the selected filters
        </div>
      )}
    </div>
  );
}
