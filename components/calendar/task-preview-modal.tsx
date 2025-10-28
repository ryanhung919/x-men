'use client';

import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { Task } from '@/lib/services/tasks';

interface TaskPreviewModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Modal component for previewing task details when clicking a task in calendar view.
 * Provides quick access to key information and navigation to full task details.
 */
export default function TaskPreviewModal({ task, isOpen, onClose }: TaskPreviewModalProps) {
  const router = useRouter();

  if (!task) return null;

  const handleViewFullDetails = () => {
    router.push(`/tasks/${task.id}`);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl">{task.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status and Priority */}
          <div className="flex gap-2">
            <Badge variant="outline">{task.status}</Badge>
            <Badge variant="outline">Priority: {task.priority}</Badge>
            {task.isOverdue && <Badge variant="destructive">Overdue</Badge>}
          </div>

          {/* Deadline */}
          {task.deadline && (
            <div>
              <span className="text-sm font-semibold text-muted-foreground">Due Date:</span>
              <p className="text-sm mt-1">{format(new Date(task.deadline), 'PPP')}</p>
            </div>
          )}

          {/* Description */}
          {task.description && (
            <div>
              <span className="text-sm font-semibold text-muted-foreground">Description:</span>
              <p className="text-sm mt-1 whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

          {/* Project */}
          {task.project && (
            <div>
              <span className="text-sm font-semibold text-muted-foreground">Project:</span>
              <p className="text-sm mt-1">{task.project.name}</p>
            </div>
          )}

          {/* Assignees */}
          {task.assignees && task.assignees.length > 0 && (
            <div>
              <span className="text-sm font-semibold text-muted-foreground">Assignees:</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {task.assignees.map(assignee => {
                  const fullName = `${assignee.user_info.first_name} ${assignee.user_info.last_name}`;
                  const initials = `${assignee.user_info.first_name.charAt(0)}${assignee.user_info.last_name.charAt(0)}`;

                  return (
                    <div key={assignee.assignee_id} className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{fullName}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div>
              <span className="text-sm font-semibold text-muted-foreground">Tags:</span>
              <div className="flex flex-wrap gap-1 mt-2">
                {task.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary">{tag}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Recurrence */}
          {task.recurrence_interval > 0 && (
            <div>
              <span className="text-sm font-semibold text-muted-foreground">Recurrence:</span>
              <p className="text-sm mt-1">
                Every {task.recurrence_interval} {task.recurrence_interval === 1 ? 'day' : 'days'}
              </p>
            </div>
          )}

          {/* Notes */}
          {task.notes && (
            <div>
              <span className="text-sm font-semibold text-muted-foreground">Notes:</span>
              <p className="text-sm mt-1 whitespace-pre-wrap">{task.notes}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={handleViewFullDetails}>
            View Full Details
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
