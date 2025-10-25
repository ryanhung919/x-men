import {
  fetchProjectsByDepartments,
  getDepartmentsForUser,
  fetchDepartmentsByProjects,
  Project,
  Department,
} from '@/lib/db/filter';

/**
 * Service function: applies business rules, handles errors, and adapts results for consumers
 * Retrieves an array of Project objects, filtered by the given department IDs.
 * If no department IDs are provided, returns all available projects for the user (sorted alphabetically).
 * @param {string} userId - The ID of the user to filter projects for.
 * @param {number[]} [departmentIds] - Optional array of department IDs to filter by.
 * @returns {Promise<Project[]>} - A promise resolving to an array of Project objects.
 */
export async function filterProjects(
  userId: string,
  departmentIds?: number[]
): Promise<Project[]> {
  try {
    // Input validation
    if (!userId) {
      console.error('filterProjects: Missing required userId');
      return [];
    }

    // Validate department IDs are positive integers
    const validDeptIds = departmentIds?.filter((id) => Number.isInteger(id) && id > 0);
    if (departmentIds && validDeptIds?.length !== departmentIds.length) {
      console.warn('filterProjects: Invalid department IDs detected and filtered out', {
        userId,
        original: departmentIds,
        valid: validDeptIds,
      });
    }

    // Get projects for valid departments (or all if none specified)
    // Pass userId to respect role-based filtering
    const projects = await fetchProjectsByDepartments(userId, validDeptIds || []);

    // Deduplicate by ID and sort alphabetically
    const uniqueProjects = Array.from(
      projects
        .reduce((map, project) => {
          if (!map.has(project.id)) {
            map.set(project.id, project);
          }
          return map;
        }, new Map<number, Project>())
        .values()
    ).sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

    return uniqueProjects;
  } catch (error) {
    // Log the error with context for monitoring
    console.error('filterProjects: Failed to fetch projects', {
      userId,
      departmentIds,
      error: error instanceof Error ? error.message : String(error),
    });

    return [];
  }
}

/**
 * Service function: applies business rules, handles errors, and adapts results for consumers
 * Retrieves an array of Department objects, filtered by the given project IDs.
 * If no project IDs are provided, returns all available departments for the user (sorted alphabetically).
 * @param {string} userId - The ID of the user to filter departments for.
 * @param {number[]} [projectIds] - Optional array of project IDs to filter by.
 * @returns {Promise<Department[]>} - A promise resolving to an array of Department objects.
 */
export async function filterDepartments(
  userId: string,
  projectIds?: number[]
): Promise<Department[]> {
  try {
    // Input validation
    if (!userId) {
      console.error('filterDepartments: Missing required userId');
      return [];
    }

    // Get all available departments for the user (respects role-based filtering)
    console.log('filterDepartments: Fetching departments for user', { userId });
    const allDepartments = await getDepartmentsForUser(userId);

    // If no project filter, return sorted departments
    if (!projectIds?.length) {
      return allDepartments.sort((a, b) => a.name.localeCompare(b.name));
    }

    // Validate project IDs are positive integers
    const validProjIds = projectIds.filter((id) => Number.isInteger(id) && id > 0);
    if (validProjIds.length !== projectIds.length) {
      console.warn('filterDepartments: Invalid project IDs detected and filtered out', {
        userId,
        original: projectIds,
        valid: validProjIds,
      });
    }

    // Get matching department IDs and filter
    const matchingDeptIds = await fetchDepartmentsByProjects(validProjIds);
    const filteredDepts = allDepartments.filter((d) => matchingDeptIds.includes(d.id));

    // Log results for monitoring
    console.log('filterDepartments: Results', {
      userId,
      totalAvailable: allDepartments.length,
      filtered: filteredDepts.length,
      projectFilter: validProjIds,
    });

    // Sort alphabetically by name
    return filteredDepts.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('filterDepartments: Failed to fetch departments', {
      userId,
      projectIds,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Graceful degradation - return empty array instead of throwing
    return [];
  }
}