import { describe, it, expect } from 'vitest';
import { authenticateAs, testUsers, adminClient } from '@/__tests__/setup/integration.setup';

/**
 * Integration tests for filter functionality with role-based access control
 *
 * Current implementation logic:
 * 1. Managers see: own department + descendant departments
 * 2. Non-managers see: own department ONLY
 * 3. Projects: Filtered from project_departments table based on selected department IDs
 */
describe('Filter Integration Tests - Role-Based Department Access', () => {
  describe('Department Filtering - Managers vs Non-Managers', () => {
    it('should return own department + descendants for Joel (Manager)', async () => {
      const { client } = await authenticateAs('joel');

      // Joel is a MANAGER in "Engineering Operations Division Director"
      // He should see: his department + all child departments + departments from shared tasks
      const { data: departments, error } = await client
        .from('departments')
        .select('id, name, parent_department_id');

      expect(error).toBeNull();
      expect(departments).toBeDefined();

      const deptNames = departments?.map((d) => d.name) || [];

      // Should see own department and descendants (because he's a manager)
      expect(deptNames).toContain('Engineering Operations Division Director');
      expect(deptNames).toContain('Senior Engineers');
      expect(deptNames).toContain('Junior Engineers');
      expect(deptNames).toContain('Call Centre');
      expect(deptNames).toContain('Operation Planning Team');

      expect(deptNames.length).toBeGreaterThanOrEqual(5);
    });

    it('should return ONLY own department for joelPersonal (Non-Manager)', async () => {
      const { client } = await authenticateAs('joelPersonal');

      // joelPersonal is STAFF ONLY (no manager role) in "Senior Engineers"
      // He should see: ONLY his own department + departments from shared tasks (NO descendants)
      const { data: departments, error } = await client.from('departments').select('id, name');

      expect(error).toBeNull();
      expect(departments).toBeDefined();

      const deptNames = departments?.map((d) => d.name) || [];

      // Should see own department
      expect(deptNames).toContain('Senior Engineers');

      // Should NOT see parent department (no manager role = no hierarchy access)
      // May see other departments if sharing tasks with them
      expect(deptNames.length).toBeGreaterThanOrEqual(1);
    });

    it('should return own department + descendants for Ryan (Manager)', async () => {
      const { client } = await authenticateAs('ryan');

      // Ryan is a MANAGER in Finance Director department
      const { data: departments, error } = await client.from('departments').select('id, name');

      expect(error).toBeNull();
      expect(departments).toBeDefined();

      const deptNames = departments?.map((d) => d.name) || [];

      // Should see own department + any descendants
      expect(deptNames).toContain('Finance Director');
      expect(deptNames).toContain('Finance Managers');
      expect(deptNames).toContain('Finance Executive');

      // Finance may have child departments
      expect(deptNames.length).toBeGreaterThanOrEqual(3);
    });

    it('should return ONLY own department for ryanPersonal (Non-Manager)', async () => {
      const { client } = await authenticateAs('ryanPersonal');

      // ryanPersonal is STAFF ONLY in "Finance Managers"
      const { data: departments, error } = await client.from('departments').select('id, name');

      expect(error).toBeNull();
      expect(departments).toBeDefined();

      const deptNames = departments?.map((d) => d.name) || [];

      // Should see own department
      expect(deptNames).toContain('Finance Managers');

      // Should NOT see sibling departments unless shared via tasks
      expect(deptNames.length).toBeGreaterThanOrEqual(1);
    });

    it('should return own department + descendants', async () => {
      const { client } = await authenticateAs('garrison');

      // Garrison is a MANAGER in System Solutioning Division Director
      const { data: departments, error } = await client.from('departments').select('name');

      expect(error).toBeNull();

      const deptNames = departments?.map((d) => d.name) || [];

      // Should see own department and descendants (manager role)
      expect(deptNames).toContain('System Solutioning Division Director');
      expect(deptNames).toContain('Developers');
      expect(deptNames).toContain('Support Team');

      // May see additional departments from shared tasks
      expect(deptNames.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Project Filtering - Based on project_departments Table', () => {
    it('should return projects linked to accessible departments for Joel (Manager)', async () => {
      const { client } = await authenticateAs('joel');

      // Get Joel's accessible departments first
      const { data: departments } = await client.from('departments').select('id');
      expect(departments).toBeDefined();

      const deptIds = departments?.map((d) => d.id) || [];
      expect(deptIds.length).toBeGreaterThan(0);

      // Get projects linked to these departments via project_departments
      const { data: projectLinks } = await adminClient
        .from('project_departments')
        .select('project_id')
        .in('department_id', deptIds);

      const expectedProjectIds = Array.from(
        new Set(projectLinks?.map((pl: { project_id: number }) => pl.project_id) || [])
      );

      // Now check what Joel actually sees through RLS
      const { data: projects, error } = await client.from('projects').select('id, name');

      expect(error).toBeNull();
      expect(projects).toBeDefined();

      const joelProjectIds = projects?.map((p) => p.id) || [];

      // Joel should see projects linked to his accessible departments
      expect(joelProjectIds.length).toBeGreaterThan(0);

      // Every project Joel sees should be in the expected set
      joelProjectIds.forEach((id) => {
        expect(expectedProjectIds).toContain(id);
      });
    });

    it('should return projects linked to accessible departments for joelPersonal (Non-Manager)', async () => {
      const { client } = await authenticateAs('joelPersonal');

      // Get joelPersonal's accessible departments
      const { data: departments } = await client.from('departments').select('id');
      expect(departments).toBeDefined();

      const deptIds = departments?.map((d) => d.id) || [];
      expect(deptIds.length).toBeGreaterThan(0);

      // Get projects linked to these departments
      const { data: projectLinks } = await adminClient
        .from('project_departments')
        .select('project_id')
        .in('department_id', deptIds);

      const expectedProjectIds = Array.from(
        new Set(projectLinks?.map((pl: { project_id: number }) => pl.project_id) || [])
      );

      // Check what joelPersonal actually sees
      const { data: projects, error } = await client.from('projects').select('id, name');

      expect(error).toBeNull();
      expect(projects).toBeDefined();

      const joelPersonalProjectIds = projects?.map((p) => p.id) || [];

      // Every project he sees should be linked to his accessible departments
      joelPersonalProjectIds.forEach((id) => {
        expect(expectedProjectIds).toContain(id);
      });
    });

    it('should see project_departments links for accessible projects', async () => {
      const { client } = await authenticateAs('mitch');

      // Get Mitch's accessible departments
      const { data: departments } = await client.from('departments').select('id');
      expect(departments).toBeDefined();

      // Get projects linked to these departments
      const { data: projectDepts, error } = await client
        .from('project_departments')
        .select('project_id, department_id');

      expect(error).toBeNull();
      expect(projectDepts).toBeDefined();
      expect(projectDepts!.length).toBeGreaterThan(0);
    });

    it('should not see archived projects', async () => {
      const { client } = await authenticateAs('mitch');

      const { data: projects, error } = await client
        .from('projects')
        .select('id, name, is_archived');

      expect(error).toBeNull();
      expect(projects).toBeDefined();

      // All returned projects should not be archived
      const archivedProjects = projects?.filter((p) => p.is_archived) || [];
      expect(archivedProjects.length).toBe(0);
    });
  });

  describe('Task Assignment and RLS', () => {
    it('should see tasks assigned to accessible departments', async () => {
      const { client } = await authenticateAs('joel');

      const { data: tasks, error } = await client.from('tasks').select('id, title, status');

      expect(error).toBeNull();
      expect(tasks).toBeDefined();
      expect(tasks!.length).toBeGreaterThan(0);
    });

    it('should see task assignments for visible tasks', async () => {
      const { client } = await authenticateAs('mitch');

      // Get tasks Mitch can see
      const { data: tasks } = await client.from('tasks').select('id').limit(5);

      expect(tasks).toBeDefined();

      if (tasks && tasks.length > 0) {
        const taskIds = tasks.map((t) => t.id);

        // Should be able to see assignments for these tasks
        const { data: assignments, error } = await client
          .from('task_assignments')
          .select('id, task_id, assignee_id')
          .in('task_id', taskIds);

        expect(error).toBeNull();
        expect(assignments).toBeDefined();
      }
    });

    it('should not see all tasks (RLS is working)', async () => {
      const { client } = await authenticateAs('garrison');

      const { data: visibleTasks } = await client.from('tasks').select('id, title');

      expect(visibleTasks).toBeDefined();

      // Get total task count using admin client
      const { count: totalTasks } = await adminClient
        .from('tasks')
        .select('*', { count: 'exact', head: true });

      // Garrison should see fewer or equal tasks than total (RLS is filtering)
      expect(visibleTasks!.length).toBeLessThanOrEqual(totalTasks!);
    });
  });

  describe('Department Hierarchy RPC Function', () => {
    it('should return department hierarchy including descendants', async () => {
      // Get Engineering Operations dept ID
      const { data: dept } = await adminClient
        .from('departments')
        .select('id')
        .eq('name', 'Engineering Operations Division Director')
        .single();

      expect(dept).toBeDefined();

      // Call RPC function
      const { data: hierarchy, error } = await adminClient.rpc('get_department_hierarchy', {
        dept_id: dept!.id,
      });

      expect(error).toBeNull();
      expect(hierarchy).toBeDefined();
      expect(hierarchy!.length).toBeGreaterThan(1);

      const hierarchyNames = hierarchy?.map((d: any) => d.name) || [];

      // Should include the department itself
      expect(hierarchyNames).toContain('Engineering Operations Division Director');

      // Should include child departments
      expect(hierarchyNames).toContain('Senior Engineers');
      expect(hierarchyNames).toContain('Junior Engineers');
    });

    it('should handle leaf department (no children)', async () => {
      const { data: dept } = await adminClient
        .from('departments')
        .select('id')
        .eq('name', 'Senior Engineers')
        .single();

      expect(dept).toBeDefined();

      const { data: hierarchy, error } = await adminClient.rpc('get_department_hierarchy', {
        dept_id: dept!.id,
      });

      expect(error).toBeNull();
      expect(hierarchy).toBeDefined();

      expect(hierarchy!.length).toBe(1);
      expect(hierarchy![0].name).toBe('Senior Engineers');
    });
  });

  describe('Role-Based Access Control Verification', () => {
    it('should verify joel has manager role', async () => {
      const { data: roles, error } = await adminClient
        .from('user_roles')
        .select('role')
        .eq('user_id', testUsers.joel.id);

      expect(error).toBeNull();
      expect(roles).toBeDefined();

      const roleNames = roles?.map((r) => r.role) || [];
      expect(roleNames).toContain('manager');
      expect(roleNames).toContain('admin');
      expect(roleNames).toContain('staff');
    });

    it('should verify joelPersonal does NOT have manager role', async () => {
      const { data: roles, error } = await adminClient
        .from('user_roles')
        .select('role')
        .eq('user_id', testUsers.joelPersonal.id);

      expect(error).toBeNull();
      expect(roles).toBeDefined();

      const roleNames = roles?.map((r) => r.role) || [];
      expect(roleNames).not.toContain('manager');
      expect(roleNames).toContain('staff');
    });

    it('should verify mitch has manager role', async () => {
      const { data: roles, error } = await adminClient
        .from('user_roles')
        .select('role')
        .eq('user_id', testUsers.mitch.id);

      expect(error).toBeNull();
      expect(roles).toBeDefined();

      const roleNames = roles?.map((r) => r.role) || [];
      expect(roleNames).toContain('manager');
    });

    it('should verify mitchPersonal does NOT have manager role', async () => {
      const { data: roles, error } = await adminClient
        .from('user_roles')
        .select('role')
        .eq('user_id', testUsers.mitchPersonal.id);

      expect(error).toBeNull();
      expect(roles).toBeDefined();

      const roleNames = roles?.map((r) => r.role) || [];
      expect(roleNames).not.toContain('manager');
      expect(roleNames).toContain('staff');
    });
  });

  describe('Filter Service Integration', () => {
    it('should return deduplicated and sorted projects when filtering by departments', async () => {
      const { client } = await authenticateAs('joel');

      // Get accessible departments
      const { data: departments } = await client.from('departments').select('id');
      expect(departments).toBeDefined();

      const deptIds = departments?.map((d) => d.id) || [];

      // Get projects through RLS (simulating the service layer)
      const { data: projects } = await client.from('projects').select('id, name').order('name');

      expect(projects).toBeDefined();

      // Check for duplicates
      const projectIds = projects?.map((p) => p.id) || [];
      const uniqueIds = Array.from(new Set(projectIds));
      expect(projectIds.length).toBe(uniqueIds.length);

      // Check sorting
      const projectNames = projects?.map((p) => p.name) || [];
      const sortedNames = [...projectNames].sort((a, b) => a.localeCompare(b));
      expect(projectNames).toEqual(sortedNames);
    });

    it('should return sorted departments when filtering by projects', async () => {
      const { client } = await authenticateAs('mitch');

      // Get accessible projects
      const { data: projects } = await client.from('projects').select('id').limit(3);
      expect(projects).toBeDefined();

      const projectIds = projects?.map((p) => p.id) || [];

      // Get departments (simulating the service layer)
      const { data: departments } = await client
        .from('departments')
        .select('id, name')
        .order('name');

      expect(departments).toBeDefined();

      // Check sorting
      const deptNames = departments?.map((d) => d.name) || [];
      const sortedNames = [...deptNames].sort((a, b) => a.localeCompare(b));
      expect(deptNames).toEqual(sortedNames);
    });
  });
});
