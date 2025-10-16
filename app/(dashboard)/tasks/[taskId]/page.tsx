import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BackButton } from '@/components/ui/back-button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { SubtaskLink } from '@/components/tasks/subtask-link';
import { enUS } from 'date-fns/locale';
import { getTaskById } from '@/lib/db/tasks';
import { formatTaskDetails, DetailedTask } from '@/lib/services/tasks';

function isImageFile(storagePath: string): boolean {
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
  return imageExtensions.some((ext) => storagePath.toLowerCase().endsWith(ext));
}

export default async function TaskDetailsPage({ params }: { params: Promise<{ taskId: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  const resolvedParams = await params;
  const taskId = parseInt(resolvedParams.taskId, 10);
  if (isNaN(taskId)) {
    notFound();
  }

  const rawData = await getTaskById(taskId);
  if (!rawData) {
    notFound();
  }

  const task = formatTaskDetails(rawData);
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
            {task.recurrence_interval > 0 && (
              <p>
                <strong>Recurring:</strong>{' '}
                <Badge variant="secondary" className="mr-1">
                  Every {task.recurrence_interval} day{task.recurrence_interval > 1 ? 's' : ''}
                </Badge>
                {task.recurrence_date && (
                  <span className="text-sm text-muted-foreground ml-2">
                    (Started: {format(new Date(task.recurrence_date), 'PPP')})
                  </span>
                )}
              </p>
            )}
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
              <ul className="list-disc pl-4 space-y-2">
                {task.subtasks.map((sub) => (
                  <li key={sub.id} className="flex items-center gap-2">
                    <SubtaskLink id={sub.id} title={sub.title} />
                    <span>-</span>
                    <Badge variant="outline">{sub.status}</Badge>
                    {sub.deadline ? (
                      <span className="text-sm text-muted-foreground">
                        (Due: {format(new Date(sub.deadline), 'PPP', { locale: enUS })})
                      </span>
                    ) : null}
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
              <ul className="list-disc pl-4 space-y-2">
                {task.attachments.map((att) => (
                  <li key={att.id}>
                    {att.public_url ? (
                      isImageFile(att.storage_path) ? (
                        <img
                          src={att.public_url}
                          alt={att.storage_path}
                          className="max-w-xs h-auto mt-2"
                        />
                      ) : (
                        <a
                          href={att.public_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {att.storage_path}
                        </a>
                      )
                    ) : (
                      <span className="text-gray-500">{att.storage_path} (Access unavailable)</span>
                    )}
                  </li>
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
