'use client';

import { useState, useEffect } from 'react';
import { Select, SelectTrigger, SelectValue, SelectContent } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CheckIcon, SearchIcon, XIcon } from 'lucide-react';

interface Staff {
  id: string;
  first_name: string;
  last_name: string;
}

interface StaffSelectorProps {
  staff: Staff[];
  selectedStaffIds: string[];
  onChange: (ids: string[]) => void;
  loading?: boolean;
}

export function StaffSelector({
  staff,
  selectedStaffIds,
  onChange,
  loading = false,
}: StaffSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredStaff = staff.filter((person) => {
    const fullName = `${person.first_name} ${person.last_name}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase());
  });

  const selectedStaff = staff.filter((s) => selectedStaffIds.includes(s.id));

  const toggle = (staffId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (selectedStaffIds.includes(staffId)) {
      // Remove
      onChange(selectedStaffIds.filter((id) => id !== staffId));
    } else {
      // Add
      onChange([...selectedStaffIds, staffId]);
    }
  };

  const removeStaff = (staffId: string) => {
    onChange(selectedStaffIds.filter((id) => id !== staffId));
  };

  const clearAll = () => {
    onChange([]);
  };

  const getStaffFullName = (person: Staff) => `${person.first_name} ${person.last_name}`;

  return (
    <div className="space-y-2">
      {/* Selected Staff Display */}
      {selectedStaff.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedStaff.map((person) => (
            <Badge
              key={person.id}
              variant="secondary"
              className="flex items-center gap-1 pl-3 pr-1 py-1"
            >
              {getStaffFullName(person)}
              <button
                type="button"
                onClick={() => removeStaff(person.id)}
                className="ml-1 rounded-full hover:bg-muted p-0.5"
              >
                <XIcon className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <button
            type="button"
            onClick={clearAll}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Dropdown Selector */}
      <div className="relative">
        <Select value="" onValueChange={() => {}}>
          <SelectTrigger
            className={cn(
              'w-full border border-input bg-background text-foreground',
              'hover:bg-accent hover:text-accent-foreground',
              'focus:ring-2 focus:ring-ring focus:ring-offset-2',
              '[&>span]:text-foreground [&>span]:font-medium'
            )}
            disabled={loading || staff.length === 0}
          >
            <SelectValue
              placeholder={
                loading
                  ? 'Loading staff...'
                  : staff.length === 0
                    ? 'No staff available'
                    : selectedStaffIds.length === 0
                      ? 'Select staff to filter'
                      : `${selectedStaffIds.length} staff selected`
              }
            />
          </SelectTrigger>
          <SelectContent
            className="bg-popover text-popover-foreground border border-border shadow-md"
          >
            {/* Search Input */}
            <div className="p-2 border-b">
              <div className="relative">
                <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search staff..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>

            <div className="max-h-[300px] overflow-y-auto">
              {filteredStaff.length === 0 ? (
                <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                  {loading ? 'Loading...' : searchTerm ? 'No staff found' : 'No staff available'}
                </div>
              ) : (
                <div className="p-1">
                  {filteredStaff.map((person) => {
                    const isSelected = selectedStaffIds.includes(person.id);

                    return (
                      <div
                        key={person.id}
                        className={cn(
                          'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none transition-colors duration-100',
                          'hover:bg-accent hover:text-accent-foreground',
                          isSelected && 'bg-accent/50'
                        )}
                        onClick={(e) => toggle(person.id, e)}
                      >
                        <div
                          className={cn(
                            'flex h-4 w-4 items-center justify-center mr-2 rounded border transition-colors duration-100',
                            isSelected ? 'border-primary bg-primary' : 'border-input'
                          )}
                        >
                          {isSelected && <CheckIcon className="h-3 w-3 text-primary-foreground" />}
                        </div>
                        <span className="flex-1 truncate">{getStaffFullName(person)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
