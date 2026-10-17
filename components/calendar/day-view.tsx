'use client';
import { format, isSameDay, isToday } from 'date-fns';
import { CalendarDays } from 'lucide-react';
import CalendarTaskCard from './calendar-task-card';
import type { Task } from '@/lib/services/tasks';
interface DayViewProps {
  tasks: Task[];
  date: Date;
  onTaskClick: (task: Task) => void;
}
/** Deadline agenda: tasks have due dates, not allocated working-hour blocks. */
export default function DayView({ tasks, date, onTaskClick }: DayViewProps) {
  const dueTasks = tasks.filter(
    (task) => task.deadline && isSameDay(new Date(task.deadline), date)
  );
  return (
    <section className="min-h-full bg-card p-5 sm:p-6" aria-label="Day calendar">
      <div className="mb-5 flex items-center gap-3">
        <span
          className={`flex size-12 items-center justify-center rounded-xl text-xl font-semibold tabular-nums ${isToday(date) ? 'bg-positive-soft text-positive' : 'bg-muted text-foreground'}`}
        >
          {format(date, 'd')}
        </span>
        <div>
          <h3 className="text-sm font-semibold">{format(date, 'EEEE')}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {dueTasks.length} task{dueTasks.length === 1 ? '' : 's'} due ·{' '}
            {format(date, 'MMMM d, yyyy')}
          </p>
        </div>
      </div>
      {dueTasks.length ? (
        <div className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
          {dueTasks.map((task) => (
            <CalendarTaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
          ))}
        </div>
      ) : (
        <div className="flex min-h-64 flex-col items-center justify-center text-center">
          <CalendarDays className="mb-3 size-6 text-muted-foreground/60" />
          <h3 className="text-sm font-medium">No tasks due this day</h3>
          <p className="mt-2 text-xs text-muted-foreground">
            Choose another date or adjust your task filters.
          </p>
        </div>
      )}
    </section>
  );
}
