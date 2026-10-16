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
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const supabase = createClient();

  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const [notifs, count] = await Promise.all([getNotifications(), getUnreadNotificationCount()]);
      setNotifications(notifs);
      setUnreadCount(count);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setError('Could not load your notifications. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();

    // Realtime subscription
    const channel: RealtimeChannel = supabase
      .channel(`notifications-changes-${crypto.randomUUID()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
        },
        async (payload: RealtimePostgresChangesPayload<Notification>) => {
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

            // If notification was archived, remove it from the list
            if (updatedNotification.is_archived) {
              setNotifications((prev) => prev.filter((n) => n.id !== updatedNotification.id));
              const oldNotification = payload.old as Notification;
              if (!oldNotification.read) {
                setUnreadCount((prev) => Math.max(0, prev - 1));
              }
            } else {
              // Normal update (e.g., marking as read)
              setNotifications((prev) =>
                prev.map((n) => (n.id === updatedNotification.id ? updatedNotification : n))
              );

              // Update unread counter
              const count = await getUnreadNotificationCount();
              setUnreadCount(count);
            }
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
      // Optimistic update
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));

      await markNotificationRead(id);
      // Realtime will confirm the update
    } catch (error) {
      console.error('Error marking notification as read:', error);
      setError('Could not mark this notification as read. Please try again.');
      // Revert on error
      fetchNotifications();
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      // Optimistic update
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);

      await markAllNotificationsRead();
      // Realtime will confirm the update
    } catch (error) {
      console.error('Error marking all as read:', error);
      setError('Could not mark notifications as read. Please try again.');
      // Revert on error
      fetchNotifications();
    }
  };

  const handleDelete = async (id: number) => {
    try {
      // Optimistic update - remove from UI immediately
      const notificationToDelete = notifications.find((n) => n.id === id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (notificationToDelete && !notificationToDelete.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }

      await deleteNotificationAction(id);
      // Realtime will confirm the update
    } catch (error) {
      console.error('Error deleting notification:', error);
      setError('Could not delete this notification. Please try again.');
      // Revert on error
      fetchNotifications();
    }
  };

  const handleDeleteAll = async () => {
    if (isDeleting) return; // Prevent multiple clicks

    try {
      setIsDeleting(true);

      // Save current notifications before clearing
      const currentNotifications = [...notifications];

      // Mark all as read first
      await markAllNotificationsRead();

      // Archive all notifications in parallel
      await Promise.all(
        currentNotifications.map((notification) => deleteNotificationAction(notification.id))
      );

      // Clear UI after all operations complete
      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error('Error deleting all notifications:', error);
      setError('Could not delete all notifications. Please try again.');
      // Revert on error
      fetchNotifications();
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    notifications,
    error,
    unreadCount,
    isLoading,
    isDeleting,
    handleMarkAsRead,
    handleMarkAllAsRead,
    handleDelete,
    handleDeleteAll,
    refetch: () => {
      setError(null);
      return fetchNotifications();
    },
  };
}
