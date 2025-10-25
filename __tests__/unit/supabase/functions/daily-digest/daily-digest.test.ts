//@ts-ignore
import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.208.0/assert/mod.ts";
//@ts-ignore
import { sendDailyDigest } from "../../../../../supabase/functions/daily-digest/daily-digest-wrapper.ts";
import {
  authUsersFixtures,
  tasksFixtures,
  task_assignments,
} from "../../../../../__tests__/fixtures/database.fixtures";

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

  // ✅ Use fixtures: overdue, today, tomorrow, future, completed
  const tasks = [
    tasksFixtures.designHomepage,    // id: 1, yesterday (overdue)
    tasksFixtures.budgetReport,      // id: 2, today
    tasksFixtures.designReview,      // id: 10, tomorrow
    tasksFixtures.marketingCampaign, // id: 4, 14 days away
    tasksFixtures.teamMeeting,       // id: 3, status: Completed
  ];

  const assignments = task_assignments.filter(a =>
    [1, 2, 10, 4, 3].includes(a.task_id)
  );

  const mockSupabase = createMockSupabase(tasks, assignments);
  let emailsSent: any[] = [];

  const mockSendEmail = async (params: any) => {
    emailsSent.push(params);
  };

  const restoreFetch = mockFetchForUsers(
    {
      [authUsersFixtures.carol.id]: authUsersFixtures.carol.email,
      [authUsersFixtures.bob.id]: authUsersFixtures.bob.email,
      [authUsersFixtures.dave.id]: authUsersFixtures.dave.email,
      [authUsersFixtures.eve.id]: authUsersFixtures.eve.email,
    },
    [
      { id: authUsersFixtures.carol.id, email: authUsersFixtures.carol.email },
      { id: authUsersFixtures.bob.id, email: authUsersFixtures.bob.email },
      { id: authUsersFixtures.dave.id, email: authUsersFixtures.dave.email },
      { id: authUsersFixtures.eve.id, email: authUsersFixtures.eve.email },
    ]
  );

  // ✅ Pass config and users as parameters
  const result = await sendDailyDigest(
    mockSupabase,
    mockSendEmail,
    {
      url: "https://example.supabase.co",
      serviceRoleKey: "test-key",
    },
    [
      { id: authUsersFixtures.carol.id, email: authUsersFixtures.carol.email },
      { id: authUsersFixtures.bob.id, email: authUsersFixtures.bob.email },
      { id: authUsersFixtures.dave.id, email: authUsersFixtures.dave.email },
      { id: authUsersFixtures.eve.id, email: authUsersFixtures.eve.email },
    ]
  );

  assertEquals(result.success, true);
  assertEquals(result.sent, 4); // 4 users with assigned tasks
  assertEquals(emailsSent.length, 4);
  
  // Check content includes different categories
  assertStringIncludes(emailsSent[0].content, "Overdue");
  assertStringIncludes(emailsSent[0].content, "Due Today");
  assertStringIncludes(emailsSent[0].content, "Upcoming");

  restoreFetch();
  restore();
});

// @ts-ignore
Deno.test("Should send digests to multiple users", async () => {
  const restore = suppressLogs();

  // ✅ Use fixtures with different assignees
  const tasks = [
    tasksFixtures.budgetReport,      // assigned to bob
    tasksFixtures.marketingCampaign, // assigned to eve
  ];

  const assignments = task_assignments.filter(a =>
    [2, 4].includes(a.task_id)
  );

  const mockSupabase = createMockSupabase(tasks, assignments);
  let emailsSent: any[] = [];

  const mockSendEmail = async (params: any) => {
    emailsSent.push(params);
  };

  const restoreFetch = mockFetchForUsers(
    {
      [authUsersFixtures.bob.id]: authUsersFixtures.bob.email,
      [authUsersFixtures.eve.id]: authUsersFixtures.eve.email,
    },
    [
      { id: authUsersFixtures.bob.id, email: authUsersFixtures.bob.email },
      { id: authUsersFixtures.eve.id, email: authUsersFixtures.eve.email },
    ]
  );

  // ✅ Pass config and users as parameters
  const result = await sendDailyDigest(
    mockSupabase,
    mockSendEmail,
    {
      url: "https://example.supabase.co",
      serviceRoleKey: "test-key",
    },
    [
      { id: authUsersFixtures.bob.id, email: authUsersFixtures.bob.email },
      { id: authUsersFixtures.eve.id, email: authUsersFixtures.eve.email },
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

  // ✅ Use budgetReport (deadline: today)
  const tasks = [tasksFixtures.budgetReport];
  const assignments = task_assignments.filter(a => a.task_id === tasksFixtures.budgetReport.id);

  const mockSupabase = createMockSupabase(tasks, assignments);
  let emailsSent: any[] = [];

  const mockSendEmail = async (params: any) => {
    emailsSent.push(params);
  };

  const restoreFetch = mockFetchForUsers(
    { [authUsersFixtures.bob.id]: authUsersFixtures.bob.email },
    [{ id: authUsersFixtures.bob.id, email: authUsersFixtures.bob.email }]
  );

  // ✅ Pass config and users as parameters
  const result = await sendDailyDigest(
    mockSupabase,
    mockSendEmail,
    {
      url: "https://example.supabase.co",
      serviceRoleKey: "test-key",
    },
    [{ id: authUsersFixtures.bob.id, email: authUsersFixtures.bob.email }]
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

  // ✅ Use marketingCampaign (priority_bucket: 8)
  const tasks = [tasksFixtures.marketingCampaign];
  const assignments = task_assignments.filter(a => a.task_id === tasksFixtures.marketingCampaign.id);

  const mockSupabase = createMockSupabase(tasks, assignments);
  let emailsSent: any[] = [];

  const mockSendEmail = async (params: any) => {
    emailsSent.push(params);
  };

  const restoreFetch = mockFetchForUsers(
    { [authUsersFixtures.eve.id]: authUsersFixtures.eve.email },
    [{ id: authUsersFixtures.eve.id, email: authUsersFixtures.eve.email }]
  );

  // ✅ Pass config and users as parameters
  const result = await sendDailyDigest(
    mockSupabase,
    mockSendEmail,
    {
      url: "https://example.supabase.co",
      serviceRoleKey: "test-key",
    },
    [{ id: authUsersFixtures.eve.id, email: authUsersFixtures.eve.email }]
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

  // ✅ Use frank (email: null)
  const tasks = [tasksFixtures.clientPortalMigration];
  const assignments = task_assignments.filter(a => a.task_id === tasksFixtures.clientPortalMigration.id);

  const mockSupabase = createMockSupabase(tasks, assignments);
  let emailsSent: any[] = [];

  const mockSendEmail = async (params: any) => {
    emailsSent.push(params);
  };

  const restoreFetch = mockFetchForUsers({}, [{ id: authUsersFixtures.frank.id }]); // No email

  // ✅ Pass config and users as parameters
  const result = await sendDailyDigest(
    mockSupabase,
    mockSendEmail,
    {
      url: "https://example.supabase.co",
      serviceRoleKey: "test-key",
    },
    [{ id: authUsersFixtures.frank.id }] // No email
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
    { [authUsersFixtures.alice.id]: authUsersFixtures.alice.email },
    [{ id: authUsersFixtures.alice.id, email: authUsersFixtures.alice.email }]
  );

  // ✅ Pass config and users as parameters
  const result = await sendDailyDigest(
    mockSupabase,
    mockSendEmail,
    {
      url: "https://example.supabase.co",
      serviceRoleKey: "test-key",
    },
    [{ id: authUsersFixtures.alice.id, email: authUsersFixtures.alice.email }]
  );

  assertEquals(result.sent, 0);
  assertEquals(emailsSent.length, 0);

  restoreFetch();
  restore();
});

// @ts-ignore
Deno.test("Should skip archived tasks", async () => {
  const restore = suppressLogs();

  // ✅ Use clientPortalMigration (is_archived: true)
  const tasks = [tasksFixtures.clientPortalMigration];
  const assignments = task_assignments.filter(a => a.task_id === tasksFixtures.clientPortalMigration.id);

  const mockSupabase = createMockSupabase(tasks, assignments);
  let emailsSent: any[] = [];

  const mockSendEmail = async (params: any) => {
    emailsSent.push(params);
  };

  const restoreFetch = mockFetchForUsers(
    { [authUsersFixtures.frank.id]: authUsersFixtures.frank.email || "" },
    [{ id: authUsersFixtures.frank.id, email: authUsersFixtures.frank.email || "" }]
  );

  // ✅ Pass config and users as parameters
  const result = await sendDailyDigest(
    mockSupabase,
    mockSendEmail,
    {
      url: "https://example.supabase.co",
      serviceRoleKey: "test-key",
    },
    [{ id: authUsersFixtures.frank.id, email: authUsersFixtures.frank.email || "" }]
  );

  assertEquals(result.sent, 0);

  restoreFetch();
  restore();
});

// @ts-ignore
Deno.test("Should skip tasks with no deadline", async () => {
  const restore = suppressLogs();

  // ✅ Use performanceReview (deadline: null)
  const tasks = [tasksFixtures.performanceReview];
  const assignments = task_assignments.filter(a => a.task_id === tasksFixtures.performanceReview.id);

  const mockSupabase = createMockSupabase(tasks, assignments);
  let emailsSent: any[] = [];

  const mockSendEmail = async (params: any) => {
    emailsSent.push(params);
  };

  const restoreFetch = mockFetchForUsers(
    { [authUsersFixtures.grace.id]: authUsersFixtures.grace.email },
    [{ id: authUsersFixtures.grace.id, email: authUsersFixtures.grace.email }]
  );

  // ✅ Pass config and users as parameters
  const result = await sendDailyDigest(
    mockSupabase,
    mockSendEmail,
    {
      url: "https://example.supabase.co",
      serviceRoleKey: "test-key",
    },
    [{ id: authUsersFixtures.grace.id, email: authUsersFixtures.grace.email }]
  );

  assertEquals(result.sent, 0);

  restoreFetch();
  restore();
});

// @ts-ignore
Deno.test("Should handle email sending failures gracefully", async () => {
  const restore = suppressLogs();

  // ✅ Use budgetReport and marketingCampaign
  const tasks = [tasksFixtures.budgetReport, tasksFixtures.marketingCampaign];
  const assignments = task_assignments.filter(a =>
    [2, 4].includes(a.task_id)
  );

  const mockSupabase = createMockSupabase(tasks, assignments);

  const mockSendEmail = async (params: any) => {
    throw new Error("SendGrid API error");
  };

  const restoreFetch = mockFetchForUsers(
    {
      [authUsersFixtures.bob.id]: authUsersFixtures.bob.email,
      [authUsersFixtures.eve.id]: authUsersFixtures.eve.email,
    },
    [
      { id: authUsersFixtures.bob.id, email: authUsersFixtures.bob.email },
      { id: authUsersFixtures.eve.id, email: authUsersFixtures.eve.email },
    ]
  );

  // ✅ Pass config and users as parameters
  const result = await sendDailyDigest(
    mockSupabase,
    mockSendEmail,
    {
      url: "https://example.supabase.co",
      serviceRoleKey: "test-key",
    },
    [
      { id: authUsersFixtures.bob.id, email: authUsersFixtures.bob.email },
      { id: authUsersFixtures.eve.id, email: authUsersFixtures.eve.email },
    ]
  );

  assertEquals(result.sent, 0);

  restoreFetch();
  restore();
});

// ============ BOUNDARY TESTS ============

// @ts-ignore
Deno.test("Should send digest for tasks 14 days away", async () => {
  const restore = suppressLogs();

  // ✅ Use marketingCampaign (14 days away - at boundary)
  const tasks = [tasksFixtures.marketingCampaign];
  const assignments = task_assignments.filter(a => a.task_id === tasksFixtures.marketingCampaign.id);

  const mockSupabase = createMockSupabase(tasks, assignments);
  let emailsSent: any[] = [];

  const mockSendEmail = async (params: any) => {
    emailsSent.push(params);
  };

  const restoreFetch = mockFetchForUsers(
    { [authUsersFixtures.eve.id]: authUsersFixtures.eve.email },
    [{ id: authUsersFixtures.eve.id, email: authUsersFixtures.eve.email }]
  );

  // ✅ Pass config and users as parameters
  const result = await sendDailyDigest(
    mockSupabase,
    mockSendEmail,
    {
      url: "https://example.supabase.co",
      serviceRoleKey: "test-key",
    },
    [{ id: authUsersFixtures.eve.id, email: authUsersFixtures.eve.email }]
  );

  assertEquals(result.sent, 1);

  restoreFetch();
  restore();
});

// @ts-ignore
Deno.test("Should NOT send digest for tasks 15 days away", async () => {
  const restore = suppressLogs();

  // ✅ Use analyticsDashboard (15 days away - beyond boundary)
  const tasks = [tasksFixtures.analyticsDashboard];
  const assignments = task_assignments.filter(a => a.task_id === tasksFixtures.analyticsDashboard.id);

  const mockSupabase = createMockSupabase(tasks, assignments);
  let emailsSent: any[] = [];

  const mockSendEmail = async (params: any) => {
    emailsSent.push(params);
  };

  const restoreFetch = mockFetchForUsers(
    { [authUsersFixtures.alice.id]: authUsersFixtures.alice.email },
    [{ id: authUsersFixtures.alice.id, email: authUsersFixtures.alice.email }]
  );

  // ✅ Pass config and users as parameters
  const result = await sendDailyDigest(
    mockSupabase,
    mockSendEmail,
    {
      url: "https://example.supabase.co",
      serviceRoleKey: "test-key",
    },
    [{ id: authUsersFixtures.alice.id, email: authUsersFixtures.alice.email }]
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
    { [authUsersFixtures.bob.id]: authUsersFixtures.bob.email },
    [{ id: authUsersFixtures.bob.id, email: authUsersFixtures.bob.email }]
  );

  // ✅ Pass config and users as parameters
  const result = await sendDailyDigest(
    mockSupabase,
    mockSendEmail,
    {
      url: "https://example.supabase.co",
      serviceRoleKey: "test-key",
    },
    [{ id: authUsersFixtures.bob.id, email: authUsersFixtures.bob.email }]
  );

  assertEquals(result.success, true);
  assertEquals(result.sent, 0);

  restoreFetch();
  restore();
});
