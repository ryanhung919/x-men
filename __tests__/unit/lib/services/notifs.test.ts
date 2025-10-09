import { describe, it, expect, vi, beforeEach } from 'vitest';
import { notifyNewTaskAssignment, notifyNewComment, NotificationType } from '@/lib/services/notifs';
import { createNotification } from '@/lib/db/notifs';
import { createMockSupabaseClient } from '@/__tests__/mocks/supabase.mock';
import { authUsersFixtures } from '@/__tests__/fixtures/database.fixtures';

vi.mock('@/lib/db/notifs', () => ({
  createNotification: vi.fn(),
}));

let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => mockSupabaseClient),
}));

describe('lib/services/notifs', () => {
  beforeEach(() => {
    mockSupabaseClient = createMockSupabaseClient();
    vi.clearAllMocks();
  });

  // task assignments notifs
  describe('notifyNewTaskAssignment', () => {
    it('should create notification with assignor name when assignor exists', async () => {
      const assignorInfo = {
        first_name: 'Bob',
        last_name: 'Johnson',
      };

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: assignorInfo,
              error: null,
            }),
          }),
        }),
      });

      await notifyNewTaskAssignment(
        authUsersFixtures.alice.id,
        authUsersFixtures.bob.id,
        1,
        'Design Homepage'
      );

      expect(createNotification).toHaveBeenCalledWith({
        user_id: authUsersFixtures.alice.id,
        title: 'New Task Assignment',
        message: 'Bob Johnson assigned you to task: "Design Homepage"',
        type: NotificationType.TASK_ASSIGNED,
      });
    });

    it("should create notification with 'Someone' when assignor is null", async () => {
      await notifyNewTaskAssignment(authUsersFixtures.alice.id, null, 1, 'Design Homepage');

      expect(createNotification).toHaveBeenCalledWith({
        user_id: authUsersFixtures.alice.id,
        title: 'New Task Assignment',
        message: 'Someone assigned you to task: "Design Homepage"',
        type: NotificationType.TASK_ASSIGNED,
      });

      // ensure 0 query for assignor info
      expect(mockSupabaseClient.from).not.toHaveBeenCalled();
    });

    it("should create notification with 'Someone' when assignor info not found", async () => {
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' },
            }),
          }),
        }),
      });

      await notifyNewTaskAssignment(
        authUsersFixtures.alice.id,
        authUsersFixtures.bob.id,
        1,
        'Design Homepage'
      );

      expect(createNotification).toHaveBeenCalledWith({
        user_id: authUsersFixtures.alice.id,
        title: 'New Task Assignment',
        message: 'Someone assigned you to task: "Design Homepage"',
        type: NotificationType.TASK_ASSIGNED,
      });
    });

    it('should not create notification for self-assignment', async () => {
      await notifyNewTaskAssignment(
        authUsersFixtures.alice.id,
        authUsersFixtures.alice.id,
        1,
        'Design Homepage'
      );

      expect(createNotification).not.toHaveBeenCalled();
      expect(mockSupabaseClient.from).not.toHaveBeenCalled();
    });

    it('should handle task titles with special characters', async () => {
      const assignorInfo = {
        first_name: 'Bob',
        last_name: 'Johnson',
      };

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: assignorInfo,
              error: null,
            }),
          }),
        }),
      });

      await notifyNewTaskAssignment(
        authUsersFixtures.alice.id,
        authUsersFixtures.bob.id,
        1,
        'Task with "quotes" and special chars: <>&'
      );

      expect(createNotification).toHaveBeenCalledWith({
        user_id: authUsersFixtures.alice.id,
        title: 'New Task Assignment',
        message: 'Bob Johnson assigned you to task: "Task with "quotes" and special chars: <>&"',
        type: NotificationType.TASK_ASSIGNED,
      });
    });
  });

  // comments notifs

  describe('notifyNewComment', () => {
    it('should create notifications for all assignees when commenter name exists', async () => {
      const commenterInfo = {
        first_name: 'Alice',
        last_name: 'Smith',
      };

      const assignees = [
        { assignee_id: authUsersFixtures.bob.id },
        { assignee_id: authUsersFixtures.carol.id },
      ];

      mockSupabaseClient.from = vi.fn().mockImplementation((table) => {
        if (table === 'user_info') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: commenterInfo,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'task_assignments') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: assignees,
                error: null,
              }),
            }),
          };
        }
      });

      await notifyNewComment(authUsersFixtures.alice.id, 1, 'Design Homepage');

      // Should create 2 notifications (one for bob, one for carol)
      expect(createNotification).toHaveBeenCalledTimes(2);

      expect(createNotification).toHaveBeenCalledWith({
        user_id: authUsersFixtures.bob.id,
        title: 'New Comment',
        message: 'Alice Smith commented on task: "Design Homepage"',
        type: NotificationType.COMMENT_ADDED,
      });

      expect(createNotification).toHaveBeenCalledWith({
        user_id: authUsersFixtures.carol.id,
        title: 'New Comment',
        message: 'Alice Smith commented on task: "Design Homepage"',
        type: NotificationType.COMMENT_ADDED,
      });
    });

    it("should create notification with 'Someone' when commenter info not found", async () => {
      const assignees = [{ assignee_id: authUsersFixtures.bob.id }];

      mockSupabaseClient.from = vi.fn().mockImplementation((table) => {
        if (table === 'user_info') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Not found' },
                }),
              }),
            }),
          };
        }
        if (table === 'task_assignments') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: assignees,
                error: null,
              }),
            }),
          };
        }
      });

      await notifyNewComment(authUsersFixtures.alice.id, 1, 'Design Homepage');

      expect(createNotification).toHaveBeenCalledWith({
        user_id: authUsersFixtures.bob.id,
        title: 'New Comment',
        message: 'Someone commented on task: "Design Homepage"',
        type: NotificationType.COMMENT_ADDED,
      });
    });

    it('should not notify commenter when they are the sole assignee', async () => {
      const commenterInfo = {
        first_name: 'Alice',
        last_name: 'Smith',
      };

      const assignees = [
        { assignee_id: authUsersFixtures.alice.id }, // Only the commenter is assigned
      ];

      mockSupabaseClient.from = vi.fn().mockImplementation((table) => {
        if (table === 'user_info') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: commenterInfo,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'task_assignments') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: assignees,
                error: null,
              }),
            }),
          };
        }
      });

      await notifyNewComment(authUsersFixtures.alice.id, 1, 'Design Homepage');

      // Should not create any notifications
      expect(createNotification).not.toHaveBeenCalled();
    });

    it('should skip commenter when notifying multiple assignees', async () => {
      const commenterInfo = {
        first_name: 'Alice',
        last_name: 'Smith',
      };

      const assignees = [
        { assignee_id: authUsersFixtures.alice.id }, // Commenter
        { assignee_id: authUsersFixtures.bob.id },
        { assignee_id: authUsersFixtures.carol.id },
      ];

      mockSupabaseClient.from = vi.fn().mockImplementation((table) => {
        if (table === 'user_info') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: commenterInfo,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'task_assignments') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: assignees,
                error: null,
              }),
            }),
          };
        }
      });

      await notifyNewComment(authUsersFixtures.alice.id, 1, 'Design Homepage');

      // Should create 2 notifications (exclude alice)
      expect(createNotification).toHaveBeenCalledTimes(2);

      // Verify alice did not receive a notification
      const calls = (createNotification as any).mock.calls;
      const aliceNotification = calls.find(
        (call: any) => call[0].user_id === authUsersFixtures.alice.id
      );
      expect(aliceNotification).toBeUndefined();
    });

    it('should not create notifications when task has no assignees', async () => {
      const commenterInfo = {
        first_name: 'Alice',
        last_name: 'Smith',
      };

      mockSupabaseClient.from = vi.fn().mockImplementation((table) => {
        if (table === 'user_info') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: commenterInfo,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'task_assignments') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          };
        }
      });

      await notifyNewComment(authUsersFixtures.alice.id, 1, 'Design Homepage');

      expect(createNotification).not.toHaveBeenCalled();
    });

    it('should handle errors when fetching assignees', async () => {
      const commenterInfo = {
        first_name: 'Alice',
        last_name: 'Smith',
      };

      mockSupabaseClient.from = vi.fn().mockImplementation((table) => {
        if (table === 'user_info') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: commenterInfo,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'task_assignments') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database error' },
              }),
            }),
          };
        }
      });

      await notifyNewComment(authUsersFixtures.alice.id, 1, 'Design Homepage');

      // Should not create any notifications on error
      expect(createNotification).not.toHaveBeenCalled();
    });
  });

  describe('NotificationType', () => {
    it('should have correct notification type values', () => {
      expect(NotificationType.TASK_ASSIGNED).toBe('task_assigned');
      expect(NotificationType.COMMENT_ADDED).toBe('comment_added');
    });
  });
});
