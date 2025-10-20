// This file contains the sendTaskReminders logic WITHOUT Deno imports
// It can be imported by both Deno and Node.js/Vitest

interface TaskAssignment {
  task_id: string;
  assignee_id: string;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  is_archived: boolean;
  notes: string | null;
  priority_bucket: string | null;
  deadline: string;
}

interface EmailSentRecord {
  taskId: string;
  taskTitle: string;
  assigneeId: string;
  assigneeEmail: string;
  reminderType: "due_today" | "due_tomorrow" | "overdue";
  sentAt: string;
}

interface SendTaskRemindersResult {
  success: boolean;
  sent: number;
  emailsSent: EmailSentRecord[];
}

interface SupabaseConfig {
  url: string;
  serviceRoleKey: string;
}

// Helper: Fetch user email via Supabase Admin API
async function getUserEmail(
  userId: string,
  supabaseUrl: string,
  serviceRoleKey: string
): Promise<string | null> {
  // Validate config before using
  if (!supabaseUrl || supabaseUrl === "undefined") {
    console.error("Invalid supabaseUrl:", supabaseUrl);
    return null;
  }

  if (!serviceRoleKey || serviceRoleKey === "undefined") {
    console.error("Invalid serviceRoleKey");
    return null;
  }

  const url = `${supabaseUrl}/auth/v1/admin/users/${userId}`;
  console.log(`Fetching email for user ${userId}`);

  try {
    const res = await fetch(url, {
      headers: {
        apiKey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(
        `Failed to fetch user ${userId} (${res.status}):`,
        errorText
      );
      return null;
    }

    const user = await res.json();
    return user?.email ?? null;
  } catch (error) {
    console.error(`Error fetching user ${userId}:`, error);
    return null;
  }
}

/**
 * Core send task reminders logic
 *
 * This is the SAME logic used by the Deno edge function,
 * but extracted to a separate file that works in both:
 * - Deno runtime (production)
 * - Node.js runtime (Vitest integration tests)
 *
 * @param supabase - Supabase client instance
 * @param sendEmailFunc - Email sending function (SendGrid or mock)
 * @param supabaseConfig - Required config with URL and service role key
 */
export async function sendTaskReminders(
  supabase: any,
  sendEmailFunc: any,
  supabaseConfig: SupabaseConfig
): Promise<SendTaskRemindersResult> {
  try {
    // Validate config is provided
    if (!supabaseConfig) {
      throw new Error(
        "supabaseConfig is required - must include url and serviceRoleKey"
      );
    }

    if (!supabaseConfig.url || !supabaseConfig.serviceRoleKey) {
      throw new Error(
        `Invalid supabaseConfig: url=${supabaseConfig.url ? "set" : "MISSING"}, serviceRoleKey=${supabaseConfig.serviceRoleKey ? "set" : "MISSING"}`
      );
    }

    const now = new Date();
    const sgNow = new Date(
      now.toLocaleString("en-US", { timeZone: "Asia/Singapore" })
    );
    sgNow.setHours(0, 0, 0, 0);

    // 1. Fetch tasks
    const { data: tasks, error: taskErr } = await supabase
      .from("tasks")
      .select(
        "id, title, description, status, is_archived, notes, priority_bucket, deadline"
      );

    if (taskErr) throw taskErr;

    if (!tasks || tasks.length === 0) {
      console.log("No tasks found");
      return { success: true, sent: 0, emailsSent: [] };
    }

    // 2. Fetch task assignments
    const { data: assignments, error: assignErr } = await supabase
      .from("task_assignments")
      .select("task_id, assignee_id");

    if (assignErr) throw assignErr;

    if (!assignments || assignments.length === 0) {
      console.log("No task assignments found");
      return { success: true, sent: 0, emailsSent: [] };
    }

    let sentCount = 0;
    const emailsSent: EmailSentRecord[] = [];

    for (const task of tasks as Task[]) {
      // Skip invalid tasks
      if (task.is_archived) {
        console.log(`Skipping archived task: ${task.title}`);
        continue;
      }

      if (
        task.status?.toLowerCase() === "completed" ||
        task.status?.toLowerCase() === "done"
      ) {
        console.log(`Skipping completed task: ${task.title}`);
        continue;
      }

      if (!task.deadline) {
        console.log(`Skipping task with no deadline: ${task.title}`);
        continue;
      }

      // Normalize deadline SGT midnight
      const deadlineUTC = new Date(task.deadline);
      const deadlineSGT = new Date(
        deadlineUTC.toLocaleString("en-US", { timeZone: "Asia/Singapore" })
      );
      deadlineSGT.setHours(0, 0, 0, 0);

      // Difference in days
      const diffDays = Math.floor(
        (sgNow.getTime() - deadlineSGT.getTime()) / (1000 * 60 * 60 * 24)
      );

      let subject: string;
      let content: string;
      let reminderType: "due_today" | "due_tomorrow" | "overdue";
      const taskLink = `https://x-men-rosy.vercel.app/task/${task.id}`;

      if (diffDays === -1) {
        reminderType = "due_tomorrow";
        subject = `Reminder: Task "${task.title}" is due tomorrow`;
        content = `
<html>
  <body style="font-family: Arial, sans-serif; line-height: 1.6;">
    <p>Hello,</p>
    
    <p>This is a reminder that your task <strong>"${task.title}"</strong> is due on <strong>${deadlineSGT
          .toISOString()
          .slice(0, 10)}</strong>.</p>
    
    <p>
      <strong>Status:</strong> ${task.status ?? "N/A"}<br>
      <strong>Priority Bucket:</strong> ${task.priority_bucket ?? "N/A"}<br>
      <strong>Description:</strong> ${task.description ?? "No description provided"}<br>
      <strong>Notes:</strong> ${task.notes ?? "No notes provided"}
    </p>
    
    <p>Click <a href="${taskLink}" style="color: #357bdc; text-decoration: underline; font-weight: bold;">here</a> to view task</p>
    
    <p>Regards,<br>Task Reminder Bot</p>
  </body>
</html>
        `;
      } else if (diffDays === 0) {
        reminderType = "due_today";
        subject = `Reminder: Task "${task.title}" is due today`;
        content = `
<html>
  <body style="font-family: Arial, sans-serif; line-height: 1.6;">
    <p>Hello,</p>
    
    <p>Your task <strong>"${task.title}"</strong> is due today <strong>(${deadlineSGT
          .toISOString()
          .slice(0, 10)})</strong>.</p>
    
    <p>
      <strong>Status:</strong> ${task.status ?? "N/A"}<br>
      <strong>Priority Bucket:</strong> ${task.priority_bucket ?? "N/A"}<br>
      <strong>Description:</strong> ${task.description ?? "No description provided"}<br>
      <strong>Notes:</strong> ${task.notes ?? "No notes provided"}
    </p>
    
    <p>Please complete this task before the deadline.</p>
    
    <p>Click <a href="${taskLink}" style="color: #357bdc; text-decoration: underline; font-weight: bold;">here</a> to view task</p>
    
    <p>Regards,<br>Task Reminder Bot</p>
  </body>
</html>
        `;
      } else if (diffDays === 1) {
        reminderType = "overdue";
        subject = `Overdue: Task "${task.title}" is past due`;
        content = `
<html>
  <body style="font-family: Arial, sans-serif; line-height: 1.6;">
    <p>Hello,</p>
    
    <p>Your task <strong>"${task.title}"</strong> was due on <strong>${deadlineSGT
          .toISOString()
          .slice(0, 10)}</strong> and is now overdue.</p>
    
    <p>
      <strong>Status:</strong> ${task.status ?? "N/A"}<br>
      <strong>Priority Bucket:</strong> ${task.priority_bucket ?? "N/A"}<br>
      <strong>Description:</strong> ${task.description ?? "No description provided"}<br>
      <strong>Notes:</strong> ${task.notes ?? "No notes provided"}
    </p>
    
    <p><strong>Please take action immediately.</strong></p>
    
    <p>Click <a href="${taskLink}" style="color: #357bdc; text-decoration: underline; font-weight: bold;">here</a> to view task</p>
    
    <p>Regards,<br>Task Reminder Bot</p>
  </body>
</html>
        `;
      } else {
        // Only send reminders for tomorrow, today, or overdue (1 day)
        continue;
      }

      // 3. Find assignees for this task
      const taskAssignees = (assignments as TaskAssignment[]).filter(
        (assignment) => assignment.task_id === task.id
      );

      if (taskAssignees.length === 0) {
        console.log(`No assignees for task: ${task.title}`);
        continue;
      }

      for (const assignment of taskAssignees) {
        // Use passed config (required, not optional)
        const email = await getUserEmail(
          assignment.assignee_id,
          supabaseConfig.url,
          supabaseConfig.serviceRoleKey
        );

        if (!email) {
          console.warn(
            `Could not fetch email for assignee ${assignment.assignee_id} on task ${task.id}`
          );
          continue;
        }

        try {
          await sendEmailFunc({
            to: email,
            from: "joel.wang.2023@scis.smu.edu.sg",
            subject,
            content,
            isHtml: true,
          });

          sentCount++;
          emailsSent.push({
            taskId: task.id,
            taskTitle: task.title,
            assigneeId: assignment.assignee_id,
            assigneeEmail: email,
            reminderType,
            sentAt: new Date().toISOString(),
          });

          console.log(
            `Email sent to ${email} for task "${task.title}" (${reminderType})`
          );
        } catch (emailErr) {
          console.error(
            `Failed to send email to ${email} for task ${task.id}:`,
            emailErr instanceof Error ? emailErr.message : emailErr
          );
          // Continue to next assignment even if this one fails
        }
      }
    }

    console.log(`\nTask Reminder Summary: ${sentCount} reminders sent`);
    return { success: true, sent: sentCount, emailsSent };
  } catch (err) {
    console.error("Error in sendTaskReminders:", err);
    throw err;
  }
}