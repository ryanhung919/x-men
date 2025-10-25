'use client';

import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isToday } from 'date-fns';
import CalendarTaskCard from './calendar-task-card';
import type { Task } from '@/lib/services/tasks';

interface MonthViewProps {
  tasks: Task[];
  date: Date;
  onTaskClick: (task: Task) => void;
  onDateSelect: (date: Date) => void;
}

/**
 * Month view calendar component showing a traditional calendar grid.
 * Displays tasks as colored badges on their deadline dates.
 * Clicking a date switches to day view for that date.
 */
export default function MonthView({ tasks, date, onTaskClick, onDateSelect }: MonthViewProps) {
  // Get all days to display (including padding from prev/next month)
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

  // Group by weeks for rendering
  const weeks: Date[][] = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  const getTasksForDay = (day: Date) => {
    return tasks.filter(task =>
      task.deadline && isSameDay(new Date(task.deadline), day)
    );
  };

  return (
    <div className="h-full flex flex-col bg-background overflow-y-auto">
      {/* Day headers - sticky */}
      <div className="grid grid-cols-7 border-b bg-muted sticky top-0 z-10">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="p-1 sm:p-2 text-center text-xs sm:text-sm font-semibold text-muted-foreground border-r last:border-r-0">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex-1 grid grid-rows-6 border-b">
        {weeks.map((week, weekIdx) => (
          <div key={weekIdx} className="grid grid-cols-7 border-b last:border-r-0">
            {week.map(day => {
              const dayTasks = getTasksForDay(day);
              const isCurrentMonth = day.getMonth() === date.getMonth();
              const isTodayDate = isToday(day);

              return (
                <div
                  key={day.toString()}
                  className={`border-r last:border-r-0 p-1 sm:p-2 min-h-[60px] sm:min-h-[80px] md:min-h-[100px] cursor-pointer hover:bg-muted/50 transition-colors ${
                    !isCurrentMonth ? 'bg-muted/50 text-muted-foreground' : ''
                  } ${isTodayDate ? 'bg-accent' : ''}`}
                  onClick={() => onDateSelect(day)}
                  role="button"
                  aria-label={`${format(day, 'MMMM d, yyyy')}, ${dayTasks.length} tasks`}
                >
                  {/* Day number */}
                  <div className={`text-xs sm:text-sm font-semibold mb-0.5 sm:mb-1 ${isTodayDate ? 'text-accent-foreground' : 'text-foreground'}`}>
                    {format(day, 'd')}
                  </div>

                  {/* Tasks */}
                  <div className="space-y-0.5 sm:space-y-1">
                    {dayTasks.slice(0, 3).map(task => (
                      <div
                        key={task.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onTaskClick(task);
                        }}
                      >
                        <CalendarTaskCard
                          task={task}
                          onClick={() => onTaskClick(task)}
                          compact={true}
                        />
                      </div>
                    ))}
                    {dayTasks.length > 3 && (
                      <div className="text-[10px] sm:text-xs text-muted-foreground pl-1 sm:pl-2">
                        +{dayTasks.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
