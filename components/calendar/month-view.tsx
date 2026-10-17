'use client';
import {
  format,
  isSameDay,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  isToday,
  isWeekend,
} from 'date-fns';
import CalendarTaskCard from './calendar-task-card';
import type { Task } from '@/lib/services/tasks';
interface MonthViewProps {
  tasks: Task[];
  date: Date;
  onTaskClick: (task: Task) => void;
  onDateSelect: (date: Date) => void;
}
export default function MonthView({ tasks, date, onTaskClick, onDateSelect }: MonthViewProps) {
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(date), { weekStartsOn: 0 }),
    end: endOfWeek(endOfMonth(date), { weekStartsOn: 0 }),
  });
  return (
    <section aria-label="Month calendar" className="flex min-h-full min-w-[840px] flex-col bg-card">
      <div className="sticky top-0 z-10 grid grid-cols-7 border-b bg-card">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((name) => (
          <div
            key={name}
            className="border-r py-3 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground last:border-r-0"
          >
            {name}
          </div>
        ))}
      </div>
      <div
        className="grid flex-1 grid-cols-7"
        style={{ gridTemplateRows: `repeat(${days.length / 7},minmax(130px,1fr))` }}
      >
        {days.map((day) => {
          const dayTasks = tasks.filter(
            (task) => task.deadline && isSameDay(new Date(task.deadline), day)
          );
          const outside = day.getMonth() !== date.getMonth();
          return (
            <div
              key={day.toISOString()}
              className={`min-w-0 border-b border-r p-2 [&:nth-child(7n)]:border-r-0 ${outside ? 'bg-muted/40' : isWeekend(day) ? 'bg-muted/20' : ''}`}
            >
              <div className="mb-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => onDateSelect(day)}
                  aria-label={`${format(day, 'MMMM d, yyyy')}, ${dayTasks.length} tasks`}
                  aria-current={isToday(day) ? 'date' : undefined}
                  className={`flex size-7 items-center justify-center rounded-full text-xs font-medium transition-colors ${isToday(day) ? 'bg-primary text-primary-foreground' : outside ? 'text-muted-foreground hover:bg-muted' : 'text-foreground hover:bg-muted'}`}
                >
                  {format(day, 'd')}
                </button>
                {dayTasks.length > 0 && (
                  <span className="text-[9px] tabular-nums text-muted-foreground">
                    {dayTasks.length} due
                  </span>
                )}
              </div>
              <div className="space-y-1.5">
                {dayTasks.slice(0, 3).map((task) => (
                  <CalendarTaskCard
                    key={task.id}
                    task={task}
                    onClick={() => onTaskClick(task)}
                    compact
                  />
                ))}
                {dayTasks.length > 3 && (
                  <button
                    type="button"
                    onClick={() => onDateSelect(day)}
                    className="w-full rounded px-2 py-1 text-left text-[10px] font-medium text-positive hover:bg-positive-soft"
                  >
                    +{dayTasks.length - 3} more tasks
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
