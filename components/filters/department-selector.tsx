'use client';

import { Select, SelectTrigger, SelectValue, SelectContent } from '@/components/ui/select';
import { CheckIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Department {
  id: number;
  name: string;
}

interface DepartmentSelectorProps {
  departments: Department[];
  selectedDepartments: number[];
  onChange: (ids: number[]) => void;
  loading?: boolean;
}

export function DepartmentSelector({
  departments,
  selectedDepartments,
  onChange,
  loading = false,
}: DepartmentSelectorProps) {
  const toggle = (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const newIds = selectedDepartments.includes(id)
      ? selectedDepartments.filter((i) => i !== id)
      : [...selectedDepartments, id];
    onChange(newIds);
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
          {' '}
          <SelectValue
            placeholder={
              selectedDepartments.length
                ? `${selectedDepartments.length} department${
                    selectedDepartments.length > 1 ? 's' : ''
                  }`
                : 'Select departments'
            }
          />
        </SelectTrigger>
        <SelectContent
          className="bg-popover text-popover-foreground border border-border shadow-md "
          style={{
            backgroundColor: 'hsl(var(--popover))',
            backdropFilter: 'none',
            WebkitBackdropFilter: 'none',
          }}
        >
          <div className="max-h-[500px] overflow-y-auto">
            {departments.length === 0 ? (
              <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                {loading ? 'Loading departments...' : 'No departments available'}
              </div>
            ) : (
              <div className="p-1">
                {departments.map((dept) => (
                  <div
                    key={dept.id}
                    className={cn(
                      'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none transition-colors duration-100',
                      'hover:bg-accent hover:text-accent-foreground',
                      selectedDepartments.includes(dept.id) && 'bg-accent/50'
                    )}
                    onClick={(e) => toggle(dept.id, e)}
                  >
                    <div
                      className={cn(
                        'flex h-4 w-4 items-center justify-center mr-2 rounded border transition-colors duration-100',
                        selectedDepartments.includes(dept.id)
                          ? 'border-primary bg-primary'
                          : 'border-input'
                      )}
                    >
                      {selectedDepartments.includes(dept.id) && (
                        <CheckIcon className="h-3 w-3 text-primary-foreground" />
                      )}
                    </div>
                    <span className="flex-1">{dept.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {loading && departments.length > 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-popover/90 backdrop-blur-sm pointer-events-none rounded-md">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
