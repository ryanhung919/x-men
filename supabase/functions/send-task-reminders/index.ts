// @ts-nocheck
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail } from "../_shared/sendEmail.ts";

// const supabase = createClient(
//   Deno.env.get("SUPABASE_URL") ?? "",
//   Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
// );

// Lazy initialization - only create when needed
let supabase: any = null;

function getSupabaseClient() {
  if (!supabase) {
    supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
  }
  return supabase;
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

// Helper: Fetch user email via Supabase Admin API
async function getUserEmail(userId: string): Promise<string | null> {
  const url = `${Deno.env.get("SUPABASE_URL")}/auth/v1/admin/users/${userId}`;
  const res = await fetch(url, {
    headers: {
      apiKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
    },
  });

  if (!res.ok) {
    console.error(`Failed to fetch user ${userId}:`, await res.text());
    return null;
  }

  const user = await res.json();
  return user?.email ?? null;
}

export async function sendTaskReminders(
  supabase: any,
  sendEmailFunc: any
): Promise<SendTaskRemindersResult> {
  try {
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

    // 2. Fetch task assignments
    const { data: assignments, error: assignErr } = await supabase
      .from("task_assignments")
      .select("task_id, assignee_id");

    if (assignErr) throw assignErr;

    let sentCount = 0;
    const emailsSent: EmailSentRecord[] = [];

    for (const task of tasks) {
      // skip invalid tasks
      if (task.is_archived) continue;
      if (
        task.status?.toLowerCase() === "completed" ||
        task.status?.toLowerCase() === "done"
      )
        continue;
      if (!task.deadline) continue;

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

      let subject, content, reminderType: "due_today" | "due_tomorrow" | "overdue";
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
        continue; // only care about due tomorrow, due today, or overdue
      }

      // 3. Find assignees for this task
      const taskAssignees = assignments.filter((a) => a.task_id === task.id);

      for (const assign of taskAssignees) {
        const email = await getUserEmail(assign.assignee_id);
        if (!email) {
          console.warn(
            `Could not fetch email for assignee ${assign.assignee_id} on task ${task.id}`
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
            assigneeId: assign.assignee_id,
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
        }
      }
    }

    console.log(`Task Reminder Summary: ${sentCount} reminders sent`);
    return { success: true, sent: sentCount, emailsSent };
  } catch (err) {
    console.error("Error in sendTaskReminders:", err);
    throw err;
  }
}

Deno.serve(async (_req: Request) => {
  try {
    const result = await sendTaskReminders(getSupabaseClient(), sendEmail);
    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error("Error in Deno.serve:", err);
    return new Response(
      JSON.stringify({
        success: false,
        sent: 0,
        emailsSent: [],
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});