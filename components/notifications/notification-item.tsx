'use client';

import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export type Notification = {
  id: number;
  title: string;
  message: string;
  type: string;
  read: boolean;
  is_archived: boolean;
  created_at: string;
};

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: number) => void;
  onClick: (notification: Notification) => void;
}

export function NotificationItem({ notification, onMarkAsRead, onClick }: NotificationItemProps) {
  const handleClick = () => {
    if (!notification.read) {
      onMarkAsRead(notification.id);
    }
    onClick(notification);
  };

  return (
    <button
      type="button"
      className={cn(
        'relative flex w-full gap-3 border-b p-5 text-left transition-colors duration-150 hover:bg-accent',
        !notification.read && 'bg-positive-soft/40'
      )}
      onClick={handleClick}
      aria-label={`${notification.read ? 'Read' : 'Unread'}: ${notification.title}`}
    >
      <span
        className={cn(
          'mt-1.5 size-2 shrink-0 rounded-full',
          notification.read ? 'border border-muted-foreground/40' : 'bg-positive'
        )}
        aria-hidden="true"
      />
      <span className="min-w-0 flex-1">
        <span className="block break-words text-sm font-medium leading-5">
          {notification.title}
        </span>
        <span className="mt-1 block line-clamp-2 break-words text-sm leading-relaxed text-muted-foreground">
          {notification.message}
        </span>
        <time
          dateTime={notification.created_at}
          title={new Date(notification.created_at).toLocaleString()}
          className="mt-2 block text-[11px] text-muted-foreground"
        >
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
        </time>
      </span>
    </button>
  );
}
