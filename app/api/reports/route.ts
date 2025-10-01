import { NextRequest, NextResponse } from "next/server";
import { generateReport } from "@/lib/services/report";

// Helper to parse comma-separated query params
function parseArrayParam(param?: string) {
  return param ? param.split(",").map(Number).filter(Boolean) : [];
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const action = searchParams.get("action");

  try {
    switch (action) {
      // Fetch all departments
      case "departments": {
        const report = await generateReport({ type: "departments", timeRange: "month" });
        return NextResponse.json(report.departments ?? []);
      }

      // Fetch projects under selected departments
      case "projects": {
        const deptParam = searchParams.get("departmentIds") || "";
        const departmentIds = parseArrayParam(deptParam);
        if (!departmentIds.length) return NextResponse.json([]);

        const report = await generateReport({ departmentIds, type: "analytics", timeRange: "month" });
        const tasks = report.tasks ?? [];
        const projectMap = new Map<number, string>();
        tasks.forEach((t: any) => {
          if (t.project_id && !projectMap.has(t.project_id)) {
            projectMap.set(t.project_id, t.project?.name ?? "");
          }
        });

        return NextResponse.json(Array.from(projectMap, ([id, name]) => ({ id, name })));
      }

      // Fetch metrics report
      case "metrics": {
        const deptIds = parseArrayParam(searchParams.get("departmentIds") || "");
        const projIds = parseArrayParam(searchParams.get("projectIds") || "");
        const timeRange = (searchParams.get("timeRange") as "week" | "month" | "quarter") || "month";

        const report = await generateReport({ departmentIds: deptIds, projectIds: projIds, timeRange, type: "metrics" });
        return NextResponse.json(report);
      }

      // Fetch analytics report
      case "analytics": {
        const deptIds = parseArrayParam(searchParams.get("departmentIds") || "");
        const projIds = parseArrayParam(searchParams.get("projectIds") || "");
        const timeRange = (searchParams.get("timeRange") as "week" | "month" | "quarter") || "month";

        const report = await generateReport({ departmentIds: deptIds, projectIds: projIds, timeRange, type: "analytics" });
        return NextResponse.json(report);
      }

      // Export report (PDF/XLSX)
      case "export": {
        const deptIds = parseArrayParam(searchParams.get("departmentIds") || "");
        const projIds = parseArrayParam(searchParams.get("projectIds") || "");
        const timeRange = (searchParams.get("timeRange") as "week" | "month" | "quarter") || "month";
        const format = (searchParams.get("format") as "pdf" | "xlsx") || "pdf";

        const report = await generateReport({ departmentIds: deptIds, projectIds: projIds, timeRange, type: "export", format });
        return NextResponse.json(report); // frontend will handle buffer -> Blob
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
