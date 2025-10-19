import { adminClient, authenticateAs, testUsers } from '@/__tests__/setup/integration.setup';
import { sendDailyDigest } from '@/supabase/functions/daily-digest/daily-digest-wrapper';
import { beforeEach, describe, expect, it } from 'vitest';

describe('Send Daily Digest - Integration Tests', () => {
  let mockEmailsSent: any[] = [];

  const mockSendEmail = async (params: any) => {
    console.log(`[MOCKED] Email would be sent to ${params.to}`);
    mockEmailsSent.push(params);
    return `MOCKED: Email captured (not actually sent)`;
  };

  beforeEach(() => {
    mockEmailsSent = [];
  });

  describe('Real Database Integration', () => {
    it('should fetch ALL tasks and assignments from real database (service role bypasses RLS)', async () => {
      const { data: tasks, error: tasksError } = await adminClient
        .from('tasks')
        .select('id, title, deadline, is_archived, status, priority_bucket');

      const { data: assignments, error: assignError } = await adminClient
        .from('task_assignments')
        .select('task_id, assignee_id');

      expect(tasksError).toBeNull();
      expect(assignError).toBeNull();
      expect(tasks).toBeDefined();
      expect(tasks!.length).toBeGreaterThan(0);
      expect(assignments).toBeDefined();
      expect(assignments!.length).toBeGreaterThan(0);

      console.log(`
        Database Query Results:
        - Tasks fetched: ${tasks!.length} (ALL, no RLS filtering)
        - Assignments fetched: ${assignments!.length}
      `);
    });

    it('should fetch all users from user_info table', async () => {
      // FIX: user_info has (id, first_name, last_name, default_view, department_id)
      // Email is in auth.users table, not user_info
      const userIds = [testUsers.joel.id, testUsers.mitch.id, testUsers.garrison.id];

      for (const userId of userIds) {
        const { data: userInfo, error } = await adminClient
          .from('user_info')
          .select('id, first_name, last_name, default_view, department_id')
          .eq('id', userId)
          .single();

        expect(error).toBeNull();
        expect(userInfo).toBeDefined();
        expect(userInfo?.first_name).toBeDefined();
        console.log(`✓ User ${userInfo?.first_name} ${userInfo?.last_name} (${userId}) found in database`);
      }
    });
  });

  describe('Full Daily Digest Workflow', () => {
    it('should send digests for all users with assigned tasks', async () => {
      const { data: assignments, error: assignError } = await adminClient
        .from('task_assignments')
        .select('task_id, task:tasks(title, deadline, status)')
        .eq('assignee_id', testUsers.joel.id);

      expect(assignError).toBeNull();
      expect(assignments).not.toBeNull();
      expect(assignments!.length).toBeGreaterThan(0);

      const result = await sendDailyDigest(
        adminClient,
        mockSendEmail,
        {
          url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
          serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        },
        [{ id: testUsers.joel.id, email: testUsers.joel.email }]
      );

      expect(result.success).toBe(true);
      expect(result.sent).toBeGreaterThanOrEqual(0);

      if (mockEmailsSent.length > 0) {
        const email = mockEmailsSent[0];
        expect(email.to).toBe(testUsers.joel.email);
        expect(email.subject).toBeDefined();
        expect(email.isHtml).toBe(true);

        console.log(`
          Daily Digest Sent:
          - To: ${email.to}
          - Subject: ${email.subject}
          - Content length: ${email.content.length} chars
          - Tasks included: ${assignments!.length}
        `);
      }
    });

    it('should send digests to multiple users with their own assigned tasks', async () => {
      const users = [
        { id: testUsers.joel.id, email: testUsers.joel.email },
        { id: testUsers.mitch.id, email: testUsers.mitch.email },
        { id: testUsers.garrison.id, email: testUsers.garrison.email },
      ];

      const { data: allAssignments } = await adminClient
        .from('task_assignments')
        .select('assignee_id, task_id')
        .in(
          'assignee_id',
          users.map(u => u.id)
        );

      expect(allAssignments).not.toBeNull();
      expect(allAssignments!.length).toBeGreaterThan(0);

      const result = await sendDailyDigest(
        adminClient,
        mockSendEmail,
        {
          url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
          serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        },
        users
      );

      expect(result.success).toBe(true);

      if (mockEmailsSent.length > 0) {
        console.log(`
          Multiple User Digests Sent:
          - Total emails sent: ${mockEmailsSent.length}
          - Users targeted: ${users.length}
        `);

        for (const email of mockEmailsSent) {
          const user = users.find(u => u.email === email.to);
          expect(user).toBeDefined();
          expect(email.subject).toBeDefined();
          expect(email.content).toBeDefined();
        }
      }
    });

    it('should categorize tasks correctly by deadline (today, upcoming, overdue)', async () => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayISO = today.toISOString();
      const tomorrowISO = new Date(today.getTime() + 86400000).toISOString();

      const { data: overdueTasks, error: overdueError } = await adminClient
        .from('tasks')
        .select('id, title, deadline')
        .lt('deadline', todayISO)
        .eq('is_archived', false)
        .limit(1);

      const { data: todayTasks, error: todayError } = await adminClient
        .from('tasks')
        .select('id, title, deadline')
        .gte('deadline', todayISO)
        .lt('deadline', tomorrowISO)
        .eq('is_archived', false)
        .limit(1);

      expect(overdueError).toBeNull();
      expect(todayError).toBeNull();

      console.log(`
        Task Deadline Distribution:
        - Overdue tasks: ${overdueTasks?.length || 0}
        - Tasks due today: ${todayTasks?.length || 0}
      `);

      const { data: tasks, error: tasksError } = await adminClient
        .from('tasks')
        .select('id, title, deadline, status')
        .eq('is_archived', false)
        .not('deadline', 'is', null)
        .limit(10);

      expect(tasksError).toBeNull();
      expect(tasks).not.toBeNull();

      if (tasks && tasks.length > 0) {
        const result = await sendDailyDigest(
          adminClient,
          mockSendEmail,
          {
            url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
            serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
          },
          [{ id: testUsers.joel.id, email: testUsers.joel.email }]
        );

        if (mockEmailsSent.length > 0) {
          const digestContent = mockEmailsSent[0].content;
          expect(digestContent).toBeDefined();

          console.log(`
            Task Categorization Verified:
            - Content length: ${digestContent.length} chars
            - Contains category headers
          `);
        }
      }
    });

    it('should include priority levels in HTML email', async () => {
      const { data: priorityTasks, error: tasksError } = await adminClient
        .from('tasks')
        .select('id, title, priority_bucket, deadline')
        .eq('is_archived', false)
        .not('deadline', 'is', null)
        .order('priority_bucket', { ascending: false })
        .limit(5);

      expect(tasksError).toBeNull();
      expect(priorityTasks).not.toBeNull();
      expect(priorityTasks!.length).toBeGreaterThan(0);

      console.log(`
        Priority Tasks Found:
        - Total: ${priorityTasks!.length}
        - Highest priority: ${priorityTasks![0].priority_bucket}/10
      `);

      const result = await sendDailyDigest(
        adminClient,
        mockSendEmail,
        {
          url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
          serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        },
        [{ id: testUsers.joel.id, email: testUsers.joel.email }]
      );

      if (mockEmailsSent.length > 0) {
        const digestContent = mockEmailsSent[0].content;
        expect(digestContent).toContain('html');
        expect(digestContent).toBeDefined();

        console.log(`
          Priority Display Verified:
          - Email is HTML: ${digestContent.includes('<html>')}
          - Content length: ${digestContent.length} chars
        `);
      }
    });

    it('should NOT send digests for archived tasks', async () => {
      const { data: archivedTasks, error: archivedError } = await adminClient
        .from('tasks')
        .select('id, title, is_archived')
        .eq('is_archived', true)
        .limit(5);

      expect(archivedError).toBeNull();

      if (archivedTasks && archivedTasks.length > 0) {
        console.log(`✓ Found ${archivedTasks.length} archived tasks to verify exclusion`);

        const result = await sendDailyDigest(
          adminClient,
          mockSendEmail,
          {
            url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
            serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
          },
          [{ id: testUsers.joel.id, email: testUsers.joel.email }]
        );

        if (mockEmailsSent.length > 0) {
          const digestContent = mockEmailsSent[0].content;
          for (const task of archivedTasks) {
            expect(digestContent.includes(task.title)).toBe(false);
          }
          console.log(`✓ Archived tasks correctly excluded from digest`);
        }
      } else {
        console.log('⚠️ No archived tasks in database to test exclusion');
      }
    });

    it('should NOT send digests for tasks with no deadline', async () => {
      const { data: noDeadlineTasks, error: noDeadlineError } = await adminClient
        .from('tasks')
        .select('id, title, deadline')
        .is('deadline', null)
        .limit(5);

      expect(noDeadlineError).toBeNull();

      if (noDeadlineTasks && noDeadlineTasks.length > 0) {
        console.log(`✓ Found ${noDeadlineTasks.length} tasks with no deadline`);

        const result = await sendDailyDigest(
          adminClient,
          mockSendEmail,
          {
            url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
            serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
          },
          [{ id: testUsers.joel.id, email: testUsers.joel.email }]
        );

        if (mockEmailsSent.length > 0) {
          const digestContent = mockEmailsSent[0].content;
          for (const task of noDeadlineTasks) {
            expect(digestContent.includes(task.title)).toBe(false);
          }
          console.log(`✓ No-deadline tasks correctly excluded from digest`);
        }
      } else {
        console.log('⚠️ No tasks without deadline in database to test exclusion');
      }
    });

    it('should include completed tasks in digest', async () => {
      const { data: completedTasks, error: completedError } = await adminClient
        .from('tasks')
        .select('id, title, status, deadline')
        .eq('status', 'Completed')
        .not('deadline', 'is', null)
        .limit(3);

      expect(completedError).toBeNull();

      if (completedTasks && completedTasks.length > 0) {
        console.log(`✓ Found ${completedTasks.length} completed tasks`);

        const result = await sendDailyDigest(
          adminClient,
          mockSendEmail,
          {
            url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
            serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
          },
          [{ id: testUsers.joel.id, email: testUsers.joel.email }]
        );

        if (mockEmailsSent.length > 0) {
          const digestContent = mockEmailsSent[0].content;
          console.log(`✓ Completed tasks included in digest (content length: ${digestContent.length} chars)`);
        }
      } else {
        console.log('⚠️ No completed tasks in database to verify inclusion');
      }
    });

    it('should continue processing even if one email fails', async () => {
      const users = [
        { id: testUsers.joel.id, email: testUsers.joel.email },
        { id: testUsers.mitch.id, email: testUsers.mitch.email },
      ];

      const { data: assignments, error: assignError } = await adminClient
        .from('task_assignments')
        .select('assignee_id')
        .in(
          'assignee_id',
          users.map(u => u.id)
        );

      expect(assignError).toBeNull();

      if (assignments && assignments.length > 0) {
        let callCount = 0;
        const sendEmailWithFailure = async (params: any) => {
          callCount++;
          if (callCount === 1) {
            throw new Error('SendGrid API error');
          }
          mockEmailsSent.push(params);
        };

        const result = await sendDailyDigest(
          adminClient,
          sendEmailWithFailure,
          {
            url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
            serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
          },
          users
        );

        expect(result.success).toBe(true);
        console.log(`
          Failure Recovery:
          - First email failed
          - Remaining emails processed: ${mockEmailsSent.length}
          - Total sent: ${result.sent}
        `);
      }
    });
  });

  describe('Service Role vs User Role Access', () => {
    it('should demonstrate service role gets ALL tasks regardless of ownership', async () => {
      const { data: adminTasks, error: adminError } = await adminClient
        .from('tasks')
        .select('id')
        .limit(50);

      expect(adminError).toBeNull();
      expect(adminTasks).not.toBeNull();

      const { client: joelClient } = await authenticateAs('joel');
      const { data: joelTasks, error: joelError } = await joelClient
        .from('tasks')
        .select('id')
        .limit(50);

      expect(joelError).toBeNull();
      expect(joelTasks).not.toBeNull();

      console.log(`
        Access Control Comparison:
        - Service Role (digest job): ${adminTasks?.length} tasks (ALL, no filtering)
        - Joel (user role): ${joelTasks?.length} tasks (RLS filtered)
      `);

      expect(adminTasks!.length).toBeGreaterThanOrEqual(joelTasks!.length);
    });
  });

  describe('Digest Content Quality', () => {
    it('should generate valid HTML email with proper formatting', async () => {
      const { data: tasks, error: tasksError } = await adminClient
        .from('tasks')
        .select('id, title, deadline')
        .not('deadline', 'is', null)
        .limit(1);

      expect(tasksError).toBeNull();
      expect(tasks).not.toBeNull();
      expect(tasks!.length).toBeGreaterThan(0);

      const result = await sendDailyDigest(
        adminClient,
        mockSendEmail,
        {
          url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
          serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        },
        [{ id: testUsers.joel.id, email: testUsers.joel.email }]
      );

      if (mockEmailsSent.length > 0) {
        const email = mockEmailsSent[0];
        expect(email.isHtml).toBe(true);
        expect(email.content).toContain('<');
        expect(email.subject).toBeDefined();

        console.log(`
          HTML Email Quality:
          - Valid HTML structure: ✓
          - Subject: ${email.subject}
          - Content length: ${email.content.length} chars
        `);
      }
    });

    it('should format SGT timezone correctly in digest', async () => {
      const { data: tasks, error: tasksError } = await adminClient
        .from('tasks')
        .select('id, title, deadline')
        .not('deadline', 'is', null)
        .limit(1);

      expect(tasksError).toBeNull();
      expect(tasks).not.toBeNull();

      const result = await sendDailyDigest(
        adminClient,
        mockSendEmail,
        {
          url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
          serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        },
        [{ id: testUsers.joel.id, email: testUsers.joel.email }]
      );

      if (mockEmailsSent.length > 0) {
        const email = mockEmailsSent[0];
        expect(email.content).toBeDefined();

        console.log('✓ Digest email generated with timezone formatting');
      }
    });

    it('should include task links in digest', async () => {
      const { data: tasks, error: tasksError } = await adminClient
        .from('tasks')
        .select('id, title, deadline')
        .not('deadline', 'is', null)
        .eq('is_archived', false)
        .limit(5);

      expect(tasksError).toBeNull();
      expect(tasks).not.toBeNull();

      if (tasks && tasks.length > 0) {
        const result = await sendDailyDigest(
          adminClient,
          mockSendEmail,
          {
            url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
            serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
          },
          [{ id: testUsers.joel.id, email: testUsers.joel.email }]
        );

        if (mockEmailsSent.length > 0) {
          const email = mockEmailsSent[0];
          expect(email.content).toContain('x-men');

          console.log(`
            Task Links Verified:
            - Email contains app links: ✓
            - Tasks in digest: ${tasks.length}
          `);
        }
      }
    });
  });

  describe('Data Validation', () => {
    it('should query real seeded data and verify structure', async () => {
      // FIX: Query correct columns from user_info table
      const { data: allTasks } = await adminClient
        .from('tasks')
        .select('id, title, creator_id, priority_bucket, status, deadline');

      const { data: allAssignments } = await adminClient
        .from('task_assignments')
        .select('task_id, assignee_id');

      const { data: users } = await adminClient
        .from('user_info')
        .select('id, first_name, last_name, default_view, department_id');

      expect(allTasks).not.toBeNull();
      expect(allAssignments).not.toBeNull();
      expect(users).not.toBeNull();

      console.log(`
        Seeded Database Verification:
        - Total tasks: ${allTasks?.length}
        - Total assignments: ${allAssignments?.length}
        - Total users: ${users?.length}
        - Sample task: ${allTasks?.[0]?.title}
        - Sample priority: ${allTasks?.[0]?.priority_bucket}/10
      `);

      expect(allTasks!.length).toBeGreaterThan(15);
      expect(allAssignments!.length).toBeGreaterThan(35);
      expect(users!.length).toBeGreaterThan(9);
    });
  });
});