'use client';

import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export type Notification = {
  id: number;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
};

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: number) => void;
  onClick: (notification: Notification) => void;
}

export function NotificationItem({
  notification,
  onMarkAsRead,
  onClick,
}: NotificationItemProps) {
  const handleClick = () => {
    if (!notification.read) {
      onMarkAsRead(notification.id);
    }
    onClick(notification);
  };

  return (
    <div
      className={cn(
        'relative flex gap-3 p-4 border-b transition-colors hover:bg-accent cursor-pointer',
        !notification.read && 'bg-accent/50'
      )}
      onClick={handleClick}
    >
      {/* Unread indicator */}
      {!notification.read && (
        <div className="absolute left-2 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-primary" />
      )}

      {/* Content */}
      <div className="flex-1 min-w-0 pl-4">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-medium truncate">{notification.title}</h4>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatDistanceToNow(new Date(notification.created_at), {
              addSuffix: true,
            })}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
          {notification.message}
        </p>
      </div>
    </div>
  );
}
