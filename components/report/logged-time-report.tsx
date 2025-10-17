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
import { Bar, BarChart, Pie, PieChart, XAxis, YAxis } from 'recharts';
import type {
  LoggedTimeReport as LoggedTimeReportType,
  KPI,
  ChartData,
} from '@/components/report/export-buttons';
import { LoggedTimeReportSkeleton } from '@/components/report/report-skeletons';

interface LoggedTimeProps {
  departmentIds?: number[];
  projectIds?: number[];
  startDate?: string;
  endDate?: string;
  onDataLoaded?: (data: LoggedTimeReportType) => void;
}

interface Metrics {
  completedTasks: number;
  overdueTasks: number;
  blockedTasks: number;
  totalLoggedHours: number;
  avgLoggedHours: number;
  incompleteHours: number;
  timeByTask: Record<string, number>;
  onTimeCompletionRate: number;
  totalDelayHours: number;
  overdueHours: number;
}

// Standard rounding (2 decimal places)
const round = (value: number, decimals: number = 2): number => {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

// Chart configs using OKLCH colors from globals.css
const timeBreakdownConfig = {
  incomplete: {
    label: 'Incomplete (non-overdue)',
    color: 'var(--chart-1)',
  },
  completed: {
    label: 'Completed',
    color: 'var(--chart-2)',
  },
  overdue: {
    label: 'Overdue',
    color: 'var(--destructive)',
  },
  blocked: {
    label: 'Blocked',
    color: 'var(--chart-3)',
  },
} satisfies ChartConfig;

const completionConfig = {
  onTime: {
    label: 'On-Time',
    color: 'var(--chart-1)',
  },
  late: {
    label: 'Late',
    color: 'var(--destructive)',
  },
} satisfies ChartConfig;

const taskStatusConfig = {
  completed: {
    label: 'Completed',
    color: 'var(--chart-1)',
  },
  overdue: {
    label: 'Overdue',
    color: 'var(--destructive)',
  },
  blocked: {
    label: 'Blocked',
    color: 'var(--chart-3)',
  },
} satisfies ChartConfig;

const delayConfig = {
  delay: {
    label: 'Delay Hours',
    color: 'var(--destructive)',
  },
  overdueTime: {
    label: 'Overdue Time Logged',
    color: 'var(--chart-4)',
  },
} satisfies ChartConfig;

// Card groupings
const DISPLAY_CARDS = [
  {
    key: 'timeBreakdown',
    title: 'Time Distribution',
    description: 'Incomplete (non-overdue) vs Completed vs Incomplete (overdue) hours',
    format: (m: Metrics) => `${round(m.totalLoggedHours, 2)}h total`,
    kpi: (m: Metrics): KPI => ({
      label: 'Total Logged Hours',
      value: round(m.totalLoggedHours, 2),
      unit: 'h',
    }),
    subMetrics: [
      {
        label: 'Incomplete (non-overdue)',
        format: (m: Metrics) => `${round(m.incompleteHours - m.overdueHours, 2)}h`,
      },
      {
        label: 'Completed',
        format: (m: Metrics) => `${round(m.totalLoggedHours - m.incompleteHours, 2)}h`,
      },
      { label: 'Incomplete (overdue)', format: (m: Metrics) => `${round(m.overdueHours, 2)}h` },
    ],
    chart: (m: Metrics) => ({
      type: 'pie' as const,
      title: 'Time Distribution',
      data: [
        { label: 'Incomplete', value: round(m.incompleteHours - m.overdueHours, 2) },
        { label: 'Completed', value: round(m.totalLoggedHours - m.incompleteHours, 2) },
        { label: 'Overdue', value: round(m.overdueHours, 2) },
      ],
    }),
    renderChart: (m: Metrics) => {
      const completedTime = round(m.totalLoggedHours - m.incompleteHours, 2);
      const nonOverdueIncompleteTime = round(m.incompleteHours - m.overdueHours, 2);
      const chartData = [
        {
          name: 'incomplete',
          value: nonOverdueIncompleteTime,
          fill: timeBreakdownConfig.incomplete.color,
        },
        { name: 'completed', value: completedTime, fill: timeBreakdownConfig.completed.color },
        {
          name: 'overdue',
          value: round(m.overdueHours, 2),
          fill: timeBreakdownConfig.overdue.color,
        },
      ];
      return (
        <ChartContainer config={timeBreakdownConfig} className="h-[160px] w-full">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={35}
              outerRadius={60}
            />
          </PieChart>
        </ChartContainer>
      );
    },
  },
  {
    key: 'completionRate',
    title: 'On-Time Completion Rate',
    description: 'Tasks completed before deadline',
    format: (m: Metrics) => `${round(m.onTimeCompletionRate * 100, 1)}%`,
    kpi: (m: Metrics): KPI => ({
      label: 'On-Time Completion Rate',
      value: round(m.onTimeCompletionRate * 100, 1),
      unit: '%',
    }),
    subMetrics: [
      { label: 'On-Time', format: (m: Metrics) => `${round(m.onTimeCompletionRate * 100, 1)}%` },
      { label: 'Late', format: (m: Metrics) => `${round((1 - m.onTimeCompletionRate) * 100, 1)}%` },
    ],
    chart: (m: Metrics) => ({
      type: 'pie' as const,
      title: 'On-Time vs Late',
      data: [
        { label: 'On-Time', value: round(m.onTimeCompletionRate * 100, 1) },
        { label: 'Late', value: round((1 - m.onTimeCompletionRate) * 100, 1) },
      ],
    }),
    renderChart: (m: Metrics) => {
      const chartData = [
        {
          name: 'onTime',
          value: round(m.onTimeCompletionRate * 100, 1),
          fill: completionConfig.onTime.color,
        },
        {
          name: 'late',
          value: round((1 - m.onTimeCompletionRate) * 100, 1),
          fill: completionConfig.late.color,
        },
      ];
      return (
        <ChartContainer config={completionConfig} className="h-[160px] w-full">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={35}
              outerRadius={60}
            />
          </PieChart>
        </ChartContainer>
      );
    },
  },
  {
    key: 'taskStatus',
    title: 'Task Status Overview',
    description: 'Completed vs Overdue vs Blocked task count',
    format: (m: Metrics) => `${m.completedTasks + m.overdueTasks + m.blockedTasks} total`,
    kpi: (m: Metrics): KPI => ({
      label: 'Total Tasks',
      value: m.completedTasks + m.overdueTasks + m.blockedTasks,
      unit: 'tasks',
    }),
    subMetrics: [
      { label: 'Completed', format: (m: Metrics) => `${m.completedTasks} tasks` },
      { label: 'Overdue', format: (m: Metrics) => `${m.overdueTasks} tasks` },
      { label: 'Blocked', format: (m: Metrics) => `${m.blockedTasks} tasks` },
    ],
    chart: (m: Metrics) => ({
      type: 'bar' as const,
      title: 'Task Status',
      data: [
        { label: 'Completed', value: m.completedTasks },
        { label: 'Overdue', value: m.overdueTasks },
        { label: 'Blocked', value: m.blockedTasks },
      ],
    }),
    renderChart: (m: Metrics) => {
      const chartData = [
        { name: 'Completed', value: m.completedTasks, fill: taskStatusConfig.completed.color },
        { name: 'Overdue', value: m.overdueTasks, fill: taskStatusConfig.overdue.color },
        { name: 'Blocked', value: m.blockedTasks, fill: taskStatusConfig.blocked.color },
      ];
      return (
        <ChartContainer config={taskStatusConfig} className="h-[140px] w-full">
          <BarChart data={chartData}>
            <XAxis dataKey="name" tickLine={false} axisLine={false} className="text-xs" />
            <YAxis tickLine={false} axisLine={false} className="text-xs" />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      );
    },
  },
  {
    key: 'delayMetrics',
    title: 'Delay Analysis',
    description: 'Total delay vs overdue time logged',
    format: (m: Metrics) => `${round(m.totalDelayHours, 2)}h delay`,
    kpi: (m: Metrics): KPI => ({
      label: 'Total Delay Hours',
      value: round(m.totalDelayHours, 2),
      unit: 'h',
    }),
    subMetrics: [
      {
        label: 'Delay (completed late)',
        format: (m: Metrics) => `${round(m.totalDelayHours, 2)}h`,
      },
      { label: 'Overdue time logged', format: (m: Metrics) => `${round(m.overdueHours, 2)}h` },
    ],
    chart: (m: Metrics) => ({
      type: 'bar' as const,
      title: 'Delay Metrics',
      data: [
        { label: 'Delay Hours', value: round(m.totalDelayHours, 2) },
        { label: 'Overdue Time Logged', value: round(m.overdueHours, 2) },
      ],
    }),
    renderChart: (m: Metrics) => {
      const chartData = [
        { name: 'Delay', value: round(m.totalDelayHours, 2), fill: delayConfig.delay.color },
        {
          name: 'Overdue Time',
          value: round(m.overdueHours, 2),
          fill: delayConfig.overdueTime.color,
        },
      ];
      return (
        <ChartContainer config={delayConfig} className="h-[140px] w-full">
          <BarChart data={chartData}>
            <XAxis dataKey="name" tickLine={false} axisLine={false} className="text-xs" />
            <YAxis tickLine={false} axisLine={false} className="text-xs" />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      );
    },
  },
  {
    key: 'avgLoggedHours',
    title: 'Average Logged Time',
    description: 'Average hours per completed task',
    format: (m: Metrics) => `${round(m.avgLoggedHours, 2)}h`,
    kpi: (m: Metrics): KPI => ({
      label: 'Avg Logged Hours',
      value: round(m.avgLoggedHours, 2),
      unit: 'h/task',
    }),
  },
];

export function LoggedTimeReport({
  departmentIds = [],
  projectIds = [],
  startDate,
  endDate,
  onDataLoaded,
}: LoggedTimeProps) {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(false);
  const prevMetricsRef = useRef<Metrics | null>(null);

  useEffect(() => {
    if (!departmentIds.length) {
      setMetrics(null);
      prevMetricsRef.current = null;
      return;
    }

    const fetchMetrics = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          action: 'time',
          departmentIds: departmentIds.join(','),
          projectIds: projectIds.join(','),
        });
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);

        const res = await fetch(`/api/reports?${params}`);
        if (!res.ok) throw new Error('Failed to fetch logged time metrics');

        const json = await res.json();
        if (json) {
          const newMetrics: Metrics = {
            completedTasks: json.completedTasks,
            overdueTasks: json.overdueTasks,
            blockedTasks: json.blockedTasks || 0,
            totalLoggedHours: json.totalTime || 0,
            avgLoggedHours: json.avgTime || 0,
            incompleteHours: json.incompleteTime || 0,
            timeByTask: json.timeByTask || {},
            onTimeCompletionRate: json.onTimeCompletionRate ?? 0,
            totalDelayHours: json.totalDelayHours ?? 0,
            overdueHours: json.overdueTime ?? 0,
          };
          prevMetricsRef.current = newMetrics;
          setMetrics(newMetrics);

          if (onDataLoaded) {
            const kpis = DISPLAY_CARDS.map((card) => card.kpi(newMetrics));
            const charts = DISPLAY_CARDS.filter((card) => card.chart).map((card) =>
              card.chart!(newMetrics)
            );

            const exportData: LoggedTimeReportType = {
              kind: 'loggedTime',
              totalTime: round(newMetrics.totalLoggedHours, 2),
              avgTime: round(newMetrics.avgLoggedHours, 2),
              completedTasks: newMetrics.completedTasks,
              overdueTasks: newMetrics.overdueTasks,
              onTimeCompletionRate: round(newMetrics.onTimeCompletionRate, 2),
              totalDelayHours: round(newMetrics.totalDelayHours, 2),
              incompleteTime: round(newMetrics.incompleteHours, 2),
              overdueTime: round(newMetrics.overdueHours, 2),
              blockedTasks: newMetrics.blockedTasks,
              timeByTask: new Map(
                Object.entries(newMetrics.timeByTask).map(([k, v]) => [Number(k), v])
              ),
              kpis,
              charts,
            };
            onDataLoaded(exportData);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, [departmentIds, projectIds, startDate, endDate, onDataLoaded]);

  const displayMetrics = loading && prevMetricsRef.current ? prevMetricsRef.current : metrics;

  if (!displayMetrics) return <LoggedTimeReportSkeleton />;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {DISPLAY_CARDS.map((card) => (
        <Card key={card.key} className={card.renderChart ? 'md:col-span-1' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-xs text-muted-foreground mb-2">
              {card.description}
            </CardDescription>
            <div className="text-2xl font-bold mb-3">{card.format(displayMetrics)}</div>

            {card.subMetrics && (
              <div className="mb-3 space-y-1">
                {card.subMetrics.map((sub, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{sub.label}</span>
                    <span className="font-medium">{sub.format(displayMetrics)}</span>
                  </div>
                ))}
              </div>
            )}

            {card.renderChart && <div className="mt-3">{card.renderChart(displayMetrics)}</div>}

            {loading && <Progress value={undefined} className="mt-2" />}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
