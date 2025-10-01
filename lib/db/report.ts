import { createClient } from "@/lib/supabase/server";

interface GetTasksOpts {
  departmentIds?: number[];
  projectIds?: number[];
  timeRange?: "week" | "month" | "quarter";
}

export async function getTasks(opts: GetTasksOpts) {
  const { departmentIds, projectIds, timeRange = "month" } = opts;

  const supabase = await createClient();

  // Compute start date
  const now = new Date();
  const startDate = new Date();
  switch (timeRange) {
    case "week":
      startDate.setDate(now.getDate() - 7);
      break;
    case "month":
      startDate.setMonth(now.getMonth() - 1);
      break;
    case "quarter":
      startDate.setMonth(now.getMonth() - 3);
      break;
  }

  // Step 1: Map departments → project IDs if departmentIds are provided
  let filteredProjectIds = projectIds ?? [];
  if (departmentIds && departmentIds.length > 0) {
    const { data: mapping, error } = await supabase
      .from("project_departments")
      .select("project_id")
      .in("department_id", departmentIds);
    if (error) throw error;
    filteredProjectIds = mapping.map((m: any) => m.project_id);
  }

  // Step 2: Query tasks
  let query = supabase
    .from("tasks")
    .select(`
      id,
      name,
      status,
      project_id,
      project:project_id(name),
      assignee_id,
      assignee:assignee_id(username),
      creator_id,
      created_at,
      deadline
    `)
    .gte("created_at", startDate.toISOString());

  if (filteredProjectIds.length > 0) query = query.in("project_id", filteredProjectIds);

  const { data: tasks, error } = await query;
  if (error) throw error;

  return tasks ?? [];
}
