import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import TasksList from '@/components/tasks/task-list';
import { getUserTasks } from '@/lib/db/tasks';

type UserRole = {
  role: string;
  user_id: string;
};

export default async function TasksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  // Fetch user's department and roles
  const { data: userInfo } = await supabase
    .from('user_info')
    .select('department_id')
    .eq('id', user.id)
    .single();

  const { data: userRoles } = (await supabase
    .from('user_roles')
    .select('role, user_id')
    .eq('user_id', user.id)) as { data: UserRole[] | null };

  const isManager = userRoles?.some((r) => r.role === 'manager') || false;
  const isAdmin = userRoles?.some((r) => r.role === 'admin') || false;

  console.log('User roles:', userRoles);
  console.log('isManager:', isManager, 'isAdmin:', isAdmin);

  // Fetch tasks based on role
  const tasks = await getUserTasks(user.id, {
    isAdmin,
    isManager,
    departmentId: userInfo?.department_id,
  });

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">My Tasks</h1>
      <TasksList tasks={tasks} isManager={isManager} isAdmin={isAdmin} />
    </div>
  );
}
