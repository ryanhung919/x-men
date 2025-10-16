import { createClient } from '@/lib/supabase/server';
import { RawTask, RawSubtask, RawAttachment, RawAssignee, RawComment } from '../services/tasks';

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

  return {
    tasks: tasksData,
    subtasks: subtasksData,
    attachments: attachmentsData,
    assignees: userInfoData,
  };
}

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
      ...taskData.task_assignments.map((a) => a.assignee_id),
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
    task: taskData,
    subtasks: subtasksData ?? [],
    attachments,
    comments: commentsData ?? [],
    assignees: userInfoData,
  };
}