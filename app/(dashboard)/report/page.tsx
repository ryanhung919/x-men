'use client';

import { useEffect, useState } from 'react';
import { DepartmentSelector, Department } from '@/components/filters/department-selector';
import { ProjectSelector, Project } from '@/components/filters/project-selector';
import { DateRangeFilter, DateRangeType } from '@/components/filters/date-range-selector';
import { startOfDay, endOfDay } from 'date-fns';

import { LoggedTimeReport } from '@/components/report/logged-time-report';
import { TaskCompletionsChart } from '@/components/report/task-completions-chart';
import { TeamSummaryChart } from '@/components/report/team-summary-chart';
import { ExportButtons } from '@/components/report/export-buttons';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

async function fetchDepartments(projectIds?: number[]): Promise<Department[]> {
  const query = projectIds?.length ? `&projectIds=${projectIds.join(',')}` : '';
  const res = await fetch(`/api/reports?action=departments${query}`);
  if (!res.ok) throw new Error('Failed to fetch departments');
  return res.json();
}

async function fetchProjects(departmentIds?: number[]): Promise<Project[]> {
  const query = departmentIds?.length ? `&departmentIds=${departmentIds.join(',')}` : '';
  const res = await fetch(`/api/reports?action=projects${query}`);
  if (!res.ok) throw new Error('Failed to fetch projects');
  return res.json();
}

export default function ReportsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const [selectedDepartments, setSelectedDepartments] = useState<number[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<number[]>([]);

  const [selectedReport, setSelectedReport] = useState<
    'loggedTime' | 'taskCompletions' | 'teamSummary'
  >('loggedTime');

  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(true);

  const [dateRange, setDateRange] = useState<DateRangeType>({
    startDate: startOfDay(new Date()),
    endDate: endOfDay(new Date()),
  });

  // --- Step 1 & Initial load: fetch all departments and projects ---
  useEffect(() => {
    Promise.all([fetchDepartments(), fetchProjects()])
      .then(([depts, projs]) => {
        setDepartments(depts);
        setProjects(projs);
      })
      .finally(() => {
        setLoadingDepartments(false);
        setLoadingProjects(false);
      });
  }, []);

  // --- Step 4: when departments change, fetch projects and filter selections ---
  useEffect(() => {
    setLoadingProjects(true);
    fetchProjects(selectedDepartments.length ? selectedDepartments : undefined)
      .then((newProjects) => {
        setProjects(newProjects);

        // Remove selected projects no longer in scope
        setSelectedProjects((prevSelected) =>
          prevSelected.filter((pId) => newProjects.some((p) => p.id === pId))
        );
      })
      .finally(() => setLoadingProjects(false));
  }, [selectedDepartments]);

  // --- Step 2 & 3: determine which project IDs to send to report ---
  const reportProjectIds = selectedProjects.length
    ? selectedProjects // Step 3: only selected projects
    : projects.map((p) => p.id); // Step 2: all visible projects

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-wrap gap-4 items-center">
        <DepartmentSelector
          departments={departments}
          selectedDepartments={selectedDepartments}
          onChange={setSelectedDepartments}
          loading={loadingDepartments}
        />
        <ProjectSelector
          projects={projects}
          selectedProjects={selectedProjects}
          onChange={setSelectedProjects}
          loading={loadingProjects}
        />
        <DateRangeFilter value={dateRange} onChange={setDateRange} />

        <Select value={selectedReport} onValueChange={(v) => setSelectedReport(v as any)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select report" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="loggedTime">Logged Time</SelectItem>
            <SelectItem value="taskCompletions">Task Completions</SelectItem>
            <SelectItem value="teamSummary">Team Summary</SelectItem>
          </SelectContent>
        </Select>

        <ExportButtons
          departmentIds={selectedDepartments}
          projectIds={reportProjectIds}
          startDate={dateRange.startDate?.toISOString()}
          endDate={dateRange.endDate?.toISOString()}
        />
      </div>

      {dateRange.startDate && dateRange.endDate && (
        <div className="flex items-center gap-2 mt-2">
          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
            Created: {dateRange.startDate.toLocaleDateString()} –{' '}
            {dateRange.endDate.toLocaleDateString()}
          </span>
          <button
            className="text-sm text-red-600 underline"
            onClick={() => setDateRange({ startDate: undefined, endDate: undefined })}
          >
            Clear
          </button>
        </div>
      )}

      <div className="mt-4">
        {!selectedDepartments.length && !selectedProjects.length ? (
          <div className="text-muted-foreground">
            Please select department(s) and/or project(s)
          </div>
        ) : selectedReport === 'loggedTime' ? (
          <LoggedTimeReport
            departmentIds={selectedDepartments}
            projectIds={reportProjectIds}
            startDate={dateRange.startDate?.toISOString()}
            endDate={dateRange.endDate?.toISOString()}
          />
        ) : selectedReport === 'taskCompletions' ? (
          <TaskCompletionsChart
            departmentIds={selectedDepartments}
            projectIds={reportProjectIds}
            startDate={dateRange.startDate?.toISOString()}
            endDate={dateRange.endDate?.toISOString()}
          />
        ) : (
          <TeamSummaryChart
            departmentIds={selectedDepartments}
            projectIds={reportProjectIds}
            startDate={dateRange.startDate?.toISOString()}
            endDate={dateRange.endDate?.toISOString()}
          />
        )}
      </div>
    </div>
  );
}
