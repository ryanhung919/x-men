'use client';

import { useState, useEffect } from 'react';
import CalendarHeader from './calendar-header';
import MonthView from './month-view';
import TaskPreviewModal from './task-preview-modal';
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
}

/**
 * Main calendar view container that containing all calendar subviews.
 * Manages state for current date, view mode, filters, and task selection.
 */
export default function CalendarView({ tasks }: CalendarViewProps) {
  const [calendarView, setCalendarView] = useState<'day' | 'week' | 'month'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filters, setFilters] = useState({
    status: [] as string[],
    showCompleted: true,
  });

  // Load saved calendar view preference
  useEffect(() => {
    const savedView = localStorage.getItem('tasks-calendar-view') as 'day' | 'week' | 'month';
    if (savedView) {
      setCalendarView(savedView);
    }
  }, []);

  
  // Save calendar view preference when it changes
  useEffect(() => {
    localStorage.setItem('tasks-calendar-view', calendarView);
  }, [calendarView]);

  // Filter tasks based on current filters
  const filteredTasks = tasks.filter((task) => {
    // Filter by completion status
    if (!filters.showCompleted && task.status === 'Completed') return false;

    // Filter by selected statuses (if any selected)
    if (filters.status.length > 0 && !filters.status.includes(task.status)) return false;

    return true;
  });

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
  };

  const handleDateSelect = (date: Date) => {
    setCurrentDate(date);
    setCalendarView('day');
  };

  return (
    <div className="flex flex-col h-full">
      <CalendarHeader
        view={calendarView}
        currentDate={currentDate}
        onViewChange={setCalendarView}
        onDateChange={setCurrentDate}
        tasks={filteredTasks}
      />

      <CalendarFilters filters={filters} onFiltersChange={setFilters} />

      <div className="flex-1 overflow-auto">
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
      </div>

      <TaskPreviewModal
        task={selectedTask}
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
      />
    </div>
  );
}
