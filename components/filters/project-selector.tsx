"use client";

import { Select, SelectTrigger, SelectValue, SelectContent } from "@/components/ui/select";

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

export function ProjectSelector({ projects, selectedProjects, onChange, loading = false }: ProjectSelectorProps) {
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
        <SelectTrigger className="w-48">
          <SelectValue 
            placeholder={selectedProjects.length ? `${selectedProjects.length} project(s)` : "Select project(s)"} 
          />
        </SelectTrigger>
        <SelectContent>
          {projects.length === 0 ? (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">No projects available</div>
          ) : (
            <>
              {projects.map((proj) => (
                <div
                  key={proj.id}
                  className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                  onClick={(e) => toggle(proj.id, e)}
                >
                  <input 
                    type="checkbox" 
                    checked={selectedProjects.includes(proj.id)} 
                    readOnly 
                    className="mr-2 pointer-events-none" 
                  />
                  {proj.name}
                </div>
              ))}
              {loading && (
                <div className="absolute inset-0 bg-white/50 backdrop-blur-sm pointer-events-none flex items-center justify-center">
                  <span className="text-sm text-muted-foreground animate-pulse">Loading...</span>
                </div>
              )}
            </>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
