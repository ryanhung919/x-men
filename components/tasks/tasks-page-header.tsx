'use client';

import { CreateTaskDialog } from './create-task-dialog';
import { useRouter } from 'next/navigation';
import { ListTodo } from 'lucide-react';

interface TasksPageHeaderProps {
  tasksCount: number;
}

export default function TasksPageHeader({ tasksCount }: TasksPageHeaderProps) {
  const router = useRouter();

  const handleTaskCreated = () => {
    // Refresh the page to show the new task
    router.refresh();

    // Optional: Could also navigate to the task detail page
    // router.push(`/tasks/${taskId}`);
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          <ListTodo className="size-3.5 text-positive" />
          Workspace
        </div>
        <h1 className="text-3xl font-semibold tracking-[-0.04em]">Tasks</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          A clear view of your team's work. <span className="tabular-nums">{tasksCount}</span> tasks
          in your workspace.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <CreateTaskDialog onTaskCreated={handleTaskCreated} />
      </div>
    </div>
  );
}
