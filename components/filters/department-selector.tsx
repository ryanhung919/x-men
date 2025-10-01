"use client";

import { useState, useEffect } from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

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
  const [openIds, setOpenIds] = useState<number[]>(selectedDepartments);

  useEffect(() => setOpenIds(selectedDepartments), [selectedDepartments]);

  const toggle = (id: number) => {
    const newIds = openIds.includes(id) ? openIds.filter((i) => i !== id) : [...openIds, id];
    setOpenIds(newIds);
    onChange(newIds);
  };

  if (loading) return <div className="h-10 w-48 bg-muted animate-pulse rounded" />;

  return (
    <Select value="" onValueChange={() => {}}>
      <SelectTrigger className="w-48">
        <SelectValue placeholder={selectedDepartments.length ? `${selectedDepartments.length} department(s)` : "Select department(s)"} />
      </SelectTrigger>
      <SelectContent>
        {departments.map((dept) => (
          <SelectItem key={dept.id} value={dept.id.toString()} onClick={() => toggle(dept.id)}>
            <input type="checkbox" checked={openIds.includes(dept.id)} readOnly className="mr-2" />
            {dept.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
