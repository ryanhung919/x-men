import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotificationAction,
} from "@/app/actions/notifs";
import * as notifsDb from "@/lib/db/notifs";
import { createMockSupabaseClient } from "@/__tests__/mocks/supabase.mock";
import {
  authUsersFixtures,
  notificationsFixtures,
} from "@/__tests__/fixtures/database.fixtures";

vi.mock("@/lib/db/notifs", () => ({
  getNotificationsForUser: vi.fn(),
  getUnreadCount: vi.fn(),
  markNotificationAsRead: vi.fn(),
  markAllAsRead: vi.fn(),
  deleteNotification: vi.fn(),
}));

let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => mockSupabaseClient),
}));

describe("app/actions/notifs", () => {
  beforeEach(() => {
    mockSupabaseClient = createMockSupabaseClient();
    vi.clearAllMocks();
  });

  describe("getNotifications", () => {
    it("should return notifications for authenticated user", async () => {
      const mockNotifications = [notificationsFixtures.aliceTaskAssigned];

      mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: { id: authUsersFixtures.alice.id } },
        error: null,
      });

      vi.spyOn(notifsDb, "getNotificationsForUser").mockResolvedValue(
        mockNotifications
      );

      const result = await getNotifications();

      expect(notifsDb.getNotificationsForUser).toHaveBeenCalledWith(
        authUsersFixtures.alice.id
      );
      expect(result).toEqual(mockNotifications);
    });

    it("should throw error when user is not authenticated", async () => {
      mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: null },
        error: { message: "Not authenticated" },
      });

      await expect(getNotifications()).rejects.toThrow("Unauthorized");
      expect(notifsDb.getNotificationsForUser).not.toHaveBeenCalled();
    });

    it("should throw error when user data is null", async () => {
      mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(getNotifications()).rejects.toThrow("Unauthorized");
      expect(notifsDb.getNotificationsForUser).not.toHaveBeenCalled();
    });
  });

  describe("getUnreadNotificationCount", () => {
    it("should return unread count for authenticated user", async () => {
      mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: { id: authUsersFixtures.alice.id } },
        error: null,
      });

      vi.spyOn(notifsDb, "getUnreadCount").mockResolvedValue(3);

      const result = await getUnreadNotificationCount();

      expect(notifsDb.getUnreadCount).toHaveBeenCalledWith(
        authUsersFixtures.alice.id
      );
      expect(result).toBe(3);
    });

    it("should throw error when user is not authenticated", async () => {
      mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: null },
        error: { message: "Not authenticated" },
      });

      await expect(getUnreadNotificationCount()).rejects.toThrow("Unauthorized");
      expect(notifsDb.getUnreadCount).not.toHaveBeenCalled();
    });
  });

  describe("markNotificationRead", () => {
    it("should mark notification as read for authenticated user", async () => {
      const updatedNotification = {
        ...notificationsFixtures.aliceTaskAssigned,
        read: true,
      };

      mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: { id: authUsersFixtures.alice.id } },
        error: null,
      });

      vi.spyOn(notifsDb, "markNotificationAsRead").mockResolvedValue(
        updatedNotification
      );

      const result = await markNotificationRead(1);

      expect(notifsDb.markNotificationAsRead).toHaveBeenCalledWith(1);
      expect(result).toEqual(updatedNotification);
      expect(result?.read).toBe(true);
    });

    it("should throw error when user is not authenticated", async () => {
      mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: null },
        error: { message: "Not authenticated" },
      });

      await expect(markNotificationRead(1)).rejects.toThrow("Unauthorized");
      expect(notifsDb.markNotificationAsRead).not.toHaveBeenCalled();
    });
  });

  describe("markAllNotificationsRead", () => {
    it("should mark all notifications as read for authenticated user", async () => {
      mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: { id: authUsersFixtures.alice.id } },
        error: null,
      });

      vi.spyOn(notifsDb, "markAllAsRead").mockResolvedValue(5);

      const result = await markAllNotificationsRead();

      expect(notifsDb.markAllAsRead).toHaveBeenCalledWith(
        authUsersFixtures.alice.id
      );
      expect(result).toBe(5);
    });

    it("should throw error when user is not authenticated", async () => {
      mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: null },
        error: { message: "Not authenticated" },
      });

      await expect(markAllNotificationsRead()).rejects.toThrow("Unauthorized");
      expect(notifsDb.markAllAsRead).not.toHaveBeenCalled();
    });
  });

  describe("deleteNotificationAction", () => {
    it("should delete notification for authenticated user", async () => {
      mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: { id: authUsersFixtures.alice.id } },
        error: null,
      });

      vi.spyOn(notifsDb, "deleteNotification").mockResolvedValue(true);

      const result = await deleteNotificationAction(1);

      expect(notifsDb.deleteNotification).toHaveBeenCalledWith(1);
      expect(result).toBe(true);
    });

    it("should throw error when user is not authenticated", async () => {
      mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: null },
        error: { message: "Not authenticated" },
      });

      await expect(deleteNotificationAction(1)).rejects.toThrow("Unauthorized");
      expect(notifsDb.deleteNotification).not.toHaveBeenCalled();
    });
  });
});
