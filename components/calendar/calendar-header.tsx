'use client';

import { format, addDays, addWeeks, addMonths, subDays, subWeeks, subMonths } from 'date-fns';
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
    downloadICalFile(tasks, `x-men-tasks-${format(new Date(), 'yyyy-MM-dd')}.ics`);
  };

  const getDateDisplay = () => {
    switch (view) {
      case 'day':
        return format(currentDate, 'MMMM d, yyyy');
      case 'week':
        return format(currentDate, 'MMMM yyyy');
      case 'month':
        return format(currentDate, 'MMMM yyyy');
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2 sm:p-4 gap-2 sm:gap-0 border-b bg-background">
      {/* Navigation */}
      <div className="flex items-center gap-1 sm:gap-2 w-full sm:w-auto">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrevious}
          aria-label="Previous"
          className="h-8 w-8 sm:h-9 sm:w-9 p-0"
        >
          <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleNext}
          aria-label="Next"
          className="h-8 w-8 sm:h-9 sm:w-9 p-0"
        >
          <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleToday}
          className="text-xs sm:text-sm"
        >
          Today
        </Button>
        <h2 className="text-base sm:text-xl font-semibold ml-2 sm:ml-4 text-foreground truncate flex-1 sm:flex-initial">{getDateDisplay()}</h2>
      </div>

      {/* View toggle */}
      <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportICal}
          className="text-xs sm:text-sm gap-1 h-8 sm:h-9"
          aria-label="Export to iCal"
        >
          <Download className="h-3 w-3 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">Export</span>
        </Button>
        
        <div className="flex rounded-md border overflow-hidden">
          <Button
            variant={view === 'day' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewChange('day')}
            className="rounded-none border-r text-xs sm:text-sm px-2 sm:px-3 h-8 sm:h-9"
            aria-label="Day view"
          >
            D
          </Button>
          <Button
            variant={view === 'week' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewChange('week')}
            className="rounded-none border-r text-xs sm:text-sm px-2 sm:px-3 h-8 sm:h-9"
            aria-label="Week view"
          >
            W
          </Button>
          <Button
            variant={view === 'month' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewChange('month')}
            className="rounded-none text-xs sm:text-sm px-2 sm:px-3 h-8 sm:h-9"
            aria-label="Month view"
          >
            M
          </Button>
        </div>
      </div>
    </div>
  );
}
