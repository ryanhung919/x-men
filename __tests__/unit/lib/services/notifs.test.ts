import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  notifyNewTaskAssignment,
  notifyNewComment,
  notifyTaskUpdate,
  NotificationType
} from '@/lib/services/notifs';
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

/**
 * NOTE: Production uses database triggers for notifications, service layer not involved
 * These tests checks the expected behavior and validate business logic/service layer
 */
describe('lib/services/notifs', () => {
  beforeEach(() => {
    mockSupabaseClient = createMockSupabaseClient();
    vi.clearAllMocks();
  });

  // Task assignments: fallback to "Someone" if assignor not found; no self-notification
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
  });

  // Comments: notify all assignees except the commenter
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
        { assignee_id: authUsersFixtures.alice.id }, // only the commenter is assigned
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

      expect(createNotification).not.toHaveBeenCalled();
    });

    it('should skip commenter when notifying multiple assignees', async () => {
      const commenterInfo = {
        first_name: 'Alice',
        last_name: 'Smith',
      };

      const assignees = [
        { assignee_id: authUsersFixtures.alice.id }, // commenter
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

      expect(createNotification).toHaveBeenCalledTimes(2);

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

      expect(createNotification).not.toHaveBeenCalled();
    });
  });

  // Task updates: test notification creation for field changes
  describe('notifyTaskUpdate', () => {
    const updaterId = authUsersFixtures.alice.id;
    const taskId = 1;
    const taskTitle = 'Design Homepage';
    const currentTask = {
      title: 'Design Homepage',
      status: 'To Do',
      priority_bucket: 5,
      description: 'Initial design work',
      deadline: '2024-12-01T00:00:00Z',
      notes: 'Important task',
      recurrence_date: null,
      is_archived: false,
    };

    beforeEach(() => {
      mockSupabaseClient.from = vi.fn().mockImplementation((table) => {
        if (table === 'user_info') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    first_name: 'Alice',
                    last_name: 'Smith',
                  },
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
                data: [
                  { assignee_id: authUsersFixtures.bob.id },
                  { assignee_id: authUsersFixtures.carol.id },
                ],
                error: null,
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        };
      });
    });

    describe('Single Field Updates', () => {
      it('should create notification for title update with proper message format', async () => {
        const updates = { title: 'New Homepage Design' };

        await notifyTaskUpdate(updaterId, taskId, taskTitle, updates, currentTask);

        expect(createNotification).toHaveBeenCalledTimes(2); // Bob and Carol

        expect(createNotification).toHaveBeenCalledWith({
          user_id: authUsersFixtures.bob.id,
          title: 'Task Updated',
          message: 'Alice Smith updated the title of task "Design Homepage" to "New Homepage Design"',
          type: NotificationType.TASK_UPDATED,
        });
      });

      it('should create notification for status update with from/to values', async () => {
        const updates = { status: 'In Progress' };

        await notifyTaskUpdate(updaterId, taskId, taskTitle, updates, currentTask);

        expect(createNotification).toHaveBeenCalledWith({
          user_id: authUsersFixtures.bob.id,
          title: 'Task Updated',
          message: 'Alice Smith changed the status of task "Design Homepage" from "To Do" to "In Progress"',
          type: NotificationType.TASK_UPDATED,
        });
      });

      it('should create notification for priority update with numeric values', async () => {
        const updates = { priority_bucket: 8 };

        await notifyTaskUpdate(updaterId, taskId, taskTitle, updates, currentTask);

        expect(createNotification).toHaveBeenCalledWith({
          user_id: authUsersFixtures.bob.id,
          title: 'Task Updated',
          message: 'Alice Smith changed the priority of task "Design Homepage" from 5 to 8',
          type: NotificationType.TASK_UPDATED,
        });
      });

      it('should create notification for deadline update with formatted dates', async () => {
        const updates = { deadline: '2024-12-15T00:00:00Z' };

        await notifyTaskUpdate(updaterId, taskId, taskTitle, updates, currentTask);

        expect(createNotification).toHaveBeenCalledWith({
          user_id: authUsersFixtures.bob.id,
          title: 'Task Updated',
          message: 'Alice Smith changed the deadline of task "Design Homepage" from 12/1/2024 to 12/15/2024',
          type: NotificationType.TASK_UPDATED,
        });
      });

      it('should create notification for description update with empty string handling', async () => {
        const updates = { description: 'Updated design requirements' };

        await notifyTaskUpdate(updaterId, taskId, taskTitle, updates, currentTask);

        expect(createNotification).toHaveBeenCalledWith({
          user_id: authUsersFixtures.bob.id,
          title: 'Task Updated',
          message: 'Alice Smith changed the description of task "Design Homepage" from "Initial design work" to "Updated design requirements"',
          type: NotificationType.TASK_UPDATED,
        });

        // Test empty string handling
        const emptyUpdates = { description: '' };
        const emptyCurrentTask = { ...currentTask, description: null };

        await notifyTaskUpdate(updaterId, taskId, taskTitle, emptyUpdates, emptyCurrentTask);

        expect(createNotification).toHaveBeenCalledWith({
          user_id: authUsersFixtures.bob.id,
          title: 'Task Updated',
          message: 'Alice Smith changed the description of task "Design Homepage" from "(empty)" to "(empty)"',
          type: NotificationType.TASK_UPDATED,
        });
      });
    });

    describe('Multi-Field Updates', () => {
      it('should create compact notification for multiple field updates', async () => {
        const updates = {
          title: 'New Homepage Design',
          status: 'In Progress',
          priority_bucket: 8,
        };

        await notifyTaskUpdate(updaterId, taskId, taskTitle, updates, currentTask);

        expect(createNotification).toHaveBeenCalledWith({
          user_id: authUsersFixtures.bob.id,
          title: 'Task Updated',
          message: 'Alice Smith updated the following fields in task "Design Homepage": title, status, priority',
          type: NotificationType.TASK_UPDATED,
        });
      });

      it('should include all changed field names in multi-field message', async () => {
        const updates = {
          title: 'New Title',
          description: 'New description',
          notes: 'New notes',
          deadline: '2024-12-20T00:00:00Z',
        };

        await notifyTaskUpdate(updaterId, taskId, taskTitle, updates, currentTask);

        expect(createNotification).toHaveBeenCalledWith({
          user_id: authUsersFixtures.bob.id,
          title: 'Task Updated',
          message: 'Alice Smith updated the following fields in task "Design Homepage": title, description, notes, deadline',
          type: NotificationType.TASK_UPDATED,
        });
      });

      it('should use user-friendly field names in multi-field messages', async () => {
        const updates = {
          priority_bucket: 8,
          recurrence_date: '2024-12-01T00:00:00Z',
          is_archived: true,
        };

        await notifyTaskUpdate(updaterId, taskId, taskTitle, updates, currentTask);

        expect(createNotification).toHaveBeenCalledWith({
          user_id: authUsersFixtures.bob.id,
          title: 'Task Updated',
          message: 'Alice Smith updated the following fields in task "Design Homepage": priority, recurrence date, archive status',
          type: NotificationType.TASK_UPDATED,
        });
      });
    });

    describe('No-Change Scenarios', () => {
      it('should not create notification when no fields actually changed', async () => {
        const updates = {
          title: 'Design Homepage', // Same as current
          status: 'To Do', // Same as current
        };

        await notifyTaskUpdate(updaterId, taskId, taskTitle, updates, currentTask);

        expect(createNotification).not.toHaveBeenCalled();
      });

      it('should handle empty updates object gracefully', async () => {
        const updates = {};

        await notifyTaskUpdate(updaterId, taskId, taskTitle, updates, currentTask);

        expect(createNotification).not.toHaveBeenCalled();
      });

      it('should skip unchanged fields in multi-field updates', async () => {
        const updates = {
          title: 'Design Homepage', // Same - should be skipped
          status: 'In Progress', // Different - should be included
          priority_bucket: 5, // Same - should be skipped
        };

        await notifyTaskUpdate(updaterId, taskId, taskTitle, updates, currentTask);

        expect(createNotification).toHaveBeenCalledWith({
          user_id: authUsersFixtures.bob.id,
          title: 'Task Updated',
          message: 'Alice Smith changed the status of task "Design Homepage" from "To Do" to "In Progress"',
          type: NotificationType.TASK_UPDATED,
        });
      });
    });

    describe('User Information Tests', () => {
      it('should include updater name when user info exists', async () => {
        const updates = { title: 'New Title' };

        await notifyTaskUpdate(updaterId, taskId, taskTitle, updates, currentTask);

        expect(createNotification).toHaveBeenCalledWith({
          user_id: authUsersFixtures.bob.id,
          title: 'Task Updated',
          message: 'Alice Smith updated the title of task "Design Homepage" to "New Title"',
          type: NotificationType.TASK_UPDATED,
        });
      });

      it('should fallback to "Someone" when updater info not found', async () => {
        const updates = { title: 'New Title' };

        // Mock user info not found
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
                  data: [{ assignee_id: authUsersFixtures.bob.id }],
                  error: null,
                }),
              }),
            };
          }
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          };
        });

        await notifyTaskUpdate(updaterId, taskId, taskTitle, updates, currentTask);

        expect(createNotification).toHaveBeenCalledWith({
          user_id: authUsersFixtures.bob.id,
          title: 'Task Updated',
          message: 'Someone updated the title of task "Design Homepage" to "New Title"',
          type: NotificationType.TASK_UPDATED,
        });
      });

      it('should handle database errors when fetching updater info', async () => {
        const updates = { title: 'New Title' };

        // Mock database error
        mockSupabaseClient.from = vi.fn().mockImplementation((table) => {
          if (table === 'user_info') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Database connection failed' },
                  }),
                }),
              }),
            };
          }
          if (table === 'task_assignments') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  data: [{ assignee_id: authUsersFixtures.bob.id }],
                  error: null,
                }),
              }),
            };
          }
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          };
        });

        await notifyTaskUpdate(updaterId, taskId, taskTitle, updates, currentTask);

        expect(createNotification).toHaveBeenCalledWith({
          user_id: authUsersFixtures.bob.id,
          title: 'Task Updated',
          message: 'Someone updated the title of task "Design Homepage" to "New Title"',
          type: NotificationType.TASK_UPDATED,
        });
      });
    });

    describe('Assignee Notification Tests', () => {
      it('should create notifications for all assignees except updater', async () => {
        const updates = { title: 'New Title' };

        // Mock assignees including the updater
        mockSupabaseClient.from = vi.fn().mockImplementation((table) => {
          if (table === 'user_info') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { first_name: 'Alice', last_name: 'Smith' },
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
                  data: [
                    { assignee_id: authUsersFixtures.alice.id }, // Updater - should be skipped
                    { assignee_id: authUsersFixtures.bob.id },   // Should receive notification
                    { assignee_id: authUsersFixtures.carol.id }, // Should receive notification
                  ],
                  error: null,
                }),
              }),
            };
          }
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          };
        });

        await notifyTaskUpdate(updaterId, taskId, taskTitle, updates, currentTask);

        // Should only notify Bob and Carol, not Alice (the updater)
        expect(createNotification).toHaveBeenCalledTimes(2);
        expect(createNotification).toHaveBeenCalledWith({
          user_id: authUsersFixtures.bob.id,
          title: 'Task Updated',
          message: 'Alice Smith updated the title of task "Design Homepage" to "New Title"',
          type: NotificationType.TASK_UPDATED,
        });
        expect(createNotification).toHaveBeenCalledWith({
          user_id: authUsersFixtures.carol.id,
          title: 'Task Updated',
          message: 'Alice Smith updated the title of task "Design Homepage" to "New Title"',
          type: NotificationType.TASK_UPDATED,
        });
      });

      it('should not notify updater when they are also an assignee', async () => {
        const updates = { title: 'New Title' };

        // Mock single assignee who is also the updater
        mockSupabaseClient.from = vi.fn().mockImplementation((table) => {
          if (table === 'user_info') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { first_name: 'Alice', last_name: 'Smith' },
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
                  data: [{ assignee_id: authUsersFixtures.alice.id }], // Only the updater
                  error: null,
                }),
              }),
            };
          }
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          };
        });

        await notifyTaskUpdate(updaterId, taskId, taskTitle, updates, currentTask);

        // Should not create any notifications (updater is the only assignee)
        expect(createNotification).not.toHaveBeenCalled();
      });

      it('should handle no assignees scenario gracefully', async () => {
        const updates = { title: 'New Title' };

        // Mock no assignees
        mockSupabaseClient.from = vi.fn().mockImplementation((table) => {
          if (table === 'user_info') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { first_name: 'Alice', last_name: 'Smith' },
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
                  data: [], // No assignees
                  error: null,
                }),
              }),
            };
          }
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          };
        });

        await notifyTaskUpdate(updaterId, taskId, taskTitle, updates, currentTask);

        // Should not create any notifications (no assignees)
        expect(createNotification).not.toHaveBeenCalled();
      });

      it('should handle database errors when fetching assignees', async () => {
        const updates = { title: 'New Title' };

        // Mock database error for assignees
        mockSupabaseClient.from = vi.fn().mockImplementation((table) => {
          if (table === 'user_info') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { first_name: 'Alice', last_name: 'Smith' },
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
                  error: { message: 'Database connection failed' },
                }),
              }),
            };
          }
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          };
        });

        await notifyTaskUpdate(updaterId, taskId, taskTitle, updates, currentTask);

        // Should not create any notifications due to database error
        expect(createNotification).not.toHaveBeenCalled();
      });
    });

    describe('Error Handling & Edge Cases', () => {
      it('should handle null/undefined values in old and new data', async () => {
        const updates = { deadline: null };

        await notifyTaskUpdate(updaterId, taskId, taskTitle, updates, currentTask);

        expect(createNotification).toHaveBeenCalledWith({
          user_id: authUsersFixtures.bob.id,
          title: 'Task Updated',
          message: 'Alice Smith changed the deadline of task "Design Homepage" from 12/1/2024 to (none)',
          type: NotificationType.TASK_UPDATED,
        });
      });

      it('should handle special characters in task titles', async () => {
        const specialTitle = 'Task with "quotes" & symbols @#$%';
        const updates = { title: 'New Title' };

        await notifyTaskUpdate(updaterId, taskId, specialTitle, updates, { ...currentTask, title: specialTitle });

        expect(createNotification).toHaveBeenCalledWith({
          user_id: authUsersFixtures.bob.id,
          title: 'Task Updated',
          message: 'Alice Smith updated the title of task "Task with \"quotes\" & symbols @#$%" to "New Title"',
          type: NotificationType.TASK_UPDATED,
        });
      });

      it('should handle recurrence_date changes (set/remove/update)', async () => {
        // Test setting recurrence date
        const updates1 = { recurrence_date: '2024-12-01T00:00:00Z' };
        await notifyTaskUpdate(updaterId, taskId, taskTitle, updates1, currentTask);

        expect(createNotification).toHaveBeenCalledWith({
          user_id: authUsersFixtures.bob.id,
          title: 'Task Updated',
          message: 'Alice Smith set a recurrence date for task "Design Homepage"',
          type: NotificationType.TASK_UPDATED,
        });

        vi.clearAllMocks();

        // Test removing recurrence date
        const currentWithRecurrence = { ...currentTask, recurrence_date: '2024-12-01T00:00:00Z' };
        const updates2 = { recurrence_date: null };
        await notifyTaskUpdate(updaterId, taskId, taskTitle, updates2, currentWithRecurrence);

        expect(createNotification).toHaveBeenCalledWith({
          user_id: authUsersFixtures.bob.id,
          title: 'Task Updated',
          message: 'Alice Smith removed the recurrence date from task "Design Homepage"',
          type: NotificationType.TASK_UPDATED,
        });
      });

      it('should handle archive status changes', async () => {
        // Test archiving
        const updates1 = { is_archived: true };
        await notifyTaskUpdate(updaterId, taskId, taskTitle, updates1, currentTask);

        expect(createNotification).toHaveBeenCalledWith({
          user_id: authUsersFixtures.bob.id,
          title: 'Task Updated',
          message: 'Alice Smith archived task "Design Homepage"',
          type: NotificationType.TASK_UPDATED,
        });

        vi.clearAllMocks();

        // Test unarchiving
        const currentArchived = { ...currentTask, is_archived: true };
        const updates2 = { is_archived: false };
        await notifyTaskUpdate(updaterId, taskId, taskTitle, updates2, currentArchived);

        expect(createNotification).toHaveBeenCalledWith({
          user_id: authUsersFixtures.bob.id,
          title: 'Task Updated',
          message: 'Alice Smith unarchived task "Design Homepage"',
          type: NotificationType.TASK_UPDATED,
        });
      });

      it('should handle database errors when creating notifications', async () => {
        const updates = { title: 'New Title' };

        // Mock successful data fetch but error in notification creation
        mockSupabaseClient.from = vi.fn().mockImplementation((table) => {
          if (table === 'user_info') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { first_name: 'Alice', last_name: 'Smith' },
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
                  data: [{ assignee_id: authUsersFixtures.bob.id }],
                  error: null,
                }),
              }),
            };
          }
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          };
        });

        // Mock createNotification to throw an error
        vi.mocked(createNotification).mockRejectedValue(new Error('Database write failed'));

        await expect(notifyTaskUpdate(updaterId, taskId, taskTitle, updates, currentTask)).rejects.toThrow('Database write failed');
      });
    });
  });

  describe('NotificationType', () => {
    it('should have correct notification type values', () => {
      expect(NotificationType.TASK_ASSIGNED).toBe('task_assigned');
      expect(NotificationType.COMMENT_ADDED).toBe('comment_added');
      expect(NotificationType.TASK_UPDATED).toBe('task_updated');
    });
  });
});
