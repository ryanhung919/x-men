'use client';

import { useState } from 'react';
import { CreateTaskDialog } from './create-task-dialog';

interface CreateSubtaskButtonProps {
  parentTaskId: number;
  parentProjectId: number;
  parentProjectName?: string;
}

export function CreateSubtaskButton({
  parentTaskId,
  parentProjectId,
  parentProjectName,
}: CreateSubtaskButtonProps) {
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
        alert(`Subtask created but failed to link to parent: ${errorData.error}`);
        return;
      }

      // Success - refresh page to see new subtask
      console.log('Subtask successfully linked to parent');
      window.location.reload();
    } catch (err) {
      console.error('Failed to link subtask to parent:', err);
      alert('Subtask created but failed to link to parent');
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <CreateTaskDialog
      initialProjectId={parentProjectId}
      initialProjectName={parentProjectName}
      isSubtask={true}
      onTaskCreated={handleSubtaskCreated}
    />
  );
}