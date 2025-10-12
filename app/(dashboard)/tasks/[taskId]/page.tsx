import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BackButton } from '@/components/ui/back-button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import Link from 'next/link';

type UserInfo = {
  id: string;
  first_name: string;
  last_name: string;
};

type DetailedTask = {
  id: number;
  title: string;
  description: string | null;
  priority: number;
  status: string;
  deadline: string | null;
  notes: string | null;
  project: { id: number; name: string } | null;
  assignees: { assignee_id: string; user_info: UserInfo }[];
  tags: string[];
  subtasks: { id: number; title: string; status: string; deadline: string | null }[];
  attachments: { id: number; storage_path: string }[];
  comments: {
    id: number;
    content: string;
    created_at: string;
    user_id: string;
    user_info: UserInfo;
  }[];
};

async function fetchTaskDetails(taskId: number): Promise<DetailedTask | null> {
  const supabase = await createClient();

  // Fetch task data
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
    .single();

  if (taskError || !taskData) {
    console.error('Error fetching task details:', taskError);
    return null;
  }

  // Fetch subtasks
  const { data: subtasksData, error: subtasksError } = await supabase
    .from('tasks')
    .select('id, title, status, deadline')
    .eq('parent_task_id', taskId)
    .neq('is_archived', true);

  if (subtasksError) {
    console.error('Error fetching subtasks:', subtasksError);
  }

  // Fetch attachments
  const { data: attachmentsData, error: attachmentsError } = await supabase
    .from('task_attachments')
    .select('id, storage_path')
    .eq('task_id', taskId);

  if (attachmentsError) {
    console.error('Error fetching attachments:', attachmentsError);
  }

  // Fetch comments
  const { data: commentsData, error: commentsError } = await supabase
    .from('task_comments')
    .select('id, content, created_at, user_id')
    .eq('task_id', taskId)
    .neq('is_archived', true);

  if (commentsError) {
    console.error('Error fetching comments:', commentsError);
  }

  // Fetch user info for assignees and commenters
  let assignees: DetailedTask['assignees'] = [];
  let userInfoMap = new Map<string, UserInfo>();
  const userIds = [
    ...new Set([
      ...(taskData.task_assignments || []).map((a: { assignee_id: string }) => a.assignee_id),
      ...(commentsData || []).map((c: { user_id: string }) => c.user_id),
    ]),
  ];

  if (userIds.length > 0) {
    const { data: assigneeInfoData, error: assigneeInfoError } = await supabase.rpc(
      'get_task_assignees_info',
      { task_ids: [taskId] }
    );

    if (assigneeInfoError) {
      console.error('Error fetching assignee user info:', assigneeInfoError);
    } else {
      userInfoMap = new Map(
        (assigneeInfoData || []).map((user: UserInfo) => [
          user.id,
          { id: user.id, first_name: user.first_name, last_name: user.last_name },
        ])
      );
      assignees = taskData.task_assignments
        .map((a: { assignee_id: string }) => {
          const user = userInfoMap.get(a.assignee_id);
          return user ? { assignee_id: a.assignee_id, user_info: user } : null;
        })
        .filter(
          (
            a: { assignee_id: string; user_info: UserInfo } | null
          ): a is { assignee_id: string; user_info: UserInfo } => a !== null
        );
    }

    const missingUserIds = userIds.filter((id) => !userInfoMap.has(id));
    if (missingUserIds.length > 0) {
      const { data: additionalUserInfo, error: userInfoError } = await supabase
        .from('user_info')
        .select('id, first_name, last_name')
        .in('id', missingUserIds);

      if (userInfoError) {
        console.error('Error fetching additional user info:', userInfoError);
      } else {
        additionalUserInfo.forEach((user: UserInfo) => {
          userInfoMap.set(user.id, {
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
          });
        });
      }
    }
  }

  return {
    id: taskData.id,
    title: taskData.title,
    description: taskData.description,
    priority: taskData.priority_bucket,
    status: taskData.status,
    deadline: taskData.deadline,
    notes: taskData.notes,
    project: taskData.project,
    assignees,
    tags: taskData.tags ? taskData.tags.map((t: { tags: { name: string } }) => t.tags.name) : [],
    subtasks: subtasksData || [],
    attachments: attachmentsData || [],
    comments: commentsData
      ? commentsData.map(
          (c: { id: number; content: string; created_at: string; user_id: string }) => ({
            id: c.id,
            content: c.content,
            created_at: c.created_at,
            user_id: c.user_id,
            user_info: userInfoMap.get(c.user_id) || {
              id: c.user_id,
              first_name: 'Unknown',
              last_name: '',
            },
          })
        )
      : [],
  };
}

export default async function TaskDetailsPage({ params }: { params: { taskId: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  // Await params to resolve the Promise and access taskId
  const resolvedParam = await params;
  const taskId = parseInt(resolvedParam.taskId, 10);
  if (isNaN(taskId)) {
    notFound();
  }

  const task = await fetchTaskDetails(taskId);
  if (!task) {
    notFound();
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Task Details</h1>
      <BackButton />
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>{task.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              <strong>Description:</strong> {task.description || 'None'}
            </p>
            <p>
              <strong>Priority:</strong> <Badge>{task.priority}</Badge>
            </p>
            <p>
              <strong>Status:</strong> <Badge>{task.status}</Badge>
            </p>
            <p>
              <strong>Assignees:</strong>{' '}
              {task.assignees.length > 0
                ? task.assignees
                    .map((a) => `${a.user_info.first_name} ${a.user_info.last_name}`)
                    .join(', ')
                : 'None'}
            </p>
            <p>
              <strong>Due Date:</strong>{' '}
              {task.deadline ? format(new Date(task.deadline), 'PPP') : 'None'}
            </p>
            <p>
              <strong>Tags:</strong>{' '}
              {task.tags.length > 0
                ? task.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="mr-1">
                      {tag}
                    </Badge>
                  ))
                : 'None'}
            </p>
            <p>
              <strong>Project:</strong> {task.project?.name || 'None'}
            </p>
            <p>
              <strong>Notes:</strong> {task.notes || 'None'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subtasks</CardTitle>
          </CardHeader>
          <CardContent>
            {task.subtasks.length > 0 ? (
              <ul className="list-disc pl-4">
                {task.subtasks.map((sub) => (
                  <li key={sub.id}>
                    {sub.title} - {sub.status}{' '}
                    {sub.deadline ? `(Due: ${format(new Date(sub.deadline), 'PPP')})` : ''}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No subtasks.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Attachments</CardTitle>
          </CardHeader>
          <CardContent>
            {task.attachments.length > 0 ? (
              <ul className="list-disc pl-4">
                {task.attachments.map((att) => (
                  <li key={att.id}>{att.storage_path}</li>
                ))}
              </ul>
            ) : (
              <p>No attachments.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activity History</CardTitle>
          </CardHeader>
          <CardContent>
            {task.comments.length > 0 ? (
              <ul className="space-y-2">
                {task.comments.map((comment) => (
                  <li key={comment.id} className="border-b pb-2">
                    <p>
                      <strong>
                        {comment.user_info.first_name} {comment.user_info.last_name}
                      </strong>{' '}
                      - {format(new Date(comment.created_at), 'PPP p')}
                    </p>
                    <p>{comment.content}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No activity history.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
