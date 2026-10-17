'use client';
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isToday,
  isWeekend,
} from 'date-fns';
import CalendarTaskCard from './calendar-task-card';
import type { Task } from '@/lib/services/tasks';
interface WeekViewProps {
  tasks: Task[];
  date: Date;
  onTaskClick: (task: Task) => void;
}
export default function WeekView({ tasks, date, onTaskClick }: WeekViewProps) {
  const days = eachDayOfInterval({
    start: startOfWeek(date, { weekStartsOn: 0 }),
    end: endOfWeek(date, { weekStartsOn: 0 }),
  });
  return (
    <section
      aria-label="Week calendar"
      className="grid min-h-full min-w-[840px] grid-cols-7 bg-card"
    >
      {days.map((day) => {
        const dayTasks = tasks.filter(
          (task) => task.deadline && isSameDay(new Date(task.deadline), day)
        );
        return (
          <div
            key={day.toISOString()}
            className={`min-w-0 border-r last:border-r-0 ${isWeekend(day) ? 'bg-muted/25' : ''}`}
          >
            <header className="sticky top-0 z-10 flex flex-col items-center gap-1 border-b bg-card/95 px-2 py-3">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {format(day, 'EEE')}
              </span>
              <span
                aria-current={isToday(day) ? 'date' : undefined}
                className={`flex size-8 items-center justify-center rounded-full text-sm font-semibold ${isToday(day) ? 'bg-primary text-primary-foreground' : 'text-foreground'}`}
              >
                {format(day, 'd')}
              </span>
              <span className="text-[10px] text-muted-foreground">{dayTasks.length} due</span>
            </header>
            <div className="space-y-2 p-2">
              {dayTasks.map((task) => (
                <CalendarTaskCard
                  key={task.id}
                  task={task}
                  onClick={() => onTaskClick(task)}
                  compact
                />
              ))}
              {!dayTasks.length && (
                <p className="py-8 text-center text-[10px] text-muted-foreground/65">
                  No deadlines
                </p>
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}
