'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Pencil } from 'lucide-react';

interface EditableStatusProps {
  taskId: number;
  initialStatus: 'To Do' | 'In Progress' | 'Completed' | 'Blocked';
  onStatusUpdate?: (newStatus: string) => void;
}

export function EditableStatus({ taskId, initialStatus, onStatusUpdate }: EditableStatusProps) {
  const [status, setStatus] = useState(initialStatus);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === status) {
      setIsEditing(false);
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'updateStatus',
          status: newStatus,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update status');
      }

      setStatus(newStatus as 'To Do' | 'In Progress' | 'Completed' | 'Blocked');
      onStatusUpdate?.(newStatus);
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update status:', err);
      alert(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-sm px-3 py-1">
          {status}
        </Badge>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setIsEditing(true)}
          className="h-8 w-8 p-0"
          disabled={isLoading}
        >
          <Pencil className="w-3.5 h-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <Select
      value={status}
      onValueChange={handleStatusChange}
      disabled={isLoading}
      open={isEditing}
      onOpenChange={setIsEditing}
    >
      <SelectTrigger className="w-full max-w-[180px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="To Do">To Do</SelectItem>
        <SelectItem value="In Progress">In Progress</SelectItem>
        <SelectItem value="Completed">Completed</SelectItem>
        <SelectItem value="Blocked">Blocked</SelectItem>
      </SelectContent>
    </Select>
  );
}