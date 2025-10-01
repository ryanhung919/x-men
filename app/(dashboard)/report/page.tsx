"use client";

import { useEffect, useState } from "react";
import { DepartmentSelector, Department } from "@/components/filters/department-selector";
import { ProjectSelector, Project } from "@/components/filters/project-selector";
import { ProductivityMetrics } from "@/components/report/productivity-metrics";
import { TaskCompletionsChart } from "@/components/report/task-completions-chart";
import { TeamSummaryChart } from "@/components/report/team-summary-chart";
import { ExportButtons } from "@/components/report/export-buttons";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

// --- API helpers ---
async function fetchDepartments(projectIds?: number[]): Promise<Department[]> {
  const query = projectIds?.length ? `&projectIds=${projectIds.join(",")}` : "";
  const res = await fetch(`/api/reports?action=departments${query}`);
  if (!res.ok) throw new Error("Failed to fetch departments");
  return res.json();
}

async function fetchProjects(departmentIds?: number[]): Promise<Project[]> {
  const query = departmentIds?.length ? `&departmentIds=${departmentIds.join(",")}` : "";
  const res = await fetch(`/api/reports?action=projects${query}`);
  if (!res.ok) throw new Error("Failed to fetch projects");
  return res.json();
}

export default function ReportsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const [selectedDepartments, setSelectedDepartments] = useState<number[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<number[]>([]);

  const [selectedReport, setSelectedReport] = useState<"loggedTime" | "taskCompletions" | "teamSummary">("loggedTime");
  const [timeRange, setTimeRange] = useState<"week" | "month" | "quarter">("month");

  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(true);

  // --- Fetch departments based on selected projects ---
  useEffect(() => {
    let cancelled = false;
    setLoadingDepartments(true);
    fetchDepartments(selectedProjects)
      .then((data) => {
        if (!cancelled) setDepartments(data);
      })
      .finally(() => !cancelled && setLoadingDepartments(false));
    return () => { cancelled = true; };
  }, [selectedProjects]);

  // --- Fetch projects based on selected departments ---
  useEffect(() => {
    let cancelled = false;
    setLoadingProjects(true);
    fetchProjects(selectedDepartments)
      .then((data) => {
        if (!cancelled) setProjects(data);
      })
      .finally(() => !cancelled && setLoadingProjects(false));
    return () => { cancelled = true; };
  }, [selectedDepartments]);

  // --- Apply default selection if none ---
  useEffect(() => {
    if (!selectedDepartments.length && departments.length) {
      setSelectedDepartments([departments[0].id]);
    }
  }, [departments]);

  useEffect(() => {
    if (!selectedProjects.length && projects.length) {
      setSelectedProjects([projects[0].id]);
    }
  }, [projects]);

  // --- Render report safely ---
  const renderReport = () => {
    if (!selectedDepartments.length && !selectedProjects.length) {
      return <div className="text-muted">Please select department(s) and/or project(s)</div>;
    }

    const props = { departmentIds: selectedDepartments, projectIds: selectedProjects, timeRange };

    switch (selectedReport) {
      case "loggedTime": return <ProductivityMetrics {...props} />;
      case "taskCompletions": return <TaskCompletionsChart {...props} />;
      case "teamSummary": return <TeamSummaryChart {...props} />;
      default: return null;
    }
  };

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

        <Select value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Time Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Last 7 Days</SelectItem>
            <SelectItem value="month">Last Month</SelectItem>
            <SelectItem value="quarter">Last Quarter</SelectItem>
          </SelectContent>
        </Select>

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

        <ExportButtons departmentIds={selectedDepartments} projectIds={selectedProjects} timeRange={timeRange} />
      </div>

      <div>{renderReport()}</div>
    </div>
  );
}
