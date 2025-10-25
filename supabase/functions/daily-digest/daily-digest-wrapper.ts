// @ts-nocheck: Deno environment doesn't have full TypeScript support for edge functions

interface TaskSummary {
  id: string;
  title: string;
  status: string;
  priority_bucket: string;
  deadline: string | null;
  daysUntilDue?: number;
  formattedDeadline?: string;
}

interface UserDigest {
  userId: string;
  userEmail: string;
  userName?: string;
  overdueTasks: TaskSummary[];
  dueTodayTasks: TaskSummary[];
  upcomingTasks: TaskSummary[];
  completedTasks: TaskSummary[];
  inProgressTasks: TaskSummary[];
}

interface SendDailyDigestResult {
  success: boolean;
  sent: number;
  digestsSent: Array<{
    userId: string;
    userEmail: string;
    sentAt: string;
  }>;
}

interface SupabaseConfig {
  url: string;
  serviceRoleKey: string;
}

interface TaskAssignment {
  task_id: string;
  assignee_id: string;
}

interface Task {
  id: string;
  title: string;
  description?: string | null;
  status?: string | null;
  is_archived: boolean;
  notes?: string | null;
  priority_bucket?: number | string | null;
  deadline?: string | null;
}

// Helper: Fetch user email via Supabase Admin API
async function getUserEmail(
  userId: string,
  supabaseUrl: string,
  serviceRoleKey: string
): Promise<string | null> {
  try {
    const url = `${supabaseUrl}/auth/v1/admin/users/${userId}`;
    const res = await fetch(url, {
      headers: {
        apiKey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    });

    if (!res.ok) {
      console.error(`Failed to fetch user ${userId}:`, await res.text());
      return null;
    }

    const user = await res.json();
    return user?.email ?? null;
  } catch (error) {
    console.error(`Error fetching user ${userId}:`, error);
    return null;
  }
}

// Helper: Calculate days until deadline
function calculateDaysUntilDue(deadline: string): number {
  const now = new Date();
  const sgNow = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Singapore" })
  );
  sgNow.setHours(0, 0, 0, 0);

  const deadlineUTC = new Date(deadline);
  const deadlineSGT = new Date(
    deadlineUTC.toLocaleString("en-US", { timeZone: "Asia/Singapore" })
  );
  deadlineSGT.setHours(0, 0, 0, 0);

  return Math.floor(
    (deadlineSGT.getTime() - sgNow.getTime()) / (1000 * 60 * 60 * 24)
  );
}

function formatDeadline(deadline: string): string {
  const deadlineUTC = new Date(deadline);

  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Singapore",
    hour12: true,
  };

  return deadlineUTC.toLocaleString("en-US", options) + " SGT";
}

// Helper: Categorize task by deadline
function categorizeTask(task: Task): string {
  if (
    task.status?.toLowerCase() === "completed" ||
    task.status?.toLowerCase() === "done"
  ) {
    return "completed";
  }

  if (!task.deadline) {
    return "noDeadline";
  }

  const daysUntilDue = calculateDaysUntilDue(task.deadline);

  if (daysUntilDue < 0) {
    return "overdue";
  } else if (daysUntilDue === 0) {
    return "dueToday";
  } else if (daysUntilDue <= 14) {
    return "upcoming";
  }

  return "other";
}

// Helper: Format task for digest
function formatTaskForDigest(task: Task): TaskSummary {
  return {
    id: task.id,
    title: task.title,
    status: task.status ?? "No Status",
    priority_bucket: String(task.priority_bucket ?? "No Priority Set"),
    deadline: task.deadline ?? null,
    daysUntilDue: task.deadline
      ? calculateDaysUntilDue(task.deadline)
      : undefined,
    formattedDeadline: task.deadline ? formatDeadline(task.deadline) : undefined,
  };
}

function getPriorityDisplay(priorityBucket: number | string): string {
  const priority =
    typeof priorityBucket === "string"
      ? parseInt(priorityBucket)
      : priorityBucket;

  let color = "#558b2f"; // Low (default)
  if (priority >= 8) {
    color = "#b71c1c"; // Critical
  } else if (priority >= 6) {
    color = "#d32f2f"; // High
  } else if (priority >= 4) {
    color = "#f57c00"; // Medium
  }

  return `<span style="color: ${color}; font-weight: bold;">${priority}/10</span>`;
}

// Helper: Generate HTML digest email
function generateDigestHTML(digest: UserDigest): string {
  const taskLink = (taskId: string): string =>
    `https://x-men-rosy.vercel.app/task/${taskId}`;

  const renderTaskList = (tasks: TaskSummary[], title: string): string => {
    if (tasks.length === 0) return "";

    const taskCards = tasks
      .map(
        (task: TaskSummary): string => `
      <div style="background-color: #f9f9f9; border: 1px solid #e0e0e0; border-radius: 6px; padding: 16px; margin-bottom: 12px; break-inside: avoid;">
        <div style="margin-bottom: 12px;">
          <a href="${taskLink(task.id)}" style="color: #357bdc; text-decoration: none; font-weight: 600; font-size: 16px; word-break: break-word; word-wrap: break-word; overflow-wrap: break-word; display: block;">
            ${task.title}
          </a>
        </div>
        
        <div style="display: flex; flex-direction: column; gap: 8px; font-size: 14px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="color: #666; font-weight: 500;">Status:</span>
            <span style="background-color: #e3f2fd; padding: 4px 8px; border-radius: 4px; white-space: nowrap;">
              ${task.status}
            </span>
          </div>
          
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="color: #666; font-weight: 500;">Priority:</span>
            <div>
              ${getPriorityDisplay(task.priority_bucket)}
            </div>
          </div>
          
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <span style="color: #666; font-weight: 500;">Deadline:</span>
            <span style="color: #357bdc; text-align: right; word-wrap: break-word; overflow-wrap: break-word;">
              ${
                task.formattedDeadline
                  ? task.formattedDeadline
                  : task.daysUntilDue !== undefined
                  ? task.daysUntilDue < 0
                    ? `<span style="color: #d32f2f; font-weight: bold;">${Math.abs(task.daysUntilDue)} days overdue</span>`
                    : task.daysUntilDue === 0
                    ? '<span style="color: #f57c00; font-weight: bold;">Today</span>'
                    : `<span style="color: #558b2f;">${task.daysUntilDue} days left</span>`
                  : "N/A"
              }
            </span>
          </div>
        </div>
      </div>
    `
      )
      .join("");

    return `
    <h3 style="color: #333; margin-top: 24px; margin-bottom: 16px; border-bottom: 2px solid #357bdc; padding-bottom: 8px; font-size: 18px;">
      ${title} (${tasks.length})
    </h3>
    <div>
      ${taskCards}
    </div>
    `;
  };

  return `
<html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      @media (max-width: 600px) {
        body { font-size: 14px; }
        .container { padding: 16px !important; }
        h1 { font-size: 24px !important; }
        h3 { font-size: 16px !important; }
        .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
        .stats-item { padding: 12px !important; }
        .stats-value { font-size: 20px !important; }
        .task-card { padding: 12px !important; }
        .task-title { word-break: break-word !important; overflow-wrap: break-word !important; word-wrap: break-word !important; }
      }
    </style>
  </head>
  <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f9f9f9; margin: 0; padding: 0;">
    <div class="container" style="max-width: 900px; margin: 0 auto; background-color: #ffffff; padding: 32px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 32px; border-bottom: 3px solid #357bdc; padding-bottom: 16px;">
        <h1 style="color: #357bdc; margin: 0; font-size: 28px;">Daily Task Digest</h1>
        <p style="color: #666; margin: 8px 0 0 0; font-size: 14px;">
          ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      <!-- Welcome -->
      <p style="font-size: 16px; margin-bottom: 24px;">
        Hi ${digest.userName || "there"},<br>
        <br>
        Here's a summary of your tasks for today. Stay on top of your work!
      </p>

      <!-- Summary Stats -->
      <div class="stats-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px;">
        <div class="stats-item" style="background-color: #ffebee; padding: 16px; border-radius: 8px; text-align: center;">
          <div class="stats-value" style="font-size: 24px; font-weight: bold; color: #d32f2f;">${digest.overdueTasks.length}</div>
          <div style="font-size: 12px; color: #c62828; margin-top: 4px;">Overdue</div>
        </div>
        <div class="stats-item" style="background-color: #fff3e0; padding: 16px; border-radius: 8px; text-align: center;">
          <div class="stats-value" style="font-size: 24px; font-weight: bold; color: #f57c00;">${digest.dueTodayTasks.length}</div>
          <div style="font-size: 12px; color: #e65100; margin-top: 4px;">Due Today</div>
        </div>
        <div class="stats-item" style="background-color: #e8f5e9; padding: 16px; border-radius: 8px; text-align: center;">
          <div class="stats-value" style="font-size: 24px; font-weight: bold; color: #558b2f;">${digest.upcomingTasks.length}</div>
          <div style="font-size: 12px; color: #33691e; margin-top: 4px;">Upcoming</div>
        </div>
        <div class="stats-item" style="background-color: #e0f2f1; padding: 16px; border-radius: 8px; text-align: center;">
          <div class="stats-value" style="font-size: 24px; font-weight: bold; color: #00796b;">${digest.completedTasks.length}</div>
          <div style="font-size: 12px; color: #004d40; margin-top: 4px;">Completed</div>
        </div>
      </div>

      <!-- Task Lists -->
      ${digest.overdueTasks.length > 0 ? renderTaskList(digest.overdueTasks, "Overdue Tasks") : ""}
      ${digest.dueTodayTasks.length > 0 ? renderTaskList(digest.dueTodayTasks, "Due Today") : ""}
      ${digest.upcomingTasks.length > 0 ? renderTaskList(digest.upcomingTasks, "Upcoming - Next 14 Days") : ""}
      ${digest.completedTasks.length > 0 ? renderTaskList(digest.completedTasks, "Completed") : ""}

      <!-- Footer -->
      <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e0e0e0; text-align: center; font-size: 12px; color: #999;">
        <p>This is an automated digest email. Visit <a href="https://x-men-rosy.vercel.app" style="color: #357bdc; text-decoration: none;">X-Men</a> to manage your tasks.</p>
        <p>© 2025 X-Men Task Management. All rights reserved.</p>
      </div>

    </div>
  </body>
</html>
  `;
}

/**
 * Core send daily digest logic
 *
 * This is the SAME logic used by the Deno edge function,
 * but extracted to a separate file that works in both:
 * - Deno runtime (production)
 * - Node.js runtime (Vitest integration tests)
 *
 * @param supabase - Supabase client instance
 * @param sendEmailFunc - Email sending function (SendGrid or mock)
 * @param supabaseConfig - Required config with URL and service role key
 * @param users - Array of users to send digests to (from Supabase Auth)
 */
export async function sendDailyDigest(
  supabase: any,
  sendEmailFunc: any,
  supabaseConfig: SupabaseConfig,
  users: any[]
): Promise<SendDailyDigestResult> {
  try {
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

    let sentCount = 0;
    const digestsSent: Array<{
      userId: string;
      userEmail: string;
      sentAt: string;
    }> = [];

    // Fetch all tasks
    const { data: tasks, error: taskErr } = await supabase
      .from("tasks")
      .select(
        "id, title, description, status, is_archived, notes, priority_bucket, deadline"
      );

    if (taskErr) throw taskErr;

    // Fetch all task assignments
    const { data: assignments, error: assignErr } = await supabase
      .from("task_assignments")
      .select("task_id, assignee_id");

    if (assignErr) throw assignErr;

    // For each user, filter their tasks and send digest
    for (const user of users) {
      const userId = user.id;
      const userEmail = user.email;

      if (!userEmail) {
        console.warn(`User ${userId} has no email, skipping`);
        continue;
      }

      try {
        // Filter assignments for this user - WITH TYPE ANNOTATION
        const userAssignments: TaskAssignment[] = (assignments as TaskAssignment[]).filter(
          (a: TaskAssignment): boolean => a.assignee_id === userId
        );

        if (!userAssignments || userAssignments.length === 0) {
          console.log(
            `User ${userEmail} has no assigned tasks, skipping digest`
          );
          continue;
        }

        const userTaskIds: string[] = userAssignments.map(
          (a: TaskAssignment): string => a.task_id
        );

        // Filter tasks for this user and apply conditions - WITH TYPE ANNOTATION
        const userTasks: Task[] = (tasks as Task[]).filter(
          (task: Task): boolean => {
            // Skip archived tasks
            if (task.is_archived) return false;

            // Skip tasks not assigned to this user
            if (!userTaskIds.includes(task.id)) return false;

            // Skip tasks with no deadline
            if (!task.deadline) return false;

            return true;
          }
        );

        if (userTasks.length === 0) {
          console.log(
            `User ${userEmail} has no active tasks with deadlines, skipping digest`
          );
          continue;
        }

        // Categorize tasks
        const overdueTasks: TaskSummary[] = [];
        const dueTodayTasks: TaskSummary[] = [];
        const upcomingTasks: TaskSummary[] = [];
        const completedTasks: TaskSummary[] = [];
        const inProgressTasks: TaskSummary[] = [];

        for (const task of userTasks) {
          const category: string = categorizeTask(task);
          const formattedTask: TaskSummary = formatTaskForDigest(task);

          if (category === "overdue") {
            overdueTasks.push(formattedTask);
          } else if (category === "dueToday") {
            dueTodayTasks.push(formattedTask);
          } else if (category === "upcoming") {
            upcomingTasks.push(formattedTask);
          } else if (category === "completed") {
            completedTasks.push(formattedTask);
          } else if (category !== "noDeadline") {
            inProgressTasks.push(formattedTask);
          }
        }

        // Skip if user has no tasks to show
        if (
          overdueTasks.length === 0 &&
          dueTodayTasks.length === 0 &&
          upcomingTasks.length === 0 &&
          completedTasks.length === 0
        ) {
          console.log(
            `User ${userEmail} has no tasks to report, skipping digest`
          );
          continue;
        }

        // Generate and send email
        const digest: UserDigest = {
          userId,
          userEmail,
          overdueTasks,
          dueTodayTasks,
          upcomingTasks,
          completedTasks,
          inProgressTasks,
        };

        const htmlContent: string = generateDigestHTML(digest);

        await sendEmailFunc({
          to: userEmail,
          from: "joel.wang.2023@scis.smu.edu.sg",
          subject: "Your Daily Task Digest",
          content: htmlContent,
          isHtml: true,
        });

        sentCount++;
        digestsSent.push({
          userId,
          userEmail,
          sentAt: new Date().toISOString(),
        });

        console.log(`Daily digest sent to ${userEmail}`);
      } catch (err) {
        console.error(
          `Failed to send digest to user ${userId}:`,
          err instanceof Error ? err.message : err
        );
      }
    }

    console.log(`Daily Digest Summary: ${sentCount} digests sent`);
    return { success: true, sent: sentCount, digestsSent };
  } catch (err) {
    console.error("Error in sendDailyDigest:", err);
    throw err;
  }
}