import { createClient } from '@/lib/supabase/server';

export type Project = { id: number; name: string };
export type Department = { id: number; name: string };

// PROJECT FILTERING

/**
 * Helper function to returns an array of user IDs belonging to the given departmentIds.
 * Note that this function only returns direct members of the given departments,
 * i.e. it does not include members of descendant departments.
 * @param {number[]} departmentIds - An array of department IDs.
 * @param {any} supabase - A Supabase client.
 * @returns {Promise<string[]>} - A promise resolving to an array of user IDs.
 */
export async function getUserIdsFromDepartments(
  departmentIds: number[],
  supabase: any
): Promise<string[]> {
  const { data, error } = await supabase
    .from('user_info')
    .select('id')
    .in('department_id', departmentIds);

  if (error) throw error;
  return data?.map((u: { id: string }) => u.id) ?? [];
}

/**
 * Filter projects based on user's department hierarchy and whether assignee includes a department mate.
 * @param {string} userId - the user's UUID
 * @param {number[]} [departmentIds] - optional, an array of department IDs to filter by
 * @returns {Promise<Project[]>} - a promise resolving to an array of filtered projects
 * @throws {Error} - if any of the database queries fail
 */
export async function fetchProjectsByDepartments(departmentIds: number[]): Promise<Project[]> {
  const supabase = await createClient();

  // Get all descendant + selected departmentIds, with your RPC
  let allDeptIds: number[] = [];
  for (const deptId of departmentIds) {
    const { data: hierarchy, error } = await supabase.rpc('get_department_hierarchy', {
      dept_id: deptId,
    });
    if (error) throw error;
    const ids = hierarchy?.map((d: { id: number }) => d.id) ?? [];
    allDeptIds.push(...ids);
  }
  allDeptIds = Array.from(new Set(allDeptIds));
  if (allDeptIds.length === 0) return [];

  // Projects linked directly to these departments
  const { data: projDeptLinks, error: pdError } = await supabase
    .from('project_departments')
    .select('project_id')
    .in('department_id', allDeptIds);
  if (pdError) throw pdError;
  const deptProjectIds = projDeptLinks?.map((pd: { project_id: number }) => pd.project_id) ?? [];

  // Projects with a task assigned to user from one of these departments
  const userIds = await getUserIdsFromDepartments(allDeptIds, supabase);
  const { data: taskProjLinks, error: tpError } = await supabase
    .from('tasks')
    .select('project_id, task_assignments!inner(assignee_id)')
    .in('task_assignments.assignee_id', userIds);
  if (tpError) throw tpError;
  const assignmentProjectIds =
    taskProjLinks?.map((t: { project_id: number }) => t.project_id) ?? [];

  // Union all project ids from both sets, dedupe
  const projectIdSet = new Set<number>(deptProjectIds.concat(assignmentProjectIds));
  if (projectIdSet.size === 0) return [];

  // Fetch actual project details
  const { data: projects, error: projError } = await supabase
    .from('projects')
    .select('id, name')
    .in('id', Array.from(projectIdSet));
  if (projError) throw projError;

  return projects ?? [];
}

// DEPARTMENT FILTERING

// Fetch department details by IDs
export async function fetchDepartmentDetails(deptIds: number[]): Promise<Department[]> {
  if (!deptIds.length) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from('departments').select('id, name').in('id', deptIds);
  if (error) throw error;
  return data || [];
}

// Get departments for user based on hierarchy + shared task assignees
export async function getDepartmentsForUser(userId: string): Promise<Department[]> {
  const supabase = await createClient();

  // Step 1: Get user's department
  const { data: userInfo, error: userErr } = await supabase
    .from('user_info')
    .select('department_id')
    .eq('id', userId)
    .single();

  if (userErr || !userInfo?.department_id) {
    return [];
  }

  const userDeptId = userInfo.department_id;

  // Step 2: Get user's department and all descendant departments (recursive)
  const { data: hierarchyDepts, error: hierErr } = await supabase.rpc('get_department_hierarchy', {
    dept_id: userDeptId,
  });

  if (hierErr) throw hierErr;
  const hierarchyDeptIds = new Set((hierarchyDepts || []).map((d: { id: number }) => d.id));

  // Step 3: Get colleagues (users in same department hierarchy)
  const { data: colleagues, error: colErr } = await supabase.rpc('get_department_colleagues', {
    user_uuid: userId,
  });

  if (colErr) throw colErr;
  const colleagueIds = (colleagues || []).map((c: { id: string }) => c.id);

  // Step 4: Get departments of assignees who share tasks with colleagues
  const { data: sharedTasks, error: taskErr } = await supabase
    .from('task_assignments')
    .select('task_id, assignee_id')
    .in('assignee_id', colleagueIds);

  if (taskErr) throw taskErr;

  if (!sharedTasks?.length) {
    // Return only hierarchy departments
    return await fetchDepartmentDetails(Array.from(hierarchyDeptIds, (id) => id as number));
  }

  // Get unique task IDs
  const taskIds = [...new Set(sharedTasks.map((t: { task_id: number }) => t.task_id))];

  // Step 5: Get ALL assignees on these shared tasks
  const { data: allAssignees, error: assignErr } = await supabase
    .from('task_assignments')
    .select('assignee_id')
    .in('task_id', taskIds);

  if (assignErr) throw assignErr;
  const allAssigneeIds = [
    ...new Set((allAssignees || []).map((a: { assignee_id: string }) => a.assignee_id)),
  ];

  // Step 6: Get departments of all these assignees
  const { data: assigneeDepts, error: deptErr } = await supabase
    .from('user_info')
    .select('department_id')
    .in('id', allAssigneeIds)
    .not('department_id', 'is', null);

  if (deptErr) throw deptErr;

  const sharedDeptIds = new Set(
    (assigneeDepts || []).map((u: { department_id: number }) => u.department_id)
  );

  // Step 7: Combine hierarchy departments + shared task departments
  const allDeptIds = new Set([...hierarchyDeptIds, ...sharedDeptIds]);

  return await fetchDepartmentDetails(Array.from(allDeptIds, (id) => id as number));
}

// Filter departments by project IDs
export async function fetchDepartmentsByProjects(projectIds: number[]): Promise<number[]> {
  const supabase = await createClient();
  const { data: pdData, error } = await supabase
    .from('project_departments')
    .select('project_id, department_id')
    .in('project_id', projectIds);
  if (error) throw error;
  if (!pdData?.length) return [];
  return Array.from(new Set(pdData.map((pd: { department_id: number }) => pd.department_id)));
}
