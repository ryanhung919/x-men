import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export type Notification = {
  id: number;
  user_id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
  updated_at: string;
};

export type CreateNotificationInput = {
  user_id: string;
  title: string;
  message: string;
  type: string;
};

// Create notification
export async function createNotification(
  input: CreateNotificationInput
): Promise<Notification | null> {
  console.log("DB: createNotification called with:", input);

  // Use admin client to bypass RLS when creating notifications
  // This is appropriate since notifications are system-generated
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  const { data, error } = await adminClient
    .from("notifications")
    .insert({
      user_id: input.user_id,
      title: input.title,
      message: input.message,
      type: input.type,
      read: false,
    })
    .select()
    .single();

  if (error) {
    console.error("DB: Error creating notification:", error);
    throw error;
  }

  console.log("DB: Notification created:", data);
  return data;
}

// Get user notifications
export async function getNotificationsForUser(
  userId: string
): Promise<Notification[]> {
  console.log("DB: getNotificationsForUser called for userId:", userId);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("DB: Error fetching notifications:", error);
    throw error;
  }

  console.log(`DB: Found ${data?.length || 0} notifications`);
  return data || [];
}

// Get unread count
export async function getUnreadCount(userId: string): Promise<number> {
  console.log("DB: getUnreadCount called for userId:", userId);
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("read", false);

  if (error) {
    console.error("DB: Error fetching unread count:", error);
    throw error;
  }

  console.log(`DB: Unread count: ${count}`);
  return count || 0;
}

// Mark notification as read
export async function markNotificationAsRead(
  notificationId: number
): Promise<Notification | null> {
  console.log("DB: markNotificationAsRead called for id:", notificationId);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("notifications")
    .update({ read: true, updated_at: new Date().toISOString() })
    .eq("id", notificationId)
    .select()
    .single();

  if (error) {
    console.error("DB: Error marking notification as read:", error);
    throw error;
  }

  console.log("DB: Notification marked as read:", data);
  return data;
}

// Mark all as read
export async function markAllAsRead(userId: string): Promise<number> {
  console.log("DB: markAllAsRead called for userId:", userId);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("notifications")
    .update({ read: true, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("read", false)
    .select();

  if (error) {
    console.error("DB: Error marking all as read:", error);
    throw error;
  }

  console.log(`DB: Marked ${data?.length || 0} notifications as read`);
  return data?.length || 0;
}

// Delete notification
export async function deleteNotification(
  notificationId: number
): Promise<boolean> {
  console.log("DB: deleteNotification called for id:", notificationId);
  const supabase = await createClient();

  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", notificationId);

  if (error) {
    console.error("DB: Error deleting notification:", error);
    throw error;
  }

  console.log("DB: Notification deleted successfully");
  return true;
}
