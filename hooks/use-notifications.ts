'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Notification } from '@/components/notifications/notification-item';
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotificationAction,
} from '@/app/actions/notifs';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const [notifs, count] = await Promise.all([getNotifications(), getUnreadNotificationCount()]);
      setNotifications(notifs);
      setUnreadCount(count);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();

    // Realtime subscription
    const channel: RealtimeChannel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
        },
        async (payload: RealtimePostgresChangesPayload<Notification>) => {
          console.log('Notification change received:', payload);

          // Handle insert
          if (payload.eventType === 'INSERT') {
            const newNotification = payload.new as Notification;
            setNotifications((prev) => [newNotification, ...prev]);
            if (!newNotification.read) {
              setUnreadCount((prev) => prev + 1);
            }
          }

          // Handle update
          if (payload.eventType === 'UPDATE') {
            const updatedNotification = payload.new as Notification;
            setNotifications((prev) =>
              prev.map((n) => (n.id === updatedNotification.id ? updatedNotification : n))
            );

            // Update unread counter
            const count = await getUnreadNotificationCount();
            setUnreadCount(count);
          }

          // Handle delete
          if (payload.eventType === 'DELETE') {
            const deletedNotification = payload.old as Notification;
            setNotifications((prev) => prev.filter((n) => n.id !== deletedNotification.id));
            if (!deletedNotification.read) {
              setUnreadCount((prev) => Math.max(0, prev - 1));
            }
          }
        }
      )
      .subscribe();

    // Cleanup subscription
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchNotifications]);

  const handleMarkAsRead = async (id: number) => {
    try {
      await markNotificationRead(id);
      // State will update via realtime subscription
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsRead();
      // State will update via realtime subscription
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteNotificationAction(id);
      // State will update via realtime subscription
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  return {
    notifications,
    unreadCount,
    isLoading,
    handleMarkAsRead,
    handleMarkAllAsRead,
    handleDelete,
    refetch: fetchNotifications,
  };
}
