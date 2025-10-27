'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Archive, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ArchiveButtonProps {
  taskId: number;
  subtaskCount: number;
}

export function ArchiveButton({ taskId, subtaskCount }: ArchiveButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleArchive = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/archive`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_archived: true }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to archive task');
      }

      toast.success('Task archived', {
        description: data.message,
      });

      // Redirect to tasks page after successful archive
      router.push('/tasks');
      router.refresh();
    } catch (error) {
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to archive task',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const subtaskText =
    subtaskCount > 0 ? ` and ${subtaskCount} subtask${subtaskCount > 1 ? 's' : ''}` : '';

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Archiving...
            </>
          ) : (
            <>
              <Archive className="mr-2 h-4 w-4" />
              Archive Task
            </>
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will archive this task{subtaskText}. Archived tasks will no longer appear in the
            active task list.
            {subtaskCount > 0 && (
              <span className="block mt-2 font-semibold">
                All subtasks will also be archived automatically.
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleArchive} disabled={isLoading}>
            {isLoading ? 'Archiving...' : 'Archive'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
