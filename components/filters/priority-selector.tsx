'use client';

import { Select, SelectTrigger, SelectValue, SelectContent } from '@/components/ui/select';
import { CheckIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PrioritySelectorProps {
  priorities: string[];
  selectedPriorities: string[];
  onChange: (priorities: string[]) => void;
  loading?: boolean;
}

export function PrioritySelector({
  priorities,
  selectedPriorities,
  onChange,
  loading = false,
}: PrioritySelectorProps) {
  const toggle = (priority: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const newPriorities = selectedPriorities.includes(priority)
      ? selectedPriorities.filter((p) => p !== priority)
      : [...selectedPriorities, priority];
    onChange(newPriorities);
  };

  return (
    <div className="relative">
      <Select value="" onValueChange={() => {}}>
        <SelectTrigger className="w-52">
          <SelectValue
            placeholder={
              selectedPriorities.length
                ? `${selectedPriorities.length} priorit${
                    selectedPriorities.length > 1 ? 'ies' : 'y'
                  }`
                : 'Select priorities'
            }
          />
        </SelectTrigger>
        <SelectContent className="bg-white dark:bg-slate-950 border border-border shadow-md">
          <div className="max-h-[300px] overflow-y-auto">
            {priorities.length === 0 ? (
              <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                {loading ? 'Loading priorities...' : 'No priorities available'}
              </div>
            ) : (
              <>
                {priorities.map((priority) => (
                  <div
                    key={priority}
                    className={cn(
                      'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none transition-colors duration-100',
                      'hover:bg-accent/50 focus:bg-accent',
                      selectedPriorities.includes(priority) && 'bg-accent/30'
                    )}
                    onClick={(e) => toggle(priority, e)}
                  >
                    <div className="flex h-4 w-4 items-center justify-center mr-2 rounded border border-input">
                      {selectedPriorities.includes(priority) && (
                        <CheckIcon className="h-3 w-3 text-primary" />
                      )}
                    </div>
                    <span className="flex-1 truncate">{priority}</span>
                  </div>
                ))}
              </>
            )}
          </div>
          {loading && priorities.length > 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-popover/80 backdrop-blur-sm pointer-events-none">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
