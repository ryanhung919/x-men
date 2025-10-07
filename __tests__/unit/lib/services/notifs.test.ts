import { describe, it, expect, vi, beforeEach } from "vitest";
import { notifyNewTaskAssignment, NotificationType } from "@/lib/services/notifs";
import { createNotification } from "@/lib/db/notifs";
import { createMockSupabaseClient } from "@/__tests__/mocks/supabase.mock";
import { authUsersFixtures } from "@/__tests__/fixtures/database.fixtures";

vi.mock("@/lib/db/notifs", () => ({
  createNotification: vi.fn(),
}));

let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => mockSupabaseClient),
}));

describe("lib/services/notifs", () => {
  beforeEach(() => {
    mockSupabaseClient = createMockSupabaseClient();
    vi.clearAllMocks();
  });

  describe("notifyNewTaskAssignment", () => {
    it("should create notification with assignor name when assignor exists", async () => {
      const assignorInfo = {
        first_name: "Bob",
        last_name: "Johnson",
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
        "Design Homepage"
      );

      expect(createNotification).toHaveBeenCalledWith({
        user_id: authUsersFixtures.alice.id,
        title: "New Task Assignment",
        message: 'Bob Johnson assigned you to task: "Design Homepage"',
        type: NotificationType.TASK_ASSIGNED,
      });
    });

    it("should create notification with 'Someone' when assignor is null", async () => {
      await notifyNewTaskAssignment(
        authUsersFixtures.alice.id,
        null,
        1,
        "Design Homepage"
      );

      expect(createNotification).toHaveBeenCalledWith({
        user_id: authUsersFixtures.alice.id,
        title: "New Task Assignment",
        message: 'Someone assigned you to task: "Design Homepage"',
        type: NotificationType.TASK_ASSIGNED,
      });

      // Ensure we didn't try to query for assignor info
      expect(mockSupabaseClient.from).not.toHaveBeenCalled();
    });

    it("should create notification with 'Someone' when assignor info not found", async () => {
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: "Not found" },
            }),
          }),
        }),
      });

      await notifyNewTaskAssignment(
        authUsersFixtures.alice.id,
        authUsersFixtures.bob.id,
        1,
        "Design Homepage"
      );

      expect(createNotification).toHaveBeenCalledWith({
        user_id: authUsersFixtures.alice.id,
        title: "New Task Assignment",
        message: 'Someone assigned you to task: "Design Homepage"',
        type: NotificationType.TASK_ASSIGNED,
      });
    });

    it("should not create notification for self-assignment", async () => {
      await notifyNewTaskAssignment(
        authUsersFixtures.alice.id,
        authUsersFixtures.alice.id,
        1,
        "Design Homepage"
      );

      expect(createNotification).not.toHaveBeenCalled();
      expect(mockSupabaseClient.from).not.toHaveBeenCalled();
    });

    it("should handle task titles with special characters", async () => {
      const assignorInfo = {
        first_name: "Bob",
        last_name: "Johnson",
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
        title: "New Task Assignment",
        message: 'Bob Johnson assigned you to task: "Task with "quotes" and special chars: <>&"',
        type: NotificationType.TASK_ASSIGNED,
      });
    });
  });

  describe("NotificationType", () => {
    it("should have correct notification type values", () => {
      expect(NotificationType.TASK_ASSIGNED).toBe("task_assigned");
    });
  });
});
