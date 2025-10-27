'use client';

import { Select, SelectTrigger, SelectValue, SelectContent } from '@/components/ui/select';
import { CheckIcon, Columns } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ColumnId =
  | 'status'
  | 'priority'
  | 'dueDate'
  | 'assignees'
  | 'project'
  | 'recurring'
  | 'creator'
  | 'subtasks'
  | 'attachments'
  | 'tags';

export const COLUMN_LABELS: Record<ColumnId, string> = {
  status: 'Status',
  priority: 'Priority',
  dueDate: 'Due Date',
  assignees: 'Assignees',
  project: 'Project',
  recurring: 'Recurring',
  creator: 'Creator',
  subtasks: 'Subtasks',
  attachments: 'Attachments',
  tags: 'Tags',
};

interface ColumnVisibilitySelectorProps {
  visibleColumns: ColumnId[];
  onChange: (columns: ColumnId[]) => void;
}

export function ColumnVisibilitySelector({
  visibleColumns,
  onChange,
}: ColumnVisibilitySelectorProps) {
  const allColumns: ColumnId[] = [
    'status',
    'priority',
    'dueDate',
    'assignees',
    'project',
    'recurring',
    'creator',
    'subtasks',
    'attachments',
    'tags',
  ];

  const toggle = (column: ColumnId, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Always keep at least one column visible
    if (visibleColumns.length === 1 && visibleColumns.includes(column)) {
      return;
    }

    const newColumns = visibleColumns.includes(column)
      ? visibleColumns.filter((c) => c !== column)
      : [...visibleColumns, column];
    onChange(newColumns);
  };

  return (
    <div className="relative">
      <Select value="" onValueChange={() => {}}>
        <SelectTrigger
          className={cn(
            'w-[140px] border border-input bg-background text-foreground',
            'hover:bg-accent hover:text-accent-foreground',
            'focus:ring-2 focus:ring-ring focus:ring-offset-2',
            '[&>span]:text-foreground [&>span]:font-medium'
          )}
        >
          <Columns className="h-4 w-4 mr-2 flex-shrink-0" />
          <SelectValue placeholder="Columns" />
        </SelectTrigger>
        <SelectContent
          className="bg-popover text-popover-foreground border border-border shadow-md min-w-[220px]"
          style={{
            backgroundColor: 'hsl(var(--popover))',
            backdropFilter: 'none',
            WebkitBackdropFilter: 'none',
          }}
        >
          <div className="max-h-[400px] overflow-y-auto">
            <div className="px-2 py-2 border-b border-border mb-1">
              <span className="text-xs text-muted-foreground font-medium">
                {visibleColumns.length} of {allColumns.length} columns visible
              </span>
            </div>
            <div className="p-1">
              {allColumns.map((column) => {
                const isDisabled = visibleColumns.length === 1 && visibleColumns.includes(column);
                return (
                  <div
                    key={column}
                    className={cn(
                      'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2.5 text-sm outline-none transition-colors duration-100',
                      'hover:bg-accent hover:text-accent-foreground',
                      visibleColumns.includes(column) && 'bg-accent/50',
                      isDisabled && 'opacity-50 cursor-not-allowed'
                    )}
                    onClick={(e) => !isDisabled && toggle(column, e)}
                    title={isDisabled ? 'At least one column must be visible' : ''}
                  >
                    <div
                      className={cn(
                        'flex h-4 w-4 items-center justify-center mr-3 flex-shrink-0 rounded border transition-colors duration-100',
                        visibleColumns.includes(column)
                          ? 'border-primary bg-primary'
                          : 'border-input'
                      )}
                    >
                      {visibleColumns.includes(column) && (
                        <CheckIcon className="h-3 w-3 text-primary-foreground" />
                      )}
                    </div>
                    <span className="flex-1 whitespace-nowrap">{COLUMN_LABELS[column]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </SelectContent>
      </Select>
    </div>
  );
}
