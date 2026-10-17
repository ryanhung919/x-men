'use client';

import { useState, useEffect } from 'react';
import { Select, SelectTrigger, SelectValue, SelectContent } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { SearchIcon } from 'lucide-react';

interface Project {
  id: number;
  name: string;
}

interface ProjectSingleSelectorProps {
  selectedProjectId: number | null;
  onChange: (id: number | null) => void;
}

export function ProjectSingleSelector({ selectedProjectId, onChange }: ProjectSingleSelectorProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/tasks?action=projects', { signal: controller.signal })
      .then((response) => response.json())
      .then((data) => setProjects(data.projects || []))
      .catch((error) => {
        if (error.name !== 'AbortError') console.error('Error fetching projects:', error);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  const handleSelect = (projectId: number) => {
    onChange(projectId);
  };

  return (
    <div className="relative">
      <Select value={selectedProjectId?.toString() || ''} onValueChange={() => {}}>
        <SelectTrigger
          id="project"
          className={cn(
            'w-full border border-input bg-background text-foreground',
            'hover:bg-accent hover:text-accent-foreground',
            'focus:ring-2 focus:ring-ring focus:ring-offset-2',
            '[&>span]:text-foreground [&>span]:font-medium'
          )}
        >
          <SelectValue placeholder={loading ? 'Loading projects...' : 'Select a project'}>
            {selectedProject?.name}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-popover text-popover-foreground border border-border shadow-md">
          {/* Search Input */}
          <div className="p-2 border-b">
            <div className="relative">
              <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          <div className="max-h-[300px] overflow-y-auto">
            {filteredProjects.length === 0 ? (
              <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                {loading
                  ? 'Loading...'
                  : searchTerm
                    ? 'No projects found'
                    : 'No projects available'}
              </div>
            ) : (
              <div className="p-1">
                {filteredProjects.map((project) => (
                  <button
                    type="button"
                    key={project.id}
                    className={cn(
                      'relative flex w-full text-left cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none transition-colors duration-100',
                      'hover:bg-accent hover:text-accent-foreground',
                      selectedProjectId === project.id && 'bg-accent/50'
                    )}
                    onClick={() => handleSelect(project.id)}
                  >
                    <div
                      className={cn(
                        'flex h-4 w-4 items-center justify-center mr-2 rounded-full border transition-colors duration-100',
                        selectedProjectId === project.id
                          ? 'border-primary bg-primary'
                          : 'border-input'
                      )}
                    >
                      {selectedProjectId === project.id && (
                        <div className="h-2 w-2 rounded-full bg-primary-foreground" />
                      )}
                    </div>
                    <span className="flex-1 truncate">{project.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </SelectContent>
      </Select>
    </div>
  );
}
