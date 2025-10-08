import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { filterDepartments, filterProjects } from '@/lib/services/filter';
import {
  generateLoggedTimeReport,
  generateTeamSummaryReport,
  generateTaskCompletionReport,
} from '@/lib/services/report';

// Helper to parse comma-separated query params
function parseArrayParam(param?: string | null) {
  return param
    ? param
        .split(',')
        .map((v) => Number(v))
        .filter((n) => Number.isFinite(n))
    : [];
}

function parseDateParam(param?: string | null) {
  if (!param) return undefined;
  const d = new Date(param);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const action = searchParams.get('action') || 'time'; // default to time

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return NextResponse.json([], { status: 200 });

    // Common filters
    const projectIds = parseArrayParam(searchParams.get('projectIds'));
    const startDate = parseDateParam(searchParams.get('startDate'));
    const endDate = parseDateParam(searchParams.get('endDate'));

    switch (action) {
      case 'departments': {
        const deptIds = parseArrayParam(searchParams.get('departmentIds')); // optional narrowing
        const departments = await filterDepartments(
          user.id,
          projectIds.length ? projectIds : undefined
        );
        return NextResponse.json(departments);
      }
      case 'projects': {
        const departmentIds = parseArrayParam(searchParams.get('departmentIds'));
        const projects = await filterProjects(
          user.id,
          departmentIds.length ? departmentIds : undefined
        );
        return NextResponse.json(projects);
      }

      case 'time': {
        const reportData = await generateLoggedTimeReport({ projectIds, startDate, endDate });
        return NextResponse.json(reportData);
      }
      case 'team': {
        const reportData = await generateTeamSummaryReport({ projectIds, startDate, endDate });
        return NextResponse.json(reportData);
      }
      case 'task': {
        const reportData = await generateTaskCompletionReport({ projectIds, startDate, endDate });
        return NextResponse.json(reportData);
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json({ error: 'Server error', details: String(err) }, { status: 500 });
  }
}
