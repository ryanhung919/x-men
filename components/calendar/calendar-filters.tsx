'use client';

import { Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface CalendarFiltersProps {
  filters: {
    status: string[];
    showCompleted: boolean;
  };
  onFiltersChange: (filters: any) => void;
}

/**
 * Filter controls for calendar view.
 * Allows filtering by status and toggling completed task visibility.
 */
export default function CalendarFilters({ filters, onFiltersChange }: CalendarFiltersProps) {
  const statuses = ['To Do', 'In Progress', 'Completed', 'Blocked'];

  const toggleStatus = (status: string) => {
    const newStatuses = filters.status.includes(status)
      ? filters.status.filter(s => s !== status)
      : [...filters.status, status];
    onFiltersChange({ ...filters, status: newStatuses });
  };

  const toggleShowCompleted = () => {
    onFiltersChange({ ...filters, showCompleted: !filters.showCompleted });
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 p-2 sm:p-4 border-b bg-background">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 sm:h-9 px-3 sm:px-4 text-xs sm:text-sm">
            <Filter className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            Filters
            {filters.status.length > 0 && (
              <span className="ml-1 sm:ml-2 rounded-full bg-primary text-primary-foreground px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs">
                {filters.status.length}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64 sm:w-56 max-h-80 overflow-y-auto">
          <DropdownMenuLabel className="text-sm sm:text-base">Filter by Status</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {statuses.map(status => (
            <DropdownMenuCheckboxItem
              key={status}
              checked={filters.status.includes(status)}
              onCheckedChange={() => toggleStatus(status)}
              className="py-2 sm:py-1 text-xs sm:text-sm cursor-pointer"
            >
              {status}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex items-center gap-2 py-1 sm:py-0">
        <Checkbox
          id="show-completed"
          checked={filters.showCompleted}
          onCheckedChange={toggleShowCompleted}
          className="h-4 w-4 sm:h-4 sm:w-4 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
        />
        <Label
          htmlFor="show-completed"
          className="text-xs sm:text-sm font-normal cursor-pointer leading-tight"
        >
          Show completed
        </Label>
      </div>
    </div>
  );
}
