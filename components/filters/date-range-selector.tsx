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

  // Convert DateRangeType to react-day-picker DateRange format
  const dateRange: DateRange | undefined =
    value.startDate || value.endDate ? { from: value.startDate, to: value.endDate } : undefined;

  // Handle calendar date selection
  const handleSelect = (range: DateRange | undefined) => {
    if (range?.from) {
      onChange({
        startDate: startOfDay(range.from),
        endDate: range.to ? endOfDay(range.to) : endOfDay(range.from),
      });
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setShowCalendar(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset calendar when dates are cleared
  useEffect(() => {
    if (!value.startDate && !value.endDate) {
      setShowCalendar(false);
    }
  }, [value.startDate, value.endDate]);

  return (
    <div className="relative w-52" ref={ref}>
      <button
        className="w-full border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground px-2.5 py-2 rounded-md flex items-center justify-between text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={() => setShowCalendar((v) => !v)}
      >
        <span className="truncate flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          {formatDisplay(value)}
        </span>
        <span className="ml-2 text-muted-foreground flex-shrink-0">{showCalendar ? '▲' : '▼'}</span>
      </button>

      {showCalendar && (
        <div
          className="absolute z-50 mt-2 w-auto bg-popover text-popover-foreground border border-border rounded-lg shadow-xl overflow-hidden"
          style={{
            backgroundColor: 'hsl(var(--popover))',
            backdropFilter: 'none',
            WebkitBackdropFilter: 'none',
          }}
        >
          {/* Preset buttons */}
          <div className="flex gap-2 p-3 border-b border-border bg-muted/30 flex-wrap">
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
          <div
            className="p-3 bg-popover"
            style={{
              backgroundColor: 'hsl(var(--popover))',
            }}
          >
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={handleSelect}
              numberOfMonths={2}
              disabled={(date) => date > maxDate}
              autoFocus
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
