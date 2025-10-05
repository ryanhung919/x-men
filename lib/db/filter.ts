import { createClient } from "@/lib/supabase/server";

type TaskAssignmentRow = {
  task_id: number;
  tasks: {
    project_id: number;
    project: { id: number; name: string } | null;
  } | null;
};

export type Project = { id: number; name: string };
export type Department = { id: number; name: string };

// Get all projects that user or their department colleagues have tasks in
export async function getProjectsForUser(userId: string): Promise<Project[]> {
  console.log("DB: getProjectsForUser called for userId:", userId);
  const supabase = await createClient();

  // Step 1: Find all users in the same department via RPC
  const { data: colleagues, error: colErr } = await supabase
    .rpc('get_department_colleagues', { user_uuid: userId });

  console.log("DB: Colleagues found via RPC:", colleagues, "Error:", colErr);

  if (colErr) throw colErr;
  if (!colleagues?.length) {
    console.log("DB: No colleagues found");
    return [];
  }

  const colleagueIds = colleagues.map((c: { id: string }) => c.id);

  // Step 2: Get tasks assigned to these users along with project info
  const { data: taskAssignments, error: taskErr } = await supabase
    .from("task_assignments")
    .select(`
      task_id,
      tasks (
        project_id,
        project: projects(id, name)
      )
    `)
    .in("assignee_id", colleagueIds);

  console.log("DB: Task assignments found:", taskAssignments, "Error:", taskErr);

  if (taskErr) throw taskErr;
  if (!taskAssignments?.length) {
    console.log("DB: No task assignments found");
    return [];
  }

  // Step 3: Deduplicate projects
  const dedup = new Map<number, string>();
  (taskAssignments as TaskAssignmentRow[]).forEach((row) => {
    const project = row.tasks?.project;
    if (project) dedup.set(project.id, project.name);
  });

  console.log("DB: Projects deduped:", Array.from(dedup.values()));
  return Array.from(dedup, ([id, name]) => ({ id, name }));
}


// Get all departments linked to given projects
export async function getDepartmentsForProjects(projectIds: number[]): Promise<Department[]> {
  console.log("DB: getDepartmentsForProjects called for projectIds:", projectIds);
  const supabase = await createClient();
  if (!projectIds.length) return [];

  // Step 1: Get department_ids for the given projects
  const { data: pdData, error: pdError } = await supabase
    .from("project_departments")
    .select("department_id")
    .in("project_id", projectIds);

  console.log("DB: Project-department data:", pdData, "Error:", pdError);

  if (pdError) throw pdError;
  if (!pdData?.length) return [];

  const departmentIds = Array.from(
    new Set(pdData.map((pd: { department_id: number }) => pd.department_id))
  );

  // Step 2: Fetch department details
  const { data: departments, error: depError } = await supabase
    .from("departments")
    .select("id, name")
    .in("id", departmentIds);

  if (depError) throw depError;

  console.log("DB: Departments fetched:", departments);
  return departments || [];
}


// Get departments for user based on their department's projects
export async function getDepartmentsForUser(userId: string): Promise<Department[]> {
  console.log("DB: getDepartmentsForUser called for userId:", userId);

  const projects = await getProjectsForUser(userId);
  if (!projects.length) {
    console.log("DB: No projects, so no departments");
    return [];
  }
  const projectIds = Array.from(new Set(projects.map(p => p.id)));

  return getDepartmentsForProjects(projectIds);
}
