import { createClient } from '@/lib/supabase/server';
import { getRolesForUserClient } from '@/lib/db/roles';
import { getAllUsers } from '@/lib/db/tasks';
import { getTaskByIdService } from '@/lib/services/tasks';
import type { TaskInspection } from '@/lib/types/tasks';

/** Session/RLS task access; guest receives no unneeded assignment directory. */
export async function getTaskInspection(taskId: number): Promise<TaskInspection | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const [task, roles] = await Promise.all([
    getTaskByIdService(taskId),
    getRolesForUserClient(supabase, user.id),
  ]);
  if (!task) return null;
  const isReadOnly = roles.includes('demo_viewer');
  return {
    ...task,
    viewer: {
      id: user.id,
      isManager: roles.includes('manager'),
      isAdmin: roles.includes('admin'),
      isReadOnly,
    },
    allUsers: isReadOnly ? [] : await getAllUsers(),
  };
}
