'use client';

import { format } from 'date-fns';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Notification } from './notification-item';

interface NotificationModalProps {
  notification: Notification | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete: (id: number) => void;
}

const formatNotificationTitle = (type: string): string => {
  const titleMap: Record<string, string> = {
    task_assigned: 'New Task Assignment',
    task_comment: 'New Comment on Task',
    task_deadline_upcoming: 'Deadline Upcoming',
    task_deadline_overdue: 'Deadline Overdue',
    task_deleted: 'Task Deleted',
  };
  return titleMap[type] || 'Notification';
};

const formatNotificationMessage = (message: string): string => {
  const taskAssignedMatch = message.match(/(.+) assigned you to task: "(.+)"/);
  if (taskAssignedMatch) {
    const [, assignorName, taskName] = taskAssignedMatch;
    return `You have been assigned to task "${taskName}" by ${assignorName}`;
  }

  return message;
};

export function NotificationModal({
  notification,
  isOpen,
  onClose,
  onDelete,
}: NotificationModalProps) {
  if (!notification) return null;

  const handleDelete = () => {
    onDelete(notification.id);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-[500px] p-7">
        <DialogHeader className="text-left">
          <span className="mb-3 flex size-10 items-center justify-center rounded-xl bg-positive-soft text-positive">
            <Bell className="size-5" />
          </span>
          <DialogTitle>{formatNotificationTitle(notification.type)}</DialogTitle>
          <p className="text-xs text-muted-foreground">
            {format(new Date(notification.created_at), 'MMM d, yyyy · h:mm a')}
          </p>
          <DialogDescription className="break-words whitespace-pre-wrap pt-3 text-sm leading-relaxed">
            {formatNotificationMessage(notification.message)}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4 gap-2 border-t pt-5 sm:justify-between">
          <Button variant="outline" onClick={onClose}>
            Done
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
