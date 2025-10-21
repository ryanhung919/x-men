//@ts-ignore
import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.208.0/assert/mod.ts";
//@ts-ignore
import { sendTaskReminders } from "../../../../../supabase/functions/send-task-reminders/task-reminders-wrapper.js";

// Helper to create mock Supabase client
function createMockSupabase(tasks: any[], assignments: any[]) {
  return {
    from: (table: string) => ({
      select: () => {
        if (table === "tasks") {
          return { data: tasks, error: null };
        }
        if (table === "task_assignments") {
          return { data: assignments, error: null };
        }
      },
    }),
  };
}

// Helper to mock fetch for getUserEmail
function mockFetchForUsers(userEmailMap: Record<string, string>) {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const userId = (url as string).split("/").pop();

    if (!userId) {
      return new Response("Not found", { status: 404 });
    }

    const email = userEmailMap[userId];

    if (email) {
      return new Response(JSON.stringify({ email }), { status: 200 });
    }
    return new Response("Not found", { status: 404 });
  }) as typeof globalThis.fetch;

  return () => {
    globalThis.fetch = originalFetch;
  };
}

function suppressLogs() {
  const logs = [console.log, console.error, console.warn];
  console.log = console.error = console.warn = () => {};
  return () => {
    [console.log, console.error, console.warn] = logs;
  };
}

// ============ HAPPY PATH TESTS ============

// @ts-ignore
Deno.test("Should send reminder for task due tomorrow", async () => {
  const restore = suppressLogs();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const tasks = [
    {
      id: "task-1",
      title: "Complete project proposal",
      description: "Finish the Q4 proposal",
      status: "in_progress",
      is_archived: false,
      notes: "High priority",
      priority_bucket: "high",
      deadline: tomorrow.toISOString(),
    },
  ];

  const assignments = [{ task_id: "task-1", assignee_id: "user-1" }];

  const mockSupabase = createMockSupabase(tasks, assignments);
  let emailsSent: any[] = [];

  const mockSendEmail = async (params: any) => {
    emailsSent.push(params);
  };

  const restoreFetch = mockFetchForUsers({ "user-1": "joel@example.com" });

  // Pass config as third argument
  const result = await sendTaskReminders(mockSupabase, mockSendEmail, {
    url: "https://example.supabase.co",
    serviceRoleKey: "test-key",
  });

  assertEquals(result.success, true);
  assertEquals(result.sent, 1);
  assertEquals(result.emailsSent.length, 1);
  assertEquals(result.emailsSent[0].reminderType, "due_tomorrow");
  assertEquals(result.emailsSent[0].assigneeEmail, "joel@example.com");
  assertStringIncludes(result.emailsSent[0].taskTitle, "Complete project proposal");

  restoreFetch();
  restore();
});

// @ts-ignore
Deno.test("Should send reminder for task due today", async () => {
  const restore = suppressLogs();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tasks = [
    {
      id: "task-1",
      title: "Submit report",
      description: "Monthly report submission",
      status: "in_progress",
      is_archived: false,
      notes: "Due by EOD",
      priority_bucket: "medium",
      deadline: today.toISOString(),
    },
  ];

  const assignments = [{ task_id: "task-1", assignee_id: "user-1" }];
  const mockSupabase = createMockSupabase(tasks, assignments);
  let emailsSent: any[] = [];

  const mockSendEmail = async (params: any) => {
    emailsSent.push(params);
  };

  const restoreFetch = mockFetchForUsers({ "user-1": "jane@example.com" });

  const result = await sendTaskReminders(mockSupabase, mockSendEmail, {
    url: "https://example.supabase.co",
    serviceRoleKey: "test-key",
  });

  assertEquals(result.success, true);
  assertEquals(result.sent, 1);
  assertEquals(result.emailsSent[0].reminderType, "due_today");
  assertStringIncludes(emailsSent[0].subject, "due today");

  restoreFetch();
  restore();
});

// @ts-ignore
Deno.test("Should send reminder for overdue task", async () => {
  const restore = suppressLogs();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  const tasks = [
    {
      id: "task-1",
      title: "Overdue task",
      description: "This is overdue",
      status: "in_progress",
      is_archived: false,
      notes: "Urgent",
      priority_bucket: "high",
      deadline: yesterday.toISOString(),
    },
  ];

  const assignments = [{ task_id: "task-1", assignee_id: "user-1" }];
  const mockSupabase = createMockSupabase(tasks, assignments);
  let emailsSent: any[] = [];

  const mockSendEmail = async (params: any) => {
    emailsSent.push(params);
  };

  const restoreFetch = mockFetchForUsers({ "user-1": "john@example.com" });

  const result = await sendTaskReminders(mockSupabase, mockSendEmail, {
    url: "https://example.supabase.co",
    serviceRoleKey: "test-key",
  });

  assertEquals(result.success, true);
  assertEquals(result.sent, 1);
  assertEquals(result.emailsSent[0].reminderType, "overdue");
  assertStringIncludes(emailsSent[0].subject, "Overdue");

  restoreFetch();
  restore();
});

// @ts-ignore
Deno.test("Should send reminders to multiple assignees for same task", async () => {
  const restore = suppressLogs();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const tasks = [
    {
      id: "task-1",
      title: "Team project",
      description: "Collaborative task",
      status: "in_progress",
      is_archived: false,
      notes: "Team effort",
      priority_bucket: "high",
      deadline: tomorrow.toISOString(),
    },
  ];

  const assignments = [
    { task_id: "task-1", assignee_id: "user-1" },
    { task_id: "task-1", assignee_id: "user-2" },
    { task_id: "task-1", assignee_id: "user-3" },
  ];

  const mockSupabase = createMockSupabase(tasks, assignments);
  let emailsSent: any[] = [];

  const mockSendEmail = async (params: any) => {
    emailsSent.push(params);
  };

  const restoreFetch = mockFetchForUsers({
    "user-1": "alice@example.com",
    "user-2": "bob@example.com",
    "user-3": "charlie@example.com",
  });

  const result = await sendTaskReminders(mockSupabase, mockSendEmail, {
    url: "https://example.supabase.co",
    serviceRoleKey: "test-key",
  });

  assertEquals(result.success, true);
  assertEquals(result.sent, 3);
  assertEquals(result.emailsSent.length, 3);
  assertEquals(emailsSent.length, 3);

  restoreFetch();
  restore();
});

// @ts-ignore
Deno.test("Should include task link in email", async () => {
  const restore = suppressLogs();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const tasks = [
    {
      id: "task-abc123",
      title: "Test task",
      description: "Test",
      status: "in_progress",
      is_archived: false,
      notes: "Test",
      priority_bucket: "low",
      deadline: tomorrow.toISOString(),
    },
  ];

  const assignments = [{ task_id: "task-abc123", assignee_id: "user-1" }];
  const mockSupabase = createMockSupabase(tasks, assignments);
  let emailsSent: any[] = [];

  const mockSendEmail = async (params: any) => {
    emailsSent.push(params);
  };

  const restoreFetch = mockFetchForUsers({ "user-1": "test@example.com" });

  const result = await sendTaskReminders(mockSupabase, mockSendEmail, {
    url: "https://example.supabase.co",
    serviceRoleKey: "test-key",
  });

  assertStringIncludes(emailsSent[0].content, "https://x-men-rosy.vercel.app/task/task-abc123");
  assertStringIncludes(emailsSent[0].content, "Click");
  assertStringIncludes(emailsSent[0].content, "here");

  restoreFetch();
  restore();
});

// ============ NEGATIVE PATH TESTS ============

// @ts-ignore
Deno.test("Should skip archived tasks", async () => {
  const restore = suppressLogs();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const tasks = [
    {
      id: "task-1",
      title: "Archived task",
      description: "This is archived",
      status: "in_progress",
      is_archived: true,
      notes: "Old task",
      priority_bucket: "low",
      deadline: tomorrow.toISOString(),
    },
  ];

  const assignments = [{ task_id: "task-1", assignee_id: "user-1" }];
  const mockSupabase = createMockSupabase(tasks, assignments);
  let emailsSent: any[] = [];

  const mockSendEmail = async (params: any) => {
    emailsSent.push(params);
  };

  const restoreFetch = mockFetchForUsers({ "user-1": "test@example.com" });

  const result = await sendTaskReminders(mockSupabase, mockSendEmail, {
    url: "https://example.supabase.co",
    serviceRoleKey: "test-key",
  });

  assertEquals(result.sent, 0);
  assertEquals(emailsSent.length, 0);

  restoreFetch();
  restore();
});

// @ts-ignore
Deno.test("Should skip completed tasks", async () => {
  const restore = suppressLogs();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const tasks = [
    {
      id: "task-1",
      title: "Completed task",
      description: "Already done",
      status: "completed",
      is_archived: false,
      notes: "Done",
      priority_bucket: "low",
      deadline: tomorrow.toISOString(),
    },
  ];

  const assignments = [{ task_id: "task-1", assignee_id: "user-1" }];
  const mockSupabase = createMockSupabase(tasks, assignments);
  let emailsSent: any[] = [];

  const mockSendEmail = async (params: any) => {
    emailsSent.push(params);
  };

  const restoreFetch = mockFetchForUsers({ "user-1": "test@example.com" });

  const result = await sendTaskReminders(mockSupabase, mockSendEmail, {
    url: "https://example.supabase.co",
    serviceRoleKey: "test-key",
  });

  assertEquals(result.sent, 0);

  restoreFetch();
  restore();
});

// @ts-ignore
Deno.test("Should skip tasks with no deadline", async () => {
  const restore = suppressLogs();
  const tasks = [
    {
      id: "task-1",
      title: "No deadline task",
      description: "No due date",
      status: "in_progress",
      is_archived: false,
      notes: "Flexible",
      priority_bucket: "low",
      deadline: null,
    },
  ];

  const assignments = [{ task_id: "task-1", assignee_id: "user-1" }];
  const mockSupabase = createMockSupabase(tasks, assignments);
  let emailsSent: any[] = [];

  const mockSendEmail = async (params: any) => {
    emailsSent.push(params);
  };

  const restoreFetch = mockFetchForUsers({ "user-1": "test@example.com" });

  const result = await sendTaskReminders(mockSupabase, mockSendEmail, {
    url: "https://example.supabase.co",
    serviceRoleKey: "test-key",
  });

  assertEquals(result.sent, 0);

  restoreFetch();
  restore();
});

// @ts-ignore
Deno.test("Should handle missing user email gracefully", async () => {
  const restore = suppressLogs();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const tasks = [
    {
      id: "task-1",
      title: "Task with invalid user",
      description: "Test",
      status: "in_progress",
      is_archived: false,
      notes: "Test",
      priority_bucket: "low",
      deadline: tomorrow.toISOString(),
    },
  ];

  const assignments = [{ task_id: "task-1", assignee_id: "user-invalid" }];
  const mockSupabase = createMockSupabase(tasks, assignments);
  let emailsSent: any[] = [];

  const mockSendEmail = async (params: any) => {
    emailsSent.push(params);
  };

  const restoreFetch = mockFetchForUsers({});

  const result = await sendTaskReminders(mockSupabase, mockSendEmail, {
    url: "https://example.supabase.co",
    serviceRoleKey: "test-key",
  });

  assertEquals(result.sent, 0);
  assertEquals(emailsSent.length, 0);

  restoreFetch();
  restore();
});

// @ts-ignore
Deno.test("Should handle email sending failures gracefully", async () => {
  const restore = suppressLogs();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const tasks = [
    {
      id: "task-1",
      title: "Task with send failure",
      description: "Test",
      status: "in_progress",
      is_archived: false,
      notes: "Test",
      priority_bucket: "low",
      deadline: tomorrow.toISOString(),
    },
  ];

  const assignments = [{ task_id: "task-1", assignee_id: "user-1" }];
  const mockSupabase = createMockSupabase(tasks, assignments);

  const mockSendEmail = async (params: any) => {
    throw new Error("SendGrid API error");
  };

  const restoreFetch = mockFetchForUsers({ "user-1": "test@example.com" });

  const result = await sendTaskReminders(mockSupabase, mockSendEmail, {
    url: "https://example.supabase.co",
    serviceRoleKey: "test-key",
  });

  assertEquals(result.sent, 0);

  restoreFetch();
  restore();
});

// ============ BOUNDARY TESTS ============

// @ts-ignore
Deno.test("Should NOT send reminder 2+ days BEFORE deadline", async () => {
  const restore = suppressLogs();

  const twoDaysFromNow = new Date();
  twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
  twoDaysFromNow.setHours(0, 0, 0, 0);

  const tasks = [
    {
      id: "task-1",
      title: "Due in 2 days",
      description: "Beyond the threshold",
      status: "in_progress",
      is_archived: false,
      notes: "Should not send",
      priority_bucket: "high",
      deadline: twoDaysFromNow.toISOString(),
    },
  ];

  const assignments = [{ task_id: "task-1", assignee_id: "user-1" }];
  const mockSupabase = createMockSupabase(tasks, assignments);
  let emailsSent: any[] = [];

  const mockSendEmail = async (params: any) => {
    emailsSent.push(params);
  };

  const restoreFetch = mockFetchForUsers({ "user-1": "test@example.com" });

  const result = await sendTaskReminders(mockSupabase, mockSendEmail, {
    url: "https://example.supabase.co",
    serviceRoleKey: "test-key",
  });

  assertEquals(result.sent, 0);
  assertEquals(emailsSent.length, 0);

  restoreFetch();
  restore();
});

// @ts-ignore
Deno.test("Should NOT send reminder 2+ days AFTER deadline", async () => {
  const restore = suppressLogs();

  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  twoDaysAgo.setHours(0, 0, 0, 0);

  const tasks = [
    {
      id: "task-1",
      title: "Very overdue task",
      description: "2 days past deadline",
      status: "in_progress",
      is_archived: false,
      notes: "Should not send",
      priority_bucket: "high",
      deadline: twoDaysAgo.toISOString(),
    },
  ];

  const assignments = [{ task_id: "task-1", assignee_id: "user-1" }];
  const mockSupabase = createMockSupabase(tasks, assignments);
  let emailsSent: any[] = [];

  const mockSendEmail = async (params: any) => {
    emailsSent.push(params);
  };

  const restoreFetch = mockFetchForUsers({ "user-1": "test@example.com" });

  const result = await sendTaskReminders(mockSupabase, mockSendEmail, {
    url: "https://example.supabase.co",
    serviceRoleKey: "test-key",
  });

  assertEquals(result.sent, 0);
  assertEquals(emailsSent.length, 0);

  restoreFetch();
  restore();
});

// ============ EDGE CASES ============

// @ts-ignore
Deno.test("Should handle special characters in task title", async () => {
  const restore = suppressLogs();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const tasks = [
    {
      id: "task-1",
      title: `Task with "quotes" & <tags> 'special' chars`,
      description: "Test special chars",
      status: "in_progress",
      is_archived: false,
      notes: "Special: &\"'<>",
      priority_bucket: "low",
      deadline: tomorrow.toISOString(),
    },
  ];

  const assignments = [{ task_id: "task-1", assignee_id: "user-1" }];
  const mockSupabase = createMockSupabase(tasks, assignments);
  let emailsSent: any[] = [];

  const mockSendEmail = async (params: any) => {
    emailsSent.push(params);
  };

  const restoreFetch = mockFetchForUsers({ "user-1": "test@example.com" });

  const result = await sendTaskReminders(mockSupabase, mockSendEmail, {
    url: "https://example.supabase.co",
    serviceRoleKey: "test-key",
  });

  assertEquals(result.sent, 1);
  assertStringIncludes(emailsSent[0].subject, "quotes");

  restoreFetch();
  restore();
});