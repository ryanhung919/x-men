'use client';

import { useState, useEffect } from 'react';
import { Select, SelectTrigger, SelectValue, SelectContent } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CheckIcon, SearchIcon, XIcon } from 'lucide-react';

interface User {
  id: string;
  first_name: string;
  last_name: string;
}

interface AssigneeMultiSelectorProps {
  selectedAssigneeIds: string[];
  onChange: (ids: string[]) => void;
  maxAssignees?: number;
}

export function AssigneeMultiSelector({
  selectedAssigneeIds,
  onChange,
  maxAssignees = 5,
}: AssigneeMultiSelectorProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/tasks?action=users');
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase());
  });

  const selectedUsers = users.filter((u) => selectedAssigneeIds.includes(u.id));

  const toggle = (userId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (selectedAssigneeIds.includes(userId)) {
      // Remove
      onChange(selectedAssigneeIds.filter((id) => id !== userId));
    } else {
      // Add (if under limit)
      if (selectedAssigneeIds.length < maxAssignees) {
        onChange([...selectedAssigneeIds, userId]);
      }
    }
  };

  const removeAssignee = (userId: string) => {
    onChange(selectedAssigneeIds.filter((id) => id !== userId));
  };

  const getUserFullName = (user: User) => `${user.first_name} ${user.last_name}`;

  return (
    <div className="space-y-2">
      {/* Selected Assignees Display */}
      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedUsers.map((user) => (
            <Badge
              key={user.id}
              variant="secondary"
              className="flex items-center gap-1 pl-3 pr-1 py-1"
            >
              {getUserFullName(user)}
              <button
                type="button"
                onClick={() => removeAssignee(user.id)}
                className="ml-1 rounded-full hover:bg-muted p-0.5"
              >
                <XIcon className="h-3 w-3" />
              </button>
            </Badge>
          ))}
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
            disabled={selectedAssigneeIds.length >= maxAssignees}
          >
            <SelectValue
              placeholder={
                loading
                  ? 'Loading users...'
                  : selectedAssigneeIds.length >= maxAssignees
                    ? `Maximum ${maxAssignees} assignees reached`
                    : selectedAssigneeIds.length === 0
                      ? 'Select assignees'
                      : `${selectedAssigneeIds.length} / ${maxAssignees} selected`
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
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>

            <div className="max-h-[300px] overflow-y-auto">
              {filteredUsers.length === 0 ? (
                <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                  {loading ? 'Loading...' : searchTerm ? 'No users found' : 'No users available'}
                </div>
              ) : (
                <div className="p-1">
                  {filteredUsers.map((user) => {
                    const isSelected = selectedAssigneeIds.includes(user.id);
                    const isDisabled = !isSelected && selectedAssigneeIds.length >= maxAssignees;

                    return (
                      <div
                        key={user.id}
                        className={cn(
                          'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none transition-colors duration-100',
                          !isDisabled && 'hover:bg-accent hover:text-accent-foreground',
                          isSelected && 'bg-accent/50',
                          isDisabled && 'opacity-50 cursor-not-allowed'
                        )}
                        onClick={(e) => !isDisabled && toggle(user.id, e)}
                      >
                        <div
                          className={cn(
                            'flex h-4 w-4 items-center justify-center mr-2 rounded border transition-colors duration-100',
                            isSelected ? 'border-primary bg-primary' : 'border-input'
                          )}
                        >
                          {isSelected && <CheckIcon className="h-3 w-3 text-primary-foreground" />}
                        </div>
                        <span className="flex-1 truncate">{getUserFullName(user)}</span>
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
