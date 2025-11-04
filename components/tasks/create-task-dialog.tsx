'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { CalendarIcon, PlusIcon } from 'lucide-react';
import { format } from 'date-fns';
import {
  CreateTaskFormData,
  TaskPriority,
  TaskStatus,
  RecurrenceFrequency,
  priorityToBucket,
  frequencyToInterval,
  CreateTaskPayload,
} from '@/lib/types/task-creation';
import { ProjectSingleSelector } from './project-single-selector';
import { AssigneeMultiSelector } from './assignee-multi-selector';
import { TagsInput } from './tags-input';
import { FileUploadZone } from './file-upload-zone';

interface CreateTaskDialogProps {
  onTaskCreated?: (taskId: number) => void;
  initialProjectId?: number; // NEW: lock project if provided
  isSubtask?: boolean; // NEW: show different title
  initialProjectName?: string; // NEW: to show project name if locked
}

export function CreateTaskDialog({ onTaskCreated, initialProjectId, isSubtask = false, initialProjectName }: CreateTaskDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [projectId, setProjectId] = useState<number | null>(initialProjectId ?? null);
  const isProjectLocked = initialProjectId !== undefined;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>(1);
  const [status, setStatus] = useState<TaskStatus>('To Do');
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [deadline, setDeadline] = useState<Date | undefined>(undefined);
  const [tags, setTags] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);

  // Recurrence state
  const [recurrenceEnabled, setRecurrenceEnabled] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<RecurrenceFrequency>('weekly');

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setProjectId(initialProjectId ??null);
    setTitle('');
    setDescription('');
    setPriority(1);
    setStatus('To Do');
    setAssigneeIds([]);
    setDeadline(undefined);
    setTags([]);
    setFiles([]);
    setRecurrenceEnabled(false);
    setRecurrenceFrequency('weekly');
    setError(null);
  };

  const validateForm = (): string | null => {
    if (!projectId) return 'Please select a project';
    if (!title.trim()) return 'Please enter a task title';
    if (!description.trim()) return 'Please enter a task description';
    if (assigneeIds.length === 0) return 'Please select at least one assignee';
    if (assigneeIds.length > 5) return 'Maximum 5 assignees allowed';
    if (!deadline) return 'Please select a deadline';

    // Validate file size (50MB total)
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (totalSize > maxSize) {
      return 'Total file size exceeds 50MB limit';
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Prepare task payload
      const taskPayload: CreateTaskPayload = {
        project_id: projectId!,
        title: title.trim(),
        description: description.trim(),
        priority_bucket: priorityToBucket(priority),
        status,
        assignee_ids: assigneeIds,
        deadline: deadline!.toISOString(),
        notes: undefined,
        tags: tags.length > 0 ? tags : undefined,
      };

      // Add recurrence if enabled
      if (recurrenceEnabled) {
        taskPayload.recurrence_interval = frequencyToInterval(recurrenceFrequency);
        // recurrence_date not needed - only interval and deadline matter
      }

      // Create FormData for multipart upload
      const formData = new FormData();
      formData.append('taskData', JSON.stringify(taskPayload));

      // Append files
      files.forEach((file, index) => {
        formData.append(`file_${index}`, file);
      });

      // Submit to API
      const response = await fetch('/api/tasks', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create task');
      }

      // Success
      setOpen(false);
      if (onTaskCreated && result.taskId) {
        onTaskCreated(result.taskId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <PlusIcon className="h-4 w-4" />
          {isSubtask ? 'Create Subtask' : 'Create Task'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:!max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isSubtask ? 'Create New Subtask' : 'Create New Task'}</DialogTitle>
          <DialogDescription>
            Fill in the details to create a new task. Fields marked with * are mandatory.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Project Selection */}
          <div className="space-y-2">
            <Label htmlFor="project">
              Project <span className="text-red-500">*</span>
            </Label>
            {isProjectLocked ? (
              <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded border text-sm">
                <p className="font-medium text-gray-700 dark:text-gray-300">
                  {initialProjectName}
                </p>
              </div>
            ) : (
              <ProjectSingleSelector selectedProjectId={projectId} onChange={setProjectId} />
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title"
              maxLength={255}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Description <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the task in detail"
              rows={3}
            />
          </div>

          {/* Priority and Status Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">
                Priority <span className="text-red-500">*</span>
              </Label>
              <Select
                value={priority.toString()}
                onValueChange={(v) => setPriority(parseInt(v) as TaskPriority)}
              >
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="4">4</SelectItem>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="6">6</SelectItem>
                  <SelectItem value="7">7</SelectItem>
                  <SelectItem value="8">8</SelectItem>
                  <SelectItem value="9">9</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">
                Status <span className="text-red-500">*</span>
              </Label>
              <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="To Do">To Do</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Assignees */}
          <div className="space-y-2">
            <Label>
              Assignees (Max 5) <span className="text-red-500">*</span>
            </Label>
            <AssigneeMultiSelector
              selectedAssigneeIds={assigneeIds}
              onChange={setAssigneeIds}
              maxAssignees={5}
            />
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label>
              Due Date <span className="text-red-500">*</span>
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !deadline && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {deadline ? format(deadline, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={deadline} onSelect={setDeadline} initialFocus />
              </PopoverContent>
            </Popover>
          </div>

          {/* Recurrence */}
          <div className="space-y-3 border rounded-md p-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="recurrence"
                checked={recurrenceEnabled}
                onCheckedChange={(checked) => setRecurrenceEnabled(checked === true)}
              />
              <Label htmlFor="recurrence" className="cursor-pointer">
                Recurring Task
              </Label>
            </div>

            {recurrenceEnabled && (
              <div className="space-y-3 pl-6">
                <div className="space-y-2">
                  <Label htmlFor="frequency">Frequency</Label>
                  <Select
                    value={recurrenceFrequency}
                    onValueChange={(v) => setRecurrenceFrequency(v as RecurrenceFrequency)}
                  >
                    <SelectTrigger id="frequency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-xs text-muted-foreground space-y-1 mt-2">
                  <p className="font-medium">How recurring tasks work:</p>
                  <ul className="list-disc list-inside space-y-0.5 pl-2">
                    <li><strong>Daily:</strong> Recurs every day</li>
                    <li><strong>Weekly:</strong> Recurs on the same weekday (e.g., every Tuesday)</li>
                    <li><strong>Monthly:</strong> Recurs on the same day of month (e.g., every 15th)</li>
                  </ul>
                  <p className="mt-1">The deadline you set above determines when this pattern starts.</p>
                </div>
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags (Optional)</Label>
            <TagsInput tags={tags} onChange={setTags} />
          </div>

          {/* File Attachments */}
          <div className="space-y-2">
            <Label>Attachments (Optional, Max 50MB total)</Label>
            <FileUploadZone files={files} onChange={setFiles} maxTotalSize={50 * 1024 * 1024} />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Footer Actions */}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
