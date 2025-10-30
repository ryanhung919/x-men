import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAllUsers, getAllProjects } from '@/lib/db/tasks';
import { createTaskService } from '@/lib/services/tasks';
import { CreateTaskPayload } from '@/lib/types/task-creation';

/**
 * POST /api/tasks - Create a new task
 *
 * Handles multipart form data with the following fields:
 * - taskData: JSON string containing the CreateTaskPayload
 * - files: Optional file attachments (up to 50MB total)
 *
 * Returns the created task ID on success
 */
export async function POST(request: NextRequest) {
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

    // Parse multipart form data
    const formData = await request.formData();
    const taskDataString = formData.get('taskData') as string;

    if (!taskDataString) {
      return NextResponse.json({ error: 'Missing task data' }, { status: 400 });
    }

    let taskPayload: CreateTaskPayload;
    try {
      taskPayload = JSON.parse(taskDataString);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid task data format' }, { status: 400 });
    }

    // Basic validation (defense in depth - service layer also validates)
    const requiredFields = [
      'project_id',
      'title',
      'description',
      'priority_bucket',
      'status',
      'assignee_ids',
      'deadline',
    ];

    for (const field of requiredFields) {
      if (!taskPayload[field as keyof CreateTaskPayload]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Validate priority bucket range
    if (taskPayload.priority_bucket < 1 || taskPayload.priority_bucket > 10) {
      return NextResponse.json(
        { error: 'Priority bucket must be between 1 and 10' },
        { status: 400 }
      );
    }

    // Validate assignee count
    if (!Array.isArray(taskPayload.assignee_ids) || taskPayload.assignee_ids.length === 0) {
      return NextResponse.json(
        { error: 'At least one assignee is required' },
        { status: 400 }
      );
    }

    if (taskPayload.assignee_ids.length > 5) {
      return NextResponse.json(
        { error: 'Maximum 5 assignees allowed' },
        { status: 400 }
      );
    }

    // Extract files from form data
    const files: File[] = [];
    let totalSize = 0;
    const maxTotalSize = 50 * 1024 * 1024; // 50MB in bytes

    for (const [key, value] of formData.entries()) {
      // Check for File-like objects (works with both native File and polyfills)
      const isFile = value instanceof File ||
                     (typeof value === 'object' && value !== null &&
                      'name' in value && 'size' in value && 'type' in value);

      if (key.startsWith('file_') && isFile) {
        files.push(value as File);
        totalSize += (value as File).size;
      }
    }

    // Validate total file size
    if (totalSize > maxTotalSize) {
      return NextResponse.json(
        { error: 'Total file size exceeds 50MB limit' },
        { status: 400 }
      );
    }

    // Create the task via service layer (handles validation and orchestration)
    const taskId = await createTaskService(supabase, taskPayload, user.id, files);

    return NextResponse.json(
      {
        success: true,
        taskId,
        message: 'Task created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create task',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/tasks - Get helper data for task creation
 *
 * Query parameters:
 * - action: 'users' | 'projects'
 *
 * Returns lists of users or projects for dropdown population
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'users': {
        const users = await getAllUsers();
        return NextResponse.json({ users }, { status: 200 });
      }

      case 'projects': {
        const projects = await getAllProjects();
        return NextResponse.json({ projects }, { status: 200 });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action parameter. Use "users" or "projects"' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error fetching data:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch data',
      },
      { status: 500 }
    );
  }
}
