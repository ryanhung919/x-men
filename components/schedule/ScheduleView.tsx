'use client';

import { useEffect, useRef, useState } from 'react';
import { DateRangeFilter, DateRangeType, presets } from '@/components/filters/date-range-selector';
import { ProjectSelector } from '@/components/filters/project-selector';
import { StaffSelector } from '@/components/filters/staff-selector';
import GanttChart, { GanttRow } from '@/components/schedule/GanttChart';
import { addDays, endOfDay, startOfDay, format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { CalendarDays, RefreshCw, X } from 'lucide-react';

import { useTaskInspector } from '@/components/tasks/task-inspector-context';
import { Skeleton } from '@/components/ui/skeleton';

type Project = { id: number; name: string };
type Staff = { id: string; first_name: string; last_name: string };

export default function ScheduleView() {
  const { openTask } = useTaskInspector();
  const [error, setError] = useState('');
  const requestVersion = useRef(0);
  const [date, setDate] = useState<DateRangeType>(() => presets[1].range); // Two weeks centered on today
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<number[]>([]);
  const [availableStaff, setAvailableStaff] = useState<Staff[]>([]);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [rows, setRows] = useState<GanttRow[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();
  const [userRoles, setUserRoles] = useState<string[]>([]);

  const startDate = date.startDate ? startOfDay(date.startDate) : startOfDay(new Date());
  const endDate = date.endDate ? endOfDay(date.endDate) : endOfDay(addDays(new Date(), 6));

  // Fetch current user and roles from API
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await fetch('/api/user/role');
        if (response.ok) {
          const data = await response.json();
          setCurrentUserId(data.userId);
          setUserRoles(data.roles || []);
        }
      } catch (error) {
        console.error('Error fetching user info:', error);
      }
    };

    fetchUserInfo();
  }, []);

  // Load filter options when dependencies change
  useEffect(() => {
    const loadFilters = async () => {
      setLoadingFilters(true);
      try {
        const projRes = await fetch(`/api/schedule/projects`);
        const projData = await projRes.json();
        setProjects(projData || []);
      } finally {
        setLoadingFilters(false);
      }
    };
    loadFilters();
  }, []); // Load projects only once on mount

  // Load available staff when projects change
  useEffect(() => {
    const loadStaff = async () => {
      try {
        const params = new URLSearchParams();
        if (selectedProjects.length) params.set('projectIds', selectedProjects.join(','));
        const res = await fetch(`/api/schedule/staff?${params.toString()}`);
        const data = await res.json();
        setAvailableStaff(data || []);

        // Clear selected staff that are no longer in the available list
        const availableIds = new Set((data || []).map((s: Staff) => s.id));
        setSelectedStaffIds((prev) => prev.filter((id) => availableIds.has(id)));
      } catch (error) {
        console.error('Error loading staff:', error);
        setAvailableStaff([]);
      }
    };
    loadStaff();
  }, [selectedProjects.join(',')]);

  // Load schedule data
  const reload = async () => {
    const version = ++requestVersion.current;
    setLoadingData(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.set('startDate', startDate.toISOString());
      params.set('endDate', endDate.toISOString());
      if (selectedProjects.length) params.set('projectIds', selectedProjects.join(','));
      if (selectedStaffIds.length) params.set('staffIds', selectedStaffIds.join(','));

      const res = await fetch(`/api/schedule?${params.toString()}`);
      if (!res.ok) throw Error('Could not load this schedule. Try again.');
      const data = await res.json();
      const grouped: Record<string, GanttRow> = {};
      (data || []).forEach((t: any) => {
        (t.assignees || []).forEach((a: any) => {
          // If staff filter is active, only show tasks for selected staff
          if (selectedStaffIds.length > 0 && !selectedStaffIds.includes(a.id)) {
            return; // Skip this assignee
          }

          const key = a.id;
          if (!grouped[key])
            grouped[key] = {
              assigneeId: key,
              assigneeName: `${a.first_name} ${a.last_name}`,
              tasks: [],
            };
          grouped[key].tasks.push({
            id: t.id,
            title: t.title,
            project: t.project_name,
            startDate: t.created_at,
            deadline: t.deadline,
            status: t.status,
            updatedAt: t.updated_at,
            assignee: { id: a.id, name: `${a.first_name} ${a.last_name}` },
          });
        });
      });
      if (version === requestVersion.current) setRows(Object.values(grouped));
    } catch (error) {
      if (version === requestVersion.current) setError('Could not load this schedule. Try again.');
    } finally {
      if (version === requestVersion.current) setLoadingData(false);
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    date.startDate?.toISOString(),
    date.endDate?.toISOString(),
    selectedProjects.join(','),
    selectedStaffIds.join(','),
  ]);

  const handleChangeDeadline = async (taskId: number, newDate: Date) => {
    const response = await fetch('/api/schedule', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId, deadline: newDate.toISOString() }),
    });
    if (!response.ok)
      throw new Error('The deadline could not be saved. Your previous date is unchanged.');
    await reload();
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <CalendarDays className="size-3.5 text-positive" />
            Planning
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.04em]">Schedule</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Follow task lifetimes across your team, with the context one click away.
          </p>
        </div>
        <Button variant="outline" onClick={reload} disabled={loadingData}>
          <RefreshCw className="mr-2 size-4" />
          {loadingData ? 'Refreshing…' : 'Refresh'}
        </Button>
      </header>
      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3 items-stretch sm:items-center rounded-xl border bg-card p-3">
        <DateRangeFilter value={date} onChange={setDate} />
        <ProjectSelector
          projects={projects as any}
          selectedProjects={selectedProjects}
          onChange={setSelectedProjects}
          loading={loadingFilters}
        />
        <StaffSelector
          staff={availableStaff}
          selectedStaffIds={selectedStaffIds}
          onChange={setSelectedStaffIds}
          loading={loadingFilters}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-xs text-muted-foreground">
        <p>
          <span className="font-medium text-foreground">
            {format(startDate, 'MMM d')} – {format(endDate, 'MMM d, yyyy')}
          </span>
          <span className="mx-3 text-border">/</span>
          {new Set(rows.flatMap((row) => row.tasks.map((task) => task.id))).size} tasks ·{' '}
          {rows.length} people
        </p>
        <div className="flex items-center gap-3">
          {loadingData && <span role="status">Updating schedule…</span>}
          {(selectedProjects.length > 0 || selectedStaffIds.length > 0) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                setSelectedProjects([]);
                setSelectedStaffIds([]);
              }}
            >
              <X className="size-3" />
              Clear filters
            </Button>
          )}
        </div>
      </div>
      {error && (
        <div
          className="flex items-center justify-between gap-3 rounded-lg border border-problem/20 bg-problem-soft p-4 text-xs text-problem"
          role="alert"
        >
          <span>
            {error}
            {rows.length > 0 ? ' Showing the previous result.' : ''}
          </span>
          <Button variant="outline" size="sm" onClick={reload}>
            Retry
          </Button>
        </div>
      )}
      {loadingData && !rows.length ? (
        <div
          className="space-y-5 rounded-xl border bg-card p-5"
          aria-label="Loading staff timeline"
        >
          <Skeleton className="h-12 w-full" />
          {[1, 2, 3, 4].map((row) => (
            <div key={row} className="flex gap-6">
              <Skeleton className="h-8 w-36" />
              <Skeleton className="h-8 flex-1" />
            </div>
          ))}
        </div>
      ) : (
        (!error || rows.length > 0) && (
          <GanttChart
            rows={rows}
            startDate={startOfDay(startDate)}
            endDate={endOfDay(endDate)}
            currentUserId={currentUserId}
            userRoles={userRoles}
            onChangeDeadline={handleChangeDeadline}
            onInspectTask={openTask}
          />
        )
      )}
    </div>
  );
}
