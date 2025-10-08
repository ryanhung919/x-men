'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { format } from 'date-fns';

type TaskDetailsProps = {
  taskId: number;
};

type DetailedTask = {
  title: string;
  description: string;
  priority: number;
  status: string;
  assignees: string[];
  deadline: string | null;
  tags: string[];
  project: { name: string };
  subtasks: { id: number; title: string; status: string; deadline: string | null }[];
  attachments: { storage_path: string }[];
  notes: string | null;
  comments: {
    id: number;
    content: string;
    created_at: string;
    user_id: string;
    user: { first_name: string; last_name: string };
  }[];
};

export default function TaskDetails({ taskId }: TaskDetailsProps) {
  const [task, setTask] = useState<DetailedTask | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTaskDetails = async () => {
      const supabase = await createClient();

      // Fetch base task data
      const { data, error: taskError } = await supabase
        .from('tasks')
        .select(
          `
            title,
            description,
            priority_bucket,
            status,
            deadline,
            notes,
            project:projects(name),
            tags:task_tags(tag:tags(name))
          `
        )
        .eq('id', taskId)
        .single();

      if (taskError) {
        console.error('Error fetching task details:', taskError);
        setLoading(false);
        return;
      }

      // Fetch assignees
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('task_assignments')
        .select('assignee_id')
        .eq('task_id', taskId);
      let assignees: string[] = ['None'];
      if (assignmentsData && assignmentsData.length > 0) {
        const assigneeIds = assignmentsData.map((a: any) => a.assignee_id);
        const { data: userInfoData, error: userInfoError } = await supabase
          .from('user_info')
          .select('id, first_name, last_name')
          .in('id', assigneeIds);
        if (userInfoError) {
          console.error('Error fetching user info:', userInfoError);
        } else {
          assignees = userInfoData.map((u: any) => `${u.first_name} ${u.last_name}`);
        }
      }

      // Fetch subtasks
      const { data: subtasksData, error: subtasksError } = await supabase
        .from('tasks')
        .select('id, title, status, deadline')
        .eq('parent_task_id', taskId);
      if (subtasksError) {
        console.error('Error fetching subtasks:', subtasksError);
      }

      // Fetch attachments
      const { data: attachmentsData, error: attachmentsError } = await supabase
        .from('task_attachments')
        .select('storage_path')
        .eq('task_id', taskId);
      if (attachmentsError) {
        console.error('Error fetching attachments:', attachmentsError);
      }

      // Fetch comments and user info
      const { data: commentsData, error: commentsError } = await supabase
        .from('task_comments')
        .select('id, content, created_at, user_id')
        .eq('task_id', taskId);
      let comments: {
        id: number;
        content: string;
        created_at: string;
        user_id: string;
        user: { first_name: string; last_name: string };
      }[] = [];
      if (commentsData && commentsData.length > 0) {
        const userIds = commentsData.map((c: any) => c.user_id);
        const { data: userInfoData, error: userInfoError } = await supabase
          .from('user_info')
          .select('id, first_name, last_name')
          .in('id', userIds);
        if (userInfoError) {
          console.error('Error fetching user info for comments:', userInfoError);
        } else {
          const userMap = new Map(userInfoData.map((u: any) => [u.id, u]));
          comments = commentsData.map((c: any) => ({
            ...c,
            user: userMap.get(c.user_id) || { first_name: 'Unknown', last_name: '' },
          }));
        }
      }

      const tags = data.tags.map((t: any) => t.tag.name);

      setTask({
        ...data,
        priority: data.priority_bucket,
        assignees: assignees.length > 0 ? assignees : ['None'],
        subtasks: subtasksData || [],
        attachments: attachmentsData || [],
        tags,
        comments,
      });
      setLoading(false);
    };
    fetchTaskDetails();
  }, [taskId]);

  if (loading) return <div>Loading task details...</div>;
  if (!task) return <div>Task not found.</div>;

  return (
    <div className="space-y-4" id="task-details-description" aria-live="polite">
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
            <strong>Assignees:</strong> {task.assignees.join(', ') || 'None'}
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
            <strong>Project:</strong> {task.project.name || 'None'}
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
              {task.attachments.map((att, idx) => (
                <li key={idx}>{att.storage_path}</li>
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
                      {comment.user.first_name} {comment.user.last_name}
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
  );
}
