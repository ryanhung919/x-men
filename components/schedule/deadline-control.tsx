'use client';

import { useId, useRef, useState } from 'react';
import { addDays, differenceInCalendarDays, format, isSameDay, startOfDay } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type Props = {
  title: string;
  deadline: string;
  firstDate: Date;
  rangeStart: Date;
  days: number;
  dayWidth: number;
  problem: boolean;
  onPreview: (date: Date | null) => void;
  onCommit: (date: Date) => Promise<void>;
};
export function DeadlineControl({
  title,
  deadline,
  firstDate,
  rangeStart,
  days,
  dayWidth,
  problem,
  onPreview,
  onCommit,
}: Props) {
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(format(new Date(deadline), 'yyyy-MM-dd'));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const gesture = useRef<{
    pointerId: number;
    startX: number;
    moved: boolean;
    date: Date;
    valid: boolean;
    grid: HTMLElement;
    scroll: HTMLElement;
  } | null>(null);
  const suppressClick = useRef(false);
  const cancel = (button: HTMLButtonElement) => {
    const current = gesture.current;
    gesture.current = null;
    setDragging(false);
    onPreview(null);
    if (current && button.hasPointerCapture(current.pointerId))
      button.releasePointerCapture(current.pointerId);
  };
  const target = (event: React.PointerEvent<HTMLButtonElement>) => {
    const current = gesture.current;
    if (!current) return;
    const grid = current.grid.getBoundingClientRect();
    const scroll = current.scroll.getBoundingClientRect();
    const pinned =
      current.scroll.querySelector('[data-person-column]')?.getBoundingClientRect().width || 0;
    current.valid =
      event.clientX >= Math.max(grid.left, scroll.left + pinned) &&
      event.clientX <= Math.min(grid.right, scroll.right) &&
      event.clientY >= Math.max(grid.top, scroll.top) &&
      event.clientY <= Math.min(grid.bottom, scroll.bottom);
    const minimum = Math.max(0, differenceInCalendarDays(firstDate, rangeStart));
    const index = Math.min(
      days - 1,
      Math.max(minimum, Math.floor((event.clientX - grid.left) / dayWidth))
    );
    current.date = addDays(startOfDay(rangeStart), index);
    if (current.moved) onPreview(current.valid ? current.date : null);
  };
  const save = async (date: Date) => {
    if (!Number.isFinite(date.getTime())) {
      setError('Choose a valid date.');
      return;
    }
    if (isSameDay(date, new Date(deadline))) {
      setOpen(false);
      return;
    }
    setSaving(true);
    setError('');
    onPreview(null);
    try {
      await onCommit(date);
      setOpen(false);
      toast.success('Deadline updated', { description: format(date, 'PPP') });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Deadline could not be saved. Try again.';
      setError(message);
      setValue(format(date, 'yyyy-MM-dd'));
      setOpen(true);
      toast.error('Deadline not changed', { description: message });
    } finally {
      setSaving(false);
    }
  };
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (saving) return;
        if (next && !error) setValue(format(new Date(deadline), 'yyyy-MM-dd'));
        setOpen(next);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={saving}
          aria-label={`Adjust deadline for ${title}`}
          title="Drag to preview a deadline. Click or press Enter to choose a date."
          className="absolute -right-5 -top-1.5 z-20 flex size-11 cursor-ew-resize items-center justify-center rounded-md focus-visible:bg-card disabled:cursor-wait"
          onClick={(event) => {
            event.stopPropagation();
            if (suppressClick.current) {
              event.preventDefault();
              suppressClick.current = false;
            }
          }}
          onKeyDown={(event) => {
            if ((event.key === 'Enter' || event.key === ' ') && !gesture.current)
              suppressClick.current = false;
            if (event.key === 'Escape' && gesture.current) {
              event.preventDefault();
              event.stopPropagation();
              suppressClick.current = true;
              cancel(event.currentTarget);
            }
          }}
          onPointerDown={(event) => {
            event.stopPropagation();
            suppressClick.current = false;
            if (event.pointerType !== 'mouse' || event.button !== 0 || saving) return;
            const grid = event.currentTarget.closest('[data-timeline-grid]') as HTMLElement | null;
            const scroll = grid?.closest('[data-timeline-scroll]') as HTMLElement | null;
            if (!grid || !scroll) return;
            event.currentTarget.focus();
            event.currentTarget.setPointerCapture(event.pointerId);
            gesture.current = {
              pointerId: event.pointerId,
              startX: event.clientX,
              moved: false,
              date: new Date(deadline),
              valid: true,
              grid,
              scroll,
            };
          }}
          onPointerMove={(event) => {
            const current = gesture.current;
            if (!current) return;
            if (Math.abs(event.clientX - current.startX) > 4) {
              current.moved = true;
              setDragging(true);
            }
            target(event);
          }}
          onPointerUp={(event) => {
            const current = gesture.current;
            if (!current) return;
            target(event);
            const { moved, valid, date } = current;
            suppressClick.current = moved;
            cancel(event.currentTarget);
            if (moved && valid) void save(date);
          }}
          onPointerCancel={(event) => {
            suppressClick.current = true;
            cancel(event.currentTarget);
          }}
          onLostPointerCapture={(event) => {
            if (gesture.current) cancel(event.currentTarget);
          }}
        >
          {saving ? (
            <Loader2 className="size-3.5 animate-spin text-positive" />
          ) : (
            <span
              className={cn(
                'size-2.5 rotate-45 rounded-[2px] border border-card shadow-sm',
                problem ? 'bg-problem' : 'bg-positive',
                dragging && 'ring-4 ring-positive/15'
              )}
            />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-72 space-y-3 p-4"
        onOpenAutoFocus={(event) => {
          if (saving) event.preventDefault();
        }}
      >
        <div>
          <h3 className="text-sm font-semibold">Change deadline</h3>
          <p className="mt-1 truncate text-xs text-muted-foreground" title={title}>
            {title}
          </p>
        </div>
        <label htmlFor={inputId} className="block space-y-1.5 text-xs text-muted-foreground">
          <span>Deadline date</span>
          <Input
            id={inputId}
            type="date"
            aria-label="Deadline date"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            disabled={saving}
          />
        </label>
        {error && (
          <p role="alert" className="text-xs text-problem">
            {error}
          </p>
        )}
        <p className="text-[10px] leading-relaxed text-muted-foreground">
          Uses your local calendar date, matching task deadline editing.
        </p>
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setOpen(false);
              setError('');
            }}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => void save(new Date(`${value}T00:00:00`))}
            disabled={saving || !value}
          >
            {saving ? 'Saving…' : 'Save deadline'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
