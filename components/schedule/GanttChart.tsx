'use client';

import { useMemo, useState } from 'react';
import {
  addDays,
  differenceInCalendarDays,
  format,
  isSameDay,
  isWeekend,
  startOfDay,
  endOfDay,
} from 'date-fns';
import {
  CircleCheck,
  CircleDashed,
  CircleMinus,
  Circle,
  Clock3,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { DeadlineControl } from './deadline-control';
import { cn } from '@/lib/utils';

export type GanttTask = {
  id: number;
  title: string;
  project: string;
  startDate: string;
  deadline: string | null;
  status: string;
  updatedAt: string;
  assignee: { id: string; name: string };
};
export type GanttRow = { assigneeId: string; assigneeName: string; tasks: GanttTask[] };
type Props = {
  rows: GanttRow[];
  startDate: Date;
  endDate: Date;
  currentUserId?: string;
  userRoles?: string[];
  onChangeDeadline?: (taskId: number, newDate: Date) => Promise<void> | void;
  onInspectTask?: (id: number) => void;
};
const MAX_DAYS = 60;
const ASSIGNEE_COLUMN_WIDTH = 210;
const DAY_COLUMN_WIDTH = 76;

export function GanttChart({
  rows,
  startDate,
  endDate,
  currentUserId,
  userRoles = [],
  onChangeDeadline,
  onInspectTask,
}: Props) {
  const totalDays = Math.max(1, differenceInCalendarDays(endDate, startDate) + 1);
  const days = useMemo(
    () =>
      Array.from(
        {
          length: Math.min(MAX_DAYS, Math.max(1, differenceInCalendarDays(endDate, startDate) + 1)),
        },
        (_, i) => addDays(startOfDay(startDate), i)
      ),
    [startDate, endDate]
  );
  const width = days.length * DAY_COLUMN_WIDTH;
  const [drag, setDrag] = useState<{ taskId: number; date: Date } | null>(null);
  const today = new Date();
  const todayIndex = differenceInCalendarDays(today, days[0]);
  const todayPosition =
    (todayIndex + (today.getHours() * 60 + today.getMinutes()) / 1440) * DAY_COLUMN_WIDTH;
  const visibleStart = startOfDay(days[0]);
  const visibleEnd = endOfDay(days[days.length - 1]);
  const months = days.reduce<{ label: string; count: number }[]>((groups, date) => {
    const label = format(date, 'MMMM yyyy');
    if (groups.at(-1)?.label === label) groups[groups.length - 1].count++;
    else groups.push({ label, count: 1 });
    return groups;
  }, []);
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">People & work</h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Task lifetime · creation to deadline, or latest update for completed work
          </p>
        </div>
        <div className="flex min-h-5 flex-wrap items-center gap-3 text-[11px] text-muted-foreground">{drag ? <span role="status" className="font-medium text-positive">{format(drag.date,'EEE, MMM d')} · Release to save · Esc to cancel</span> : <>
          <span className="flex items-center gap-1">
            <CircleDashed className="size-3 text-positive" />
            Active
          </span>
          <span className="flex items-center gap-1">
            <CircleCheck className="size-3 text-positive" />
            Completed
          </span>
          <span className="flex items-center gap-1">
            <CircleMinus className="size-3 text-problem" />
            Blocked / overdue
          </span></>}</div>
      </div>
      {totalDays > MAX_DAYS && (
        <p className="border-b bg-muted px-4 py-2 text-xs text-muted-foreground" role="status">
          Showing the first {MAX_DAYS} days of this range. Narrow the dates to inspect later work.
        </p>
      )}
      <div
        className="relative max-h-[calc(100vh-320px)] min-h-[380px] overflow-auto [scrollbar-gutter:stable]"
        data-timeline-scroll
        role="region"
        aria-label="Staff task timeline"
        tabIndex={0}
      >
        <div style={{ minWidth: ASSIGNEE_COLUMN_WIDTH + width }}>
          <div className="sticky top-0 z-30 flex border-b bg-card">
            <div
              className="sticky left-0 z-40 flex shrink-0 flex-col justify-end border-r bg-card px-4 pb-3"
              style={{ width: ASSIGNEE_COLUMN_WIDTH }}
            >
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Team members
              </span>
              <span className="mt-1 text-[11px] text-muted-foreground">
                {rows.length} people in scope
              </span>
            </div>
            <div style={{ width }}>
              <div className="flex h-7 border-b bg-muted/30">
                {months.map((month) => (
                  <div
                    key={month.label}
                    className="shrink-0 border-r px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
                    style={{ width: month.count * DAY_COLUMN_WIDTH }}
                  >
                    {month.label}
                  </div>
                ))}
              </div>
              <div className="flex">
                {days.map((date) => (
                  <div
                    key={date.toISOString()}
                    className={cn(
                      'flex h-14 shrink-0 flex-col items-center justify-center gap-1 border-r border-border/50 text-xs',
                      isWeekend(date) && 'bg-muted/45'
                    )}
                    style={{ width: DAY_COLUMN_WIDTH }}
                  >
                    <span className="text-[10px] text-muted-foreground">{format(date, 'EEE')}</span>
                    <span
                      className={cn(
                        'flex size-6 items-center justify-center rounded-md font-medium tabular-nums',
                        isSameDay(date, today)
                          ? 'bg-positive text-primary-foreground'
                          : 'text-foreground'
                      )}
                    >
                      {format(date, 'd')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {rows.length === 0 && (
            <div className="sticky left-0 w-[min(100%,700px)] px-6 py-20 text-center">
              <p className="text-sm font-medium">No work in this range</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Try another date range or adjust project and staff filters.
              </p>
            </div>
          )}
          {rows.map((row) => {
            const spans = row.tasks.flatMap((task) => {
              const first = startOfDay(new Date(task.startDate));
              const completed = task.status === 'Completed';
              const last =
                completed && task.updatedAt
                  ? endOfDay(new Date(task.updatedAt))
                  : task.deadline
                    ? endOfDay(new Date(task.deadline))
                    : null;
              if (!last || last < visibleStart || first > visibleEnd || last < first) return [];
              return [{ task, first, last, completed }];
            });
            const rowHeight = Math.max(88, spans.length * 38 + 24);
            return (
              <div key={row.assigneeId} className="flex border-b last:border-0">
                <div
                  data-person-column
                  className="sticky left-0 z-20 shrink-0 border-r bg-card px-4 py-5"
                  style={{ width: ASSIGNEE_COLUMN_WIDTH }}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full border bg-muted text-[10px] font-medium text-muted-foreground">
                      {row.assigneeName
                        .split(' ')
                        .map((word) => word[0])
                        .slice(0, 2)
                        .join('')}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-xs font-medium" title={row.assigneeName}>
                        {row.assigneeName}
                      </div>
                      <div className="mt-1 text-[10px] text-muted-foreground">
                        {spans.length} visible task{spans.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  className="relative"
                  style={{ width, minHeight: rowHeight }}
                  data-timeline-grid
                >
                  <div className="pointer-events-none absolute inset-0 flex">
                    {days.map((date) => (
                      <div
                        key={date.toISOString()}
                        className={cn(
                          'shrink-0 border-r border-border/40',
                          isWeekend(date) && 'bg-muted/40'
                        )}
                        data-weekend={isWeekend(date) || undefined}
                        style={{ width: DAY_COLUMN_WIDTH }}
                      />
                    ))}
                  </div>
                  {todayIndex >= 0 && todayIndex < days.length && (
                    <div
                      className="pointer-events-none absolute inset-y-0 z-10 w-px bg-positive/70"
                      style={{ left: todayPosition }}
                      aria-label="Current time"
                    />
                  )}
                  {spans.map(({ task, first, last: savedLast, completed }, index) => {
                    const previewing = drag?.taskId === task.id;
                    const last = previewing ? endOfDay(drag.date) : savedLast;
                    const start = Math.max(0, differenceInCalendarDays(first, days[0]));
                    const end = Math.min(days.length - 1, differenceInCalendarDays(last, days[0]));
                    const left = start * DAY_COLUMN_WIDTH + 5;
                    const barWidth = (end - start + 1) * DAY_COLUMN_WIDTH - 10;
                    const overdue = !completed && task.deadline && new Date(task.deadline) < today;
                    const problem = task.status === 'Blocked' || overdue;
                    const Icon =
                      task.status === 'Blocked'
                        ? CircleMinus
                        : overdue
                          ? Clock3
                          : completed
                            ? CircleCheck
                            : task.status === 'In Progress'
                              ? CircleDashed
                              : Circle;
                    const clippedLeft = first < visibleStart;
                    const clippedRight = last > visibleEnd;
                    const canDrag =
                      !userRoles.includes('demo_viewer') &&
                      (userRoles.includes('manager') || task.assignee.id === currentUserId);
                    return (
                      <div
                        key={task.id}
                        className="absolute h-8"
                        style={{ top: index * 38 + 12, left, width: barWidth }}
                      >
                        <button
                          type="button"
                          onClick={() => onInspectTask?.(task.id)}
                          aria-label={`Inspect ${task.title}, ${task.status}${overdue ? ', overdue' : ''}`}
                          title={`${task.title} · ${task.project}\n${task.status}${overdue ? ' · overdue' : ''}\nCreated ${format(first, 'PPP')} → ${completed ? 'Latest update' : 'Deadline'} ${format(last, 'PPP')}${clippedLeft || clippedRight ? '\nSpan continues beyond visible range' : ''}`}
                          className={cn(
                            'flex h-8 w-full items-center gap-2 overflow-hidden rounded-md border border-l-[3px] px-2.5 text-left transition-colors',
                            problem
                              ? 'border-problem/35 border-l-problem bg-problem-soft text-problem hover:bg-problem/15'
                              : 'border-positive/25 border-l-positive bg-positive-soft text-foreground hover:bg-positive/15',
                            clippedLeft && 'rounded-l-none',
                            clippedRight && 'rounded-r-none'
                          )}
                        >
                          <Icon className={cn('size-3.5 shrink-0', !problem && 'text-positive')} />
                          {clippedLeft && <ChevronLeft className="size-3 shrink-0 opacity-60" />}
                          <span className="truncate text-xs font-medium">{barWidth >= 160 ? task.title : ''}</span>
                          {barWidth > 420 && (
                            <span className="ml-auto truncate text-[10px] opacity-65">
                              {task.project}
                            </span>
                          )}
                          {clippedRight && (
                            <ChevronRight className="ml-auto size-3 shrink-0 opacity-60" />
                          )}
                        </button>
                        {barWidth < 160 && end < days.length - 3 && (
                          <span
                            className="pointer-events-none absolute left-full top-2 ml-3 max-w-[230px] truncate text-xs text-foreground"
                            aria-hidden="true"
                          >
                            {task.title}
                          </span>
                        )}
                        {!completed && !clippedRight && canDrag && onChangeDeadline && (
                          <DeadlineControl
                            title={task.title}
                            deadline={task.deadline!}
                            firstDate={first}
                            rangeStart={days[0]}
                            days={days.length}
                            dayWidth={DAY_COLUMN_WIDTH}
                            problem={!!problem}
                            onPreview={(date) => setDrag(date ? { taskId: task.id, date } : null)}
                            onCommit={async (date) => {
                              await onChangeDeadline(task.id, date);
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                  {!spans.length && (
                    <p className="relative px-5 py-7 text-xs text-muted-foreground">
                      No task spans visible in this interval.
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <p className="border-t px-4 py-2.5 text-[10px] text-muted-foreground">
        Bars show task lifetime, not allocated effort. Tasks without deadlines remain available in
        Tasks. Scroll horizontally to explore the range.
      </p>
    </div>
  );
}
export default GanttChart;
