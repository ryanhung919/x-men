import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createNotification,
  getNotificationsForUser,
  getUnreadCount,
  markNotificationAsRead,
  markAllAsRead,
  deleteNotification,
} from "@/lib/db/notifs";
import { createMockSupabaseClient } from "@/__tests__/mocks/supabase.mock";
import {
  authUsersFixtures,
  notificationsFixtures,
} from "@/__tests__/fixtures/database.fixtures";

// Mock the Supabase client module
let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => mockSupabaseClient),
}));

describe("lib/db/notifs", () => {
  beforeEach(() => {
    mockSupabaseClient = createMockSupabaseClient();
  });

  describe("createNotification", () => {
    it("should create a new notification successfully", async () => {
      const newNotification = {
        user_id: authUsersFixtures.alice.id,
        title: "New Task Assignment",
        message: "You have been assigned to a new task",
        type: "task_assigned",
      };

      const expectedResult = {
        ...newNotification,
        id: 99,
        read: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Mock the insert chain
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: expectedResult,
              error: null,
            }),
          }),
        }),
      });

      const result = await createNotification(newNotification);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith("notifications");
      expect(result).toEqual(expectedResult);
      expect(result?.read).toBe(false);
    });

    it("should throw error when notification creation fails", async () => {
      const newNotification = {
        user_id: authUsersFixtures.alice.id,
        title: "Test",
        message: "Test message",
        type: "task_assigned",
      };

      const mockError = { message: "Database error", code: "23505" };

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: mockError,
            }),
          }),
        }),
      });

      await expect(createNotification(newNotification)).rejects.toThrow();
    });
  });

  describe("getNotificationsForUser", () => {
    it("should return all notifications for a user", async () => {
      const aliceNotifications = [notificationsFixtures.aliceTaskAssigned];

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: aliceNotifications,
              error: null,
            }),
          }),
        }),
      });

      const result = await getNotificationsForUser(authUsersFixtures.alice.id);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith("notifications");
      expect(result).toEqual(aliceNotifications);
      expect(result).toHaveLength(1);
    });

    it("should return empty array when user has no notifications", async () => {
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      });

      const result = await getNotificationsForUser(authUsersFixtures.dave.id);

      expect(result).toEqual([]);
    });

    it("should throw error when query fails", async () => {
      const mockError = { message: "Connection error" };

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: null,
              error: mockError,
            }),
          }),
        }),
      });

      await expect(
        getNotificationsForUser(authUsersFixtures.alice.id)
      ).rejects.toThrow();
    });
  });

  describe("getUnreadCount", () => {
    it("should return unread notification count", async () => {
      const mockChain = {
        eq: vi.fn().mockResolvedValue({
          count: 3,
          error: null,
        }),
      };

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue(mockChain),
        }),
      });

      const result = await getUnreadCount(authUsersFixtures.alice.id);

      expect(result).toBe(3);
    });

    it("should return 0 when user has no unread notifications", async () => {
      const mockChain = {
        eq: vi.fn().mockResolvedValue({
          count: 0,
          error: null,
        }),
      };

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue(mockChain),
        }),
      });

      const result = await getUnreadCount(authUsersFixtures.bob.id);

      expect(result).toBe(0);
    });

    it("should return 0 when count is null", async () => {
      const mockChain = {
        eq: vi.fn().mockResolvedValue({
          count: null,
          error: null,
        }),
      };

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue(mockChain),
        }),
      });

      const result = await getUnreadCount(authUsersFixtures.alice.id);

      expect(result).toBe(0);
    });
  });

  describe("markNotificationAsRead", () => {
    it("should mark a notification as read", async () => {
      const updatedNotification = {
        ...notificationsFixtures.aliceTaskAssigned,
        read: true,
        updated_at: new Date().toISOString(),
      };

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: updatedNotification,
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await markNotificationAsRead(1);

      expect(result?.read).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith("notifications");
    });

    it("should throw error when notification not found", async () => {
      const mockError = { message: "Not found", code: "PGRST116" };

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: mockError,
              }),
            }),
          }),
        }),
      });

      await expect(markNotificationAsRead(999)).rejects.toThrow();
    });
  });

  describe("markAllAsRead", () => {
    it("should mark all unread notifications as read", async () => {
      const updatedNotifications = [
        { ...notificationsFixtures.aliceTaskAssigned, read: true },
        { ...notificationsFixtures.bobTaskAssigned, read: true },
      ];

      const mockChain = {
        select: vi.fn().mockResolvedValue({
          data: updatedNotifications,
          error: null,
        }),
      };

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue(mockChain),
          }),
        }),
      });

      const result = await markAllAsRead(authUsersFixtures.alice.id);

      expect(result).toBe(2);
    });

    it("should return 0 when no unread notifications", async () => {
      const mockChain = {
        select: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue(mockChain),
          }),
        }),
      });

      const result = await markAllAsRead(authUsersFixtures.bob.id);

      expect(result).toBe(0);
    });
  });

  describe("deleteNotification", () => {
    it("should delete a notification successfully", async () => {
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: null,
          }),
        }),
      });

      const result = await deleteNotification(1);

      expect(result).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith("notifications");
    });

    it("should throw error when deletion fails", async () => {
      const mockError = { message: "Delete failed" };

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: mockError,
          }),
        }),
      });

      await expect(deleteNotification(1)).rejects.toThrow();
    });
  });
});
