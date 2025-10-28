import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const projectIds = (searchParams.get('projectIds') || '')
    .split(',')
    .filter((v) => v.trim() !== '')
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!projectIds.length) {
    return NextResponse.json([]);
  }

  try {
    // Get all assignees from tasks in the selected projects
    // This respects RLS policies - users can only see staff assigned to tasks they can view
    const { data: taskAssignments, error: assignmentsError } = await supabase
      .from('task_assignments')
      .select(`
        assignee_id,
        tasks!inner(
          project_id,
          is_archived
        )
      `)
      .in('tasks.project_id', projectIds)
      .eq('tasks.is_archived', false);

    if (assignmentsError) {
      console.error('Error fetching task assignments:', assignmentsError);
      return NextResponse.json({ error: 'Failed to fetch staff' }, { status: 500 });
    }

    // Get unique assignee IDs
    const assigneeIds = Array.from(
      new Set((taskAssignments || []).map((ta: any) => ta.assignee_id))
    );

    if (assigneeIds.length === 0) {
      return NextResponse.json([]);
    }

    // Fetch user info for these assignees using the RPC function
    const { data: staffData, error: staffError } = await supabase
      .from('user_info')
      .select('id, first_name, last_name')
      .in('id', assigneeIds)
      .order('first_name', { ascending: true });

    if (staffError) {
      console.error('Error fetching staff info:', staffError);
      return NextResponse.json({ error: 'Failed to fetch staff' }, { status: 500 });
    }

    return NextResponse.json(staffData || []);
  } catch (error) {
    console.error('Error fetching staff:', error);
    return NextResponse.json({ error: 'Failed to fetch staff' }, { status: 500 });
  }
}
