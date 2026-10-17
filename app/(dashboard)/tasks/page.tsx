import { getRolesForUserClient } from '@/lib/db/roles';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
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
  const [tasks, roles] = await Promise.all([
    getUserTasksService(user.id),
    getRolesForUserClient(supabase, user.id),
  ]);

  return (
    <div className="space-y-5">
      <TasksPageHeader readOnly={roles.includes('demo_viewer')} tasksCount={tasks.length} />
      <TasksViewWrapper tasks={tasks} />
    </div>
  );
}
