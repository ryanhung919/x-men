"use client";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { FileDown, FileSpreadsheet } from "lucide-react";

// --- Report Type Definitions ---
export interface LoggedTimeReport {
  kind: "loggedTime";
  totalTime: number;
  avgTime: number;
  completedCount: number;
  overdueCount: number;
  onTimeRate: number;
  totalLateness: number;
  wipTime: number;
  overdueLoggedTime: number;
  timeByTask?: Map<number, number>;
}

export interface TeamSummaryReport {
  kind: "teamSummary";
  totalTasks: number;
  tasksByCreator: Map<string, number>;
  avgTasksPerMember?: number;
}

export interface TaskCompletionReport {
  kind: "taskCompletions";
  completionRate: number;
  completedByProject: Map<number, number>;
  totalCompleted?: number;
  totalPending?: number;
}

export type AnyReport = LoggedTimeReport | TeamSummaryReport | TaskCompletionReport;

// --- Field Configuration ---
type FieldConfig = {
  label: string;
  accessor: (report: any) => string | number;
  format?: (value: any) => string;
};

const REPORT_CONFIGS: Record<AnyReport["kind"], FieldConfig[]> = {
  loggedTime: [
    { label: "Total Time (hours)", accessor: (r) => r.totalTime, format: (v) => v.toFixed(2) },
    { label: "Average Time (hours)", accessor: (r) => r.avgTime, format: (v) => v.toFixed(2) },
    { label: "Completed Tasks", accessor: (r) => r.completedCount },
    { label: "Overdue Tasks", accessor: (r) => r.overdueCount },
    { label: "On-Time Rate (%)", accessor: (r) => r.onTimeRate, format: (v) => (v * 100).toFixed(1) },
    { label: "WIP Time (hours)", accessor: (r) => r.wipTime, format: (v) => v.toFixed(2) },
    { label: "Total Lateness (hours)", accessor: (r) => r.totalLateness, format: (v) => v.toFixed(2) },
    { label: "Overdue Logged Time (hours)", accessor: (r) => r.overdueLoggedTime, format: (v) => v.toFixed(2) },
  ],
  teamSummary: [
    { label: "Total Tasks", accessor: (r) => r.totalTasks },
    { label: "Avg Tasks Per Member", accessor: (r) => r.avgTasksPerMember ?? "N/A", format: (v) => typeof v === "number" ? v.toFixed(1) : v },
    { label: "Unique Contributors", accessor: (r) => r.tasksByCreator?.size ?? 0 },
  ],
  taskCompletions: [
    { label: "Completion Rate (%)", accessor: (r) => r.completionRate, format: (v) => (v * 100).toFixed(1) },
    { label: "Total Completed", accessor: (r) => r.totalCompleted ?? 0 },
    { label: "Total Pending", accessor: (r) => r.totalPending ?? 0 },
    { label: "Projects Tracked", accessor: (r) => r.completedByProject?.size ?? 0 },
  ],
};

interface ExportButtonsProps {
  reportData: AnyReport;
  reportTitle?: string;
}

export function ExportButtons({ reportData, reportTitle }: ExportButtonsProps) {
  const title = reportTitle || `${reportData.kind} Report`;
  const config = REPORT_CONFIGS[reportData.kind];
  const timestamp = new Date().toISOString().split("T")[0];
  const filename = `${title.replace(/\s+/g, "_")}_${timestamp}`;

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(16);
    doc.text(title, 20, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 28);
    
    // Summary metrics
    doc.setFontSize(12);
    let y = 40;
    config.forEach((field) => {
      const rawValue = field.accessor(reportData);
      const displayValue = field.format ? field.format(rawValue) : String(rawValue);
      doc.text(`${field.label}: ${displayValue}`, 20, y);
      y += 8;
    });
    
    // Breakdown tables for Maps
    if (reportData.kind === "loggedTime" && reportData.timeByTask?.size) {
      y += 10;
      doc.setFontSize(14);
      doc.text("Task Breakdown", 20, y);
      y += 8;
      doc.setFontSize(10);
      Array.from(reportData.timeByTask.entries()).slice(0, 25).forEach(([taskId, seconds]) => {
        doc.text(`Task ${taskId}: ${(seconds / 3600).toFixed(2)} hours`, 25, y);
        y += 6;
        if (y > 280) { doc.addPage(); y = 20; }
      });
    }
    
    if (reportData.kind === "teamSummary" && reportData.tasksByCreator.size) {
      y += 10;
      doc.setFontSize(14);
      doc.text("Tasks by Creator", 20, y);
      y += 8;
      doc.setFontSize(10);
      Array.from(reportData.tasksByCreator.entries()).forEach(([creator, count]) => {
        doc.text(`${creator}: ${count} tasks`, 25, y);
        y += 6;
        if (y > 280) { doc.addPage(); y = 20; }
      });
    }
    
    if (reportData.kind === "taskCompletions" && reportData.completedByProject.size) {
      y += 10;
      doc.setFontSize(14);
      doc.text("Completed by Project", 20, y);
      y += 8;
      doc.setFontSize(10);
      Array.from(reportData.completedByProject.entries()).forEach(([projectId, count]) => {
        doc.text(`Project ${projectId}: ${count} completed`, 25, y);
        y += 6;
        if (y > 280) { doc.addPage(); y = 20; }
      });
    }
    
    doc.save(`${filename}.pdf`);
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    
    // Summary sheet
    const summaryRows = config.map((field) => {
      const rawValue = field.accessor(reportData);
      const displayValue = field.format ? field.format(rawValue) : rawValue;
      return { Metric: field.label, Value: displayValue };
    });
    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");
    
    // Breakdown sheets
    if (reportData.kind === "loggedTime" && reportData.timeByTask?.size) {
      const taskRows = Array.from(reportData.timeByTask.entries()).map(([taskId, seconds]) => ({
        "Task ID": taskId,
        "Logged Time (hours)": (seconds / 3600).toFixed(2),
      }));
      const wsTask = XLSX.utils.json_to_sheet(taskRows);
      XLSX.utils.book_append_sheet(wb, wsTask, "Task Breakdown");
    }
    
    if (reportData.kind === "teamSummary" && reportData.tasksByCreator.size) {
      const creatorRows = Array.from(reportData.tasksByCreator.entries()).map(([creator, count]) => ({
        Creator: creator,
        "Task Count": count,
      }));
      const wsCreator = XLSX.utils.json_to_sheet(creatorRows);
      XLSX.utils.book_append_sheet(wb, wsCreator, "By Creator");
    }
    
    if (reportData.kind === "taskCompletions" && reportData.completedByProject.size) {
      const projectRows = Array.from(reportData.completedByProject.entries()).map(([projectId, count]) => ({
        "Project ID": projectId,
        Completed: count,
      }));
      const wsProject = XLSX.utils.json_to_sheet(projectRows);
      XLSX.utils.book_append_sheet(wb, wsProject, "By Project");
    }
    
    XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  return (
    <div className="flex gap-2">
      <Button onClick={handleExportPDF} variant="outline" size="sm">
        <FileDown className="w-4 h-4 mr-2" />
        Export PDF
      </Button>
      <Button onClick={handleExportExcel} variant="outline" size="sm">
        <FileSpreadsheet className="w-4 h-4 mr-2" />
        Export Excel
      </Button>
    </div>
  );
}
