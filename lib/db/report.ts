import { createClient } from "@/lib/supabase/server";

interface GetTasksOpts {
  projectIds?: number[];
  startDate?: Date;
  endDate?: Date;
}

export async function getTasks(opts: GetTasksOpts) {
  const { projectIds, startDate, endDate } = opts;
  const supabase = await createClient();

  // Base query selecting all relevant task fields
  let query = supabase
    .from("tasks")
    .select(`
      id,
      title,
      description,
      priority_bucket,
      status,
      creator_id,
      project_id,
      deadline,
      parent_task_id,
      logged_time,
      created_at,
      updated_at
    `);

  // Filter by projectIds if provided
  if (projectIds && projectIds.length > 0) {
    query = query.in("project_id", projectIds);
  }

  // Filter by startDate / endDate if provided
  if (startDate) query = query.gte("created_at", startDate.toISOString());
  if (endDate) query = query.lte("created_at", endDate.toISOString());

  const { data: tasks, error } = await query;
  if (error) throw error;

  return tasks ?? [];
}
