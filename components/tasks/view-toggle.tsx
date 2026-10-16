'use client';

import { LayoutList, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ViewToggleProps {
  view: 'list' | 'calendar';
  onViewChange: (view: 'list' | 'calendar') => void;
}

/**
 * Toggle between list and calendar views.
 */
export default function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg border bg-background p-0.5">
      <Button
        variant={view === 'list' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => onViewChange('list')}
        aria-label="Switch to list view"
        aria-pressed={view === 'list'}
      >
        <LayoutList className="h-4 w-4 mr-2" />
        List
      </Button>
      <Button
        variant={view === 'calendar' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => onViewChange('calendar')}
        aria-label="Switch to calendar view"
        aria-pressed={view === 'calendar'}
      >
        <Calendar className="h-4 w-4 mr-2" />
        Calendar
      </Button>
    </div>
  );
}
