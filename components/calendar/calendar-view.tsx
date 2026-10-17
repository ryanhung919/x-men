'use client';

import { useState, useEffect } from 'react';
import CalendarHeader from './calendar-header';
import MonthView from './month-view';
import { useTaskInspector } from '@/components/tasks/task-inspector-context';
import CalendarFilters from './calendar-filters';
import type { Task } from '@/lib/services/tasks';

// Import day and week views dynamically to avoid initial bundle size
import dynamic from 'next/dynamic';

const DayView = dynamic(() => import('./day-view'), {
  loading: () => <div className="flex items-center justify-center h-full">Loading...</div>,
});

const WeekView = dynamic(() => import('./week-view'), {
  loading: () => <div className="flex items-center justify-center h-full">Loading...</div>,
});

interface CalendarViewProps {
  tasks: Task[];
  scopeManaged?: boolean;
}

/**
 * Main calendar view container that containing all calendar subviews.
 * Manages state for current date, view mode, filters, and task selection.
 */
export default function CalendarView({ tasks, scopeManaged = false }: CalendarViewProps) {
  const [calendarView, setCalendarView] = useState<'day' | 'week' | 'month'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const { openTask } = useTaskInspector();
  const [preferenceLoaded, setPreferenceLoaded] = useState(false);
  const [filters, setFilters] = useState({
    status: [] as string[],
    showCompleted: true,
  });

  // Load saved calendar view preference
  useEffect(() => {
    const savedView = localStorage.getItem('tasks-calendar-view') as 'day' | 'week' | 'month';
    if (['day', 'week', 'month'].includes(savedView)) {
      setCalendarView(savedView);
    }
    setPreferenceLoaded(true);
  }, []);

  // Save calendar view preference when it changes
  useEffect(() => {
    if (preferenceLoaded) localStorage.setItem('tasks-calendar-view', calendarView);
  }, [calendarView, preferenceLoaded]);

  // Filter tasks based on current filters
  const filteredTasks = scopeManaged
    ? tasks
    : tasks.filter((task) => {
        // Filter by completion status
        if (!filters.showCompleted && task.status === 'Completed') return false;

        // Filter by selected statuses (if any selected)
        if (filters.status.length > 0 && !filters.status.includes(task.status)) return false;

        return true;
      });

  const handleTaskClick = (task: Task) => {
    openTask(task.id);
  };

  const handleDateSelect = (date: Date) => {
    setCurrentDate(date);
    setCalendarView('day');
  };

  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden rounded-xl border bg-card">
      <CalendarHeader
        view={calendarView}
        currentDate={currentDate}
        onViewChange={setCalendarView}
        onDateChange={setCurrentDate}
        tasks={filteredTasks}
      />

      {!scopeManaged && <CalendarFilters filters={filters} onFiltersChange={setFilters} />}

      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/20 px-4 py-2 text-[10px] text-muted-foreground">
        <span>Deadlines · tasks appear on their due dates</span>
        <span>
          {filteredTasks.filter((task) => !task.deadline).length} without a deadline · available in
          List
        </span>
        <span className="sm:hidden">Scroll to explore dates →</span>
      </div>
      <div className="min-h-0 min-w-0 flex-1 overflow-auto">
        {!filteredTasks.length ? (
          <div className="flex h-full min-h-56 items-center justify-center px-6 text-center text-sm text-muted-foreground">
            No tasks match your current filters.
          </div>
        ) : !filteredTasks.some((task) => task.deadline) ? (
          <div className="flex h-full min-h-56 flex-col items-center justify-center px-6 text-center">
            <h3 className="text-sm font-medium">No dated work in this scope</h3>
            <p className="mt-2 text-xs text-muted-foreground">
              Tasks without deadlines remain available in List.
            </p>
          </div>
        ) : (
          <>
            {calendarView === 'day' && (
              <DayView tasks={filteredTasks} date={currentDate} onTaskClick={handleTaskClick} />
            )}
            {calendarView === 'week' && (
              <WeekView tasks={filteredTasks} date={currentDate} onTaskClick={handleTaskClick} />
            )}
            {calendarView === 'month' && (
              <MonthView
                tasks={filteredTasks}
                date={currentDate}
                onTaskClick={handleTaskClick}
                onDateSelect={handleDateSelect}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
