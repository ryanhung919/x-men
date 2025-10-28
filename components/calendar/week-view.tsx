'use client';

import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
import CalendarTaskCard from './calendar-task-card';
import type { Task } from '@/lib/services/tasks';

interface WeekViewProps {
  tasks: Task[];
  date: Date;
  onTaskClick: (task: Task) => void;
}

/**
 * Week view component with Apple Calendar-style 7-column layout and vertical time grids.
 * Each day shows tasks positioned at 9am-6pm, displayed side-by-side if multiple on same day.
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

export default function WeekView({ tasks, date, onTaskClick }: WeekViewProps) {
  // Time slots (hourly from 12am to 11pm)
  const timeSlots = Array.from({ length: 24 }, (_, i) => i);

  // Get week days (Sunday to Saturday)
  const weekDays = eachDayOfInterval({
    start: startOfWeek(date, { weekStartsOn: 0 }),
    end: endOfWeek(date, { weekStartsOn: 0 }),
  });

  // Group tasks by day
  const tasksByDay = weekDays.map((day) => ({
    day,
    tasks: tasks.filter((t) => t.deadline && isSameDay(new Date(t.deadline), day)),
  }));

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header row - like month view with equal width columns */}
      <div className="flex border-b bg-muted sticky top-0 z-10">
        {/* Time column header spacer */}
        <div className="w-12 sm:w-16 flex-shrink-0 border-r bg-muted h-16" />

        {/* Day headers - equal width columns like month view */}
        {tasksByDay.map(({ day }) => {
          const isTodayDate = isToday(day);
          return (
            <div
              key={`header-${day.toString()}`}
              className={`flex-1 border-r last:border-r-0 h-16 text-center py-2 ${
                isTodayDate ? 'bg-accent' : 'bg-card'
              }`}
            >
              <div className="text-[10px] sm:text-xs text-muted-foreground">
                {format(day, 'EEE')}
              </div>
              <div
                className={`text-sm sm:text-base md:text-lg font-semibold ${
                  isTodayDate ? 'text-accent-foreground' : 'text-foreground'
                }`}
              >
                {format(day, 'd')}
              </div>
            </div>
          );
        })}
      </div>

      {/* Content area - week view grid with equal width columns */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex relative" style={{ minHeight: `${timeSlots.length * 64}px` }}>
          {/* Time labels column */}
          <div className="w-12 sm:w-16 flex-shrink-0 border-r bg-muted sticky left-0 z-10">
            {timeSlots.map((hour) => (
              <div
                key={hour}
                className="h-16 border-b text-[10px] sm:text-xs text-muted-foreground px-2 py-1 text-right"
              >
                {format(new Date().setHours(hour, 0, 0, 0), 'h a')}
              </div>
            ))}
          </div>

          {/* Week columns - equal width columns like month view */}
          {tasksByDay.map(({ day, tasks: dayTasks }) => {
            const taskPositions = calculateTaskPosition(dayTasks, day);

            return (
              <div
                key={day.toString()}
                className="flex-1 border-r last:border-r-0"
              >
                {/* Container for full day height with relative positioning */}
                <div className="relative" style={{ height: `${timeSlots.length * 64}px` }}>
                  {/* Hour grid background */}
                  {timeSlots.map((hour) => (
                    <div
                      key={hour}
                      className="absolute inset-x-0 h-16 border-b"
                      style={{ top: `${hour * 64}px` }}
                    />
                  ))}

                  {/* Tasks positioned on the grid */}
                  <div className="absolute inset-0">
                    {taskPositions.map(({ task, top, height, left, width }) => (
                      <div
                        key={task.id}
                        className="absolute p-0.5 pointer-events-auto"
                        style={{
                          top,
                          height,
                          left,
                          width: `calc(${width} - 2px)`,
                        }}
                      >
                        <div className="h-full">
                          <CalendarTaskCard
                            task={task}
                            onClick={() => onTaskClick(task)}
                            compact={true}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
