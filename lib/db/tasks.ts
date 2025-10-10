import { createClient } from '@/lib/supabase/server';
import { mapTaskAttributes } from '@/lib/services/tasks';

type UserInfo = {
  id: string;
  first_name: string;
  last_name: string;
};

export async function getUserTasks(
  userId: string,
) {
  const supabase = await createClient();

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

  const { data, error } = await query.order('deadline', { ascending: true });
  if (error) throw new Error(error.message);

  // Fetch subtasks separately
  const taskIds = data.map((task: any) => task.id);
  const { data: subtasksData, error: subtasksError } = await supabase
    .from('tasks')
    .select('id, title, status, deadline, parent_task_id')
    .in('parent_task_id', taskIds)
    .neq('is_archived', true);

  if (subtasksError) throw new Error(subtasksError.message);

  // Map subtasks to tasks
  const subtasksMap = new Map<number, any[]>();
  subtasksData.forEach((subtask: any) => {
    const parentId = subtask.parent_task_id;
    if (!subtasksMap.has(parentId)) {
      subtasksMap.set(parentId, []);
    }
    subtasksMap.get(parentId)!.push({
      id: subtask.id,
      title: subtask.title,
      status: subtask.status,
      deadline: subtask.deadline,
    });
  });

  // Fetch attachments separately
  const { data: attachmentsData, error: attachmentsError } = await supabase
    .from('task_attachments')
    .select('id, storage_path, task_id')
    .in('task_id', taskIds);

  if (attachmentsError) throw new Error(attachmentsError.message);

  // Map attachments to tasks
  const attachmentsMap = new Map<number, any[]>();
  attachmentsData.forEach((attachment: any) => {
    const taskId = attachment.task_id;
    if (!attachmentsMap.has(taskId)) {
      attachmentsMap.set(taskId, []);
    }
    attachmentsMap.get(taskId)!.push({
      id: attachment.id,
      storage_path: attachment.storage_path,
    });
  });

  // Fetch user_info for assignees using security definer function
  // allow getting names of assignees even if they're from different departments
  let userInfoData: UserInfo[] = [];
  if (taskIds.length > 0) {
    const { data: userInfo, error: userInfoError } = await supabase.rpc('get_task_assignees_info', {
      task_ids: taskIds,
    });

    if (userInfoError) throw new Error(userInfoError.message);
    userInfoData = (userInfo ?? []) as UserInfo[];
  }

  // Map user_info to tasks
  const userInfoMap = new Map(userInfoData.map((user) => [user.id, user]));

  return data
    .map((task: any) => ({
      ...task,
      subtasks: subtasksMap.get(task.id) || [],
      assignees: task.task_assignments
        .map((a: any) => {
          const user = userInfoMap.get(a.assignee_id);
          return user
            ? {
                assignee_id: a.assignee_id,
                user_info: {
                  first_name: user.first_name,
                  last_name: user.last_name,
                },
              }
            : null;
        })
        .filter(Boolean),
      attachments: attachmentsMap.get(task.id) || [],
    }))
    .map(mapTaskAttributes);
}
