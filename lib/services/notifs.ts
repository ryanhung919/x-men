import { createNotification } from "@/lib/db/notifs";
import { createClient } from "@/lib/supabase/server";

// Notification types
export const NotificationType = {
  TASK_ASSIGNED: "task_assigned",
} as const;

// Notify user of task assignment (skips self-assignment)
export async function notifyNewTaskAssignment(
  assigneeId: string,
  assignorId: string | null,
  taskId: number,
  taskTitle: string
): Promise<void> {
  console.log("Service: notifyNewTaskAssignment called", {
    assigneeId,
    assignorId,
    taskId,
    taskTitle,
  });

  // Don't notify if self-assignment
  if (assigneeId === assignorId) {
    console.log("Service: Self-assignment, skipping notification");
    return;
  }

  // Get assignor name
  let assignorName = "Someone";
  if (assignorId) {
    const supabase = await createClient();
    const { data: assignorInfo } = await supabase
      .from("user_info")
      .select("first_name, last_name")
      .eq("id", assignorId)
      .single();

    if (assignorInfo) {
      assignorName = `${assignorInfo.first_name} ${assignorInfo.last_name}`;
    }
  }

  const title = "New Task Assignment";
  const message = `${assignorName} assigned you to task: "${taskTitle}"`;

  await createNotification({
    user_id: assigneeId,
    title,
    message,
    type: NotificationType.TASK_ASSIGNED,
  });

  console.log("Service: Notification created successfully");
}
