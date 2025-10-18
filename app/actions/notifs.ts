"use server";

import { createClient } from "@/lib/supabase/server";
import {
  getNotificationsForUser,
  getUnreadCount,
  markNotificationAsRead,
  markAllAsRead,
  archiveNotification,
} from "@/lib/db/notifs";

// Get current user's notifications
export async function getNotifications() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Unauthorized");
  }

  return await getNotificationsForUser(user.id);
}

// Get unread count
export async function getUnreadNotificationCount() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Unauthorized");
  }

  return await getUnreadCount(user.id);
}

// Mark as read
export async function markNotificationRead(notificationId: number) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Unauthorized");
  }

  return await markNotificationAsRead(notificationId);
}

// Mark all as read
export async function markAllNotificationsRead() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Unauthorized");
  }

  return await markAllAsRead(user.id);
}

// Archive notification (soft delete)
export async function deleteNotificationAction(notificationId: number) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Unauthorized");
  }

  return await archiveNotification(notificationId);
}
