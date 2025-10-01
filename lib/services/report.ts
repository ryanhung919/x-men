import { getTasks } from "@/lib/db/report";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";

interface ReportOptions {
  departmentIds?: number[];
  projectIds?: number[];
  timeRange: "week" | "month" | "quarter";
  type: "metrics" | "analytics" | "export" | "departments";
  format?: "pdf" | "xlsx";
}

interface Task {
  id: number;
  name: string;
  status: "To Do" | "In Progress" | "Done" | string;
  project_id: number;
  project?: { name: string };
  assignee_id?: string;
  assignee?: { username: string };
  creator_id?: string;
  created_at: string;
  deadline?: string;
}


export async function generateReport(opts: ReportOptions) {
  const { departmentIds, projectIds, timeRange, type, format } = opts;

  // Special case: fetch departments
  if (type === "departments") {
    return { departments: await fetchDepartments() };
  }

  const tasks = await getTasks({ departmentIds, projectIds, timeRange });

  // Metrics
  const completedTasks = tasks.filter((t: Task) => t.status === "Done");
  const totalTasks = tasks.length;
  const completionRate = totalTasks ? Math.round((completedTasks.length / totalTasks) * 100) : 0;
  const overdueTasks = tasks.filter((t: Task) => t.deadline && new Date(t.deadline) < new Date() && t.status !== "Done").length;

  const metrics = { completionRate, totalTasks, totalCompleted: completedTasks.length, totalOverdue: overdueTasks };

  // Analytics
  const statusData = ["To Do", "In Progress", "Done"].map((status) => ({
    status,
    count: tasks.filter((t: Task) => t.status === status).length,
  }));

  const projectMap = new Map<number, { name: string; completed: number; total: number }>();
  tasks.forEach((t: Task) => {
    if (!projectMap.has(t.project_id)) projectMap.set(t.project_id, { name: t.project?.name ?? "", completed: 0, total: 0 });
    const p = projectMap.get(t.project_id)!;
    p.total += 1;
    if (t.status === "Done") p.completed += 1;
  });

  const analytics = { statusData, projectData: Array.from(projectMap.values()) };

  if (type === "metrics") return { metrics };
  if (type === "analytics") {
    return { 
      analytics: { statusData, projectData: Array.from(projectMap.values()) },
      tasks, // return raw tasks for charts like TeamSummaryChart
    };
  }

  // Export
  if (type === "export") {
    if (format === "pdf") {
      const doc = new jsPDF();
      doc.text("Task Report", 10, 10);
      doc.text(`Total Tasks: ${totalTasks}`, 10, 20);
      doc.text(`Completed: ${completedTasks.length}`, 10, 30);
      doc.text(`Overdue: ${overdueTasks}`, 10, 40);
      return { buffer: doc.output("arraybuffer"), mime: "application/pdf" };
    } else if (format === "xlsx") {
      const ws = XLSX.utils.json_to_sheet(tasks);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Tasks");
      const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      return { buffer: buf, mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" };
    }
  }

  return {};
}

// Helper: fetch departments
async function fetchDepartments() {
  const supabase = await import("@/lib/supabase/server").then(m => m.createClient());
  const { data, error } = await supabase.from("departments").select("id,name");
  if (error) throw error;
  return data ?? [];
}
