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
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can access reports
    if (['time', 'team', 'task'].includes(action)) {
      const { data: roleRows, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (roleError) {
        console.error('Error checking user roles:', roleError);
        return NextResponse.json({ error: 'Failed to verify permissions' }, { status: 500 });
      }

      const roles = roleRows?.map((r: { role: string }) => r.role) || [];
      const isAdmin = roles.includes('admin');

      if (!isAdmin) {
        return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
    }

    // Common filters
    const departmentIds = parseArrayParam(searchParams.get('departmentIds'));
    const projectIds = parseArrayParam(searchParams.get('projectIds'));
    const startDate = parseDateParam(searchParams.get('startDate'));
    const endDate = parseDateParam(searchParams.get('endDate'));

    switch (action) {
      case 'departments': {
        // Return departments user can see, optionally filtered by projects
        try {
          const departments = await filterDepartments(
            user.id,
            projectIds.length ? projectIds : undefined
          );
          return NextResponse.json(departments);
        } catch (err) {
          console.error('Error fetching departments:', err);
          throw err;
        }
      }

      case 'projects': {
        // Return projects user can see, optionally filtered by departments
        const projects = await filterProjects(
          user.id,
          departmentIds.length ? departmentIds : undefined
        );
        return NextResponse.json(projects);
      }

      case 'time': {
        // Generate logged time report with filters
        const reportData = await generateLoggedTimeReport({
          projectIds: projectIds.length ? projectIds : undefined,
          startDate,
          endDate,
        });
        
        // Convert Map to object for JSON serialization
        return NextResponse.json({
          kind: reportData.kind,
          totalTime: reportData.totalTime,
          avgTime: reportData.avgTime,
          completedTasks: reportData.completedTasks,
          overdueTasks: reportData.overdueTasks,
          blockedTasks: reportData.blockedTasks,
          incompleteTime: reportData.incompleteTime,
          onTimeCompletionRate: reportData.onTimeCompletionRate,
          totalDelayHours: reportData.totalDelayHours,
          overdueTime: reportData.overdueTime,
          timeByTask: Object.fromEntries(reportData.timeByTask),
        });
      }

      case 'team': {
        // Generate team summary report with filters
        const reportData = await generateTeamSummaryReport({
          projectIds: projectIds.length ? projectIds : undefined,
          startDate,
          endDate,
        });
        
        // Convert Maps to objects for JSON serialization
        return NextResponse.json({
          kind: reportData.kind,
          totalTasks: reportData.totalTasks,
          totalUsers: reportData.totalUsers,
          weeklyBreakdown: reportData.weeklyBreakdown,
          userTotals: Object.fromEntries(reportData.userTotals),
          weekTotals: Object.fromEntries(reportData.weekTotals),
        });
      }

      case 'task': {
        // Generate task completion report with filters
        const reportData = await generateTaskCompletionReport({
          projectIds: projectIds.length ? projectIds : undefined,
          startDate,
          endDate,
        });
        
        // Convert Map to object for JSON serialization
        return NextResponse.json({
          ...reportData,
          completedByProject: Object.fromEntries(reportData.completedByProject),
        });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (err) {
    console.error('Report API error:', err);
    return NextResponse.json(
      { 
        error: 'Server error', 
        details: err instanceof Error ? err.message : String(err) 
      }, 
      { status: 500 }
    );
  }
}