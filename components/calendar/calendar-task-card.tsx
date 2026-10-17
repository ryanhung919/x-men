'use client';

import { Repeat } from 'lucide-react';
import { isPast } from 'date-fns';
import type { Task } from '@/lib/services/tasks';
import { TaskStatus, OverdueIndicator } from '@/components/tasks/task-status';

interface CalendarTaskCardProps {
  task: Task;
  compact?: boolean;
  onClick: () => void;
}

export default function CalendarTaskCard({
  task,
  compact = false,
  onClick,
}: CalendarTaskCardProps) {
  const overdue = !!task.deadline && task.status !== 'Completed' && isPast(new Date(task.deadline));
  const problem = overdue || task.status === 'Blocked';
  const active = task.status === 'In Progress' || task.status === 'Completed';
  const tone = problem
    ? 'border-l-problem bg-problem-soft/60 hover:bg-problem-soft'
    : active
      ? 'border-l-positive bg-positive-soft/65 hover:bg-positive-soft'
      : 'border-l-muted-foreground/50 bg-muted/40 hover:bg-muted';
  return (
    <button
      type="button"
      onClick={onClick}
      title={task.title}
      aria-label={`Task: ${task.title}, Status: ${task.status}, Priority: ${task.priority}${overdue ? ', Overdue' : ''}${task.recurrence_interval > 0 ? ', Recurring task' : ''}`}
      className={`group w-full min-w-0 rounded-md border border-border/50 border-l-[3px] text-left text-foreground transition-colors ${tone} ${compact ? 'px-2 py-1.5' : 'p-4'}`}
    >
      <div className="flex items-start gap-1.5">
        <span
          className={`min-w-0 flex-1 break-words font-medium leading-snug ${compact ? 'line-clamp-2 text-[11px]' : 'text-sm'}`}
        >
          {task.title}
        </span>
        {task.recurrence_interval > 0 && (
          <Repeat
            aria-label="Recurring task"
            className="mt-0.5 size-3 shrink-0 text-muted-foreground"
          />
        )}
      </div>
      {!compact && (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <TaskStatus status={task.status} />
            {overdue && <OverdueIndicator />}
          </div>
          {task.description && (
            <p className="mt-3 line-clamp-2 break-words text-xs leading-relaxed text-muted-foreground">
              {task.description}
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-3">
            <span className="font-mono text-[10px] text-muted-foreground">NDL-{task.id}</span>
            <span className="text-[11px] text-muted-foreground">
              {task.assignees.length
                ? task.assignees
                    .map(
                      (assignee) =>
                        `${assignee.user_info.first_name} ${assignee.user_info.last_name}`
                    )
                    .join(', ')
                : 'Unassigned'}
            </span>
          </div>
        </>
      )}
      {compact && (
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <TaskStatus status={task.status} className="gap-1 text-[9px] [&>svg]:size-2.5" />
          {overdue && <span className="text-[9px] text-problem">· Overdue</span>}
        </div>
      )}
    </button>
  );
}
