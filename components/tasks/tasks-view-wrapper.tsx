'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import TasksList from './task-list';
import ViewToggle from './view-toggle';
import type { Task } from '@/lib/services/tasks';

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
 * Manages list/calendar view state, defaulting to list view.
 */
export default function TasksViewWrapper({ tasks }: TasksViewWrapperProps) {
  const [view, setView] = useState<'list' | 'calendar'>('list');

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
