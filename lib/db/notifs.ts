import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export type Notification = {
  id: number;
  user_id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  is_archived: boolean;
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
  // Use admin client to bypass RLS when creating notifications
  // Appropriate since notifications are system-generated
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
    .from('notifications')
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
    console.error('DB: Error creating notification:', error);
    throw error;
  }

  return data;
}

// Get user notifications (non-archived only by default)
export async function getNotificationsForUser(
  userId: string,
  includeArchived: boolean = false
): Promise<Notification[]> {
  const supabase = await createClient();

  let query = supabase.from('notifications').select('*').eq('user_id', userId);

  // Filter out archived notifications
  if (!includeArchived) {
    query = query.eq('is_archived', false);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('DB: Error fetching notifications:', error);
    throw error;
  }

  return data || [];
}

// Get unread count
export async function getUnreadCount(userId: string): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);

  if (error) {
    console.error('DB: Error fetching unread count:', error);
    throw error;
  }

  return count || 0;
}

// Mark notification as read
export async function markNotificationAsRead(notificationId: number): Promise<Notification | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('notifications')
    .update({ read: true, updated_at: new Date().toISOString() })
    .eq('id', notificationId)
    .select()
    .single();

  if (error) {
    console.error('DB: Error marking notification as read:', error);
    throw error;
  }

  return data;
}

// Mark all as read
export async function markAllAsRead(userId: string): Promise<number> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('notifications')
    .update({ read: true, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('read', false)
    .select();

  if (error) {
    console.error('DB: Error marking all as read:', error);
    throw error;
  }

  return data?.length || 0;
}

// Archive notification
export async function archiveNotification(notificationId: number): Promise<Notification | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('notifications')
    .update({ is_archived: true, updated_at: new Date().toISOString() })
    .eq('id', notificationId)
    .select()
    .single();

  if (error) {
    console.error('DB: Error archiving notification:', error);
    throw error;
  }

  return data;
}
