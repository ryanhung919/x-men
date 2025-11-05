'use client';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Check, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface EditableDescriptionProps {
  taskId: number;
  initialDescription: string | null;
  onDescriptionUpdate?: (newDescription: string) => void;
}

export function EditableDescription({
  taskId,
  initialDescription,
  onDescriptionUpdate,
}: EditableDescriptionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [description, setDescription] = useState(initialDescription || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'updateDescription',
          description,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update description');
      }

      const data = await res.json();
      setIsEditing(false);
      onDescriptionUpdate?.(description);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setDescription(initialDescription || '');
    setIsEditing(false);
    setError(null);
  };

  // Consistent padding wrapper for both modes
  const containerClasses = 'p-3';

  if (isEditing) {
    return (
      <div className={containerClasses}>
        <div className="space-y-3">
          <Textarea
            ref={textareaRef}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter task description..."
            className="min-h-[120px] resize-none text-base"
            disabled={isLoading}
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              <Check className="w-4 h-4 mr-1" />
              {isLoading ? 'Saving...' : 'Save'}
            </Button>
            <Button
              size="sm"
              onClick={handleCancel}
              disabled={isLoading}
              variant="outline"
            >
              <X className="w-4 h-4 mr-1" />
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className={`${containerClasses} border border-transparent rounded-md hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-text transition-all`}
    >
      {description ? (
        <p className="text-base whitespace-pre-wrap">{description}</p>
      ) : (
        <p className="text-base text-gray-400 italic">Add a description...</p>
      )}
    </div>
  );
}