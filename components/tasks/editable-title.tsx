'use client';

import { useState, useRef, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface EditableTitleProps {
  taskId: number;
  initialTitle: string;
  onTitleUpdate?: (newTitle: string) => void;
}

export function EditableTitle({ taskId, initialTitle, onTitleUpdate }: EditableTitleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Title cannot be empty');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'updateTitle',
          title: title.trim(),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update title');
      }

      setIsEditing(false);
      onTitleUpdate?.(title.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setTitle(initialTitle);
    setIsEditing(false);
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="space-y-2">
        <Input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter task title..."
          disabled={isLoading}
          className="!text-2xl !font-bold h-auto py-2 px-3 selection:bg-positive-soft selection:text-inherit"
          style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
          }}
        />
        {error && <p className="text-sm text-problem">{error}</p>}
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isLoading}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Check className="w-4 h-4 mr-1" />
            {isLoading ? 'Saving...' : 'Save'}
          </Button>
          <Button size="sm" onClick={handleCancel} disabled={isLoading} variant="outline">
            <X className="w-4 h-4 mr-1" />
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <h1 className="text-2xl font-semibold leading-tight tracking-tight">
      <button
        type="button"
        aria-label="Edit task title"
        onClick={() => setIsEditing(true)}
        className="w-full rounded-md text-left hover:text-positive"
      >
        {title}
      </button>
    </h1>
  );
}
