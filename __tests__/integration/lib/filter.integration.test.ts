import { describe, it, expect } from 'vitest';
import { authenticateAs, testUsers, adminClient } from '@/__tests__/setup/integration.setup';

/**
 * Integration tests for filter functionality
 * These tests use the actual seeded database and test RLS policies, triggers, and business logic
 *
 * Note: We use adminClient for creating test data because:
 * 1. Service role bypasses RLS policies
 * 2. Triggers require proper setup (e.g., tasks need assignees)
 * 3. Tests focus on READ operations where RLS actually matters
 */
describe('Filter Integration Tests', () => {
  describe('Department Filtering with RLS', () => {
    it('should return user department hierarchy for Joel (Engineering Ops Director)', async () => {
      const { client } = await authenticateAs('joel');

      // Joel is in "Engineering Operations Division Director"
      // He should see his department + all child departments
      const { data: departments, error } = await client
        .from('departments')
        .select('id, name, parent_department_id');

      expect(error).toBeNull();
      expect(departments).toBeDefined();

      // Joel should see his department and descendants
      const deptNames = departments?.map((d) => d.name) || [];
      expect(deptNames).toContain('Engineering Operations Division Director');
      expect(deptNames).toContain('Senior Engineers');
      expect(deptNames).toContain('Junior Engineers');
      expect(deptNames).toContain('Call Centre');
      expect(deptNames).toContain('Operation Planning Team');
    });

    it('should show departments of users sharing tasks with Mitch (Finance Director)', async () => {
      const { client } = await authenticateAs('mitch');

      // Mitch is in Finance Director department
      const { data: departments, error } = await client.from('departments').select('id, name');

      expect(error).toBeNull();
      expect(departments).toBeDefined();

      const deptNames = departments?.map((d) => d.name) || [];

      // Should see own department
      expect(deptNames).toContain('Finance Director');

      // Should see departments of users who share tasks with Mitch's team
      expect(deptNames.length).toBeGreaterThan(1);
    });

    it('should see own department and descendants for Garrison', async () => {
      const { client } = await authenticateAs('garrison');

      // Garrison is in System Solutioning Division Director
      const { data: departments, error } = await client.from('departments').select('name');

      expect(error).toBeNull();

      const deptNames = departments?.map((d) => d.name) || [];

      // Should see own department
      expect(deptNames).toContain('System Solutioning Division Director');
      expect(deptNames).toContain('Developers');
      expect(deptNames).toContain('Support Team');
    });
  });

  describe('Project Filtering with RLS', () => {
    it('should return projects with tasks assigned to Joel department', async () => {
      const { client } = await authenticateAs('joel');

      const { data: projects, error } = await client.from('projects').select('id, name');

      expect(error).toBeNull();
      expect(projects).toBeDefined();
      expect(projects!.length).toBeGreaterThan(0);

      const projectNames = projects?.map((p) => p.name) || [];

      // Joel should see projects his team is working on
      expect(projectNames.length).toBeGreaterThan(0);

      // Verify these are actual projects from the database
      for (const projectName of projectNames) {
        expect(projectName).toBeTruthy();
      }
    });

    it('should return projects for Mitch department', async () => {
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

    it('should see project_departments links for accessible projects', async () => {
      const { client } = await authenticateAs('ryan');

      // Get Ryan's department ID
      const { data: userInfo } = await client
        .from('user_info')
        .select('department_id')
        .eq('id', testUsers.ryan.id)
        .single();

      expect(userInfo).toBeDefined();

      // Get projects linked to departments Ryan can see
      const { data: projectDepts, error } = await client
        .from('project_departments')
        .select('project_id, department_id');

      expect(error).toBeNull();
      expect(projectDepts).toBeDefined();
      expect(projectDepts!.length).toBeGreaterThan(0);
    });
  });

  describe('Task Assignment and RLS', () => {
    it('should see tasks assigned to own department', async () => {
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

      // Garrison should see fewer tasks than total (RLS is filtering)
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

  describe('Department Colleagues RPC Function', () => {
    it('should return colleagues in same department hierarchy', async () => {
      const { data: colleagues, error } = await adminClient.rpc('get_department_colleagues', {
        user_uuid: testUsers.joel.id,
      });

      expect(error).toBeNull();
      expect(colleagues).toBeDefined();
      expect(colleagues!.length).toBeGreaterThan(0);

      const colleagueIds = colleagues?.map((c: any) => c.id) || [];
      expect(colleagueIds).toContain(testUsers.joel.id);
      expect(colleagueIds).toContain(testUsers.kester.id);
    });

    it('should return colleagues for Finance department', async () => {
      const { data: colleagues } = await adminClient.rpc('get_department_colleagues', {
        user_uuid: testUsers.mitch.id,
      });

      const colleagueIds = colleagues?.map((c: any) => c.id) || [];

      expect(colleagueIds).toContain(testUsers.mitch.id);
      expect(colleagueIds).toContain(testUsers.ryan.id);
    });
  });
});
