import { createClient } from '@/lib/supabase/server';
import { RawTask, RawSubtask, RawAttachment, RawAssignee, RawComment } from '../services/tasks';
import { CreateTaskPayload } from '../types/task-creation';
import { SupabaseClient } from '@supabase/supabase-js';
import { createClient as createServiceClient } from '@supabase/supabase-js';

/**
 * Fetches all non-archived tasks for a specific user along with related data.
 *
 * This function retrieves:
 * - All tasks where the user is involved (creator or assignee)
 * - Subtasks for those tasks
 * - Attachments associated with the tasks
 * - User information for all assignees
 *
 * @param userId - The unique identifier of the user whose tasks to fetch
 * @returns An object containing:
 *   - tasks: Array of RawTask objects with all task data including project, tags, and assignments
 *   - subtasks: Array of RawSubtask objects representing child tasks
 *   - attachments: Array of RawAttachment objects with storage paths
 *   - assignees: Array of RawAssignee objects with user info (id, first_name, last_name)
 *
 * @throws {Error} If there's a database error during fetching
 *
 * @example
 * const tasksData = await getUserTasks('user-123');
 * console.log(`Found ${tasksData.tasks.length} tasks`);
 */
export async function getUserTasks(userId: string) {
  const supabase = await createClient();

  // Fetch tasks
  let query = supabase
    .from('tasks')
    .select(
      `
      id,
      title,
      description,
      priority_bucket,
      status,
      deadline,
      notes,
      project:projects(id, name),
      parent_task_id,
      recurrence_interval,
      recurrence_date,
      task_assignments(assignee_id),
      tags:task_tags(tags(name))
    `
    )
    .neq('is_archived', true);

  const { data: tasksData, error: tasksError } = await query.order('deadline', { ascending: true });
  if (tasksError) throw new Error(tasksError.message);

  // Fetch subtasks
  const taskIds = tasksData.map((task: any) => task.id);
  const { data: subtasksData, error: subtasksError } = await supabase
    .from('tasks')
    .select('id, title, status, deadline, parent_task_id')
    .in('parent_task_id', taskIds)
    .neq('is_archived', true);

  if (subtasksError) throw new Error(subtasksError.message);

  // Fetch attachments
  const { data: attachmentsData, error: attachmentsError } = await supabase
    .from('task_attachments')
    .select('id, storage_path, task_id')
    .in('task_id', taskIds);

  if (attachmentsError) throw new Error(attachmentsError.message);

  // Fetch user info for assignees
  let userInfoData: { id: string; first_name: string; last_name: string }[] = [];
  if (taskIds.length > 0) {
    const { data: userInfo, error: userInfoError } = await supabase.rpc('get_task_assignees_info', {
      task_ids: taskIds,
    });

    if (userInfoError) throw new Error(userInfoError.message);
    userInfoData = (userInfo ?? []) as { id: string; first_name: string; last_name: string }[];
  }

  // Transform tasks data to match RawTask type (project should be object, not array)
  const transformedTasks = tasksData.map((task: any) => ({
    ...task,
    project: Array.isArray(task.project) ? task.project[0] : task.project,
  }));

  return {
    tasks: transformedTasks as RawTask[],
    subtasks: subtasksData,
    attachments: attachmentsData,
    assignees: userInfoData,
  };
}

/**
 * Fetches detailed information for a specific task by its ID.
 *
 * This function retrieves comprehensive task details including:
 * - The main task data with project information, tags, and assignments
 * - All subtasks (child tasks)
 * - Attachments with generated public URLs for access
 * - Comments made on the task with user information
 * - User information for all assignees and commenters
 *
 * @param taskId - The unique numeric identifier of the task to fetch
 * @returns An object containing the task details, or null if:
 *   - The task doesn't exist
 *   - The task is archived
 *   - There was an error fetching the task
 *
 * The returned object includes:
 *   - task: RawTask object with all task properties, or null if not found
 *   - subtasks: Array of RawSubtask objects
 *   - attachments: Array with id, storage_path, and public_url for each attachment
 *   - comments: Array of RawComment objects
 *   - assignees: Array of RawAssignee objects with user info
 *
 * @example
 * const taskDetails = await getTaskById(42);
 * if (taskDetails?.task) {
 *   console.log(`Task: ${taskDetails.task.title}`);
 *   console.log(`Subtasks: ${taskDetails.subtasks.length}`);
 * }
 */
export async function getTaskById(taskId: number): Promise<{
  task: RawTask | null;
  subtasks: RawSubtask[];
  attachments: { id: number; storage_path: string; public_url?: string }[];
  comments: RawComment[];
  assignees: RawAssignee[];
} | null> {
  const supabase = await createClient();

  const { data: taskData, error: taskError } = await supabase
    .from('tasks')
    .select(
      `
      id,
      title,
      description,
      priority_bucket,
      status,
      deadline,
      notes,
      project:projects(id, name),
      parent_task_id,
      recurrence_interval,
      recurrence_date,
      task_assignments(assignee_id),
      tags:task_tags(tags(name))
      `
    )
    .eq('id', taskId)
    .neq('is_archived', true)
    .single() as { data: RawTask | null; error: any };

  if (taskError || !taskData) {
    console.error('Error fetching task details:', taskError);
    return null;
  }

  // Transform task data to match RawTask type (project should be object, not array)
  const transformedTask: any = {
    ...taskData,
    project: Array.isArray(taskData.project) ? taskData.project[0] : taskData.project,
  };

  const { data: subtasksData, error: subtasksError } = await supabase
    .from('tasks')
    .select('id, title, status, deadline, parent_task_id')
    .eq('parent_task_id', taskId)
    .neq('is_archived', true) as { data: RawSubtask[] | null; error: any };

  if (subtasksError) {
    console.error('Error fetching subtasks:', subtasksError);
  }

  const { data: attachmentsData, error: attachmentsError } = await supabase
    .from('task_attachments')
    .select('id, storage_path')
    .eq('task_id', taskId) as { data: RawAttachment[] | null; error: any };

  let attachments: { id: number; storage_path: string; public_url?: string }[] = [];
  if (attachmentsError) {
    console.error('Error fetching attachments:', attachmentsError);
  } else if (attachmentsData?.length) {
    attachments = attachmentsData.map((attachment) => {
  const { data } = supabase.storage
    .from('task-attachments')
    .getPublicUrl(attachment.storage_path);
      return {
        id: attachment.id,
        storage_path: attachment.storage_path,
        public_url: data?.publicUrl,
      };
    });
  }

  const { data: commentsData, error: commentsError } = await supabase
    .from('task_comments')
    .select('id, content, created_at, user_id')
    .eq('task_id', taskId)
    .neq('is_archived', true) as { data: RawComment[] | null; error: any };

  if (commentsError) {
    console.error('Error fetching comments:', commentsError);
  }

  let userInfoData: RawAssignee[] = [];
  const userIds = [
    ...new Set([
      ...transformedTask.task_assignments.map((a: any) => a.assignee_id),
      ...(commentsData || []).map((c) => c.user_id),
    ]),
  ];

  if (userIds.length > 0) {
    const { data: assigneeInfoData, error: assigneeInfoError } = await supabase.rpc(
      'get_task_assignees_info',
      { task_ids: [taskId] }
    ) as { data: RawAssignee[] | null; error: any };

    if (assigneeInfoError) {
      console.error('Error fetching assignee user info:', assigneeInfoError);
    } else if (assigneeInfoData) {
      userInfoData = assigneeInfoData;
    }

    const missingUserIds = userIds.filter((id) => !userInfoData.some((user) => user.id === id));
    if (missingUserIds.length > 0) {
      const { data: additionalUserInfo, error: userInfoError } = await supabase
        .from('user_info')
        .select('id, first_name, last_name')
        .in('id', missingUserIds) as { data: RawAssignee[] | null; error: any };

      if (userInfoError) {
        console.error('Error fetching additional user info:', userInfoError);
      } else if (additionalUserInfo) {
        userInfoData = [...userInfoData, ...additionalUserInfo];
      }
    }
  }

  return {
    task: transformedTask as RawTask,
    subtasks: subtasksData ?? [],
    attachments,
    comments: commentsData ?? [],
    assignees: userInfoData,
  };
}

/**
 * Creates a new task with all related data (assignments, tags, attachments).
 *
 * This function performs the following operations:
 * 1. Creates the main task record AND task assignments in a single transaction
 *    using the `create_task_with_assignments` stored procedure
 * 2. Creates or links tags to the task
 * 3. Uploads and links file attachments
 *
 * The stored procedure ensures the DEFERRABLE trigger `trg_validate_task_assignee_count`
 * waits for both the task and assignments to be inserted before validating.
 *
 * The database trigger `update_project_departments` will automatically link
 * the task's project to the departments of the assignees.
 *
 * NOTE: Only the users specified in assignee_ids will be assigned to the task.
 * The creator is NOT automatically added as an assignee.
 *
 * @param supabase - Authenticated Supabase client with user context (not currently used)
 * @param payload - The task creation payload with all task details
 * @param creatorId - The UUID of the user creating the task
 * @param attachmentFiles - Optional array of files to attach to the task
 * @returns The ID of the newly created task
 * @throws {Error} If there's a database error or validation failure
 *
 * @example
 * const supabase = await createClient();
 * const taskId = await createTask(supabase, {
 *   project_id: 1,
 *   title: "New Feature",
 *   description: "Implement feature X",
 *   priority_bucket: 6,
 *   status: "To Do",
 *   assignee_ids: ["user-123", "user-456"],
 *   deadline: "2025-12-31T23:59:59Z",
 *   tags: ["frontend", "urgent"]
 * }, "creator-user-id");
 */
export async function createTask(
  supabase: SupabaseClient,
  payload: CreateTaskPayload,
  creatorId: string,
  attachmentFiles?: File[]
): Promise<number> {

  // Use service role client to bypass RLS for task creation
  // Regular user client can't SELECT the task back because task_assignments don't exist yet
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Prepare assignments (use only the selected assignees)
  const uniqueAssigneeIds = Array.from(new Set(payload.assignee_ids));

  // Validate assignee count (1-5)
  if (uniqueAssigneeIds.length > 5) {
    throw new Error('Cannot assign more than 5 users to a task');
  }

  // 1. Create the task and assignments in a single transaction using stored procedure
  // This ensures the DEFERRABLE trigger waits for both inserts before validating
  const { data: taskId, error: taskError } = await serviceClient.rpc(
    'create_task_with_assignments',
    {
      p_title: payload.title,
      p_description: payload.description,
      p_priority_bucket: payload.priority_bucket,
      p_status: payload.status,
      p_deadline: payload.deadline,
      p_notes: payload.notes ?? null,
      p_project_id: payload.project_id,
      p_creator_id: creatorId,
      p_recurrence_interval: payload.recurrence_interval ?? 0,
      p_recurrence_date: payload.recurrence_date ?? null,
      p_assignee_ids: uniqueAssigneeIds,
    }
  );

  if (taskError || !taskId) {
    throw new Error(`Failed to create task: ${taskError?.message || 'Unknown error'}`);
  }

  // 2. Handle tags (use service client)
  if (payload.tags && payload.tags.length > 0) {
    // Insert tags if they don't exist and get their IDs
    for (const tagName of payload.tags) {
      // Try to insert the tag (will be ignored if it exists due to UNIQUE constraint)
      await serviceClient.from('tags').insert({ name: tagName }).select();
    }

    // Get all tag IDs
    const { data: tagData, error: tagFetchError } = await serviceClient
      .from('tags')
      .select('id, name')
      .in('name', payload.tags);

    if (tagFetchError) {
      console.error('Error fetching tags:', tagFetchError);
    } else if (tagData) {
      // Link tags to task
      const taskTags = tagData.map((tag) => ({
        task_id: taskId,
        tag_id: tag.id,
      }));

      const { error: taskTagError} = await serviceClient
        .from('task_tags')
        .insert(taskTags);

      if (taskTagError) {
        console.error('Error linking tags to task:', taskTagError);
      }
    }
  }

  // 3. Handle file attachments (storage uses service client, but user client for uploads is ok)
  if (attachmentFiles && attachmentFiles.length > 0) {
    for (const file of attachmentFiles) {
      // Generate unique file path: tasks/{taskId}/{timestamp}-{filename}
      const timestamp = Date.now();
      const storagePath = `tasks/${taskId}/${timestamp}-${file.name}`;

      // Upload to Supabase Storage (use service client for storage)
      const { error: uploadError } = await serviceClient.storage
        .from('task-attachments')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error(`Error uploading file ${file.name}:`, uploadError);
        continue; // Skip this file but continue with others
      }

      // Create attachment record (use service client)
      const { error: attachmentError } = await serviceClient
        .from('task_attachments')
        .insert({
          task_id: taskId,
          storage_path: storagePath,
          uploaded_by: creatorId,
        });

      if (attachmentError) {
        console.error(`Error creating attachment record for ${file.name}:`, attachmentError);
        // Clean up the uploaded file
        await serviceClient.storage.from('task-attachments').remove([storagePath]);
      }
    }
  }

  return taskId;
}

/**
 * Fetches all users from the database with their basic information.
 * Used for populating assignee selection dropdowns.
 *
 * Uses service role client to bypass RLS and return all users in the organization.
 *
 * @returns Array of user objects with id, first_name, and last_name
 * @throws {Error} If there's a database error
 */
export async function getAllUsers(): Promise<RawAssignee[]> {
  // Use service role client to bypass RLS and get all users
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await serviceClient
    .from('user_info')
    .select('id, first_name, last_name')
    .order('first_name', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch users: ${error.message}`);
  }

  return data as RawAssignee[];
}

/**
 * Fetches all non-archived projects from the database.
 * Used for populating project selection dropdowns.
 *
 * Uses service role client to bypass RLS and return all projects in the organization.
 *
 * @returns Array of project objects with id and name
 * @throws {Error} If there's a database error
 */
export async function getAllProjects(): Promise<{ id: number; name: string }[]> {
  // Use service role client to bypass RLS and get all projects
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await serviceClient
    .from('projects')
    .select('id, name')
    .eq('is_archived', false)
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch projects: ${error.message}`);
  }

  return data;
}