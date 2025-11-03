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
      creator_id,
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

  // Fetch user info for assignees AND creators
  let userInfoData: { id: string; first_name: string; last_name: string }[] = [];
  if (taskIds.length > 0) {
    const { data: userInfo, error: userInfoError } = await supabase.rpc('get_task_assignees_info', {
      task_ids: taskIds,
    });

    if (userInfoError) throw new Error(userInfoError.message);
    userInfoData = (userInfo ?? []) as { id: string; first_name: string; last_name: string }[];

    // Also fetch creator info for all tasks
    const creatorIds = Array.from(new Set(tasksData.map((task: any) => task.creator_id)));
    const missingCreatorIds = creatorIds.filter((id) => !userInfoData.some((user) => user.id === id));

    if (missingCreatorIds.length > 0) {
      const { data: creatorInfo, error: creatorInfoError } = await supabase
        .from('user_info')
        .select('id, first_name, last_name')
        .in('id', missingCreatorIds);

      if (creatorInfoError) throw new Error(creatorInfoError.message);
      if (creatorInfo) {
        userInfoData = [...userInfoData, ...creatorInfo];
      }
    }
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
      creator_id,
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
      transformedTask.creator_id, // Include creator
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

/**
 * Archives or unarchives a task and all its subtasks (cascade).
 *
 * This function performs a soft delete by setting the is_archived flag.
 * When archiving a parent task, all subtasks are automatically archived as well
 * to maintain logical consistency.
 *
 * Uses service role client to ensure the operation completes regardless of RLS policies.
 *
 * @param taskId - The ID of the task to archive/unarchive
 * @param isArchived - True to archive, false to restore
 * @returns The number of tasks affected (parent + subtasks)
 * @throws {Error} If the task doesn't exist or there's a database error
 *
 * @example
 * // Archive a task and its subtasks
 * const affectedCount = await archiveTask(123, true);
 * console.log(`Archived ${affectedCount} tasks`);
 */
export async function archiveTask(
  taskId: number,
  isArchived: boolean
): Promise<number> {
  // Use service role client to bypass RLS for archive operation
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // First, verify the task exists
  const { data: taskExists, error: checkError } = await serviceClient
    .from('tasks')
    .select('id')
    .eq('id', taskId)
    .single();

  if (checkError || !taskExists) {
    throw new Error(`Task with ID ${taskId} not found`);
  }

  // Get all subtasks recursively (in case of nested subtasks)
  const { data: subtasks, error: subtasksError } = await serviceClient
    .from('tasks')
    .select('id')
    .eq('parent_task_id', taskId);

  if (subtasksError) {
    throw new Error(`Failed to fetch subtasks: ${subtasksError.message}`);
  }

  const subtaskIds = subtasks?.map(st => st.id) || [];
  const allTaskIds = [taskId, ...subtaskIds];

  // Archive/unarchive the parent task and all subtasks
  const { error: updateError } = await serviceClient
    .from('tasks')
    .update({ is_archived: isArchived })
    .in('id', allTaskIds);

  if (updateError) {
    throw new Error(`Failed to archive tasks: ${updateError.message}`);
  }

  return allTaskIds.length;
}

export async function getScheduleTasks(
  startDate?: Date,
  endDate?: Date,
  projectIds?: number[],
  staffIds?: string[]
): Promise<{
  id: number;
  title: string;
  created_at: string;
  deadline: string;
  status: string;
  updated_at: string;
  project_name: string;
  assignees: { id: string; first_name: string; last_name: string }[];
}[]> {
  const supabase = await createClient();

  let query = supabase
    .from('tasks')
    .select(
      `
      id,
      title,
      created_at,
      deadline,
      status,
      updated_at,
      project:projects!inner(id, name),
      task_assignments(assignee_id)
    `
    )
    .neq('is_archived', true)
    .not('deadline', 'is', null);

  // Apply date filters - show tasks that overlap with the date range
  // A task overlaps if: (task_start <= endDate) AND (task_deadline >= startDate)
  // Since task_start is created_at, we check: created_at <= endDate AND deadline >= startDate
  if (endDate) {
    query = query.lte('created_at', endDate.toISOString());
  }
  if (startDate) {
    query = query.gte('deadline', startDate.toISOString());
  }

  // Apply project filter
  if (projectIds && projectIds.length > 0) {
    query = query.in('project.id', projectIds);
  }

  query = query.order('deadline', { ascending: true });

  const { data: tasksData, error: tasksError } = await query;

  if (tasksError) {
    throw new Error(`Failed to fetch schedule tasks: ${tasksError.message}`);
  }

  if (!tasksData || tasksData.length === 0) {
    return [];
  }

  // Filter by staff if specified
  let filteredTasksData = tasksData;
  if (staffIds && staffIds.length > 0) {
    filteredTasksData = tasksData.filter((task: any) => {
      const taskAssigneeIds = ((task as any).task_assignments || []).map((a: any) => a.assignee_id);
      // Check if any of the selected staff are assigned to this task
      return staffIds.some((staffId: string) => taskAssigneeIds.includes(staffId));
    });
  }

  if (filteredTasksData.length === 0) {
    return [];
  }

  // Get all task IDs
  const taskIds = filteredTasksData.map((task: any) => task.id);

  // Fetch assignee information using the security definer function
  const { data: assigneesData, error: assigneesError } = await supabase.rpc(
    'get_task_assignees_info',
    { task_ids: taskIds }
  );

  if (assigneesError) {
    throw new Error(`Failed to fetch assignee info: ${assigneesError.message}`);
  }

  // Build a map of task_id -> assignees
  const taskAssigneeMap = new Map<number, { id: string; first_name: string; last_name: string }[]>();
  
  for (const task of filteredTasksData) {
    const taskId = (task as any).id;
    const assigneeIds = ((task as any).task_assignments || []).map((a: any) => a.assignee_id);
    const taskAssignees = (assigneesData || []).filter((a: any) => assigneeIds.includes(a.id));
    taskAssigneeMap.set(taskId, taskAssignees);
  }

  // Transform and return the data
  return filteredTasksData.map((task: any) => ({
    id: task.id,
    title: task.title,
    created_at: task.created_at,
    deadline: task.deadline,
    status: task.status,
    updated_at: task.updated_at,
    project_name: Array.isArray(task.project) ? task.project[0]?.name : task.project?.name,
    assignees: taskAssigneeMap.get(task.id) || [],
  }));
}
// ============  TASK UPDATE ============

/**
 * Updates only the task title in the database.
 * No permission checks - those happen in the service layer.
 */
export async function updateTaskTitleDB(
  taskId: number,
  newTitle: string
): Promise<{ id: number; title: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('tasks')
    .update({
      title: newTitle,
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .select('id, title')
    .single();

  if (error) {
    throw new Error(`Failed to update task title: ${error.message}`);
  }

  return data;
}

/**
 * Updates only the task description in the database.
 */
export async function updateTaskDescriptionDB(
  taskId: number,
  newDescription: string
): Promise<{ id: number; description: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('tasks')
    .update({
      description: newDescription,
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .select('id, description')
    .single();

  if (error) {
    throw new Error(`Failed to update task description: ${error.message}`);
  }

  return data;
}

/**
 * Updates only the task status in the database.
 */
export async function updateTaskStatusDB(
  taskId: number,
  newStatus: 'To Do' | 'In Progress' | 'Completed' | 'Blocked'
): Promise<{ id: number; status: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('tasks')
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .select('id, status')
    .single();

  if (error) {
    throw new Error(`Failed to update task status: ${error.message}`);
  }

  return data;
}

/**
 * Updates only the task priority in the database.
 */
export async function updateTaskPriorityDB(
  taskId: number,
  newPriority: number
): Promise<{ id: number; priority_bucket: number }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('tasks')
    .update({
      priority_bucket: newPriority,
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .select('id, priority_bucket')
    .single();

  if (error) {
    throw new Error(`Failed to update task priority: ${error.message}`);
  }

  return data;
}

/**
 * Updates only the task deadline in the database.
 * Converts deadline to Singapore Time (SGT/UTC+8) format.
 */
export async function updateTaskDeadlineDB(
  taskId: number,
  newDeadline: string | null
): Promise<{ id: number; deadline: string | null }> {
  const supabase = await createClient();

  // Convert deadline to SGT format if provided
  let finalDeadline: string | null = null;
  if (newDeadline) {
    const date = new Date(newDeadline);
    // Format as ISO string with SGT timezone offset (+08:00)
    finalDeadline = date.toISOString().replace('Z', '+08:00');
  }

  const { data, error } = await supabase
    .from('tasks')
    .update({
      deadline: finalDeadline,
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .select('id, deadline')
    .single();

  if (error) {
    throw new Error(`Failed to update task deadline: ${error.message}`);
  }

  return data;
}
/**
 * Updates only the task notes in the database.
 */
export async function updateTaskNotesDB(
  taskId: number,
  newNotes: string
): Promise<{ id: number; notes: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('tasks')
    .update({
      notes: newNotes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .select('id, notes')
    .single();

  if (error) {
    throw new Error(`Failed to update task notes: ${error.message}`);
  }

  return data;
}

/**
 * Updates only the task project in the database.
 */
export async function updateTaskProjectDB(
  taskId: number,
  newProjectId: number
): Promise<{ id: number; project_id: number }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('tasks')
    .update({
      project_id: newProjectId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .select('id, project_id')
    .single();

  if (error) {
    throw new Error(`Failed to update task project: ${error.message}`);
  }

  return data;
}

/**
 * Updates task recurrence settings.
 * If recurrenceInterval is 0, clears the recurrence (sets both to null).
 */
export async function updateTaskRecurrenceDB(
  taskId: number,
  recurrenceInterval: number,
  recurrenceDate: string | null
): Promise<{ id: number; recurrence_interval: number; recurrence_date: string | null }> {
  const supabase = await createClient();

  // If interval is 0, clear recurrence
  const finalInterval = recurrenceInterval === 0 ? 0 : recurrenceInterval;
  const finalDate = recurrenceInterval === 0 ? null : recurrenceDate;

  const { data, error } = await supabase
    .from('tasks')
    .update({
      recurrence_interval: finalInterval,
      recurrence_date: finalDate,
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .select('id, recurrence_interval, recurrence_date')
    .single();

  if (error) {
    throw new Error(`Failed to update task recurrence: ${error.message}`);
  }

  return data;
}

// ============ TAGS ============

/**
 * Adds a single tag to a task (without removing existing ones).
 * Uses service role client to bypass RLS for tag operations.
 */
export async function addTaskTagDB(taskId: number, tagName: string): Promise<string> {
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Try to insert the tag (will fail silently if it exists due to UNIQUE constraint)
  try {
    await serviceClient
      .from('tags')
      .insert({ name: tagName })
      .select();
  } catch (error) {
    // Tag already exists (UNIQUE constraint), carry on
    console.log(`Tag "${tagName}" already exists, continuing...`);
  }

  // 2. Get tag ID
  const { data: tag, error: tagError } = await serviceClient
    .from('tags')
    .select('id')
    .eq('name', tagName)
    .single();

  if (tagError || !tag) {
    throw new Error('Failed to find or create tag');
  }

  // 3. Check if already linked to this task
  const { data: existing } = await serviceClient
    .from('task_tags')
    .select('id')
    .eq('task_id', taskId)
    .eq('tag_id', tag.id)
    .single();

  if (existing) {
    throw new Error('Tag already linked to this task');
  }

  // 4. Link tag to task
  const { error: linkError } = await serviceClient
    .from('task_tags')
    .insert({ task_id: taskId, tag_id: tag.id });

  if (linkError) {
    throw new Error(`Failed to add tag: ${linkError.message}`);
  }

  return tagName;
}

/**
 * Removes a single tag from a task.
 * Uses service role client to bypass RLS for tag operations.
 */
export async function removeTaskTagDB(taskId: number, tagName: string): Promise<string> {
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Get tag ID
  const { data: tag, error: tagError } = await serviceClient
    .from('tags')
    .select('id')
    .eq('name', tagName)
    .single();

  if (tagError || !tag) {
    throw new Error('Tag not found');
  }

  // 2. Remove the link between task and tag
  const { error: deleteError } = await serviceClient
    .from('task_tags')
    .delete()
    .eq('task_id', taskId)
    .eq('tag_id', tag.id);

  if (deleteError) {
    throw new Error(`Failed to remove tag: ${deleteError.message}`);
  }

  return tagName;
}

// ============ ASSIGNEES ============


/**
 * Adds a single assignee to a task (without removing existing ones).
 */
export async function addTaskAssigneeDB(
  taskId: number,
  assigneeId: string,
  currentUserId: string
): Promise<string> {
  // Use service role client to bypass RLS for adding assignees
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Check current count
  const { count } = await serviceClient
    .from('task_assignments')
    .select('*', { count: 'exact' })
    .eq('task_id', taskId);

  if ((count || 0) >= 5) {
    throw new Error('Cannot exceed 5 total assignees');
  }

  // 2. Check if already assigned
  const { data: existing } = await serviceClient
    .from('task_assignments')
    .select('id')
    .eq('task_id', taskId)
    .eq('assignee_id', assigneeId)
    .single();

  if (existing) {
    throw new Error('User already assigned to this task');
  }

  // 3. Add assignment with service client (bypasses RLS)
  const { error } = await serviceClient.from('task_assignments').insert({
    task_id: taskId,
    assignee_id: assigneeId,
    assignor_id: currentUserId,
  });

  if (error) {
    throw new Error(`Failed to add assignee: ${error.message}`);
  }

  return assigneeId;
}

/**
 * Removes a single assignee from a task.
 */
export async function removeTaskAssigneeDB(
  taskId: number,
  assigneeId: string
): Promise<string> {
  // Use service role client to bypass RLS for removal
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Check current assignee count
  const { count } = await serviceClient
    .from('task_assignments')
    .select('*', { count: 'exact' })
    .eq('task_id', taskId);

  if ((count || 0) <= 1) {
    throw new Error('Cannot remove assignee. A task must have at least 1 assignee.');
  }

  // 2. Remove the assignee
  const { error } = await serviceClient
    .from('task_assignments')
    .delete()
    .eq('task_id', taskId)
    .eq('assignee_id', assigneeId);

  if (error) {
    throw new Error(`Failed to remove assignee: ${error.message}`);
  }

  return assigneeId;
}

// ============ SUBTASKS ============

/**
 * Links a subtask to its parent task by updating the parent_task_id field.
 * Called after createTask() succeeds to establish the parent-child relationship.
 *
 * @param subtaskId - The ID of the newly created subtask
 * @param parentTaskId - The ID of the parent task
 * @throws {Error} If the update fails
 */
export async function linkSubtaskToParentDB(
  subtaskId: number,
  parentTaskId: number
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('tasks')
    .update({ parent_task_id: parentTaskId })
    .eq('id', subtaskId);

  if (error) {
    throw new Error(`Failed to link subtask to parent: ${error.message}`);
  }
}


// ============ ATTACHMENTS ============

export async function getTaskAttachmentsTotalSize(taskId: number): Promise<number> {
  const supabase = await createClient();

  const { data: attachments, error } = await supabase
    .from('task_attachments')
    .select('id')
    .eq('task_id', taskId);

  if (error) {
    console.error('Error fetching task attachments:', error);
    return 0;
  }

  if (!attachments || attachments.length === 0) {
    return 0;
  }

  // Get file sizes from storage metadata
  let totalSize = 0;
  const { data: files } = await supabase.storage
    .from('task-attachments')
    .list(`tasks/${taskId}`);

  if (files) {
    totalSize = files.reduce((sum, file) => sum + (file.metadata?.size || 0), 0);
  }

  return totalSize;
}

export async function addTaskAttachmentsDB(
  taskId: number,
  files: File[],
  userId: string
): Promise<{ id: number; storage_path: string }[]> {
  // Use service client to bypass RLS for attachment operations
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Verify task exists
  const { data: taskExists, error: taskError } = await serviceClient
    .from('tasks')
    .select('id')
    .eq('id', taskId)
    .single();

  if (taskError || !taskExists) {
    throw new Error('Task not found');
  }

  // Validate files input
  if (!files || !Array.isArray(files) || files.length === 0) {
    throw new Error('No valid files provided');
  }

  console.log(`Starting upload of ${files.length} files for task ${taskId}`);

  const createdAttachments: { id: number; storage_path: string }[] = [];
  const uploadErrors: string[] = [];

  // Process each file
  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    // Validate file object
    if (!file || typeof file !== 'object') {
      uploadErrors.push(`File ${i}: Invalid file object`);
      continue;
    }

    const fileName = (file as any).name || `file_${i}`;
    const fileSize = (file as any).size || 0;

    console.log(`Processing file ${i}: ${fileName} (${fileSize} bytes)`);

    // Generate unique file path
    const timestamp = Date.now();
    const storagePath = `tasks/${taskId}/${timestamp}-${i}-${fileName}`;

    try {
      // 1. Upload to Supabase Storage using service client
      console.log(`Uploading to storage: ${storagePath}`);
      
      const { error: uploadError } = await serviceClient.storage
        .from('task-attachments')
        .upload(storagePath, file as any, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error(`Upload error for ${fileName}:`, uploadError);
        uploadErrors.push(`${fileName}: ${uploadError.message}`);
        continue;
      }

      console.log(`Successfully uploaded to storage: ${storagePath}`);

      // 2. Create attachment record using service client (bypasses RLS)
      const { data: attachment, error: attachmentError } = await serviceClient
        .from('task_attachments')
        .insert({
          task_id: taskId,
          storage_path: storagePath,
          uploaded_by: userId,
        })
        .select('id, storage_path')
        .single();

      if (attachmentError) {
        console.error(`DB error for ${fileName}:`, attachmentError);
        uploadErrors.push(`${fileName}: DB insert failed`);
        
        // Clean up the uploaded file
        await serviceClient.storage
          .from('task-attachments')
          .remove([storagePath])
          .catch((err) => {
            console.error(`Cleanup error for ${storagePath}:`, err);
          });
        continue;
      }

      if (attachment) {
        console.log(`Successfully created attachment record: ${attachment.id}`);
        createdAttachments.push(attachment);
      }
    } catch (error) {
      console.error(`Exception processing file ${fileName}:`, error);
      uploadErrors.push(`${fileName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Log results
  console.log(`Upload complete: ${createdAttachments.length} succeeded, ${uploadErrors.length} failed`);
  if (uploadErrors.length > 0) {
    console.error('Upload errors:', uploadErrors);
  }

  if (createdAttachments.length === 0 && files.length > 0) {
    throw new Error(
      `Failed to upload any files. Errors: ${uploadErrors.join('; ')}`
    );
  }

  return createdAttachments;
}

export async function removeTaskAttachmentDB(attachmentId: number): Promise<string> {
  // Use service client to bypass RLS for attachment operations
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Fetch attachment to get storage path
  const { data: attachment, error: fetchError } = await serviceClient
    .from('task_attachments')
    .select('storage_path')
    .eq('id', attachmentId)
    .single();

  if (fetchError || !attachment) {
    throw new Error('Attachment not found');
  }

  const storagePath = attachment.storage_path;

  // 2. Delete from storage using service client
  const { error: storageError } = await serviceClient.storage
    .from('task-attachments')
    .remove([storagePath]);

  if (storageError) {
    console.error(`Error deleting file from storage ${storagePath}:`, storageError);
    // Continue with DB deletion anyway - file may already be deleted
  }

  // 3. Delete attachment record from database using service client
  const { error: dbError } = await serviceClient
    .from('task_attachments')
    .delete()
    .eq('id', attachmentId);

  if (dbError) {
    throw new Error(`Failed to delete attachment: ${dbError.message}`);
  }

  return storagePath;
}

// ============ COMMENTS ============

/**
 * Adds a comment to a task.
 * Any authenticated user can add a comment.
 */
export async function addTaskCommentDB(
  taskId: number,
  userId: string,
  content: string
): Promise<{ id: number; content: string; created_at: string; user_id: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('task_comments')
    .insert({
      task_id: taskId,
      user_id: userId,
      content: content,
    })
    .select('id, content, created_at, user_id')
    .single();

  if (error) {
    throw new Error(`Failed to add comment: ${error.message}`);
  }

  return data;
}

/**
 * Updates a comment.
 * Only the comment author can edit their own comments.
 */
export async function updateTaskCommentDB(
  commentId: number,
  newContent: string
): Promise<{ id: number; content: string; updated_at: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('task_comments')
    .update({
      content: newContent,
      updated_at: new Date().toISOString(),
    })
    .eq('id', commentId)
    .select('id, content, updated_at')
    .single();

  if (error) {
    throw new Error(`Failed to update comment: ${error.message}`);
  }

  return data;
}

/**
 * Deletes a comment.
 * Uses service role client to bypass RLS for admin deletion.
 */
export async function deleteTaskCommentDB(commentId: number): Promise<void> {
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await serviceClient
    .from('task_comments')
    .delete()
    .eq('id', commentId);

  if (error) {
    throw new Error(`Failed to delete comment: ${error.message}`);
  }
}

/**
 * Fetches the author of a comment (for permission checks).
 */
export async function getCommentAuthorDB(commentId: number): Promise<string | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('task_comments')
    .select('user_id')
    .eq('id', commentId)
    .single();

  if (error || !data) {
    return null;
  }

  return data.user_id;
}



// ============ HELPER: Get task with permission data ============

/**
 * Fetches task data needed for permission checks (creator + assignees).
 * Used by service layer for authorization.
 */
export async function getTaskPermissionDataDB(
  taskId: number
): Promise<{ creator_id: string; assignee_ids: string[] } | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('tasks')
    .select('creator_id, task_assignments(assignee_id)')
    .eq('id', taskId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    creator_id: data.creator_id,
    assignee_ids: (data.task_assignments || []).map((a: any) => a.assignee_id),
  };
}

export async function isUserManager(userId: string): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to check user role: ${error.message}`);
  }

  // Check if 'manager' or 'admin' is in the roles (admins can also remove)
  const roles = data?.map((row: { role: string }) => row.role) || [];
  return roles.includes('manager');
}

export async function checkUserIsAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to check user role: ${error.message}`);
  }

  const roles = data?.map((row: any) => row.role) || [];
  return roles.includes('admin');
}