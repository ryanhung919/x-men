import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getScheduleTasks } from '@/lib/db/tasks';

function parseArray(param?: string | null): number[] {
  return param
    ? param
        .split(',')
        .map((v) => Number(v))
        .filter((n) => Number.isFinite(n))
    : [];
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const projectIds = parseArray(searchParams.get('projectIds'));
  const staffIds = (searchParams.get('staffIds') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const tasks = await getScheduleTasks(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      projectIds.length ? projectIds : undefined,
      staffIds.length ? staffIds : undefined
    );

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Error fetching schedule:', error);
    return NextResponse.json(
      { error: 'Failed to fetch schedule data' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { taskId, deadline } = body || {};
  
  if (!taskId || !deadline) {
    return NextResponse.json({ error: 'Missing taskId or deadline' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { error: updateError } = await supabase
      .from('tasks')
      .update({ deadline: new Date(deadline).toISOString() })
      .eq('id', Number(taskId));

    if (updateError) {
      console.error('Error updating task deadline:', updateError);
      return NextResponse.json({ error: 'Failed to update deadline' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error updating deadline:', error);
    return NextResponse.json({ error: 'Failed to update deadline' }, { status: 500 });
  }
}
