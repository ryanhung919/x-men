'use client';

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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{formatNotificationTitle(notification.type)}</DialogTitle>
          <DialogDescription>{formatNotificationMessage(notification.message)}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="destructive" onClick={handleDelete}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
