import { createClient } from '@/lib/supabase/server';

export type Project = { id: number; name: string };
export type Department = { id: number; name: string };

/**
 * Helper function to check if user has manager role
 */
async function userHasManagerRole(userId: string, supabase: any): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'manager')
    .single();

  return !error && !!data;
}

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
 * Filter projects based on selected departments via project_departments table.
 * Simply returns projects that have a row in project_departments for the selected department IDs.
 */
export async function fetchProjectsByDepartments(
  userId: string,
  departmentIds: number[]
): Promise<Project[]> {
  const supabase = await createClient();

  if (departmentIds.length === 0) return [];

  // Get projects linked to the selected departments via project_departments table
  const { data: projDeptLinks, error: pdError } = await supabase
    .from('project_departments')
    .select('project_id')
    .in('department_id', departmentIds);

  if (pdError) throw pdError;

  const projectIds = projDeptLinks?.map((pd: { project_id: number }) => pd.project_id) ?? [];

  if (projectIds.length === 0) return [];

  // Fetch actual project details
  const { data: projects, error: projError } = await supabase
    .from('projects')
    .select('id, name')
    .in('id', Array.from(new Set(projectIds))); // Dedupe project IDs

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

/**
 * Get departments for user based on role.
 * - Managers: See own department + descendant departments
 * - Non-managers (Staff/Admin only): See ONLY own department
 */
export async function getDepartmentsForUser(userId: string): Promise<Department[]> {
  const supabase = await createClient();

  // Check if user is a manager
  const isManager = await userHasManagerRole(userId, supabase);

  // Get user's department
  const { data: userInfo, error: userErr } = await supabase
    .from('user_info')
    .select('department_id')
    .eq('id', userId)
    .single();

  if (userErr || !userInfo?.department_id) {
    return [];
  }

  const userDeptId = userInfo.department_id;

  if (isManager) {
    // Managers get user's department and all descendant departments
    const { data: hierarchyDepts, error: hierErr } = await supabase.rpc(
      'get_department_hierarchy',
      {
        dept_id: userDeptId,
      }
    );

    if (hierErr) throw hierErr;
    
    const hierarchyDeptIds = (hierarchyDepts || []).map((d: { id: number }) => d.id);
    return await fetchDepartmentDetails(hierarchyDeptIds);
  } else {
    // Non-managers only get their own department
    return await fetchDepartmentDetails([userDeptId]);
  }
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