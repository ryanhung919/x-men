'use client';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon, Pencil } from 'lucide-react';
import { useState } from 'react';

interface EditableDeadlineProps {
  taskId: number;
  initialDeadline: string | null;
  onDeadlineUpdate?: (newDeadline: string) => void;
}

export function EditableDeadline({
  taskId,
  initialDeadline,
  onDeadlineUpdate,
}: EditableDeadlineProps) {
  const [deadline, setDeadline] = useState<Date | undefined>(
    initialDeadline ? new Date(initialDeadline) : undefined
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDateSelect = async (selectedDate: Date | undefined) => {
    if (!selectedDate) return;

    setIsLoading(true);
    setError(null);

    try {
      // Make API call to update deadline
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'updateDeadline',
          deadline: selectedDate.toISOString(),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update deadline');
      }

      // Update local state
      setDeadline(selectedDate);
      onDeadlineUpdate?.(selectedDate.toISOString());
      setIsEditing(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update deadline';
      setError(errorMessage);
      console.error('Failed to update deadline:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isEditing) {
    return (
      <div className="flex items-center gap-2">
        <div className="text-base">
          {deadline ? format(deadline, 'PPP') : 'No deadline set'}
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setIsEditing(true)}
          className="h-8 w-8 p-0"
          disabled={isLoading}
        >
          <Pencil className="w-3.5 h-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {error && (
        <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950 p-2 rounded-md border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}
      
      <Popover open={isEditing} onOpenChange={setIsEditing}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'w-full justify-start text-left font-normal',
              !deadline && 'text-muted-foreground'
            )}
            disabled={isLoading}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {deadline ? format(deadline, 'PPP') : 'Pick a date'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={deadline}
            onSelect={handleDateSelect}
            initialFocus
            disabled={isLoading}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}