import { describe, it, expect, beforeEach } from 'vitest';
import { adminClient, authenticateAs } from '@/__tests__/setup/integration.setup';
import { sendTaskReminders } from '@/supabase/functions/send-task-reminders/task-reminders-wrapper';

describe('Send Task Reminders - Integration Tests', () => {
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
    it('should fetch ALL tasks from real database (service role bypasses RLS)', async () => {
      const { data: tasks, error } = await adminClient
        .from('tasks')
        .select('id, title, deadline, is_archived, status');

      expect(error).toBeNull();
      expect(tasks).toBeDefined();
      expect(tasks!.length).toBeGreaterThan(0);

      console.log(`Service role fetched ${tasks!.length} tasks (ALL, no RLS filtering)`);
    });
  });

  describe('Full Reminder Workflow (Mocked Email)', () => {
    it('should send reminders for all relevant tasks', async () => {
      // ✅ Pass config with Supabase URL and service role key
      const result = await sendTaskReminders(
        adminClient,
        mockSendEmail,
        {
          url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
          serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        }
      );

      expect(result.success).toBe(true);
      expect(result.sent).toBeGreaterThan(0);
      expect(result.emailsSent.length).toBe(result.sent);

      console.log(`
        Send Task Reminders Workflow Complete:
        - Success: ${result.success}
        - Reminders sent: ${result.sent}
        - Emails captured (mocked): ${mockEmailsSent.length}
      `);

      expect(mockEmailsSent.length).toBeGreaterThan(0);
    });

    it('should send correct email content with task details', async () => {
      mockEmailsSent = [];
      await sendTaskReminders(
        adminClient,
        mockSendEmail,
        {
          url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
          serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        }
      );

      expect(mockEmailsSent.length).toBeGreaterThan(0);

      const firstEmail = mockEmailsSent[0];

      expect(firstEmail.to).toBeDefined();
      expect(firstEmail.from).toBe('joel.wang.2023@scis.smu.edu.sg');
      expect(firstEmail.subject).toBeDefined();
      expect(firstEmail.content).toBeDefined();
      expect(firstEmail.isHtml).toBe(true);

      console.log(`
        Email Structure Verified:
        - To: ${firstEmail.to}
        - Subject: ${firstEmail.subject}
        - Content preview: ${firstEmail.content.substring(0, 100)}...
      `);

      expect(firstEmail.content).toContain('https://x-men-rosy.vercel.app/task/');
      expect(firstEmail.content).toContain('Click');
      expect(firstEmail.content).toContain('here');
    });

    it('should categorize reminders correctly', async () => {
      mockEmailsSent = [];
      const result = await sendTaskReminders(
        adminClient,
        mockSendEmail,
        {
          url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
          serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        }
      );

      expect(result.emailsSent.length).toBeGreaterThan(0);

      const reminderTypes = result.emailsSent.map((e) => e.reminderType);
      console.log(`
        Reminder Types Found:
        - Due Tomorrow: ${reminderTypes.filter((t) => t === 'due_tomorrow').length}
        - Due Today: ${reminderTypes.filter((t) => t === 'due_today').length}
        - Overdue: ${reminderTypes.filter((t) => t === 'overdue').length}
      `);

      expect(reminderTypes.some((t) => ['due_today', 'due_tomorrow', 'overdue'].includes(t))).toBe(true);
    });

    it('should NOT send reminders for archived tasks', async () => {
      const { data: archivedTasks } = await adminClient
        .from('tasks')
        .select('id')
        .eq('is_archived', true)
        .limit(1);

      mockEmailsSent = [];
      const result = await sendTaskReminders(
        adminClient,
        mockSendEmail,
        {
          url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
          serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        }
      );

      if (archivedTasks && archivedTasks.length > 0) {
        const sentTaskIds = result.emailsSent.map((e) => e.taskId);
        const hasArchivedReminders = sentTaskIds.some((id) =>
          archivedTasks.some((a) => a.id === id)
        );

        expect(hasArchivedReminders).toBe(false);
        console.log(`No reminders sent for ${archivedTasks.length} archived tasks`);
      }
    });

    it('should NOT send reminders for completed tasks', async () => {
      const { data: completedTasks } = await adminClient
        .from('tasks')
        .select('id')
        .eq('status', 'completed')
        .limit(1);

      mockEmailsSent = [];
      const result = await sendTaskReminders(
        adminClient,
        mockSendEmail,
        {
          url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
          serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        }
      );

      if (completedTasks && completedTasks.length > 0) {
        const sentTaskIds = result.emailsSent.map((e) => e.taskId);
        const hasCompletedReminders = sentTaskIds.some((id) =>
          completedTasks.some((c) => c.id === id)
        );

        expect(hasCompletedReminders).toBe(false);
        console.log(`No reminders sent for ${completedTasks.length} completed tasks`);
      }
    });

    it('should continue processing even if one email fails', async () => {
      let callCount = 0;
      const sendEmailPartiallyFailing = async (params: any) => {
        callCount++;
        if (callCount === 1) {
          throw new Error('SendGrid error');
        }
        mockEmailsSent.push(params);
      };

      const result = await sendTaskReminders(
        adminClient,
        sendEmailPartiallyFailing,
        {
          url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
          serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        }
      );

      expect(result.success).toBe(true);
      console.log(`Sent ${result.sent} emails even after first email failed`);
    });
  });

  describe('Service Role vs User Role Access', () => {
    it('should demonstrate service role gets ALL tasks', async () => {
      const { data: adminTasks } = await adminClient.from('tasks').select('id');
      const { client: joelClient } = await authenticateAs('joel');
      const { data: joelTasks } = await joelClient.from('tasks').select('id');

      console.log(`
        Access Control Comparison:
        - Service Role (cron job): ${adminTasks?.length} tasks (ALL, no filtering)
        - Joel (user role): ${joelTasks?.length} tasks (RLS filtered)
      `);

      expect(adminTasks!.length).toBeGreaterThanOrEqual(joelTasks!.length);
    });
  });
});