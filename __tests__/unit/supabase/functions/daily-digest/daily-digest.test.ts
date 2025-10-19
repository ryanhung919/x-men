//@ts-ignore
import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.208.0/assert/mod.ts";
//@ts-ignore
import { sendDailyDigest } from "../../../../../supabase/functions/daily-digest/daily-digest-wrapper.ts";

// Helper to create mock Supabase client
function createMockSupabase(tasks: any[], assignments: any[]) {
  return {
    from: (table: string) => ({
      select: () => ({
        data:
          table === "tasks"
            ? tasks
            : table === "task_assignments"
            ? assignments
            : [],
        error: null,
      }),
    }),
  };
}

// Helper to mock fetch for getUserEmail and admin users endpoint
function mockFetchForUsers(
  userEmailMap: Record<string, string>,
  users: any[] = []
) {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
        ? input.toString()
        : (input as any).url;

    // Check if this is the admin users LIST endpoint
    if ((url as string).includes("/auth/v1/admin/users")) {
      const parts = (url as string).split("/");
      const lastPart = parts[parts.length - 1].split("?")[0]; // Remove query params

      // If lastPart is "users" or empty, it's the list endpoint
      // If it looks like a UUID (has dashes), it's a single user lookup
      if (lastPart === "users" || lastPart === "") {
        return new Response(JSON.stringify({ users }), { status: 200 });
      }

      // Otherwise, it's a single user lookup
      const userId = lastPart;
      const email = userEmailMap[userId];
      if (email) {
        return new Response(JSON.stringify({ email }), { status: 200 });
      }
      return new Response("Not found", { status: 404 });
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
Deno.test("Should send digest with all task categories", async () => {
  const restore = suppressLogs();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  nextWeek.setHours(0, 0, 0, 0);

  const tasks = [
    {
      id: "task-1",
      title: "Overdue task",
      description: "This is overdue",
      status: "in_progress",
      is_archived: false,
      notes: "Urgent",
      priority_bucket: 8,
      deadline: yesterday.toISOString(),
    },
    {
      id: "task-2",
      title: "Due today",
      description: "Today submission",
      status: "in_progress",
      is_archived: false,
      notes: "EOD deadline",
      priority_bucket: 7,
      deadline: today.toISOString(),
    },
    {
      id: "task-3",
      title: "Due tomorrow",
      description: "Tomorrow deadline",
      status: "in_progress",
      is_archived: false,
      notes: "Next day",
      priority_bucket: 5,
      deadline: tomorrow.toISOString(),
    },
    {
      id: "task-4",
      title: "Upcoming task",
      description: "Next week task",
      status: "in_progress",
      is_archived: false,
      notes: "Future task",
      priority_bucket: 3,
      deadline: nextWeek.toISOString(),
    },
    {
      id: "task-5",
      title: "Completed task",
      description: "Already finished",
      status: "done",
      is_archived: false,
      notes: "Finished",
      priority_bucket: 2,
      deadline: today.toISOString(),
    },
  ];

  const assignments = [
    { task_id: "task-1", assignee_id: "user-1" },
    { task_id: "task-2", assignee_id: "user-1" },
    { task_id: "task-3", assignee_id: "user-1" },
    { task_id: "task-4", assignee_id: "user-1" },
    { task_id: "task-5", assignee_id: "user-1" },
  ];

  const mockSupabase = createMockSupabase(tasks, assignments);
  let emailsSent: any[] = [];

  const mockSendEmail = async (params: any) => {
    emailsSent.push(params);
  };

  const restoreFetch = mockFetchForUsers(
    { "user-1": "user1@example.com" },
    [{ id: "user-1", email: "user1@example.com" }]
  );

  // Updated: Pass config and users as parameters
  const result = await sendDailyDigest(
    mockSupabase,
    mockSendEmail,
    {
      url: "https://example.supabase.co",
      serviceRoleKey: "test-key",
    },
    [{ id: "user-1", email: "user1@example.com" }]
  );

  assertEquals(result.success, true);
  assertEquals(result.sent, 1);
  assertEquals(emailsSent.length, 1);
  assertStringIncludes(emailsSent[0].content, "Overdue");
  assertStringIncludes(emailsSent[0].content, "Due Today");
  assertStringIncludes(emailsSent[0].content, "Upcoming");
  assertStringIncludes(emailsSent[0].content, "Completed");

  restoreFetch();
  restore();
});

// @ts-ignore
Deno.test("Should send digests to multiple users", async () => {
  const restore = suppressLogs();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const tasks = [
    {
      id: "task-1",
      title: "Task 1",
      description: "Test",
      status: "in_progress",
      is_archived: false,
      notes: "Test",
      priority_bucket: 5,
      deadline: tomorrow.toISOString(),
    },
    {
      id: "task-2",
      title: "Task 2",
      description: "Test",
      status: "in_progress",
      is_archived: false,
      notes: "Test",
      priority_bucket: 6,
      deadline: tomorrow.toISOString(),
    },
  ];

  const assignments = [
    { task_id: "task-1", assignee_id: "user-1" },
    { task_id: "task-2", assignee_id: "user-2" },
  ];

  const mockSupabase = createMockSupabase(tasks, assignments);
  let emailsSent: any[] = [];

  const mockSendEmail = async (params: any) => {
    emailsSent.push(params);
  };

  const restoreFetch = mockFetchForUsers(
    { "user-1": "user1@example.com", "user-2": "user2@example.com" },
    [
      { id: "user-1", email: "user1@example.com" },
      { id: "user-2", email: "user2@example.com" },
    ]
  );

  // Updated: Pass config and users as parameters
  const result = await sendDailyDigest(
    mockSupabase,
    mockSendEmail,
    {
      url: "https://example.supabase.co",
      serviceRoleKey: "test-key",
    },
    [
      { id: "user-1", email: "user1@example.com" },
      { id: "user-2", email: "user2@example.com" },
    ]
  );

  assertEquals(result.success, true);
  assertEquals(result.sent, 2);
  assertEquals(emailsSent.length, 2);

  restoreFetch();
  restore();
});

// @ts-ignore
Deno.test("Should include formatted deadline in digest", async () => {
  const restore = suppressLogs();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(14, 30, 0, 0);

  const tasks = [
    {
      id: "task-1",
      title: "Task with deadline",
      description: "Test",
      status: "in_progress",
      is_archived: false,
      notes: "Test",
      priority_bucket: 7,
      deadline: tomorrow.toISOString(),
    },
  ];

  const assignments = [{ task_id: "task-1", assignee_id: "user-1" }];
  const mockSupabase = createMockSupabase(tasks, assignments);
  let emailsSent: any[] = [];

  const mockSendEmail = async (params: any) => {
    emailsSent.push(params);
  };

  const restoreFetch = mockFetchForUsers(
    { "user-1": "user1@example.com" },
    [{ id: "user-1", email: "user1@example.com" }]
  );

  // Updated: Pass config and users as parameters
  const result = await sendDailyDigest(
    mockSupabase,
    mockSendEmail,
    {
      url: "https://example.supabase.co",
      serviceRoleKey: "test-key",
    },
    [{ id: "user-1", email: "user1@example.com" }]
  );

  assertEquals(result.sent, 1);
  // Check for SGT formatted date
  assertStringIncludes(emailsSent[0].content, "SGT");

  restoreFetch();
  restore();
});

// @ts-ignore
Deno.test("Should include priority number in digest", async () => {
  const restore = suppressLogs();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const tasks = [
    {
      id: "task-1",
      title: "High priority task",
      description: "Test",
      status: "in_progress",
      is_archived: false,
      notes: "Test",
      priority_bucket: 8,
      deadline: tomorrow.toISOString(),
    },
  ];

  const assignments = [{ task_id: "task-1", assignee_id: "user-1" }];
  const mockSupabase = createMockSupabase(tasks, assignments);
  let emailsSent: any[] = [];

  const mockSendEmail = async (params: any) => {
    emailsSent.push(params);
  };

  const restoreFetch = mockFetchForUsers(
    { "user-1": "user1@example.com" },
    [{ id: "user-1", email: "user1@example.com" }]
  );

  // Updated: Pass config and users as parameters
  const result = await sendDailyDigest(
    mockSupabase,
    mockSendEmail,
    {
      url: "https://example.supabase.co",
      serviceRoleKey: "test-key",
    },
    [{ id: "user-1", email: "user1@example.com" }]
  );

  assertEquals(result.sent, 1);
  assertStringIncludes(emailsSent[0].content, "8/10");

  restoreFetch();
  restore();
});

// ============ NEGATIVE PATH TESTS ============

// @ts-ignore
Deno.test("Should skip users with no email", async () => {
  const restore = suppressLogs();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const tasks = [
    {
      id: "task-1",
      title: "Test task",
      description: "Test",
      status: "in_progress",
      is_archived: false,
      notes: "Test",
      priority_bucket: 5,
      deadline: tomorrow.toISOString(),
    },
  ];

  const assignments = [{ task_id: "task-1", assignee_id: "user-1" }];
  const mockSupabase = createMockSupabase(tasks, assignments);
  let emailsSent: any[] = [];

  const mockSendEmail = async (params: any) => {
    emailsSent.push(params);
  };

  const restoreFetch = mockFetchForUsers({}, [{ id: "user-1" }]); // No email

  // Updated: Pass config and users as parameters
  const result = await sendDailyDigest(
    mockSupabase,
    mockSendEmail,
    {
      url: "https://example.supabase.co",
      serviceRoleKey: "test-key",
    },
    [{ id: "user-1" }] // No email
  );

  assertEquals(result.sent, 0);
  assertEquals(emailsSent.length, 0);

  restoreFetch();
  restore();
});

// @ts-ignore
Deno.test("Should skip users with no assigned tasks", async () => {
  const restore = suppressLogs();

  const mockSupabase = createMockSupabase([], []);
  let emailsSent: any[] = [];

  const mockSendEmail = async (params: any) => {
    emailsSent.push(params);
  };

  const restoreFetch = mockFetchForUsers(
    { "user-1": "user1@example.com" },
    [{ id: "user-1", email: "user1@example.com" }]
  );

  // Updated: Pass config and users as parameters
  const result = await sendDailyDigest(
    mockSupabase,
    mockSendEmail,
    {
      url: "https://example.supabase.co",
      serviceRoleKey: "test-key",
    },
    [{ id: "user-1", email: "user1@example.com" }]
  );

  assertEquals(result.sent, 0);
  assertEquals(emailsSent.length, 0);

  restoreFetch();
  restore();
});

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
      notes: "Old",
      priority_bucket: 5,
      deadline: tomorrow.toISOString(),
    },
  ];

  const assignments = [{ task_id: "task-1", assignee_id: "user-1" }];
  const mockSupabase = createMockSupabase(tasks, assignments);
  let emailsSent: any[] = [];

  const mockSendEmail = async (params: any) => {
    emailsSent.push(params);
  };

  const restoreFetch = mockFetchForUsers(
    { "user-1": "user1@example.com" },
    [{ id: "user-1", email: "user1@example.com" }]
  );

  // Updated: Pass config and users as parameters
  const result = await sendDailyDigest(
    mockSupabase,
    mockSendEmail,
    {
      url: "https://example.supabase.co",
      serviceRoleKey: "test-key",
    },
    [{ id: "user-1", email: "user1@example.com" }]
  );

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
      description: "Flexible",
      status: "in_progress",
      is_archived: false,
      notes: "No deadline",
      priority_bucket: 5,
      deadline: null,
    },
  ];

  const assignments = [{ task_id: "task-1", assignee_id: "user-1" }];
  const mockSupabase = createMockSupabase(tasks, assignments);
  let emailsSent: any[] = [];

  const mockSendEmail = async (params: any) => {
    emailsSent.push(params);
  };

  const restoreFetch = mockFetchForUsers(
    { "user-1": "user1@example.com" },
    [{ id: "user-1", email: "user1@example.com" }]
  );

  // Updated: Pass config and users as parameters
  const result = await sendDailyDigest(
    mockSupabase,
    mockSendEmail,
    {
      url: "https://example.supabase.co",
      serviceRoleKey: "test-key",
    },
    [{ id: "user-1", email: "user1@example.com" }]
  );

  assertEquals(result.sent, 0);

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
      title: "Task",
      description: "Test",
      status: "in_progress",
      is_archived: false,
      notes: "Test",
      priority_bucket: 5,
      deadline: tomorrow.toISOString(),
    },
  ];

  const assignments = [{ task_id: "task-1", assignee_id: "user-1" }];
  const mockSupabase = createMockSupabase(tasks, assignments);

  const mockSendEmail = async (params: any) => {
    throw new Error("SendGrid API error");
  };

  const restoreFetch = mockFetchForUsers(
    { "user-1": "user1@example.com" },
    [{ id: "user-1", email: "user1@example.com" }]
  );

  // Updated: Pass config and users as parameters
  const result = await sendDailyDigest(
    mockSupabase,
    mockSendEmail,
    {
      url: "https://example.supabase.co",
      serviceRoleKey: "test-key",
    },
    [{ id: "user-1", email: "user1@example.com" }]
  );

  assertEquals(result.sent, 0);

  restoreFetch();
  restore();
});

// ============ BOUNDARY TESTS ============

// @ts-ignore
Deno.test("Should send digest for tasks 14 days away", async () => {
  const restore = suppressLogs();

  const twoWeeksFromNow = new Date();
  twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);
  twoWeeksFromNow.setHours(0, 0, 0, 0);

  const tasks = [
    {
      id: "task-1",
      title: "Task 14 days away",
      description: "At boundary",
      status: "in_progress",
      is_archived: false,
      notes: "Boundary",
      priority_bucket: 5,
      deadline: twoWeeksFromNow.toISOString(),
    },
  ];

  const assignments = [{ task_id: "task-1", assignee_id: "user-1" }];
  const mockSupabase = createMockSupabase(tasks, assignments);
  let emailsSent: any[] = [];

  const mockSendEmail = async (params: any) => {
    emailsSent.push(params);
  };

  const restoreFetch = mockFetchForUsers(
    { "user-1": "user1@example.com" },
    [{ id: "user-1", email: "user1@example.com" }]
  );

  // Updated: Pass config and users as parameters
  const result = await sendDailyDigest(
    mockSupabase,
    mockSendEmail,
    {
      url: "https://example.supabase.co",
      serviceRoleKey: "test-key",
    },
    [{ id: "user-1", email: "user1@example.com" }]
  );

  assertEquals(result.sent, 1);

  restoreFetch();
  restore();
});

// @ts-ignore
Deno.test("Should NOT send digest for tasks 15 days away", async () => {
  const restore = suppressLogs();

  const fifteenDaysFromNow = new Date();
  fifteenDaysFromNow.setDate(fifteenDaysFromNow.getDate() + 15);
  fifteenDaysFromNow.setHours(0, 0, 0, 0);

  const tasks = [
    {
      id: "task-1",
      title: "Task 15 days away",
      description: "Beyond boundary",
      status: "in_progress",
      is_archived: false,
      notes: "Boundary",
      priority_bucket: 5,
      deadline: fifteenDaysFromNow.toISOString(),
    },
  ];

  const assignments = [{ task_id: "task-1", assignee_id: "user-1" }];
  const mockSupabase = createMockSupabase(tasks, assignments);
  let emailsSent: any[] = [];

  const mockSendEmail = async (params: any) => {
    emailsSent.push(params);
  };

  const restoreFetch = mockFetchForUsers(
    { "user-1": "user1@example.com" },
    [{ id: "user-1", email: "user1@example.com" }]
  );

  // Updated: Pass config and users as parameters
  const result = await sendDailyDigest(
    mockSupabase,
    mockSendEmail,
    {
      url: "https://example.supabase.co",
      serviceRoleKey: "test-key",
    },
    [{ id: "user-1", email: "user1@example.com" }]
  );

  assertEquals(result.sent, 0);

  restoreFetch();
  restore();
});

// ============ EDGE CASES ============

// @ts-ignore
Deno.test("Should handle empty task list", async () => {
  const restore = suppressLogs();

  const mockSupabase = createMockSupabase([], []);
  let emailsSent: any[] = [];

  const mockSendEmail = async (params: any) => {
    emailsSent.push(params);
  };

  const restoreFetch = mockFetchForUsers(
    { "user-1": "user1@example.com" },
    [{ id: "user-1", email: "user1@example.com" }]
  );

  // Updated: Pass config and users as parameters
  const result = await sendDailyDigest(
    mockSupabase,
    mockSendEmail,
    {
      url: "https://example.supabase.co",
      serviceRoleKey: "test-key",
    },
    [{ id: "user-1", email: "user1@example.com" }]
  );

  assertEquals(result.success, true);
  assertEquals(result.sent, 0);

  restoreFetch();
  restore();
});

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
      description: "Special & chars",
      status: "in_progress",
      is_archived: false,
      notes: "&\"'<>",
      priority_bucket: 5,
      deadline: tomorrow.toISOString(),
    },
  ];

  const assignments = [{ task_id: "task-1", assignee_id: "user-1" }];
  const mockSupabase = createMockSupabase(tasks, assignments);
  let emailsSent: any[] = [];

  const mockSendEmail = async (params: any) => {
    emailsSent.push(params);
  };

  const restoreFetch = mockFetchForUsers(
    { "user-1": "user1@example.com" },
    [{ id: "user-1", email: "user1@example.com" }]
  );

  // Updated: Pass config and users as parameters
  const result = await sendDailyDigest(
    mockSupabase,
    mockSendEmail,
    {
      url: "https://example.supabase.co",
      serviceRoleKey: "test-key",
    },
    [{ id: "user-1", email: "user1@example.com" }]
  );

  assertEquals(result.sent, 1);

  restoreFetch();
  restore();
});