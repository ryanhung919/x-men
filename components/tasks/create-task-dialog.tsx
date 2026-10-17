'use client';

import { useState, useRef } from 'react';
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
import {
  CalendarIcon,
  PlusIcon,
  ChevronDown,
  LockKeyhole,
  Loader2,
  SlidersHorizontal,
} from 'lucide-react';
import { format } from 'date-fns';
import {
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
  onTaskCreated?: (taskId: number) => void | Promise<void>;
  readOnly?: boolean;
  disabled?: boolean;
  initialProjectId?: number; // NEW: lock project if provided
  isSubtask?: boolean; // NEW: show different title
  initialProjectName?: string; // NEW: to show project name if locked
}

const Required = () => (
  <span className="text-muted-foreground" aria-hidden="true">
    *
  </span>
);

export function CreateTaskDialog({
  onTaskCreated,
  initialProjectId,
  isSubtask = false,
  initialProjectName,
  readOnly = false,
  disabled = false,
}: CreateTaskDialogProps) {
  const submissionRef = useRef(false);
  const errorRef = useRef<HTMLDivElement>(null);
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

  const resetForm = () => {
    setProjectId(initialProjectId ?? null);
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
    if (submissionRef.current || readOnly) return;

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      requestAnimationFrame(() => errorRef.current?.focus());
      return;
    }

    submissionRef.current = true;
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
      resetForm();
      if (onTaskCreated && result.taskId) {
        await onTaskCreated(result.taskId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      submissionRef.current = false;
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!loading) {
          setOpen(next);
          if (!next) resetForm();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant={isSubtask ? 'outline' : 'default'}
          size={isSubtask ? 'sm' : 'default'}
          disabled={disabled}
          className="gap-2"
        >
          <PlusIcon className="size-4" />
          {isSubtask ? 'Create Subtask' : 'Create Task'}
        </Button>
      </DialogTrigger>
      <DialogContent
        className="flex max-h-[calc(100svh-32px)] flex-col gap-0 overflow-hidden p-0 sm:!max-w-[680px]"
        onEscapeKeyDown={(e) => {
          if (loading) e.preventDefault();
        }}
        onInteractOutside={(e) => {
          if (loading) e.preventDefault();
        }}
      >
        <DialogHeader className="shrink-0 border-b px-6 py-5 text-left">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {isSubtask ? 'Break work into steps' : 'New work'}
          </div>
          <DialogTitle className="text-2xl font-semibold tracking-tight">
            {isSubtask ? 'Create subtask' : 'Create task'}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {isSubtask
              ? `Part of ${initialProjectName || 'the parent project'}.`
              : 'Set the essentials. Add the details when you need them.'}{' '}
            <span className="whitespace-nowrap">* Required</span>
          </DialogDescription>
        </DialogHeader>
        {readOnly ? (
          <div className="space-y-4 px-6 py-8">
            <span className="flex size-11 items-center justify-center rounded-xl bg-positive-soft text-positive">
              <LockKeyhole className="size-5" />
            </span>
            <h3 className="font-medium">You're exploring a read-only demo</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Browse tasks, timelines and reports. Creating or changing workspace data is available
              to team accounts.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false);
                resetForm();
              }}
            >
              Back to workspace
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
              <div className="space-y-2">
                <Label htmlFor="title">
                  Title <Required />
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What needs to get done?"
                  maxLength={255}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">
                  Description <Required />
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add the context your team needs…"
                  rows={3}
                  className="min-h-20 resize-y"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="project">
                    Project <Required />
                  </Label>
                  {isProjectLocked ? (
                    <div className="flex h-10 items-center gap-2 rounded-lg border bg-muted/40 px-3 text-sm">
                      <LockKeyhole className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">
                        {initialProjectName || `Project ${projectId}`}
                      </span>
                    </div>
                  ) : (
                    <ProjectSingleSelector selectedProjectId={projectId} onChange={setProjectId} />
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deadline">
                    Deadline <Required />
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        id="deadline"
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !deadline && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 size-4" />
                        {deadline ? format(deadline, 'MMM d, yyyy') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        mode="single"
                        selected={deadline}
                        onSelect={setDeadline}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="assignees">
                  Assignees <Required />
                  <span className="ml-auto text-xs font-normal text-muted-foreground">
                    Choose up to 5
                  </span>
                </Label>
                <AssigneeMultiSelector
                  selectedAssigneeIds={assigneeIds}
                  onChange={setAssigneeIds}
                  maxAssignees={5}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">
                    Status <Required />
                  </Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                    <SelectTrigger id="status" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(['To Do', 'In Progress', 'Completed', 'Blocked'] as const).map((value) => (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">
                    Priority <Required />
                  </Label>
                  <Select
                    value={priority.toString()}
                    onValueChange={(v) => setPriority(parseInt(v) as TaskPriority)}
                  >
                    <SelectTrigger id="priority" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((value) => (
                        <SelectItem key={value} value={value.toString()}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <details className="group rounded-xl border bg-muted/20">
                <summary className="flex cursor-pointer list-none items-center gap-3 p-4 text-sm font-medium [&::-webkit-details-marker]:hidden">
                  <SlidersHorizontal className="size-4 text-muted-foreground" />
                  <span>
                    More options
                    <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                      Recurrence, tags & files
                      {tags.length || files.length || recurrenceEnabled ? ' · Added' : ''}
                    </span>
                  </span>
                  <ChevronDown className="ml-auto size-4 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <div className="space-y-5 border-t p-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="recurrence"
                        checked={recurrenceEnabled}
                        onCheckedChange={(checked) => setRecurrenceEnabled(checked === true)}
                      />
                      <Label htmlFor="recurrence">Repeat this task</Label>
                    </div>
                    {recurrenceEnabled && (
                      <div className="space-y-2">
                        <Select
                          value={recurrenceFrequency}
                          onValueChange={(v) => setRecurrenceFrequency(v as RecurrenceFrequency)}
                        >
                          <SelectTrigger
                            id="frequency"
                            aria-label="Repeat frequency"
                            className="w-full"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Every day</SelectItem>
                            <SelectItem value="weekly">Every 7 days</SelectItem>
                            <SelectItem value="monthly">Every 30 days</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          A new task is created after completion. The deadline anchors the repeat
                          interval.
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>
                      Tags{' '}
                      <span className="text-xs font-normal text-muted-foreground">Optional</span>
                    </Label>
                    <TagsInput tags={tags} onChange={setTags} />
                  </div>
                  <div className="space-y-2">
                    <Label>
                      Files{' '}
                      <span className="text-xs font-normal text-muted-foreground">
                        Up to 10 files · 50 MB total
                      </span>
                    </Label>
                    <FileUploadZone
                      files={files}
                      onChange={setFiles}
                      maxTotalSize={50 * 1024 * 1024}
                    />
                  </div>
                </div>
              </details>
            </div>
            <div className="shrink-0 border-t bg-card px-6 py-4">
              {error && (
                <div
                  ref={errorRef}
                  tabIndex={-1}
                  role="alert"
                  className="mb-3 rounded-lg border border-problem/20 bg-problem-soft px-3 py-2 text-sm text-problem"
                >
                  {error}
                </div>
              )}
              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={loading}
                  onClick={() => {
                    setOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                  {loading ? 'Creating…' : isSubtask ? 'Create subtask' : 'Create task'}
                </Button>
              </DialogFooter>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
