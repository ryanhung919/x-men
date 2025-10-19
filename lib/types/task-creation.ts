// Types for task creation form and API

export type TaskPriority = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type TaskStatus = 'To Do' | 'In Progress' | 'Completed' | 'Blocked';
export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'none';

export interface TaskRecurrence {
  frequency: RecurrenceFrequency;
  interval: number; // Number of days for recurrence
  startDate: string; // ISO date string
}

export interface CreateTaskFormData {
  // Mandatory fields
  projectId: number;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  assigneeIds: string[]; // UUID array, max 5, creator is default
  deadline: string; // ISO date string

  // Optional fields
  notes?: string;
  recurrence?: TaskRecurrence | null;
  tags?: string[]; // Array of tag strings
  attachments?: File[]; // Files to upload
}

export interface CreateTaskPayload {
  // Mandatory fields
  project_id: number;
  title: string;
  description: string;
  priority_bucket: number; // 1-10 (converted from Low/Medium/High)
  status: TaskStatus;
  assignee_ids: string[]; // UUID array
  deadline: string; // ISO timestamp

  // Optional fields
  notes?: string;
  recurrence_interval?: number; // Days between recurrences
  recurrence_date?: string; // Start date for recurrence
  tags?: string[]; // Tag names
}

export interface CreateTaskResponse {
  success: boolean;
  taskId?: number;
  error?: string;
}

// Priority is now a direct number (1-9), so no conversion needed
export function priorityToBucket(priority: TaskPriority): number {
  return priority;
}

// Helper function to convert bucket number to priority (1-9)
export function bucketToPriority(bucket: number): TaskPriority {
  // Clamp to 1-9 range
  const clamped = Math.max(1, Math.min(9, bucket));
  return clamped as TaskPriority;
}

// Helper function to convert recurrence frequency to interval days
export function frequencyToInterval(frequency: RecurrenceFrequency): number {
  const mapping: Record<RecurrenceFrequency, number> = {
    'none': 0,
    'daily': 1,
    'weekly': 7,
    'monthly': 30
  };
  return mapping[frequency];
}
