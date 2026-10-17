'use client';

import {
  format,
  addDays,
  addWeeks,
  addMonths,
  subDays,
  subWeeks,
  subMonths,
  startOfWeek,
  endOfWeek,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { downloadICalFile } from '@/lib/utils/ical';
import type { Task } from '@/lib/services/tasks';

interface CalendarHeaderProps {
  view: 'day' | 'week' | 'month';
  currentDate: Date;
  onViewChange: (view: 'day' | 'week' | 'month') => void;
  onDateChange: (date: Date) => void;
  tasks: Task[];
}

/**
 * Calendar header component with navigation controls and view mode toggles.
 * Handles date navigation (previous/next/today) and switching between day/week/month views.
 */
export default function CalendarHeader({
  view,
  currentDate,
  onViewChange,
  onDateChange,
  tasks,
}: CalendarHeaderProps) {
  const handlePrevious = () => {
    switch (view) {
      case 'day':
        onDateChange(subDays(currentDate, 1));
        break;
      case 'week':
        onDateChange(subWeeks(currentDate, 1));
        break;
      case 'month':
        onDateChange(subMonths(currentDate, 1));
        break;
    }
  };

  const handleNext = () => {
    switch (view) {
      case 'day':
        onDateChange(addDays(currentDate, 1));
        break;
      case 'week':
        onDateChange(addWeeks(currentDate, 1));
        break;
      case 'month':
        onDateChange(addMonths(currentDate, 1));
        break;
    }
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  const handleExportICal = () => {
    downloadICalFile(tasks, `nodal-tasks-${format(new Date(), 'yyyy-MM-dd')}.ics`);
  };

  const getDateDisplay = () => {
    switch (view) {
      case 'day':
        return format(currentDate, 'MMMM d, yyyy');
      case 'week':
        return `${format(startOfWeek(currentDate), 'MMM d')} – ${format(endOfWeek(currentDate), 'MMM d, yyyy')}`;
      case 'month':
        return format(currentDate, 'MMMM yyyy');
    }
  };

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-card px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="min-w-40 text-base font-semibold tracking-tight">{getDateDisplay()}</h2>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrevious}
            aria-label="Previous"
            className="size-7"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNext}
            aria-label="Next"
            className="size-7"
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleToday} className="ml-1 h-8 text-xs">
            Today
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div role="group" aria-label="Calendar view" className="flex rounded-lg bg-muted/60 p-1">
          {(['day', 'week', 'month'] as const).map((mode) => (
            <Button
              key={mode}
              variant="ghost"
              size="sm"
              onClick={() => onViewChange(mode)}
              aria-label={`${mode[0].toUpperCase() + mode.slice(1)} view`}
              aria-pressed={view === mode}
              className={`h-7 px-3 text-xs ${view === mode ? 'bg-card text-positive shadow-sm hover:bg-card' : 'text-muted-foreground'}`}
            >
              {mode[0].toUpperCase() + mode.slice(1)}
            </Button>
          ))}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleExportICal}
          className="size-8 text-muted-foreground"
          aria-label="Export to iCal"
          title="Export to iCal"
        >
          <Download className="size-4" />
        </Button>
      </div>
    </header>
  );
}
