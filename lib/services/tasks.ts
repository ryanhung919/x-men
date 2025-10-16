export type RawTask = {
  id: number;
  title: string;
  description: string | null;
  priority_bucket: number;
  status: string;
  deadline: string | null;
  notes: string | null;
  project: { id: number; name: string };
  parent_task_id: number | null;
  recurrence_interval: number;
  recurrence_date: string | null;
  task_assignments: { assignee_id: string }[];
  tags: { tags: { name: string } }[];
};

export type RawSubtask = {
  id: number;
  title: string;
  status: string;
  deadline: string | null;
  parent_task_id: number;
};

export type RawAttachment = {
  id: number;
  storage_path: string;
  task_id: number;
};

export type RawAssignee = {
  id: string;
  first_name: string;
  last_name: string;
};

export type RawComment = {
  id: number;
  content: string;
  created_at: string;
  user_id: string;
};

export type Task = {
  id: number;
  title: string;
  description: string | null;
  priority: number;
  status: 'To Do' | 'In Progress' | 'Completed' | 'Blocked';
  deadline: string | null;
  notes: string | null;
  recurrence_interval: number;
  recurrence_date: string | null;
  project: { id: number; name: string };
  subtasks: { id: number; title: string; status: string; deadline: string | null }[];
  assignees: { assignee_id: string; user_info: { first_name: string; last_name: string } }[];
  tags: string[];
  attachments: string[];
  isOverdue: boolean;
};

export type TaskComment = {
  id: number;
  content: string;
  created_at: string;
  user_id: string;
  user_info: RawAssignee;
};

export type DetailedTask = Omit<Task, 'attachments'> & {
  attachments: { id: number; storage_path: string; public_url?: string }[];
  comments: TaskComment[];
};

export function mapTaskAttributes(task: RawTask): Omit<Task, 'subtasks' | 'assignees' | 'attachments'> {
  const isOverdue = task.deadline ? new Date(task.deadline) < new Date() && task.status !== 'Completed' : false;

  return {
    id: task.id,
    title: task.title,
    description: task.description,
    priority: task.priority_bucket,
    status: task.status as Task['status'],
    deadline: task.deadline,
    notes: task.notes,
    recurrence_interval: task.recurrence_interval,
    recurrence_date: task.recurrence_date,
    project: task.project,
    tags: task.tags.map((t) => t.tags.name),
    isOverdue,
  };
}

export function calculateNextDueDate(task: Task): Task {
  if (task.recurrence_interval > 0 && task.recurrence_date) {
    const anchor = new Date(task.recurrence_date);
    const now = new Date();
    const intervalMs = task.recurrence_interval * 24 * 60 * 60 * 1000;
    const timeDiff = now.getTime() - anchor.getTime();
    const periodsPassed = Math.floor(timeDiff / intervalMs);
    const nextDue = new Date(anchor.getTime() + (periodsPassed + 1) * intervalMs);
    return {
      ...task,
      deadline: nextDue.toISOString(),
      isOverdue: new Date(nextDue) < new Date() && task.status !== 'Completed',
    };
  }
  return task;
}

export function formatTasks(
  rawData: {
    tasks: RawTask[];
    subtasks: RawSubtask[];
    attachments: RawAttachment[];
    assignees: RawAssignee[];
  }
): Task[] {
  const subtasksMap = new Map<number, RawSubtask[]>();
  rawData.subtasks.forEach((subtask: RawSubtask) => {
    if (!subtasksMap.has(subtask.parent_task_id)) {
      subtasksMap.set(subtask.parent_task_id, []);
    }
    subtasksMap.get(subtask.parent_task_id)!.push({
      id: subtask.id,
      title: subtask.title,
      status: subtask.status,
      deadline: subtask.deadline,
      parent_task_id: subtask.parent_task_id,
    });
  });

  const attachmentsMap = new Map<number, RawAttachment[]>();
  rawData.attachments.forEach((attachment: RawAttachment) => {
    if (!attachmentsMap.has(attachment.task_id)) {
      attachmentsMap.set(attachment.task_id, []);
    }
    attachmentsMap.get(attachment.task_id)!.push({
      id: attachment.id,
      storage_path: attachment.storage_path,
      task_id: attachment.task_id,
    });
  });

  const userInfoMap = new Map<string, RawAssignee>(
    rawData.assignees.map((user) => [user.id, user])
  );

  return rawData.tasks.map((task) => {
    const mappedTask = mapTaskAttributes(task);
    const assignees = task.task_assignments.map((a) => {
      const user = userInfoMap.get(a.assignee_id);
      return {
        assignee_id: a.assignee_id,
        user_info: user
          ? { first_name: user.first_name, last_name: user.last_name }
          : { first_name: 'Unknown', last_name: 'User' },
      };
    });

    const formattedSubtasks = (subtasksMap.get(task.id) || []).map((s) => ({
      id: s.id,
      title: s.title,
      status: s.status,
      deadline: s.deadline,
    }));

    return {
      ...mappedTask,
      subtasks: formattedSubtasks,
      assignees,
      attachments: (attachmentsMap.get(task.id) || []).map((a) => a.storage_path),
    };
  });
}

export function formatTaskDetails(
  rawData: {
    task: RawTask | null;
    subtasks: RawSubtask[];
    attachments: { id: number; storage_path: string; public_url?: string }[];
    comments: RawComment[];
    assignees: RawAssignee[];
  }
): DetailedTask | null {
  if (!rawData.task) return null;

  const mappedTask = mapTaskAttributes(rawData.task);
  const userInfoMap = new Map<string, RawAssignee>(
    rawData.assignees.map((user) => [user.id, user])
  );

  const assignees = rawData.task.task_assignments.map((a) => ({
    assignee_id: a.assignee_id,
    user_info: userInfoMap.get(a.assignee_id) || {
      id: a.assignee_id,
      first_name: 'Unknown',
      last_name: 'User',
    },
  }));

  const formattedSubtasks = rawData.subtasks.map((s) => ({
    id: s.id,
    title: s.title,
    status: s.status,
    deadline: s.deadline,
  }));

  const comments = rawData.comments.map((c) => ({
    id: c.id,
    content: c.content,
    created_at: c.created_at,
    user_id: c.user_id,
    user_info: userInfoMap.get(c.user_id) || {
      id: c.user_id,
      first_name: 'Unknown',
      last_name: 'User',
    },
  }));

  return {
    ...mappedTask,
    subtasks: formattedSubtasks,
    assignees,
    attachments: rawData.attachments,
    comments,
  };
}