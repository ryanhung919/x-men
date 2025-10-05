import { NextRequest, NextResponse } from "next/server";
import { generateReport, exportReport, ReportType } from "@/lib/services/report";
import { filterDepartments, filterProjects } from "@/lib/services/filter";
import { createClient } from "@/lib/supabase/server";

// Helper to parse comma-separated query params
function parseArrayParam(param?: string) {
  return param ? param.split(",").map(Number).filter(Boolean) : [];
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const action = searchParams.get("action");

  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) return NextResponse.json([], { status: 200 });

    switch (action) {
      // --- Get departments for dropdown ---
      case "departments": {
        const projectIds = parseArrayParam(searchParams.get("projectIds") || "");
        const departments = await filterDepartments(
          user.id,
          projectIds.length ? projectIds : undefined
        );
        return NextResponse.json(departments);
      }

      // --- Get projects for dropdown ---
      case "projects": {
        const departmentIds = parseArrayParam(searchParams.get("departmentIds") || "");
        const projects = await filterProjects(
          user.id,
          departmentIds.length ? departmentIds : undefined
        );
        return NextResponse.json(projects);
      }

      // --- Generate report ---
      case "report": 
        case "time": {
          const projectIds = parseArrayParam(searchParams.get("projectIds") || "");
          const startDateStr = searchParams.get("startDate");
          const endDateStr = searchParams.get("endDate");
          const format = (searchParams.get("format") as "pdf" | "xlsx") || undefined;
          const type = (searchParams.get("type") as ReportType) || "loggedTime";

          const startDate = startDateStr ? new Date(startDateStr) : undefined;
          const endDate = endDateStr ? new Date(endDateStr) : undefined;

          const reportData = await generateReport({ projectIds, startDate, endDate, type });

          if (format) {
            const file = await exportReport(reportData, { projectIds, startDate, endDate, type, format });
            return new Response(file.buffer, { headers: { "Content-Type": file.mime } });
          }

          return NextResponse.json(reportData);
        }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json({ error: "Server error", details: String(err) }, { status: 500 });
  }
}
