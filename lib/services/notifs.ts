import { createNotification } from '@/lib/db/notifs';
import { createClient } from '@/lib/supabase/server';

export const NotificationType = {
  TASK_ASSIGNED: 'task_assigned',
  COMMENT_ADDED: 'comment_added',
} as const;

// Notifies users who have been assigned a task
export async function notifyNewTaskAssignment(
  assigneeId: string,
  assignorId: string | null,
  taskId: number,
  taskTitle: string
): Promise<void> {
  console.log('Service: notifyNewTaskAssignment called', {
    assigneeId,
    assignorId,
    taskId,
    taskTitle,
  });

  // No notifications for self-assignment
  if (assigneeId === assignorId) {
    console.log('Service: Self-assignment, skipping notification');
    return;
  }

  // Get assignor name
  let assignorName = 'Someone';
  if (assignorId) {
    const supabase = await createClient();
    const { data: assignorInfo } = await supabase
      .from('user_info')
      .select('first_name, last_name')
      .eq('id', assignorId)
      .single();

    if (assignorInfo) {
      assignorName = `${assignorInfo.first_name} ${assignorInfo.last_name}`;
    }
  }

  const title = 'New Task Assignment';
  const message = `${assignorName} assigned you to task: "${taskTitle}"`;

  await createNotification({
    user_id: assigneeId,
    title,
    message,
    type: NotificationType.TASK_ASSIGNED,
  });

  console.log('Service: Notification created successfully');
}

// Notify all assignees of a new comment (skips the commenter)
export async function notifyNewComment(
  commenterId: string,
  taskId: number,
  taskTitle: string
): Promise<void> {
  console.log('Service: notifyNewComment called', {
    commenterId,
    taskId,
    taskTitle,
  });

  const supabase = await createClient();

  // Get commenter name
  let commenterName = 'Someone';
  const { data: commenterInfo } = await supabase
    .from('user_info')
    .select('first_name, last_name')
    .eq('id', commenterId)
    .single();

  if (commenterInfo) {
    commenterName = `${commenterInfo.first_name} ${commenterInfo.last_name}`;
  }

  // Get all assignees for this task
  const { data: assignees, error } = await supabase
    .from('task_assignments')
    .select('assignee_id')
    .eq('task_id', taskId);

  if (error || !assignees || assignees.length === 0) {
    console.log('Service: No assignees found or error fetching assignees');
    return;
  }

  const title = 'New Comment';
  const message = `${commenterName} commented on task: "${taskTitle}"`;

  // Create notifications for all assignees except the commenter
  for (const assignment of assignees) {
    // Skip the commenter
    if (assignment.assignee_id === commenterId) {
      continue;
    }

    await createNotification({
      user_id: assignment.assignee_id,
      title,
      message,
      type: NotificationType.COMMENT_ADDED,
    });
  }

  console.log('Service: Comment notifications created successfully');
}
