import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import TasksList from '@/components/tasks/task-list';
import { getUserTasksService } from '@/lib/services/tasks';
import TasksPageHeader from '@/components/tasks/tasks-page-header';
import TasksViewWrapper from '@/components/tasks/tasks-view-wrapper';

export default async function TasksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  // Fetch and format tasks via service layer (single call)
  const tasks = await getUserTasksService(user.id);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <TasksPageHeader tasksCount={tasks.length} />
      <TasksViewWrapper tasks={tasks} />
    </div>
  );
}
