'use client';

import { useEffect } from 'react';
import { LayoutList, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ViewToggleProps {
  view: 'list' | 'calendar';
  onViewChange: (view: 'list' | 'calendar') => void;
}

/**
 * Toggle component to switch between list and calendar views.
 * Persists user preference to localStorage for consistency across sessions.
 */
export default function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  // Persist view preference to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('tasks-view-preference', view);
  }, [view]);

  return (
    <div className="flex gap-2 items-center">
      <Button
        variant={view === 'list' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onViewChange('list')}
        aria-label="Switch to list view"
      >
        <LayoutList className="h-4 w-4 mr-2" />
        List
      </Button>
      <Button
        variant={view === 'calendar' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onViewChange('calendar')}
        aria-label="Switch to calendar view"
      >
        <Calendar className="h-4 w-4 mr-2" />
        Calendar
      </Button>
    </div>
  );
}
