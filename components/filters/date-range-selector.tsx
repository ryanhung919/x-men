'use client';

import { useState, useRef, useEffect } from 'react';
import {
  addDays,
  startOfDay,
  endOfDay,
  format,
  startOfMonth,
  endOfMonth,
  subMonths,
} from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type DateRangeType = {
  startDate?: Date;
  endDate?: Date;
};

interface DateRangePickerProps {
  value: DateRangeType;
  onChange: (range: DateRangeType) => void;
  maxDate?: Date;
  loading?: boolean;
}

export const presets: { label: string; range: DateRangeType }[] = [
  {
    label: 'Today',
    range: {
      startDate: startOfDay(new Date()),
      endDate: endOfDay(new Date()),
    },
  },
  {
    label: 'Last 7 Days',
    range: {
      startDate: startOfDay(addDays(new Date(), -6)),
      endDate: endOfDay(new Date()),
    },
  },
  {
    label: 'Last Month',
    range: {
      startDate: startOfMonth(subMonths(new Date(), 1)),
      endDate: endOfMonth(subMonths(new Date(), 1)),
    },
  },
  {
    label: 'This Month',
    range: {
      startDate: startOfMonth(new Date()),
      endDate: endOfDay(new Date()),
    },
  },
];

export function DateRangeFilter({
  value,
  onChange,
  maxDate = new Date(),
  loading = false,
}: DateRangePickerProps) {
  const [showCalendar, setShowCalendar] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selectPreset = (preset: DateRangeType) => {
    onChange(preset);
  };

  const clearRange = () => {
    onChange({ startDate: undefined, endDate: undefined });
  };

  const formatDisplay = (range: DateRangeType) =>
    range.startDate && range.endDate
      ? `${format(range.startDate, 'dd/MM/yyyy')} – ${format(range.endDate, 'dd/MM/yyyy')}`
      : 'All Time';

  const dateRange: DateRange | undefined =
    value.startDate || value.endDate ? { from: value.startDate, to: value.endDate } : undefined;

  const handleSelect = (range: DateRange | undefined) => {
    if (range?.from) {
      onChange({
        startDate: startOfDay(range.from),
        endDate: range.to ? endOfDay(range.to) : endOfDay(range.from),
      });
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setShowCalendar(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!value.startDate && !value.endDate) {
      setShowCalendar(false);
    }
  }, [value.startDate, value.endDate]);

  return (
    <div className="relative w-52" ref={ref}>
      <button
        className={cn(
          'flex w-52 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm',
          'ring-offset-background placeholder:text-muted-foreground',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'hover:bg-accent hover:text-accent-foreground'
        )}
        onClick={() => setShowCalendar((v) => !v)}
      >
        <span className="flex items-center gap-2 truncate">
          <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="truncate">{formatDisplay(value)}</span>
        </span>
        <svg
          className="h-4 w-4 opacity-50 shrink-0"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d={showCalendar ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'}
          />
        </svg>
      </button>

      {showCalendar && (
        <div className="absolute z-50 mt-2 w-auto border border-border rounded-lg shadow-xl overflow-hidden bg-popover">
          {/* Preset buttons */}
          <div className="flex gap-2 p-3 border-b border-border flex-wrap bg-background">
            {presets.map((p) => (
              <button
                key={p.label}
                className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground whitespace-nowrap"
                onClick={() => selectPreset(p.range)}
              >
                {p.label}
              </button>
            ))}
            <button
              className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground"
              onClick={clearRange}
            >
              Clear
            </button>
          </div>

          {/* Calendar */}
          <div className="p-3 bg-popover">
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={handleSelect}
              numberOfMonths={2}
              disabled={(date) => date > maxDate}
              className="rounded-md"
              defaultMonth={dateRange?.from || new Date()}
            />
          </div>

          {/* Loading overlay */}
          {loading && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-lg pointer-events-none">
              <span className="animate-pulse text-muted-foreground text-sm font-medium">
                Loading...
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
