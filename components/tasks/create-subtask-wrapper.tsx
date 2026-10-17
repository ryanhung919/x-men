'use client';

import { toast } from 'sonner';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreateTaskDialog } from './create-task-dialog';

interface CreateSubtaskButtonProps {
  parentTaskId: number;
  parentProjectId: number;
  parentProjectName?: string;
  onCreated?: () => void;
}

export function CreateSubtaskButton({
  parentTaskId,
  parentProjectId,
  parentProjectName,
  onCreated,
}: CreateSubtaskButtonProps) {
  const router = useRouter();
  const [isLinking, setIsLinking] = useState(false);

  const handleSubtaskCreated = async (subtaskId: number) => {
    setIsLinking(true);

    try {
      // Call API to link subtask to parent
      const res = await fetch(`/api/tasks/${parentTaskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'linkSubtask',
          subtaskId,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error('Failed to link subtask to parent:', errorData.error);
        toast.error('Task created, but could not link to parent', { description: errorData.error });
        return;
      }

      // Success - refresh page to see new subtask
      console.log('Subtask successfully linked to parent');
      router.refresh();
      onCreated?.();
    } catch (err) {
      console.error('Failed to link subtask to parent:', err);
      toast.error('Task created, but could not link to parent');
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <CreateTaskDialog
      initialProjectId={parentProjectId}
      initialProjectName={parentProjectName}
      isSubtask={true}
      disabled={isLinking}
      onTaskCreated={handleSubtaskCreated}
    />
  );
}
