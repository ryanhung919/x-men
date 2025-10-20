'use client';

import { CreateTaskDialog } from './create-task-dialog';
import { useRouter } from 'next/navigation';
import { ListTodo } from 'lucide-react';

interface TasksPageHeaderProps {
  tasksCount: number;
}

export default function TasksPageHeader({ tasksCount }: TasksPageHeaderProps) {
  const router = useRouter();

  const handleTaskCreated = (taskId: number) => {
    // Refresh the page to show the new task
    router.refresh();

    // Optional: Could also navigate to the task detail page
    // router.push(`/tasks/${taskId}`);
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10">
          <ListTodo className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Tasks</h1>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <CreateTaskDialog onTaskCreated={handleTaskCreated} />
      </div>
    </div>
  );
}
