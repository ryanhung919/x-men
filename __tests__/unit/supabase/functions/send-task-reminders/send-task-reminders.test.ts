//@ts-ignore
import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.208.0/assert/mod.ts";
//@ts-ignore
import { sendTaskReminders } from "../../../../../supabase/functions/send-task-reminders/task-reminders-wrapper.js";
import {
  authUsersFixtures,
  tasksFixtures,
  task_assignments,
} from "../../../../../__tests__/fixtures/database.fixtures";

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

  // ✅ Use designReview (id 10, status: In Progress, deadline: tomorrow)
  const tasks = [tasksFixtures.designReview];
  const assignments = task_assignments.filter(a => a.task_id === tasksFixtures.designReview.id);

  const mockSupabase = createMockSupabase(tasks, assignments);
  let emailsSent: any[] = [];

  const mockSendEmail = async (params: any) => {
    emailsSent.push(params);
  };

  const restoreFetch = mockFetchForUsers({
    [authUsersFixtures.dave.id]: authUsersFixtures.dave.email,
  });

  const result = await sendTaskReminders(mockSupabase, mockSendEmail, {
    url: "https://example.supabase.co",
    serviceRoleKey: "test-key",
  });

  assertEquals(result.success, true);
  assertEquals(result.sent, 1);
  assertEquals(result.emailsSent[0].reminderType, "due_tomorrow");

  restoreFetch();
  restore();
});

// @ts-ignore
Deno.test("Should send reminder for task due today", async () => {
  const restore = suppressLogs();

  // ✅ Use budgetReport (id 2, status: In Progress, deadline: today)
  const tasks = [tasksFixtures.budgetReport];
  const assignments = task_assignments.filter(a => a.task_id === tasksFixtures.budgetReport.id);

  const mockSupabase = createMockSupabase(tasks, assignments);
  let emailsSent: any[] = [];

  const mockSendEmail = async (params: any) => {
    emailsSent.push(params);
  };

  const restoreFetch = mockFetchForUsers({
    [authUsersFixtures.bob.id]: authUsersFixtures.bob.email,
  });

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

  // ✅ Use designHomepage (id 1, status: To Do, deadline: yesterday)
  const tasks = [tasksFixtures.designHomepage];
  const assignments = task_assignments.filter(a => a.task_id === tasksFixtures.designHomepage.id);

  const mockSupabase = createMockSupabase(tasks, assignments);
  let emailsSent: any[] = [];

  const mockSendEmail = async (params: any) => {
    emailsSent.push(params);
  };

  const restoreFetch = mockFetchForUsers({
    [authUsersFixtures.carol.id]: authUsersFixtures.carol.email,
  });

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

  // ✅ Use dataIntegration (id 9, status: In Progress, has multiple assignees)
  const tasks = [tasksFixtures.dataIntegration];
  const assignments = task_assignments.filter(a => a.task_id === tasksFixtures.dataIntegration.id);

  const mockSupabase = createMockSupabase(tasks, assignments);
  let emailsSent: any[] = [];

  const mockSendEmail = async (params: any) => {
    emailsSent.push(params);
  };

  const restoreFetch = mockFetchForUsers({
    [authUsersFixtures.alice.id]: authUsersFixtures.alice.email,
    [authUsersFixtures.bob.id]: authUsersFixtures.bob.email,
  });

  const result = await sendTaskReminders(mockSupabase, mockSendEmail, {
    url: "https://example.supabase.co",
    serviceRoleKey: "test-key",
  });

  assertEquals(result.success, true);
  assertEquals(result.sent, assignments.length);
  assertEquals(result.emailsSent.length, assignments.length);
  assertEquals(emailsSent.length, assignments.length);

  restoreFetch();
  restore();
});

// @ts-ignore
Deno.test("Should include task link in email", async () => {
  const restore = suppressLogs();

  // ✅ Use budgetReport
  const tasks = [tasksFixtures.budgetReport];
  const assignments = task_assignments.filter(a => a.task_id === tasksFixtures.budgetReport.id);

  const mockSupabase = createMockSupabase(tasks, assignments);
  let emailsSent: any[] = [];

  const mockSendEmail = async (params: any) => {
    emailsSent.push(params);
  };

  const restoreFetch = mockFetchForUsers({
    [authUsersFixtures.bob.id]: authUsersFixtures.bob.email,
  });

  const result = await sendTaskReminders(mockSupabase, mockSendEmail, {
    url: "https://example.supabase.co",
    serviceRoleKey: "test-key",
  });

  assertStringIncludes(emailsSent[0].content, `https://x-men-rosy.vercel.app/task/${tasksFixtures.budgetReport.id}`);
  assertStringIncludes(emailsSent[0].content, "Click");
  assertStringIncludes(emailsSent[0].content, "here");

  restoreFetch();
  restore();
});

// ============ NEGATIVE PATH TESTS ============

// @ts-ignore
Deno.test("Should skip archived tasks", async () => {
  const restore = suppressLogs();

  // ✅ Use clientPortalMigration (id 6, is_archived: true)
  const tasks = [tasksFixtures.clientPortalMigration];
  const assignments = task_assignments.filter(a => a.task_id === tasksFixtures.clientPortalMigration.id);

  const mockSupabase = createMockSupabase(tasks, assignments);
  let emailsSent: any[] = [];

  const mockSendEmail = async (params: any) => {
    emailsSent.push(params);
  };

  const restoreFetch = mockFetchForUsers({
    [authUsersFixtures.frank.id]: authUsersFixtures.frank.email || "",
  });

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

  // ✅ Use apiDocumentation (id 7, status: Completed)
  const tasks = [tasksFixtures.apiDocumentation];
  const assignments = task_assignments.filter(a => a.task_id === tasksFixtures.apiDocumentation.id);

  const mockSupabase = createMockSupabase(tasks, assignments);
  let emailsSent: any[] = [];

  const mockSendEmail = async (params: any) => {
    emailsSent.push(params);
  };

  const restoreFetch = mockFetchForUsers({
    [authUsersFixtures.alice.id]: authUsersFixtures.alice.email,
  });

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

  // ✅ Use performanceReview (id 8, deadline: null)
  const tasks = [tasksFixtures.performanceReview];
  const assignments = task_assignments.filter(a => a.task_id === tasksFixtures.performanceReview.id);

  const mockSupabase = createMockSupabase(tasks, assignments);
  let emailsSent: any[] = [];

  const mockSendEmail = async (params: any) => {
    emailsSent.push(params);
  };

  const restoreFetch = mockFetchForUsers({
    [authUsersFixtures.grace.id]: authUsersFixtures.grace.email,
  });

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

  // ✅ Use clientPortalMigration with frank (no email)
  const tasks = [tasksFixtures.clientPortalMigration];
  const assignments = task_assignments.filter(a => a.task_id === tasksFixtures.clientPortalMigration.id);

  const mockSupabase = createMockSupabase(tasks, assignments);
  let emailsSent: any[] = [];

  const mockSendEmail = async (params: any) => {
    emailsSent.push(params);
  };

  const restoreFetch = mockFetchForUsers({
    [authUsersFixtures.frank.id]: "", // No email
  });

  const result = await sendTaskReminders(mockSupabase, mockSendEmail, {
    url: "https://example.supabase.co",
    serviceRoleKey: "test-key",
  });

  assertEquals(result.success, true);

  restoreFetch();
  restore();
});

// @ts-ignore
Deno.test("Should handle email sending failures gracefully", async () => {
  const restore = suppressLogs();

  // ✅ Use budgetReport and designReview
  const tasks = [tasksFixtures.budgetReport, tasksFixtures.designReview];
  const assignments = task_assignments.filter(
    a => a.task_id === tasksFixtures.budgetReport.id || a.task_id === tasksFixtures.designReview.id
  );

  const mockSupabase = createMockSupabase(tasks, assignments);
  let callCount = 0;

  const mockSendEmail = async (params: any) => {
    callCount++;
    if (callCount === 1) {
      throw new Error("SendGrid error");
    }
  };

  const restoreFetch = mockFetchForUsers({
    [authUsersFixtures.bob.id]: authUsersFixtures.bob.email,
    [authUsersFixtures.dave.id]: authUsersFixtures.dave.email,
  });

  const result = await sendTaskReminders(mockSupabase, mockSendEmail, {
    url: "https://example.supabase.co",
    serviceRoleKey: "test-key",
  });

  assertEquals(result.success, true);

  restoreFetch();
  restore();
});

// ============ BOUNDARY TESTS ============

// @ts-ignore
Deno.test("Should NOT send reminder 2+ days BEFORE deadline", async () => {
  const restore = suppressLogs();

  // ✅ Use analyticsDashboard (15 days away)
  const tasks = [tasksFixtures.analyticsDashboard];
  const assignments = task_assignments.filter(a => a.task_id === tasksFixtures.analyticsDashboard.id);

  const mockSupabase = createMockSupabase(tasks, assignments);
  let emailsSent: any[] = [];

  const mockSendEmail = async (params: any) => {
    emailsSent.push(params);
  };

  const restoreFetch = mockFetchForUsers({
    [authUsersFixtures.alice.id]: authUsersFixtures.alice.email,
  });

  const result = await sendTaskReminders(mockSupabase, mockSendEmail, {
    url: "https://example.supabase.co",
    serviceRoleKey: "test-key",
  });

  assertEquals(result.sent, 0);
  assertEquals(emailsSent.length, 0);

  restoreFetch();
  restore();
});
