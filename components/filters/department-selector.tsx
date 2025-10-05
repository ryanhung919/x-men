"use client";

import { Select, SelectTrigger, SelectValue, SelectContent } from "@/components/ui/select";

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

export function DepartmentSelector({ departments, selectedDepartments, onChange, loading = false }: DepartmentSelectorProps) {
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
        <SelectTrigger className="w-48">
          <SelectValue 
            placeholder={selectedDepartments.length ? `${selectedDepartments.length} department(s)` : "Select department(s)"} 
          />
        </SelectTrigger>
        <SelectContent>
          {departments.length === 0 ? (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">No departments available</div>
          ) : (
            <>
              {departments.map((dept) => (
                <div
                  key={dept.id}
                  className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                  onClick={(e) => toggle(dept.id, e)}
                >
                  <input 
                    type="checkbox" 
                    checked={selectedDepartments.includes(dept.id)} 
                    readOnly 
                    className="mr-2 pointer-events-none" 
                  />
                  {dept.name}
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
