"use client";

import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

export interface Project {
  id: number;
  name: string;
}

interface ProjectSelectorProps {
  projects: Project[];
  selectedProjects: number[];
  onChange: (ids: number[]) => void;
  loading?: boolean;
}

export function ProjectSelector({ projects, selectedProjects, onChange, loading = false }: ProjectSelectorProps) {
  const toggle = (id: number) => {
    const newIds = selectedProjects.includes(id)
      ? selectedProjects.filter((x) => x !== id)
      : [...selectedProjects, id];
    onChange(newIds);
  };

  if (loading) return <div className="h-10 w-48 bg-muted animate-pulse rounded" />;

  return (
    <Select value="" onValueChange={() => {}}>
      <SelectTrigger className="w-48">
        <SelectValue placeholder={selectedProjects.length ? `${selectedProjects.length} project(s)` : "Select project(s)"} />
      </SelectTrigger>
      <SelectContent>
        {projects.map((proj) => (
          <SelectItem key={proj.id} value={proj.id.toString()} onClick={() => toggle(proj.id)}>
            <input type="checkbox" checked={selectedProjects.includes(proj.id)} readOnly className="mr-2" />
            {proj.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
