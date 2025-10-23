'use client';

import { Repeat } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { isPast } from 'date-fns';
import type { Task } from '@/lib/services/tasks';

interface CalendarTaskCardProps {
  task: Task;
  compact?: boolean;
  onClick: () => void;
}

// Inline utility functions
const isTaskOverdue = (task: Task): boolean => {
  if (!task.deadline || task.status === 'Completed') return false;
  return isPast(new Date(task.deadline));
};

/**
 * Task card component for display in calendar views.
 * Shows task status with color coding using shadcn/ui badge variants, recurring indicators, and assignee avatars.
 */
export default function CalendarTaskCard({
  task,
  compact = false,
  onClick,
}: CalendarTaskCardProps) {
  const isOverdue = isTaskOverdue(task);

  // Function to get color classes based on status and overdue state
  const getStatusClasses = (status: string, isOverdue: boolean) => {
    // Overdue tasks take priority (except completed)
    if (isOverdue && status !== 'Completed') {
      return 'bg-destructive text-white border-destructive hover:bg-destructive/90';
    }

    switch (status) {
      case 'Completed':
        return 'bg-primary text-primary-foreground border-primary hover:bg-primary/90';
      case 'In Progress':
        return 'bg-secondary text-secondary-foreground border-secondary hover:bg-secondary/90';
      case 'Blocked':
        return 'bg-destructive text-white border-destructive hover:bg-destructive/90';
      default: // To Do
        return 'text-foreground border-border bg-background hover:bg-accent hover:text-accent-foreground';
    }
  };

  const statusClasses = getStatusClasses(task.status, isOverdue);

  if (compact) {
    return (
      <button
        onClick={onClick}
        className={`w-full h-full text-left px-1 py-0.5 sm:px-2 sm:py-1 rounded text-xs border ${statusClasses} transition-opacity flex items-center gap-0.5 sm:gap-1`}
        aria-label={`Task: ${task.title}`}
      >
        {task.recurrence_interval > 0 && (
          <Repeat className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
        )}
        <span className="truncate text-[10px] sm:text-xs">{task.title}</span>
      </button>
    );
  }

  // Full card for day view
  return (
    <button
      onClick={onClick}
      className={`w-full h-full text-left p-2 sm:p-3 rounded-lg border ${statusClasses} transition-opacity flex flex-col overflow-hidden`}
      aria-label={`Task: ${task.title}, Status: ${task.status}, Priority: ${task.priority}`}
    >
      <div className="flex items-start justify-between gap-1 sm:gap-2 mb-1 sm:mb-2">
        <h4 className="font-semibold text-xs sm:text-sm line-clamp-2 flex-1 leading-tight">
          {task.title}
        </h4>
        {task.recurrence_interval > 0 && (
          <Repeat className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" aria-label="Recurring task" />
        )}
      </div>

      {task.description && (
        <p className="text-[10px] sm:text-xs opacity-90 line-clamp-1 sm:line-clamp-2 mb-1 sm:mb-2 leading-tight">
          {task.description}
        </p>
      )}

      {/* Show assignees only on larger screens */}
      <div className="mt-auto flex items-center gap-1 hidden sm:flex">
        {task.assignees?.slice(0, 2).map((assignee) => {
          const initials = `${assignee.user_info.first_name.charAt(
            0
          )}${assignee.user_info.last_name.charAt(0)}`;

          return (
            <Avatar
              key={assignee.assignee_id}
              className="h-5 w-5"
              title={`${assignee.user_info.first_name} ${assignee.user_info.last_name}`}
            >
              <AvatarFallback className="text-[10px] bg-white/20">{initials}</AvatarFallback>
            </Avatar>
          );
        })}
        {task.assignees && task.assignees.length > 2 && (
          <span className="text-xs opacity-90">+{task.assignees.length - 2}</span>
        )}
      </div>

      {/* Mobile: show count instead of avatars */}
      {task.assignees && task.assignees.length > 0 && (
        <div className="mt-auto flex items-center gap-1 sm:hidden">
          <span className="text-[10px] opacity-75">
            {task.assignees.length} assignee{task.assignees.length > 1 ? 's' : ''}
          </span>
        </div>
      )}
    </button>
  );
}
