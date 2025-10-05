import {
  getProjectsForUser,
  getDepartmentsForUser,
  Project,
  Department,
} from "@/lib/db/filter";
import { createClient } from "@/lib/supabase/server";

// Project filtering: restrict projects to those linked with selected departments
export async function filterProjects(
  userId: string,
  departmentIds?: number[]
): Promise<Project[]> {
  const allProjects = await getProjectsForUser(userId);

  if (!departmentIds || departmentIds.length === 0) return allProjects;

  const supabase = await createClient();
  const { data: pdData, error } = await supabase
    .from("project_departments")
    .select("project_id, department_id")
    .in("project_id", allProjects.map((p) => p.id))
    .in("department_id", departmentIds);

  if (error) throw error;
  if (!pdData?.length) return [];

  const matchingProjectIds = new Set(
    pdData.map((pd: { project_id: number }) => pd.project_id)
  );

  return allProjects.filter((p) => matchingProjectIds.has(p.id));
}

// Department filtering: restrict departments to those linked with selected projects
export async function filterDepartments(
  userId: string,
  projectIds?: number[]
): Promise<Department[]> {
  const allDepartments = await getDepartmentsForUser(userId);

  if (!projectIds || projectIds.length === 0) return allDepartments;

  const supabase = await createClient();
  const { data: pdData, error } = await supabase
    .from("project_departments")
    .select("project_id, department_id")
    .in("project_id", projectIds);

  if (error) throw error;
  if (!pdData?.length) return [];

  const matchingDeptIds = new Set(
    pdData.map((pd: { department_id: number }) => pd.department_id)
  );

  return allDepartments.filter((d) => matchingDeptIds.has(d.id));
}

// Task filtering (intersection of department + project selections)
export async function filterTasksByDeptProj(
  userId: string,
  departmentIds?: number[],
  projectIds?: number[]
) {
  const supabase = await createClient();

  // Step 1: Get colleagues in same department
  const { data: colleagues, error: colErr } = await supabase
    .rpc("get_department_colleagues", { user_uuid: userId });

  if (colErr) throw colErr;
  if (!colleagues?.length) return [];

  const colleagueIds = colleagues.map((c: { id: string }) => c.id);

  // Step 2: Get tasks for these colleagues
  const { data: tasks, error: taskErr } = await supabase
    .from("task_assignments")
    .select(`
      task_id,
      assignee_id,
      tasks (
        id,
        name,
        project_id,
        project: projects (id, name),
        department_id,
        department: departments (id, name)
      )
    `)
    .in("assignee_id", colleagueIds);

  if (taskErr) throw taskErr;
  if (!tasks?.length) return [];

  // Step 3: Apply department filter (if selected)
  let filtered = tasks;
  if (departmentIds && departmentIds.length > 0) {
    filtered = filtered.filter((row: any) =>
      departmentIds.includes(row.tasks?.department_id)
    );
  }

  // Step 4: Apply project filter (if selected)
  if (projectIds && projectIds.length > 0) {
    filtered = filtered.filter((row: any) =>
      projectIds.includes(row.tasks?.project_id)
    );
  }

  // Step 5: Return unique tasks
  const dedup = new Map<number, any>();
  filtered.forEach((row: any) => {
    if (row.tasks) dedup.set(row.tasks.id, row.tasks);
  });

  return Array.from(dedup.values());
}