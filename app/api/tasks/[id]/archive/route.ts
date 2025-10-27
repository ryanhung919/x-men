import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { archiveTask } from '@/lib/db/tasks';
import { getRolesForUserClient } from '@/lib/db/roles';

/**
 * PATCH /api/tasks/[id]/archive - Archive or unarchive a task
 *
 * Request body:
 * - is_archived: boolean - True to archive, false to restore
 *
 * Authorization:
 * - Only managers can archive/unarchive tasks
 *
 * Returns:
 * - success: boolean
 * - taskId: number
 * - affectedCount: number - Total number of tasks affected (parent + subtasks)
 * - message: string
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a manager
    const roles = await getRolesForUserClient(supabase, user.id);
    if (!roles.includes('manager')) {
      return NextResponse.json(
        { error: 'Only managers can archive tasks' },
        { status: 403 }
      );
    }

    // Parse task ID from params - handle both Promise and non-Promise
    const resolvedParams = context.params instanceof Promise
      ? await context.params
      : context.params;
    const { id } = resolvedParams;
    const taskId = parseInt(id, 10);

    if (isNaN(taskId)) {
      return NextResponse.json(
        { error: 'Invalid task ID' },
        { status: 400 }
      );
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { is_archived } = body;

    if (typeof is_archived !== 'boolean') {
      return NextResponse.json(
        { error: 'is_archived must be a boolean' },
        { status: 400 }
      );
    }

    // Archive or unarchive the task
    const affectedCount = await archiveTask(taskId, is_archived);

    return NextResponse.json(
      {
        success: true,
        taskId,
        affectedCount,
        message: is_archived
          ? `Task and ${affectedCount - 1} subtask(s) archived successfully`
          : `Task and ${affectedCount - 1} subtask(s) restored successfully`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error archiving task:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to archive task',
      },
      { status: 500 }
    );
  }
}
