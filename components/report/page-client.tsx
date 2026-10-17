'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { DepartmentSelector, Department } from '@/components/filters/department-selector';
import { ProjectSelector, Project } from '@/components/filters/project-selector';
import { DateRangeFilter, DateRangeType } from '@/components/filters/date-range-selector';
import { format } from 'date-fns';

import { LoggedTimeReport } from '@/components/report/logged-time-report';
import { TaskCompletionsChart } from '@/components/report/task-completion-report';
import { TeamSummaryChart } from '@/components/report/team-summary-report';
import { ExportButtons, type AnyReport } from '@/components/report/export-buttons';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

import { XIcon, FilterIcon, ChartNoAxesCombined } from 'lucide-react';

async function fetchProjects(departmentIds?: number[], signal?: AbortSignal): Promise<Project[]> {
  const query = departmentIds?.length ? `&departmentIds=${departmentIds.join(',')}` : '';
  const res = await fetch(`/api/reports?action=projects${query}`, { signal });
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
  initialDepartments,
  initialProjects,
  initialReportData,
  preselectedDepartments,
  preselectedProjects,
}: ReportsPageClientProps) {
  const [departments] = useState<Department[]>(initialDepartments);
  const [projects, setProjects] = useState<Project[]>(initialProjects);

  const [selectedDepartments, setSelectedDepartments] = useState<number[]>(preselectedDepartments);
  const [selectedProjects, setSelectedProjects] = useState<number[]>(preselectedProjects);

  const [selectedReport, setSelectedReport] = useState<
    'loggedTime' | 'taskCompletions' | 'teamSummary'
  >('loggedTime');

  const [loadingProjects, setLoadingProjects] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [scopeError, setScopeError] = useState(false);
  const [scopeRetry, setScopeRetry] = useState(0);

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
    setReportData(null);
    setSelectedDepartments([]);
    setSelectedProjects([]);
    setDateRange({ startDate: undefined, endDate: undefined });
  };

  // Cancel obsolete dependent-filter requests before rendering the next scope.
  useEffect(() => {
    const controller = new AbortController();
    setLoadingProjects(true);
    setScopeError(false);
    fetchProjects(selectedDepartments, controller.signal)
      .then((nextProjects) => {
        if (controller.signal.aborted) return;
        setProjects(nextProjects);
        setSelectedProjects((previous) =>
          previous.filter((id) => nextProjects.some((project) => project.id === id))
        );
      })
      .catch(() => {
        if (!controller.signal.aborted) setScopeError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingProjects(false);
      });
    return () => controller.abort();
  }, [selectedDepartments, scopeRetry]);

  // Determine which project IDs to send to report
  const reportProjectIds = useMemo(() => {
    return selectedProjects.length ? selectedProjects : projects.map((p) => p.id);
  }, [selectedProjects, projects]);

  const scopeKey = JSON.stringify([
    selectedReport,
    selectedDepartments,
    reportProjectIds,
    dateRange.startDate?.toISOString(),
    dateRange.endDate?.toISOString(),
  ]);
  const [loadedScope, setLoadedScope] = useState('');
  const handleReportDataLoaded = useCallback(
    (data: AnyReport) => {
      setLoadedScope(scopeKey);
      setReportData(data);
      setIsLoading(false);
    },
    [scopeKey]
  );

  const handleDepartmentChange = (newDepts: number[]) => {
    setIsLoading(true);
    setReportData(null);
    setSelectedDepartments(newDepts);
  };

  const handleProjectChange = (newProjs: number[]) => {
    setIsLoading(true);
    setReportData(null);
    setSelectedProjects(newProjs);
  };

  const handleDateRangeChange = (range: DateRangeType) => {
    setIsLoading(true);
    setReportData(null);
    setDateRange(range);
  };

  const handleReportTypeChange = (value: string) => {
    const type = value as typeof selectedReport;
    if (type === selectedReport) return;
    setIsLoading(true);
    setReportData(null);
    setSelectedReport(type);
  };

  return (
    <Tabs value={selectedReport} onValueChange={handleReportTypeChange} className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-4 pb-2">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <ChartNoAxesCombined className="size-3.5 text-positive" />
            Workspace analytics
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.04em]">Reports</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            A clearer view of effort, progress, and delivery.
          </p>
        </div>
        {reportData && loadedScope === scopeKey && (
          <ExportButtons
            reportData={reportData}
            reportTitle={REPORT_OPTIONS.find((o) => o.value === selectedReport)?.label}
            disabled={
              isLoading || loadingProjects || scopeError || reportData.kind !== selectedReport
            }
          />
        )}
      </header>
      <TabsList
        aria-label="Report type"
        className="h-11 w-full justify-start gap-1 rounded-none border-b bg-transparent p-0 sm:w-fit"
      >
        {REPORT_OPTIONS.map(({ value, label }) => (
          <TabsTrigger
            key={value}
            value={value}
            className="h-full flex-none rounded-none border-0 border-b-2 border-transparent px-3 text-xs text-muted-foreground shadow-none data-[state=active]:border-positive data-[state=active]:bg-transparent data-[state=active]:text-positive data-[state=active]:shadow-none dark:data-[state=active]:bg-transparent dark:data-[state=active]:border-positive dark:data-[state=active]:text-positive sm:px-4 sm:text-sm"
          >
            {label}
          </TabsTrigger>
        ))}
      </TabsList>
      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3 [&>div]:max-w-full">
        <DepartmentSelector
          departments={departments}
          selectedDepartments={selectedDepartments}
          onChange={handleDepartmentChange}
          loading={false}
        />
        <ProjectSelector
          projects={projects}
          selectedProjects={selectedProjects}
          onChange={handleProjectChange}
          loading={loadingProjects}
        />
        <DateRangeFilter value={dateRange} onChange={handleDateRangeChange} />
      </div>

      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-2 rounded-md bg-positive-soft text-positive px-2.5 py-1 text-xs border border-positive/10">
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
      <TabsContent value={selectedReport} key={scopeKey}>
        {scopeError ? (
          <div role="alert" className="rounded-xl border bg-card p-8 text-center">
            <p className="text-sm">We couldn’t load the available projects.</p>
            <button
              className="mt-3 rounded-lg border px-4 py-2 text-sm"
              onClick={() => setScopeRetry((value) => value + 1)}
            >
              Try again
            </button>
          </div>
        ) : loadingProjects ? (
          <p
            role="status"
            className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground"
          >
            Updating report scope…
          </p>
        ) : !selectedDepartments.length && !selectedProjects.length ? (
          <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-border rounded-lg bg-muted/30">
            <FilterIcon className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Filters Selected</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Please select one or more departments and/or projects from the filters above to
              generate your report.
            </p>
          </div>
        ) : selectedReport === 'loggedTime' ? (
          <LoggedTimeReport
            departmentIds={selectedDepartments}
            projectIds={reportProjectIds}
            startDate={dateRange.startDate?.toISOString()}
            endDate={dateRange.endDate?.toISOString()}
            onDataLoaded={handleReportDataLoaded}
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
      </TabsContent>
    </Tabs>
  );
}
