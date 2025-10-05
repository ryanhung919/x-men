'use client';

import { Select, SelectTrigger, SelectValue, SelectContent } from '@/components/ui/select';
import { CheckIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Project {
  id: number;
  name: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

interface ProjectSelectorProps {
  projects: Project[];
  selectedProjects: number[];
  onChange: (ids: number[]) => void;
  loading?: boolean;
}

export function ProjectSelector({
  projects,
  selectedProjects,
  onChange,
  loading = false,
}: ProjectSelectorProps) {
  const toggle = (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const newIds = selectedProjects.includes(id)
      ? selectedProjects.filter((x) => x !== id)
      : [...selectedProjects, id];
    onChange(newIds);
  };

  return (
    <div className="relative">
      <Select value="" onValueChange={() => {}}>
        <SelectTrigger className="w-52">
          <SelectValue
            placeholder={
              selectedProjects.length
                ? `${selectedProjects.length} project${selectedProjects.length > 1 ? 's' : ''}`
                : 'Select projects'
            }
          />
        </SelectTrigger>
        <SelectContent className="bg-white dark:bg-slate-950 border border-border shadow-md">
          <div className="max-h-[300px] overflow-y-auto">
            {projects.length === 0 ? (
              <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                {loading ? 'Loading projects...' : 'No projects available'}
              </div>
            ) : (
              <>
                {projects.map((proj) => (
                  <div
                    key={proj.id}
                    className={cn(
                      'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none transition-colors duration-100',
                      'hover:bg-accent/50 focus:bg-accent',
                      selectedProjects.includes(proj.id) && 'bg-accent/30'
                    )}
                    onClick={(e) => toggle(proj.id, e)}
                  >
                    <div className="flex h-4 w-4 items-center justify-center mr-2 rounded border border-input">
                      {selectedProjects.includes(proj.id) && (
                        <CheckIcon className="h-3 w-3 text-primary" />
                      )}
                    </div>
                    <span className="flex-1 truncate">{proj.name}</span>
                  </div>
                ))}
              </>
            )}
          </div>
          {loading && projects.length > 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-popover/80 backdrop-blur-sm pointer-events-none">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
