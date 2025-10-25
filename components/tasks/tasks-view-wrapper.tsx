'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import TasksList from './task-list';
import ViewToggle from './view-toggle';
import type { Task } from '@/lib/services/tasks';

// Dynamically import CalendarView to reduce initial bundle size
const CalendarView = dynamic(() => import('@/components/calendar/calendar-view'), {
  loading: () => (
    <div className="flex items-center justify-center h-96">
      <p className="text-muted-foreground">Loading calendar...</p>
    </div>
  ),
});

interface TasksViewWrapperProps {
  tasks: Task[];
}

/**
 * Client-side wrapper for tasks page that manages view state (list vs calendar).
 * Persists user view preference to localStorage.
 */
export default function TasksViewWrapper({ tasks }: TasksViewWrapperProps) {
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved view preference from localStorage on mount
  useEffect(() => {
    const savedView = localStorage.getItem('tasks-view-preference') as 'list' | 'calendar';
    if (savedView) {
      setView(savedView);
    }
    setIsLoaded(true);
  }, []);

  // Prevent hydration mismatch by not rendering until loaded
  if (!isLoaded) {
    return <TasksList tasks={tasks} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ViewToggle view={view} onViewChange={setView} />
      </div>

      {view === 'list' ? (
        <TasksList tasks={tasks} />
      ) : (
        <div className="border rounded-lg overflow-hidden" style={{ height: 'calc(100vh - 250px)' }}>
          <CalendarView tasks={tasks} />
        </div>
      )}
    </div>
  );
}
