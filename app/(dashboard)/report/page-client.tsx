'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { DepartmentSelector, Department } from '@/components/filters/department-selector';
import { ProjectSelector, Project } from '@/components/filters/project-selector';
import { DateRangeFilter, DateRangeType } from '@/components/filters/date-range-selector';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

import { LoggedTimeReport } from '@/components/report/logged-time-report';
import { TaskCompletionsChart } from '@/components/report/task-completion-report';
import { TeamSummaryChart } from '@/components/report/team-summary-report';
import { ExportButtons, type AnyReport } from '@/components/report/export-buttons';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

import { XIcon } from 'lucide-react';

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

const REPORT_OPTIONS = [
  { value: 'loggedTime', label: 'Logged Time' },
  { value: 'taskCompletions', label: 'Task Completions' },
  { value: 'teamSummary', label: 'Team Summary' },
];

interface ReportsPageClientProps {
  initialDepartmentId: number | null;
  initialDepartments: Department[];
  initialProjects: Project[];
  initialReportData: AnyReport | null;
  preselectedDepartments: number[];
  preselectedProjects: number[];
}

export default function ReportsPageClient({
  initialDepartmentId,
  initialDepartments,
  initialProjects,
  initialReportData,
  preselectedDepartments,
  preselectedProjects,
}: ReportsPageClientProps) {
  const [departments, setDepartments] = useState<Department[]>(initialDepartments);
  const [projects, setProjects] = useState<Project[]>(initialProjects);

  const [selectedDepartments, setSelectedDepartments] = useState<number[]>(preselectedDepartments);
  const [selectedProjects, setSelectedProjects] = useState<number[]>(preselectedProjects);

  const [selectedReport, setSelectedReport] = useState<
    'loggedTime' | 'taskCompletions' | 'teamSummary'
  >('loggedTime');

  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [dateRange, setDateRange] = useState<DateRangeType>({
    startDate: undefined,
    endDate: undefined,
  });

  const [reportData, setReportData] = useState<AnyReport | null>(initialReportData);

  const hasActiveFilters =
    selectedDepartments.length > 0 ||
    selectedProjects.length > 0 ||
    (dateRange.startDate && dateRange.endDate);

  const clearAllFilters = () => {
    setIsLoading(true);
    setSelectedDepartments([]);
    setSelectedProjects([]);
    setDateRange({ startDate: undefined, endDate: undefined });
  };

  // When departments change, fetch projects and filter selections
  useEffect(() => {
    if (selectedDepartments.length === 0) {
      // No departments selected - fetch all projects
      setLoadingProjects(true);
      fetchProjects()
        .then((newProjects) => {
          setProjects(newProjects);
          setSelectedProjects([]);
        })
        .finally(() => setLoadingProjects(false));
      return;
    }

    setLoadingProjects(true);
    fetchProjects(selectedDepartments)
      .then((newProjects) => {
        setProjects(newProjects);

        // Remove selected projects no longer in scope
        setSelectedProjects((prevSelected) =>
          prevSelected.filter((pId) => newProjects.some((p) => p.id === pId))
        );
      })
      .finally(() => setLoadingProjects(false));
  }, [selectedDepartments]);

  // Determine which project IDs to send to report
  const reportProjectIds = useMemo(() => {
    return selectedProjects.length ? selectedProjects : projects.map((p) => p.id);
  }, [selectedProjects, projects]);

  // Callback to lift report data from child components
  const handleReportDataLoaded = useCallback((data: AnyReport) => {
    setReportData(data);
    setIsLoading(false);
  }, []);

  const handleDepartmentChange = (newDepts: number[]) => {
    setIsLoading(true);
    setSelectedDepartments(newDepts);
  };

  const handleProjectChange = (newProjs: number[]) => {
    setIsLoading(true);
    setSelectedProjects(newProjs);
  };

  const handleDateRangeChange = (range: DateRangeType) => {
    setIsLoading(true);
    setDateRange(range);
  };

  const handleReportTypeChange = (type: typeof selectedReport) => {
    setIsLoading(true);
    setSelectedReport(type);
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-wrap gap-4 items-center">
        <DepartmentSelector
          departments={departments}
          selectedDepartments={selectedDepartments}
          onChange={handleDepartmentChange}
          loading={loadingDepartments}
        />
        <ProjectSelector
          projects={projects}
          selectedProjects={selectedProjects}
          onChange={handleProjectChange}
          loading={loadingProjects}
        />
        <DateRangeFilter value={dateRange} onChange={handleDateRangeChange} />

        <Select value={selectedReport} onValueChange={handleReportTypeChange}>
          <SelectTrigger
            className={cn(
              'w-52 border border-input bg-background text-foreground',
              'hover:bg-accent hover:text-accent-foreground',
              'focus:ring-2 focus:ring-ring focus:ring-offset-2'
            )}
          >
            <SelectValue placeholder="Select report" />
          </SelectTrigger>

          <SelectContent
            className="bg-popover text-popover-foreground border border-border shadow-md [&>span]:text-foreground [&>span]:font-medium"
            style={{
              backgroundColor: 'hsl(var(--popover))',
              backdropFilter: 'none',
              WebkitBackdropFilter: 'none',
            }}
          >
            <div className="max-h-[300px] overflow-y-auto">
              <SelectItem
                value="loggedTime"
                className="cursor-pointer rounded-sm px-2 py-2 text-sm transition-colors duration-100 hover:bg-accent/50 focus:bg-accent"
              >
                Logged Time
              </SelectItem>
              <SelectItem
                value="taskCompletions"
                className="cursor-pointer rounded-sm px-2 py-2 text-sm transition-colors duration-100 hover:bg-accent/50 focus:bg-accent"
              >
                Task Completions
              </SelectItem>
              <SelectItem
                value="teamSummary"
                className="cursor-pointer rounded-sm px-2 py-2 text-sm transition-colors duration-100 hover:bg-accent/50 focus:bg-accent"
              >
                Team Summary
              </SelectItem>
            </div>
          </SelectContent>
        </Select>

        {reportData && (
          <ExportButtons
            reportData={reportData}
            reportTitle={REPORT_OPTIONS.find((o) => o.value === selectedReport)?.label}
            disabled={isLoading || !reportData}
          />
        )}
      </div>

      {hasActiveFilters && (
        <div className="flex items-center gap-2 mt-3">
          <span className="flex items-center gap-2 rounded-full bg-accent/10 text-accent-foreground px-3 py-1.5 text-sm border border-accent/30 shadow-sm">
            {selectedDepartments.length > 0 && (
              <span>
                {selectedDepartments.length} department{selectedDepartments.length > 1 ? 's' : ''}
              </span>
            )}
            {selectedDepartments.length > 0 && selectedProjects.length > 0 && <span>•</span>}
            {selectedProjects.length > 0 && (
              <span>
                {selectedProjects.length} project{selectedProjects.length > 1 ? 's' : ''}
              </span>
            )}
            {(selectedDepartments.length > 0 || selectedProjects.length > 0) &&
              dateRange.startDate &&
              dateRange.endDate && <span>•</span>}
            {dateRange.startDate && dateRange.endDate && (
              <span>
                {format(dateRange.startDate, 'dd/MM/yyyy')} –{' '}
                {format(dateRange.endDate, 'dd/MM/yyyy')}
              </span>
            )}
          </span>
          <button
            onClick={clearAllFilters}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-accent-foreground transition-colors"
          >
            <XIcon className="h-3.5 w-3.5" />
            Clear Filters
          </button>
        </div>
      )}

      {/* Report Display */}
      <div className="mt-4">
        {!selectedDepartments.length && !selectedProjects.length ? (
          <div className="text-muted-foreground">
            Please select department(s) and/or project(s).{' '}
          </div>
        ) : selectedReport === 'loggedTime' ? (
          <LoggedTimeReport
            departmentIds={selectedDepartments}
            projectIds={reportProjectIds}
            startDate={dateRange.startDate?.toISOString()}
            endDate={dateRange.endDate?.toISOString()}
            onDataLoaded={handleReportDataLoaded}
            initialData={initialReportData?.kind === 'loggedTime' ? initialReportData : undefined}
          />
        ) : selectedReport === 'taskCompletions' ? (
          <TaskCompletionsChart
            departmentIds={selectedDepartments}
            projectIds={reportProjectIds}
            startDate={dateRange.startDate?.toISOString()}
            endDate={dateRange.endDate?.toISOString()}
            onDataLoaded={handleReportDataLoaded}
          />
        ) : (
          <TeamSummaryChart
            departmentIds={selectedDepartments}
            projectIds={reportProjectIds}
            startDate={dateRange.startDate?.toISOString()}
            endDate={dateRange.endDate?.toISOString()}
            onDataLoaded={handleReportDataLoaded}
          />
        )}
      </div>
    </div>
  );
}