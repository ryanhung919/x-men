import { Circle, CircleDashed, CircleMinus, CircleCheck, Clock3 } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Shared task vocabulary: priority stays neutral; labels carry meaning alongside color. */
export function TaskStatus({ status, className }: { status: string; className?: string }) {
  const Icon =
    status === 'Completed'
      ? CircleCheck
      : status === 'In Progress'
        ? CircleDashed
        : status === 'Blocked'
          ? CircleMinus
          : Circle;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium',
        status === 'Blocked'
          ? 'text-problem'
          : status === 'Completed' || status === 'In Progress'
            ? 'text-positive'
            : 'text-muted-foreground',
        className
      )}
    >
      <Icon className="size-3.5 shrink-0" />
      {status}
    </span>
  );
}

export function OverdueIndicator() {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-problem">
      <Clock3 className="size-3" />
      Overdue
    </span>
  );
}
