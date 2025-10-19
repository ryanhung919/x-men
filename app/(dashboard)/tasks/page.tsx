import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import TasksList from '@/components/tasks/task-list';
import { getUserTasks } from '@/lib/db/tasks';
import { formatTasks } from '@/lib/services/tasks';
import TasksPageHeader from '@/components/tasks/tasks-page-header';

export default async function TasksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  // Fetch raw tasks data
  const rawData = await getUserTasks(user.id);

  // Format the raw data into Task[]
  const tasks = formatTasks(rawData);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <TasksPageHeader tasksCount={tasks.length} />
      <TasksList tasks={tasks} />
    </div>
  );
}
