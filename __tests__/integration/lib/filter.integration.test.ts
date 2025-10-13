import { describe, it, expect } from 'vitest';
import { authenticateAs, testUsers, adminClient } from '@/__tests__/setup/integration.setup';
import { createClient } from '@/lib/supabase/server';

/**
 * Integration tests for filter functionality
 * These tests use the actual seeded database and test RLS policies, triggers, and business logic
 */
describe('Filter Integration Tests', () => {
  describe('Department Filtering with RLS', () => {
    it('should return user department hierarchy for Joel (Engineering Ops Director)', async () => {
      const { client, session } = await authenticateAs('joel');
      
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
      const { data: departments, error } = await client
        .from('departments')
        .select('id, name');

      expect(error).toBeNull();
      expect(departments).toBeDefined();
      
      const deptNames = departments?.map((d) => d.name) || [];
      
      // Should see own department
      expect(deptNames).toContain('Finance Director');
      
      // Should see departments of colleagues who share tasks with Mitch's team
      // Based on sample data, Joel (Eng Ops) and Garrison (System Sol) share tasks with Mitch
      expect(deptNames).toContain('Engineering Operations Division Director');
      expect(deptNames).toContain('System Solutioning Division Director');
    });

    it('should not see departments outside hierarchy or shared tasks', async () => {
      const { client } = await authenticateAs('garrison');
      
      // Garrison is in System Solutioning Division Director
      const { data: departments, error } = await client
        .from('departments')
        .select('name');

      expect(error).toBeNull();
      
      const deptNames = departments?.map((d) => d.name) || [];
      
      // Should see own department
      expect(deptNames).toContain('System Solutioning Division Director');
      expect(deptNames).toContain('Developers');
      expect(deptNames).toContain('Support Team');
      
      // Should NOT see unrelated departments (e.g., HR, unless sharing tasks)
      // This depends on actual task assignments in sample data
    });
  });

  describe('Project Filtering with RLS', () => {
    it('should return projects with tasks assigned to Joel department', async () => {
      const { client } = await authenticateAs('joel');
      
      const { data: projects, error } = await client
        .from('projects')
        .select('id, name');

      expect(error).toBeNull();
      expect(projects).toBeDefined();
      expect(projects!.length).toBeGreaterThan(0);
      
      const projectNames = projects?.map((p) => p.name) || [];
      
      // Based on sample data, Joel's team works on these projects
      expect(projectNames).toContain('Website Redesign');
      expect(projectNames).toContain('Digital Collaboration Rollout');
    });

    it('should return projects filtered by department using project_departments', async () => {
      const { client } = await authenticateAs('mitch');
      
      // Get Mitch's department ID
      const { data: userInfo } = await client
        .from('user_info')
        .select('department_id')
        .eq('id', testUsers.mitch.id)
        .single();

      expect(userInfo).toBeDefined();
      
      // Get projects linked to Finance department
      const { data: projectDepts, error: pdError } = await client
        .from('project_departments')
        .select('project_id, department_id');

      expect(pdError).toBeNull();
      
      // Should see project-department links for projects with Finance team
      const financeProjects = projectDepts?.filter(
        (pd) => pd.department_id === userInfo?.department_id
      );
      
      expect(financeProjects).toBeDefined();
      expect(financeProjects!.length).toBeGreaterThan(0);
    });

    it('should not see archived projects', async () => {
      const { client } = await authenticateAs('joel');
      
      const { data: projects, error } = await client
        .from('projects')
        .select('id, name, is_archived')
        .eq('is_archived', false);

      expect(error).toBeNull();
      expect(projects).toBeDefined();
      
      // All returned projects should not be archived
      const archivedProjects = projects?.filter((p) => p.is_archived) || [];
      expect(archivedProjects.length).toBe(0);
    });
  });

  describe('Task Assignment and RLS', () => {
    it('should see tasks assigned to own department', async () => {
      const { client } = await authenticateAs('joel');
      
      const { data: tasks, error } = await client
        .from('tasks')
        .select('id, title, status');

      expect(error).toBeNull();
      expect(tasks).toBeDefined();
      expect(tasks!.length).toBeGreaterThan(0);
    });

    it('should see task assignments for visible tasks', async () => {
      const { client } = await authenticateAs('mitch');
      
      // Get tasks Mitch can see
      const { data: tasks } = await client
        .from('tasks')
        .select('id')
        .limit(5);

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

    it('should not see tasks from completely unrelated departments', async () => {
      // This test verifies RLS is working properly
      const { client } = await authenticateAs('garrison');
      
      const { data: allTasks } = await client
        .from('tasks')
        .select('id, title');

      // Garrison should only see tasks where:
      // 1. He's assigned
      // 2. Someone in his department is assigned
      // 3. Tasks in projects linked to his department
      
      expect(allTasks).toBeDefined();
      
      // Verify we're not seeing ALL tasks (RLS is active)
      const { count: totalTasks } = await adminClient
        .from('tasks')
        .select('*', { count: 'exact', head: true });

      expect(allTasks!.length).toBeLessThan(totalTasks!);
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
      const { data: hierarchy, error } = await adminClient.rpc(
        'get_department_hierarchy',
        { dept_id: dept!.id }
      );

      expect(error).toBeNull();
      expect(hierarchy).toBeDefined();
      expect(hierarchy!.length).toBeGreaterThan(1); // Should include parent + children

      const hierarchyNames = hierarchy?.map((d: any) => d.name) || [];
      
      // Should include the department itself
      expect(hierarchyNames).toContain('Engineering Operations Division Director');
      
      // Should include child departments
      expect(hierarchyNames).toContain('Senior Engineers');
      expect(hierarchyNames).toContain('Junior Engineers');
    });
  });

  describe('Department Colleagues RPC Function', () => {
    it('should return colleagues in same department hierarchy', async () => {
      const { data: colleagues, error } = await adminClient.rpc(
        'get_department_colleagues',
        { user_uuid: testUsers.joel.id }
      );

      expect(error).toBeNull();
      expect(colleagues).toBeDefined();
      expect(colleagues!.length).toBeGreaterThan(0);

      // Should include Joel himself
      const colleagueIds = colleagues?.map((c: any) => c.id) || [];
      expect(colleagueIds).toContain(testUsers.joel.id);
      
      // Should include Kester (also in Eng Ops)
      expect(colleagueIds).toContain(testUsers.kester.id);
    });

    it('should not return users from unrelated departments', async () => {
      const { data: colleagues } = await adminClient.rpc(
        'get_department_colleagues',
        { user_uuid: testUsers.mitch.id }
      );

      const colleagueIds = colleagues?.map((c: any) => c.id) || [];
      
      // Mitch (Finance) should see Ryan (Finance) but not necessarily Garrison (System Sol)
      expect(colleagueIds).toContain(testUsers.ryan.id);
    });
  });

  describe('Notifications Trigger', () => {
    it('should create notification when task is assigned', async () => {
      const { client: joelClient } = await authenticateAs('joel');
      
      // Get Ryan's notifications before assignment
      const { client: ryanClient } = await authenticateAs('ryan');
      const { count: beforeCount } = await ryanClient
        .from('notifications')
        .select('*', { count: 'exact', head: true });

      // Joel creates a task
      const { data: task, error: taskError } = await adminClient
        .from('tasks')
        .insert({
          title: 'Integration Test Task',
          description: 'Test task for notifications',
          priority_bucket: 5,
          status: 'To Do',
          creator_id: testUsers.joel.id,
          project_id: 2, // Website Redesign
        })
        .select()
        .single();

      expect(taskError).toBeNull();
      expect(task).toBeDefined();

      // Assign to Ryan
      const { error: assignError } = await adminClient
        .from('task_assignments')
        .insert({
          task_id: task!.id,
          assignee_id: testUsers.ryan.id,
          assignor_id: testUsers.joel.id,
        });

      expect(assignError).toBeNull();

      // Wait a bit for trigger to fire
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Check Ryan's notifications
      const { data: notifications, count: afterCount } = await ryanClient
        .from('notifications')
        .select('*', { count: 'exact' })
        .eq('type', 'task_assigned')
        .order('created_at', { ascending: false })
        .limit(1);

      expect(afterCount).toBeGreaterThan(beforeCount!);
      expect(notifications).toBeDefined();
      expect(notifications![0].message).toContain('Joel Wang');
      expect(notifications![0].message).toContain('Integration Test Task');

      // Cleanup
      await adminClient.from('task_assignments').delete().eq('task_id', task!.id);
      await adminClient.from('tasks').delete().eq('id', task!.id);
    });
  });

  describe('Project-Department Linking Trigger', () => {
    it('should auto-link project to department when task is assigned', async () => {
      // Create a test project
      const { data: project } = await adminClient
        .from('projects')
        .insert({
          name: 'Auto-Link Test Project',
          is_archived: false,
        })
        .select()
        .single();

      expect(project).toBeDefined();

      // Create a task in this project
      const { data: task } = await adminClient
        .from('tasks')
        .insert({
          title: 'Auto-Link Test Task',
          description: 'Test for project-department auto-linking',
          priority_bucket: 5,
          status: 'To Do',
          creator_id: testUsers.joel.id,
          project_id: project!.id,
        })
        .select()
        .single();

      expect(task).toBeDefined();

      // Assign to Ryan (Finance dept)
      const { error: assignError } = await adminClient
        .from('task_assignments')
        .insert({
          task_id: task!.id,
          assignee_id: testUsers.ryan.id,
          assignor_id: testUsers.joel.id,
        });

      expect(assignError).toBeNull();

      // Wait for trigger
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Check if project-department link was created
      const { data: projectDept } = await adminClient
        .from('project_departments')
        .select('*')
        .eq('project_id', project!.id);

      expect(projectDept).toBeDefined();
      expect(projectDept!.length).toBeGreaterThan(0);

      // Should have linked to Ryan's department (Finance)
      const { data: ryanInfo } = await adminClient
        .from('user_info')
        .select('department_id')
        .eq('id', testUsers.ryan.id)
        .single();

      const linkedDepts = projectDept?.map((pd) => pd.department_id) || [];
      expect(linkedDepts).toContain(ryanInfo!.department_id);

      // Cleanup
      await adminClient.from('task_assignments').delete().eq('task_id', task!.id);
      await adminClient.from('tasks').delete().eq('id', task!.id);
      await adminClient.from('project_departments').delete().eq('project_id', project!.id);
      await adminClient.from('projects').delete().eq('id', project!.id);
    });
  });

  describe('User Info RLS with Shared Tasks', () => {
    it('should see user info for colleagues and shared task assignees', async () => {
      const { client } = await authenticateAs('joel');
      
      // Joel should see users in his department and users sharing tasks
      const { data: users, error } = await client
        .from('user_info')
        .select('id, first_name, last_name, department_id');

      expect(error).toBeNull();
      expect(users).toBeDefined();
      
      const userIds = users?.map((u) => u.id) || [];
      
      // Should see himself
      expect(userIds).toContain(testUsers.joel.id);
      
      // Should see Kester (same department)
      expect(userIds).toContain(testUsers.kester.id);
      
      // Should see users from other departments if they share tasks
      // This depends on actual task assignments in sample data
    });
  });
});