'use client';

import { format, isSameDay, isToday } from 'date-fns';
import CalendarTaskCard from './calendar-task-card';
import type { Task } from '@/lib/services/tasks';

interface DayViewProps {
  tasks: Task[];
  date: Date;
  onTaskClick: (task: Task) => void;
}

/**
 * Day view component with vertical time grid.
 * Tasks are positioned from 9am-6pm by default and displayed side-by-side if multiple on same day.
 */
// Inline utility functions
const calculateTaskPosition = (tasks: Task[], date: Date) => {
  // Filter tasks for this specific date
  const tasksForDate = tasks.filter(
    (task) => task.deadline && isSameDay(new Date(task.deadline), date)
  );

  const taskCount = tasksForDate.length;
  if (taskCount === 0) return [];

  // Each hour cell has responsive height: h-12 = 48px, h-14 = 56px, h-16 = 64px
  // Using the actual height that matches the grid cells
  const HOUR_HEIGHT = 64; // Use desktop height for consistency (h-16 = 64px)
  const START_HOUR = 9; // 9am
  const DURATION_HOURS = 9; // 9am to 6pm

  const TOP_POSITION = `${START_HOUR * HOUR_HEIGHT}px`;
  const HEIGHT = `${DURATION_HOURS * HOUR_HEIGHT}px`;

  return tasksForDate.map((task, index) => ({
    task,
    top: TOP_POSITION,
    height: HEIGHT,
    left: `${(100 / taskCount) * index}%`,
    width: `${100 / taskCount}%`,
  }));
};

export default function DayView({ tasks, date, onTaskClick }: DayViewProps) {
  // Time slots (hourly from 12am to 11pm)
  const timeSlots = Array.from({ length: 24 }, (_, i) => i);

  // Filter tasks for this specific day
  const tasksForDay = tasks.filter(
    (task) => task.deadline && isSameDay(new Date(task.deadline), date)
  );

  // Calculate positions for tasks (9am-6pm span, side-by-side layout)
  const taskPositions = calculateTaskPosition(tasksForDay, date);

  // Current time indicator position (only for today)
  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60;
  const currentTimePosition = currentHour * 64; // Convert to pixels (64px per hour)

  return (
    <div className="h-full bg-background overflow-y-auto">
      <div className="flex relative" style={{ minHeight: `${timeSlots.length * 64}px` }}>
        {/* Time labels column */}
        <div className="w-16 md:w-20 flex-shrink-0 border-r bg-muted sticky left-0 z-10">
          {timeSlots.map((hour) => (
            <div
              key={hour}
              className="h-16 border-b text-xs text-muted-foreground px-2 py-1 text-right"
            >
              {format(new Date().setHours(hour, 0, 0, 0), 'h a')}
            </div>
          ))}
        </div>

        {/* Task area with time grid */}
        <div className="flex-1 relative" style={{ height: `${timeSlots.length * 64}px` }}>
          {/* Hour grid lines */}
          {timeSlots.map((hour) => (
            <div
              key={hour}
              className="absolute inset-x-0 h-16 border-b"
              style={{ top: `${hour * 64}px` }}
            />
          ))}

          {/* Current time indicator (only shown for today) */}
          {isToday(date) && (
            <div
              className="absolute left-0 right-0 border-t-2 border-red-500 z-10 pointer-events-none"
              style={{ top: `${currentTimePosition}px` }}
              aria-label="Current time"
            >
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-red-500 rounded-full -mt-1.25 sm:-mt-1.5 -ml-1.25 sm:-ml-1.5" />
            </div>
          )}

          {/* Tasks positioned on the grid */}
          <div className="absolute inset-0">
            {taskPositions.map(({ task, top, height, left, width }) => (
              <div
                key={task.id}
                className="absolute p-0.5 sm:p-1"
                style={{
                  top,
                  height,
                  left,
                  width: `calc(${width} - 2px)`, // Small gap between tasks
                }}
              >
                <CalendarTaskCard task={task} onClick={() => onTaskClick(task)} compact={false} />
              </div>
            ))}
          </div>

          {/* Empty state */}
          {tasksForDay.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              <p className="text-sm sm:text-base">No tasks scheduled for {format(date, 'MMMM d, yyyy')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
