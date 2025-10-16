'use client';

import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { FileDown, FileSpreadsheet } from 'lucide-react';

// --- Type Definitions ---
export type KPI = {
  label: string;
  value: string | number;
  unit?: string;
};

export type ChartData = {
  type: 'bar' | 'pie' | 'line';
  title: string;
  data: Array<{ label: string; value: number }>;
};

export interface LoggedTimeReport {
  kind: 'loggedTime';
  totalTime: number; // Total logged time (hours) across ALL tasks
  avgTime: number; // Average logged time (hours) per COMPLETED task only
  completedTasks: number; // Count of tasks with status='Completed'
  overdueTasks: number; // Count of incomplete tasks (In Progress/Blocked/To Do) past deadline
  blockedTasks: number; // Count of tasks with status='Blocked'
  onTimeCompletionRate: number; // Ratio (0-1) of completed tasks done on-time
  totalDelayHours: number; // Total hours that completed tasks were late
  incompleteTime: number; // Total logged time (hours) for ALL incomplete tasks (In Progress + Blocked + To Do)
  overdueTime: number; // Total logged time (hours) for incomplete tasks that are OVERDUE
  timeByTask?: Map<number, number>;
  kpis: KPI[];
  charts?: ChartData[];
}

export interface TeamSummaryReport {
  kind: 'teamSummary';
  totalTasks: number;
  totalUsers: number;
  weeklyBreakdown: Array<{
    week: string;
    weekStart: string;
    userId: string;
    userName: string;
    todo: number;
    inProgress: number;
    completed: number;
    blocked: number;
    total: number;
  }>;
  userTotals: Map<string, {
    userName: string;
    todo: number;
    inProgress: number;
    completed: number;
    blocked: number;
    total: number;
  }>;
  kpis: KPI[];
  charts?: ChartData[];
}

export interface TaskCompletionReport {
  kind: 'taskCompletions';
  totalTasks: number;
  totalCompleted: number;
  totalInProgress: number;
  totalTodo: number;
  totalBlocked: number;
  overallCompletionRate: number;
  userStats: Array<{
    userId: string;
    userName: string;
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    todoTasks: number;
    blockedTasks: number;
    completionRate: number;
    avgCompletionTime: number;
    onTimeCompletions: number;
    lateCompletions: number;
    onTimeRate: number;
    totalLoggedTime: number;
    avgLoggedTimePerTask: number;
  }>;
  completedByProject: Map<number, number>;
  kpis: KPI[];
  charts?: ChartData[];
}

export type AnyReport = LoggedTimeReport | TeamSummaryReport | TaskCompletionReport;

// --- Get Metric Descriptions ---
function getMetricDescription(key: string, report: AnyReport): string {
  if (report.kind === 'loggedTime') {
    const descriptions: Record<string, string> = {
      totalTime: 'Total logged time (hours) across all tasks (Completed + In Progress + Blocked + To Do + Overdue)',
      avgTime: 'Average logged time (hours) per completed task only',
      completedTasks: "Count of tasks with status='Completed'",
      overdueTasks: 'Count of incomplete tasks (In Progress/Blocked/To Do) that are past their deadline',
      blockedTasks: "Count of tasks with status='Blocked' (waiting on dependencies or external events)",
      onTimeCompletionRate: 'Ratio (0-1) of completed tasks done on-time, where updated_at <= deadline',
      totalDelayHours: 'Total hours that completed tasks were late (sum of hours past deadline for completed tasks)',
      incompleteTime: 'Total logged time (hours) for all incomplete tasks (In Progress + Blocked + To Do), includes both overdue and non-overdue',
      overdueTime: 'Total logged time (hours) for incomplete tasks that are OVERDUE (subset of incompleteTime)',
    };
    return descriptions[key] || '';
  }
  
  if (report.kind === 'teamSummary') {
    const descriptions: Record<string, string> = {
      totalTasks: 'Total number of tasks across all team members in the selected time period',
      totalUsers: 'Number of unique users with assigned tasks in the selected period',
    };
    return descriptions[key] || '';
  }
  
  if (report.kind === 'taskCompletions') {
    const descriptions: Record<string, string> = {
      totalTasks: 'Total number of tasks across all users',
      totalCompleted: 'Number of tasks marked as Completed',
      totalInProgress: 'Number of tasks currently In Progress',
      totalTodo: 'Number of tasks in To Do status',
      totalBlocked: 'Number of tasks that are Blocked',
      overallCompletionRate: 'Percentage of all tasks that have been completed',
    };
    return descriptions[key] || '';
  }
  
  return '';
}

// --- Extract summary rows with descriptions ---
function getSummaryRows(report: AnyReport) {
  const rows: Array<{ label: string; value: string; description?: string }> = [];
  Object.entries(report).forEach(([key, value]) => {
    if (
      key === 'kind' ||
      key === 'kpis' ||
      key === 'charts' ||
      value instanceof Map ||
      typeof value === 'function'
    )
      return;

    rows.push({
      label: toLabel(key),
      value:
        typeof value === 'number' && (key.includes('Rate') || key.includes('Completion'))
          ? `${(value * 100).toFixed(1)}%`
          : String(value),
      description: getMetricDescription(key, report),
    });
  });
  return rows;
}

// --- Extract breakdowns ---
function getBreakdowns(
  report: AnyReport
): Array<{ title: string; data: Array<Record<string, any>> }> {
  const breakdowns: Array<{ title: string; data: Array<Record<string, any>> }> = [];
  
  if (report.kind === 'loggedTime') {
    Object.entries(report).forEach(([key, value]) => {
      if (!(value instanceof Map) || value.size === 0) return;
      breakdowns.push({
        title: toLabel(key),
        data: Array.from(value.entries()).map(([k, v]) => ({
          [toLabel(key.replace(/By|Per/i, ''))]: k,
          Hours: typeof v === 'number' ? (v / 3600).toFixed(2) : v,
        })),
      });
    });
  }
  
  if (report.kind === 'teamSummary') {
    // Weekly breakdown
    if (report.weeklyBreakdown && report.weeklyBreakdown.length > 0) {
      breakdowns.push({
        title: 'Weekly Task Breakdown by User',
        data: report.weeklyBreakdown.map(w => ({
          Week: w.week,
          'Week Start': new Date(w.weekStart).toLocaleDateString(),
          User: w.userName,
          'To Do': w.todo,
          'In Progress': w.inProgress,
          Completed: w.completed,
          Blocked: w.blocked,
          Total: w.total,
        })),
      });
    }
    
    // User totals
    if (report.userTotals && report.userTotals.size > 0) {
      breakdowns.push({
        title: 'User Task Totals',
        data: Array.from(report.userTotals.entries()).map(([userId, data]) => ({
          User: data.userName,
          'To Do': data.todo,
          'In Progress': data.inProgress,
          Completed: data.completed,
          Blocked: data.blocked,
          Total: data.total,
          'Completion Rate': `${((data.completed / data.total) * 100).toFixed(1)}%`,
        })),
      });
    }
  }
  
  if (report.kind === 'taskCompletions') {
    // User stats breakdown
    if (report.userStats && report.userStats.length > 0) {
      breakdowns.push({
        title: 'User Task Completion Statistics',
        data: report.userStats.map(u => ({
          User: u.userName,
          'Total Tasks': u.totalTasks,
          Completed: u.completedTasks,
          'In Progress': u.inProgressTasks,
          'To Do': u.todoTasks,
          Blocked: u.blockedTasks,
          'Completion Rate': `${(u.completionRate * 100).toFixed(1)}%`,
          'Avg Completion Time (hrs)': u.avgCompletionTime.toFixed(1),
          'On-Time': u.onTimeCompletions,
          Late: u.lateCompletions,
          'On-Time Rate': `${(u.onTimeRate * 100).toFixed(1)}%`,
          'Total Logged Time (hrs)': u.totalLoggedTime.toFixed(1),
          'Avg Time/Task (hrs)': u.avgLoggedTimePerTask.toFixed(1),
        })),
      });
    }
    
    // Completed by project
    if (report.completedByProject && report.completedByProject.size > 0) {
      breakdowns.push({
        title: 'Completed Tasks by Project',
        data: Array.from(report.completedByProject.entries()).map(([projectId, count]) => ({
          'Project ID': projectId,
          'Completed Tasks': count,
        })),
      });
    }
  }
  
  return breakdowns;
}

function renderChartInPDF(
  doc: jsPDF,
  chart: ChartData,
  x: number,
  y: number,
  maxWidth: number
): number {
  const chartHeight = 140;
  const barWidth = 50;
  const maxValue = Math.max(...chart.data.map((d) => d.value), 1);

  // Chart colors (slate/blue palette)
  const colors = [
    [100, 149, 237], // Cornflower blue
    [72, 118, 255], // Royal blue
    [220, 53, 69], // Red (destructive)
    [255, 193, 7], // Amber
    [40, 167, 69], // Green
  ];

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(chart.title, x, y);
  y += 20;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  if (chart.type === 'bar') {
    // Bar chart
    chart.data.forEach((item, idx) => {
      const barHeight = (item.value / maxValue) * 80;
      const barX = x + idx * (barWidth + 15);
      const color = colors[idx % colors.length];

      // Bar
      doc.setFillColor(color[0], color[1], color[2]);
      doc.rect(barX, y + 80 - barHeight, barWidth, barHeight, 'F');

      // Label
      doc.text(item.label.substring(0, 10), barX + barWidth / 2, y + 95, { align: 'center' });

      // Value
      doc.text(String(item.value), barX + barWidth / 2, y + 75 - barHeight, { align: 'center' });
    });
    return y + chartHeight;
  } else if (chart.type === 'pie') {
    // Pie chart as segments with legend
    const total = chart.data.reduce((sum, d) => sum + d.value, 0);

    // Draw pie segments
    const centerX = x + 60;
    const centerY = y + 50;
    const radius = 40;
    let startAngle = -90;

    chart.data.forEach((item, idx) => {
      const sliceAngle = (item.value / total) * 360;
      const endAngle = startAngle + sliceAngle;
      const color = colors[idx % colors.length];

      // Draw pie slice
      doc.setFillColor(color[0], color[1], color[2]);

      // Calculate arc points
      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;

      // Move to center
      const path: [number, number][] = [[centerX, centerY]];

      // Create arc
      const steps = 20;
      for (let i = 0; i <= steps; i++) {
        const angle = startRad + (endRad - startRad) * (i / steps);
        path.push([centerX + radius * Math.cos(angle), centerY + radius * Math.sin(angle)]);
      }

      // Draw filled triangle fan
      doc.triangle(path[0][0], path[0][1], path[1][0], path[1][1], path[2][0], path[2][1], 'F');
      for (let i = 2; i < path.length - 1; i++) {
        doc.triangle(
          path[0][0],
          path[0][1],
          path[i][0],
          path[i][1],
          path[i + 1][0],
          path[i + 1][1],
          'F'
        );
      }

      startAngle = endAngle;
    });

    // Draw legend
    const legendX = x + 130;
    let legendY = y + 10;

    chart.data.forEach((item, idx) => {
      const color = colors[idx % colors.length];
      const percentage = ((item.value / total) * 100).toFixed(1);

      // Color box
      doc.setFillColor(color[0], color[1], color[2]);
      doc.rect(legendX, legendY, 10, 10, 'F');

      // Label and percentage
      doc.setFontSize(9);
      doc.text(`${item.label}: ${item.value} (${percentage}%)`, legendX + 15, legendY + 8);
      legendY += 16;
    });

    return y + Math.max(100, legendY - y + 20);
  }

  return y + chartHeight;
}

// --- Component ---
interface ExportButtonsProps {
  reportData: AnyReport;
  reportTitle?: string;
  subTitle?: string;
}

export function ExportButtons({ reportData, reportTitle, subTitle }: ExportButtonsProps) {
  const title = reportTitle || `${capitalize(reportData.kind)} Report`;
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `${title.replace(/\s+/g, '_')}_${timestamp}`;
  const kpis = reportData.kpis || [];
  const charts = reportData.charts || [];
  const summaryRows = getSummaryRows(reportData);
  const breakdowns = getBreakdowns(reportData);

  // --- PDF Export with APA formatting ---
  const handleExportPDF = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const page = { w: doc.internal.pageSize.getWidth(), h: doc.internal.pageSize.getHeight() };
    const margin = 72; // 1-inch margins (APA standard)

    // Title Page (APA style)
    doc.setFont('times', 'bold');
    doc.setFontSize(16);
    doc.text(title, page.w / 2, page.h / 2 - 40, { align: 'center' });

    doc.setFont('times', 'normal');
    doc.setFontSize(12);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, page.w / 2, page.h / 2, {
      align: 'center',
    });

    if (subTitle) {
      doc.text(String(subTitle), page.w / 2, page.h / 2 + 20, { align: 'center' });
    }

    doc.addPage();
    let y = margin;

    // Level 1 Heading: Executive Summary
    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.text('Executive Summary', margin, y);
    y += 24;

    // KPI Table (2 columns)
    doc.setFont('times', 'normal');
    doc.setFontSize(11);
    const colWidth = (page.w - 2 * margin) / 2 - 10;

    kpis.forEach((kpi, i) => {
      const column = i % 2;
      const row = Math.floor(i / 2);
      const x = margin + column * (colWidth + 20);
      const ty = y + row * 30;

      if (ty > page.h - margin - 30) {
        doc.addPage();
        y = margin;
        return;
      }

      // KPI label (bold)
      doc.setFont('times', 'bold');
      doc.text(`${kpi.label}:`, x, ty);

      // KPI value (normal)
      doc.setFont('times', 'normal');
      const val = `${kpi.value}${kpi.unit ? ` ${kpi.unit}` : ''}`;
      doc.text(val, x, ty + 14);
    });

    const rows = Math.ceil(kpis.length / 2);
    y += rows * 30 + 30;

    // Level 1 Heading: Visualizations
    if (charts.length > 0) {
      if (y > page.h - margin - 200) {
        doc.addPage();
        y = margin;
      }

      doc.setFont('times', 'bold');
      doc.setFontSize(14);
      doc.text('Visualizations', margin, y);
      y += 24;

      charts.forEach((chart) => {
        if (y > page.h - margin - 180) {
          doc.addPage();
          y = margin;
        }

        // Level 2 Heading: Chart title
        doc.setFont('times', 'bold');
        doc.setFontSize(12);
        doc.text(chart.title, margin, y);
        y += 20;

        y = renderChartInPDF(doc, chart, margin, y, page.w - 2 * margin);
        y += 30;
      });
    }

    // Level 1 Heading: Detailed Metrics
    if (y > page.h - margin - 150) {
      doc.addPage();
      y = margin;
    }

    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.text('Detailed Metrics', margin, y);
    y += 24;

    doc.setFont('times', 'normal');
    doc.setFontSize(11);

    summaryRows.forEach((row) => {
      if (y > page.h - margin - 60) {
        doc.addPage();
        y = margin;
      }

      // Metric label (italic)
      doc.setFont('times', 'italic');
      doc.text(`${row.label}:`, margin, y);

      // Value (normal)
      doc.setFont('times', 'normal');
      doc.text(row.value, margin + 200, y);
      y += 16;

      // Description (smaller, indented)
      if (row.description) {
        doc.setFontSize(10);
        doc.setTextColor(60);
        const descLines = doc.splitTextToSize(row.description, page.w - 2 * margin - 20);
        doc.text(descLines, margin + 20, y);
        y += descLines.length * 12 + 8;
        doc.setFontSize(11);
        doc.setTextColor(0);
      }
    });

    // Level 1 Heading: Data Breakdowns
    breakdowns.forEach((breakdown) => {
      if (y > page.h - margin - 100) {
        doc.addPage();
        y = margin;
      }

      doc.setFont('times', 'bold');
      doc.setFontSize(14);
      doc.text(breakdown.title, margin, y);
      y += 20;

      doc.setFont('times', 'normal');
      doc.setFontSize(10);

      // Table header
      doc.setFont('times', 'bold');
      const headers = Object.keys(breakdown.data[0] || {});
      headers.forEach((header, idx) => {
        doc.text(header, margin + 20 + idx * 150, y);
      });
      y += 16;
      doc.setFont('times', 'normal');

      breakdown.data.slice(0, 30).forEach((item) => {
        if (y > page.h - margin - 30) {
          doc.addPage();
          y = margin;
        }

        Object.values(item).forEach((val, idx) => {
          doc.text(String(val), margin + 20 + idx * 150, y);
        });
        y += 14;
      });

      if (breakdown.data.length > 30) {
        doc.setFont('times', 'italic');
        doc.text(`... and ${breakdown.data.length - 30} more entries`, margin + 20, y);
        y += 16;
        doc.setFont('times', 'normal');
      }
      y += 20;
    });

    doc.save(`${filename}.pdf`);
  };

  // --- Excel Export with all data ---
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Summary KPIs
    const kpiData = kpis.map((k) => ({
      Metric: k.label,
      Value: k.value,
      Unit: k.unit || '',
    }));
    const wsKPI = XLSX.utils.json_to_sheet(kpiData);
    XLSX.utils.book_append_sheet(wb, wsKPI, 'Summary');

    // Sheet 2: Detailed Metrics with Descriptions
    const detailedData = summaryRows.map((r) => ({
      Metric: r.label,
      Value: r.value,
      Description: r.description || '',
    }));
    const wsDetailed = XLSX.utils.json_to_sheet(detailedData);
    XLSX.utils.book_append_sheet(wb, wsDetailed, 'Detailed Metrics');

    // Sheets 3+: Chart Data (one sheet per chart)
    charts.forEach((chart, idx) => {
      const chartData = chart.data.map((item) => ({
        Category: item.label,
        Value: item.value,
      }));
      const wsChart = XLSX.utils.json_to_sheet(chartData);

      // Sanitize sheet name (max 31 chars, no special chars)
      let sheetName = chart.title.replace(/[:\\/?*\[\]]/g, '').substring(0, 31);
      if (!sheetName) sheetName = `Chart ${idx + 1}`;

      XLSX.utils.book_append_sheet(wb, wsChart, sheetName);
    });

    // Additional Sheets: Breakdowns (e.g., Time by Task)
    breakdowns.forEach((breakdown, idx) => {
      const wsBreakdown = XLSX.utils.json_to_sheet(breakdown.data);

      let sheetName = breakdown.title.replace(/[:\\/?*\[\]]/g, '').substring(0, 31);
      if (!sheetName) sheetName = `Breakdown ${idx + 1}`;

      XLSX.utils.book_append_sheet(wb, wsBreakdown, sheetName);
    });

    XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  return (
    <div className="flex gap-2">
      <Button onClick={handleExportPDF} variant="outline" size="sm">
        <FileDown className="mr-2 h-4 w-4" />
        Export PDF
      </Button>
      <Button onClick={handleExportExcel} variant="outline" size="sm">
        <FileSpreadsheet className="mr-2 h-4 w-4" />
        Export Excel
      </Button>
    </div>
  );
}

// --- Helpers ---
function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function toLabel(fieldName: string): string {
  return fieldName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}