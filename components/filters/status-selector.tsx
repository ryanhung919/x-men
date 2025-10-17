'use client';

import { Select, SelectTrigger, SelectValue, SelectContent } from '@/components/ui/select';
import { CheckIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatusSelectorProps {
  statuses: readonly string[]; // Changed to readonly string[]
  selectedStatuses: string[];
  onChange: (statuses: string[]) => void;
  loading?: boolean;
}

export function StatusSelector({
  statuses,
  selectedStatuses,
  onChange,
  loading = false,
}: StatusSelectorProps) {
  const toggle = (status: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const newStatuses = selectedStatuses.includes(status)
      ? selectedStatuses.filter((s) => s !== status)
      : [...selectedStatuses, status];
    onChange(newStatuses);
  };

  return (
    <div className="relative">
      <Select value="" onValueChange={() => {}}>
        <SelectTrigger
          className={cn(
            'w-52 border border-input bg-background text-foreground',
            'hover:bg-accent hover:text-accent-foreground',
            'focus:ring-2 focus:ring-ring focus:ring-offset-2',
            '[&>span]:text-foreground [&>span]:font-medium'
          )}
        >
          <SelectValue
            placeholder={
              selectedStatuses.length
                ? `${selectedStatuses.length} status${selectedStatuses.length > 1 ? 'es' : ''}`
                : 'All statuses'
            }
          />
        </SelectTrigger>
        <SelectContent
          className="bg-popover text-popover-foreground border border-border shadow-md"
          style={{
            backgroundColor: 'hsl(var(--popover))',
            backdropFilter: 'none',
            WebkitBackdropFilter: 'none',
          }}
        >
          <div className="max-h-[300px] overflow-y-auto">
            {statuses.length === 0 ? (
              <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                {loading ? 'Loading statuses...' : 'No statuses available'}
              </div>
            ) : (
              <div className="p-1">
                {statuses.map((status) => (
                  <div
                    key={status}
                    className={cn(
                      'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none transition-colors duration-100',
                      'hover:bg-accent hover:text-accent-foreground',
                      selectedStatuses.includes(status) && 'bg-accent/50'
                    )}
                    onClick={(e) => toggle(status, e)}
                  >
                    <div
                      className={cn(
                        'flex h-4 w-4 items-center justify-center mr-2 rounded border transition-colors duration-100',
                        selectedStatuses.includes(status)
                          ? 'border-primary bg-primary'
                          : 'border-input'
                      )}
                    >
                      {selectedStatuses.includes(status) && (
                        <CheckIcon className="h-3 w-3 text-primary-foreground" />
                      )}
                    </div>
                    <span className="flex-1 truncate">{status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {loading && statuses.length > 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-popover pointer-events-none">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
