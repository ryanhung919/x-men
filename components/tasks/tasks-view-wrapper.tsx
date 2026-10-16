'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Search, X, CheckCheck, CircleMinus, CalendarDays, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusSelector } from '@/components/filters/status-selector';
import { ProjectSelector, type Project } from '@/components/filters/project-selector';
import { TagSelector } from '@/components/filters/tag-selector';
import {
  ColumnVisibilitySelector,
  type ColumnId,
} from '@/components/filters/column-visibility-selector';
import { calculateNextDueDate, type Task } from '@/lib/types/tasks';
import TasksList from './task-list';
import ViewToggle from './view-toggle';

const CalendarView = dynamic(() => import('@/components/calendar/calendar-view'), {
  loading: () => (
    <div className="flex h-96 items-center justify-center rounded-xl border bg-card text-sm text-muted-foreground">
      Loading calendar…
    </div>
  ),
});
const STATUSES = ['To Do', 'In Progress', 'Completed', 'Blocked'] as const;

export default function TasksViewWrapper({ tasks }: { tasks: Task[] }) {
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [search, setSearch] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    projects: [] as number[],
    statuses: [] as string[],
    tags: [] as string[],
  });
  const [preset, setPreset] = useState<'all' | 'blocked' | 'week'>('all');
  const [visibleColumns, setVisibleColumns] = useState<ColumnId[]>([
    'status',
    'priority',
    'dueDate',
    'assignees',
    'project',
  ]);
  // Apply recurrence exactly once so both presentations use the same displayed dates.
  const datedTasks = useMemo(() => tasks.map(calculateNextDueDate), [tasks]);
  const projects: Project[] = Array.from(
    new Map(
      tasks
        .filter((task) => task.project)
        .map((task) => [
          task.project.id,
          { ...task.project, is_archived: false, created_at: '', updated_at: '' },
        ])
    ).values()
  );
  const tags = Array.from(new Set(tasks.flatMap((task) => task.tags)));
  const now = new Date();
  const weekEnd = new Date(now);
  weekEnd.setDate(now.getDate() + ((7 - now.getDay()) % 7));
  weekEnd.setHours(23, 59, 59, 999);
  const matches = datedTasks.filter(
    (task) =>
      (showCompleted || task.status !== 'Completed') &&
      (!filters.projects.length || filters.projects.includes(task.project?.id)) &&
      (!filters.statuses.length || filters.statuses.includes(task.status)) &&
      (!filters.tags.length || filters.tags.some((tag) => task.tags.includes(tag))) &&
      (!search.trim() ||
        `${task.title} ${task.project?.name ?? ''} ${task.tags.join(' ')}`
          .toLowerCase()
          .includes(search.trim().toLowerCase())) &&
      (preset !== 'blocked' || task.status === 'Blocked') &&
      (preset !== 'week' ||
        (task.deadline && new Date(task.deadline) >= now && new Date(task.deadline) <= weekEnd))
  );
  const active = matches.filter((task) => task.status !== 'Completed').length;
  const overdue = matches.filter((task) => task.isOverdue).length;
  const upcoming = matches.filter(
    (task) =>
      task.status !== 'Completed' &&
      task.deadline &&
      new Date(task.deadline) >= now &&
      new Date(task.deadline) <= weekEnd
  ).length;
  const filterCount = filters.projects.length + filters.statuses.length + filters.tags.length;
  const hasScope = !!(search || filterCount || preset !== 'all' || showCompleted);
  const clear = () => {
    setSearch('');
    setFilters({ projects: [], statuses: [], tags: [] });
    setPreset('all');
    setShowCompleted(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-3">
        <div className="relative min-w-[180px] flex-1 sm:max-w-[320px]">
          <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search tasks…"
            aria-label="Search tasks"
            className="h-9 border-transparent bg-muted/70 pl-9 shadow-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={showFilters ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            aria-expanded={showFilters}
          >
            <SlidersHorizontal className="size-3.5" />
            Filters
            {filterCount > 0 && (
              <span className="rounded bg-positive-soft px-1.5 text-positive">{filterCount}</span>
            )}
          </Button>
          <Button
            variant={showCompleted ? 'secondary' : 'ghost'}
            size="sm"
            aria-pressed={showCompleted}
            onClick={() => setShowCompleted(!showCompleted)}
          >
            <CheckCheck className="size-3.5" />
            Completed
          </Button>
          {view === 'list' && (
            <ColumnVisibilitySelector
              visibleColumns={visibleColumns}
              onChange={setVisibleColumns}
            />
          )}
          <span className="mx-1 hidden h-5 w-px bg-border sm:block" />
          <ViewToggle view={view} onViewChange={setView} />
        </div>
      </div>
      {showFilters && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3">
          <StatusSelector
            statuses={STATUSES}
            selectedStatuses={filters.statuses}
            onChange={(statuses) => setFilters({ ...filters, statuses })}
          />
          <ProjectSelector
            projects={projects}
            selectedProjects={filters.projects}
            onChange={(projects) => setFilters({ ...filters, projects })}
          />
          <TagSelector
            tags={tags}
            selectedTags={filters.tags}
            onChange={(tags) => setFilters({ ...filters, tags })}
          />
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex flex-wrap items-center gap-1">
          <Button
            size="sm"
            variant={preset === 'all' ? 'secondary' : 'ghost'}
            onClick={() => setPreset('all')}
            aria-pressed={preset === 'all'}
            className="h-7 text-xs"
          >
            All work
          </Button>
          <Button
            size="sm"
            variant={preset === 'blocked' ? 'secondary' : 'ghost'}
            onClick={() => setPreset('blocked')}
            aria-pressed={preset === 'blocked'}
            className="h-7 text-xs"
          >
            <CircleMinus className="size-3" />
            Blocked
          </Button>
          <Button
            size="sm"
            variant={preset === 'week' ? 'secondary' : 'ghost'}
            onClick={() => setPreset('week')}
            aria-pressed={preset === 'week'}
            className="h-7 text-xs"
          >
            <CalendarDays className="size-3" />
            Due this week
          </Button>
          {hasScope && (
            <Button
              size="sm"
              variant="ghost"
              onClick={clear}
              className="h-7 text-xs text-muted-foreground"
            >
              <X className="size-3" />
              Clear
            </Button>
          )}
        </div>
        <p
          className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground"
          aria-live="polite"
        >
          <span>
            <strong className="font-medium text-foreground tabular-nums">{matches.length}</strong>{' '}
            shown
          </span>
          <span>{active} active</span>
          <span className={overdue ? 'text-problem' : ''}>{overdue} overdue</span>
          <span>{upcoming} due this week</span>
        </p>
      </div>
      <div hidden={view !== 'list'}>
        <TasksList
          tasks={matches}
          visibleColumns={visibleColumns}
          emptyMessage={tasks.length ? 'No tasks match your scope.' : 'No tasks yet.'}
          onClear={hasScope ? clear : undefined}
        />
      </div>
      {view === 'calendar' && (
        <div
          className="overflow-hidden rounded-xl border bg-card"
          style={{ height: 'calc(100vh - 300px)', minHeight: 500 }}
        >
          <CalendarView tasks={matches} scopeManaged />
        </div>
      )}
    </div>
  );
}
