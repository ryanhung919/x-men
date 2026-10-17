'use client';

import { useEffect, useState, useRef } from 'react';
import {
  CheckCheck,
  Clock3,
  CircleMinus,
  ListFilter,
  Timer,
  ChartNoAxesCombined,
} from 'lucide-react';
import type {
  LoggedTimeReport as LoggedTimeReportType,
  KPI,
} from '@/components/report/export-buttons';
import { ReportError } from '@/components/report/report-comparison';
import { LoggedTimeReportSkeleton } from '@/components/report/report-skeletons';

interface LoggedTimeProps {
  departmentIds?: number[];
  projectIds?: number[];
  startDate?: string;
  endDate?: string;
  onDataLoaded?: (data: LoggedTimeReportType) => void;
  initialData?: any;
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
    subMetrics: [
      {
        label: 'Total Tasks',
        format: (m: Metrics) => `${Object.keys(m.timeByTask).length} tasks`,
      },
      {
        label: 'Total Time',
        format: (m: Metrics) => `${round(m.totalLoggedHours, 2)}h`,
      },
    ],
    chart: (m: Metrics) => {
      // Get top 5 tasks by time
      const taskEntries = Object.entries(m.timeByTask)
        .map(([id, seconds]) => ({
          id,
          hours: round(seconds / 3600, 2),
        }))
        .sort((a, b) => b.hours - a.hours)
        .slice(0, 5);

      return {
        type: 'bar' as const,
        title: 'Top Tasks by Time',
        data: taskEntries.map((t) => ({
          label: `Task ${t.id}`,
          value: t.hours,
        })),
      };
    },
  },
];

export function LoggedTimeReport({
  departmentIds = [],
  projectIds = [],
  startDate,
  endDate,
  onDataLoaded,
  initialData,
}: LoggedTimeProps) {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const prevMetricsRef = useRef<Metrics | null>(null);
  const initializedRef = useRef(false);

  // Initialize with preloaded data if available
  useEffect(() => {
    if (initialData && !startDate && !endDate && !initializedRef.current) {
      const initialMetrics: Metrics = {
        completedTasks: initialData.completedTasks || 0,
        overdueTasks: initialData.overdueTasks || 0,
        blockedTasks: initialData.blockedTasks || 0,
        totalLoggedHours: initialData.totalTime || 0,
        avgLoggedHours: initialData.avgTime || 0,
        incompleteHours: initialData.incompleteTime || 0,
        timeByTask:
          initialData.timeByTask instanceof Map
            ? Object.fromEntries(initialData.timeByTask)
            : initialData.timeByTask || {},
        onTimeCompletionRate: initialData.onTimeCompletionRate ?? 0,
        totalDelayHours: initialData.totalDelayHours ?? 0,
        overdueHours: initialData.overdueTime ?? 0,
      };

      setMetrics(initialMetrics);
      prevMetricsRef.current = initialMetrics;
      initializedRef.current = true;

      // Generate export data for initial load
      if (onDataLoaded) {
        const kpis = DISPLAY_CARDS.map((card) => card.kpi(initialMetrics));
        const charts = DISPLAY_CARDS.filter((card) => card.chart).map((card) =>
          card.chart!(initialMetrics)
        );

        const exportData: LoggedTimeReportType = {
          kind: 'loggedTime',
          totalTime: round(initialMetrics.totalLoggedHours, 2),
          avgTime: round(initialMetrics.avgLoggedHours, 2),
          completedTasks: initialMetrics.completedTasks,
          overdueTasks: initialMetrics.overdueTasks,
          onTimeCompletionRate: round(initialMetrics.onTimeCompletionRate, 2),
          totalDelayHours: round(initialMetrics.totalDelayHours, 2),
          incompleteTime: round(initialMetrics.incompleteHours, 2),
          overdueTime: round(initialMetrics.overdueHours, 2),
          blockedTasks: initialMetrics.blockedTasks,
          timeByTask: new Map(
            Object.entries(initialMetrics.timeByTask).map(([k, v]) => [Number(k), v])
          ),
          kpis,
          charts,
        };
        onDataLoaded(exportData);
      }
    }
  }, [initialData, onDataLoaded, startDate, endDate]);

  // Fetch data when filters change
  useEffect(() => {
    if (!departmentIds.length && !projectIds.length) {
      setMetrics(null);
      prevMetricsRef.current = null;
      initializedRef.current = false;
      return;
    }

    // Skip fetch only on the very first render if we have preloaded data and no date filters
    if (initialData && !startDate && !endDate && !initializedRef.current) {
      return;
    }

    const controller = new AbortController();
    const fetchMetrics = async () => {
      setLoading(true);
      setError(false);
      try {
        const params = new URLSearchParams({
          action: 'time',
          departmentIds: departmentIds.join(','),
          projectIds: projectIds.join(','),
        });
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);

        const res = await fetch(`/api/reports?${params}`, { signal: controller.signal });
        if (!res.ok) throw new Error('Failed to fetch logged time metrics');

        const json = await res.json();
        if (controller.signal.aborted) return;
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
      } catch {
        if (controller.signal.aborted) return;
        setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    fetchMetrics();
    return () => controller.abort();
  }, [departmentIds, projectIds, startDate, endDate, onDataLoaded, retry]);

  if (error) return <ReportError retry={() => setRetry((value) => value + 1)} />;

  const displayMetrics = loading && prevMetricsRef.current ? prevMetricsRef.current : metrics;

  if (!displayMetrics) return <LoggedTimeReportSkeleton />;

  const m = displayMetrics;
  const distribution = [
    {
      label: 'Completed',
      value: round(m.totalLoggedHours - m.incompleteHours),
      color: 'var(--chart-1)',
      icon: CheckCheck,
    },
    {
      label: 'Active · within deadline',
      value: round(m.incompleteHours - m.overdueHours),
      color: 'var(--chart-2)',
      icon: Timer,
    },
    { label: 'Overdue', value: round(m.overdueHours), color: 'var(--chart-problem)', icon: Clock3 },
  ];
  const status = [
    { label: 'Completed', value: m.completedTasks, color: 'var(--chart-1)', icon: CheckCheck },
    { label: 'Overdue', value: m.overdueTasks, color: 'var(--chart-problem)', icon: Clock3 },
    {
      label: 'Blocked',
      value: m.blockedTasks,
      color: 'var(--chart-problem-secondary)',
      icon: CircleMinus,
    },
  ];
  const topTasks = Object.entries(m.timeByTask)
    .map(([id, seconds]) => ({ id, hours: round(seconds / 3600) }))
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 5);
  let accumulated = 0;
  const circumference = 2 * Math.PI * 96;

  return (
    <section aria-label="Logged time overview" aria-busy={loading} className="space-y-5">
      <div className="grid grid-cols-2 overflow-hidden rounded-xl border bg-card lg:grid-cols-4">
        {[
          {
            label: 'Total logged time',
            value: round(m.totalLoggedHours),
            unit: 'h',
            detail: `${Object.keys(m.timeByTask).length} tasks in selected scope`,
            icon: Timer,
          },
          {
            label: 'On-time completion',
            value: round(m.onTimeCompletionRate * 100, 1),
            unit: '%',
            detail: 'Among completed tasks',
            icon: CheckCheck,
          },
          {
            label: 'Average logged time',
            value: round(m.avgLoggedHours),
            unit: 'h',
            detail: 'Per completed task',
            icon: ChartNoAxesCombined,
          },
          {
            label: 'Total delay',
            value: round(m.totalDelayHours),
            unit: 'h',
            detail: 'Across tasks completed late',
            icon: Clock3,
          },
        ].map(({ label, value, unit, detail, icon: Icon }, index) => (
          <div
            key={label}
            className="min-w-0 border-border px-5 py-5 even:border-l lg:[&:not(:first-child)]:border-l"
          >
            <div className="mb-3 flex items-center justify-between gap-2 text-xs font-medium text-muted-foreground">
              <span>{label}</span>
              <Icon className={`size-4 ${index === 3 ? 'text-problem' : 'text-positive'}`} />
            </div>
            <div className="flex items-baseline gap-1 tabular-nums">
              <span className="text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">
                {value.toLocaleString()}
              </span>
              <span className="text-lg text-muted-foreground">{unit}</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.65fr_1fr]">
        <div className="overflow-hidden rounded-2xl border bg-card p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold tracking-tight">Time distribution</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                How logged effort is distributed across work.
              </p>
            </div>
            <span className="rounded-md border bg-secondary px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Hours
            </span>
          </div>
          <div className="grid items-center gap-6 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="relative mx-auto size-[248px] max-w-full">
              <svg
                viewBox="0 0 248 248"
                className="size-full -rotate-90"
                role="img"
                aria-label={`Logged time: ${distribution.map((item) => `${item.label} ${item.value} hours`).join(', ')}`}
              >
                <circle
                  cx="124"
                  cy="124"
                  r="96"
                  fill="none"
                  stroke="var(--muted)"
                  strokeWidth="30"
                />
                {distribution.map((item) => {
                  const fraction =
                    m.totalLoggedHours > 0 ? Math.max(0, item.value / m.totalLoggedHours) : 0;
                  const offset = -accumulated * circumference;
                  accumulated += fraction;
                  return (
                    <circle
                      key={item.label}
                      cx="124"
                      cy="124"
                      r="96"
                      fill="none"
                      stroke={item.color}
                      strokeWidth="30"
                      strokeDasharray={`${Math.max(0, fraction * circumference - 3)} ${circumference}`}
                      strokeDashoffset={offset}
                    />
                  );
                })}
              </svg>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[11px] text-muted-foreground">TOTAL LOGGED</span>
                <div className="mt-1 text-4xl font-semibold tracking-[-0.045em] tabular-nums">
                  {round(m.totalLoggedHours)}
                  <span className="ml-1 text-base font-normal text-muted-foreground">h</span>
                </div>
                <span className="mt-2 text-xs text-muted-foreground">Across selected scope</span>
              </div>
            </div>
            <dl className="space-y-5">
              {distribution.map(({ label, value, color, icon: Icon }) => (
                <div key={label} className="border-b border-border/60 pb-4 last:border-0 last:pb-0">
                  <dt className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Icon className="size-3.5" style={{ color }} />
                    {label}
                  </dt>
                  <dd className="mt-2 flex items-baseline justify-between gap-2">
                    <span className="text-xl font-semibold tabular-nums">
                      {value}
                      <span className="ml-1 text-xs font-normal text-muted-foreground">h</span>
                    </span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {m.totalLoggedHours ? round((value / m.totalLoggedHours) * 100, 1) : 0}%
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="flex items-center gap-2 border-t pt-4 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-positive" />
            {loading ? 'Updating report…' : 'Logged hours, grouped by current task state'}
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-5 sm:p-6">
          <h2 className="text-base font-semibold tracking-tight">Delivery health</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Completion timing and work that needs attention.
          </p>
          <div className="mt-6 flex items-baseline justify-between">
            <span className="text-xs text-muted-foreground">On-time completion</span>
            <span className="text-2xl font-semibold tabular-nums tracking-tight">
              {round(m.onTimeCompletionRate * 100, 1)}%
            </span>
          </div>
          <div
            className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-muted"
            role="img"
            aria-label={`${round(m.onTimeCompletionRate * 100, 1)} percent on time; ${round((1 - m.onTimeCompletionRate) * 100, 1)} percent late`}
          >
            <span
              style={{ width: `${m.onTimeCompletionRate * 100}%`, background: 'var(--chart-1)' }}
            />
            <span className="flex-1" style={{ background: 'var(--chart-problem)' }} />
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
            <span>On time</span>
            <span>{round((1 - m.onTimeCompletionRate) * 100, 1)}% late</span>
          </div>
          <div className="mt-6 space-y-4 border-t pt-5">
            {status.map(({ label, value, color, icon: Icon }) => (
              <div key={label}>
                <div className="mb-2 flex justify-between text-xs">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Icon className="size-3.5" style={{ color }} />
                    {label}
                  </span>
                  <span className="font-medium tabular-nums">
                    {value}
                    <span className="ml-1 font-normal text-muted-foreground">tasks</span>
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(value / Math.max(...status.map((s) => s.value), 1)) * 100}%`,
                      background: color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-5 text-[10px] leading-relaxed text-muted-foreground">
            Overdue and blocked categories may overlap. Timing uses the task’s latest update.
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.65fr_1fr]">
        <div className="rounded-2xl border bg-card p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold tracking-tight">Where time goes</h2>
              <p className="mt-1 text-xs text-muted-foreground">Top five tasks by logged hours</p>
            </div>
            <ListFilter className="size-4 text-muted-foreground" aria-hidden="true" />
          </div>
          <div className="mt-5 space-y-3">
            {topTasks.length ? (
              topTasks.map((task) => (
                <div
                  key={task.id}
                  className="grid grid-cols-[70px_1fr_58px] items-center gap-3 text-xs"
                >
                  <span className="font-mono text-muted-foreground">Task {task.id}</span>
                  <div className="h-3 rounded bg-muted">
                    <div
                      className="h-full rounded"
                      style={{
                        width: `${(task.hours / Math.max(topTasks[0].hours, 1)) * 100}%`,
                        background: 'var(--chart-2)',
                      }}
                    />
                  </div>
                  <span className="text-right font-medium tabular-nums">{task.hours} h</span>
                </div>
              ))
            ) : (
              <p className="py-8 text-sm text-muted-foreground">No logged time in this scope.</p>
            )}
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-5 sm:p-6">
          <h2 className="text-base font-semibold tracking-tight">Delay analysis</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Two different measures of overdue work
          </p>
          <dl className="mt-5 space-y-5">
            {[
              { label: 'Delay on tasks completed late', value: m.totalDelayHours },
              { label: 'Logged time on overdue tasks', value: m.overdueHours },
            ].map(({ label, value }, index) => (
              <div key={label}>
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
                  {round(value)}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">h</span>
                </dd>
                <div className="mt-2 h-1.5 rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(value / Math.max(m.totalDelayHours, m.overdueHours, 1)) * 100}%`,
                      background: index ? 'var(--chart-problem-secondary)' : 'var(--chart-problem)',
                    }}
                  />
                </div>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
