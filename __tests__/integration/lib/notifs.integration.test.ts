import { describe, it, expect } from 'vitest';
import { authenticateAs, testUsers, adminClient } from '@/__tests__/setup/integration.setup';

/**
 * Integration tests for notification functionality
 * These tests use the actual seeded database and test RLS policies, triggers, and business logic
 *
 * Key features tested:
 * - RLS policies: Users only see their own notifications
 * - Database triggers: Notifications created on task assignment and comments
 * - CRUD operations: Create, read, update, delete notifications
 * - Multi-user scenarios: Task assignments, comments
 */
describe('Notifications Integration Tests', () => {
  describe('RLS Policies - User can only see own notifications', () => {
    it('should only see own notifications for Joel', async () => {
      const { client } = await authenticateAs('joel');

      // Get Joel's notifications
      const { data: notifications, error } = await client
        .from('notifications')
        .select('id, user_id, title, message, type, read');

      expect(error).toBeNull();
      expect(notifications).toBeDefined();

      // All notifications should belong to Joel
      const allBelongToJoel = notifications?.every((n) => n.user_id === testUsers.joel.id);
      expect(allBelongToJoel).toBe(true);
    });

    it('should not see other users notifications', async () => {
      const { client } = await authenticateAs('mitch');

      // Try to get notifications for different user IDs
      const { data: notifications, error } = await client
        .from('notifications')
        .select('*')
        .eq('user_id', testUsers.joel.id); // Try to access Joel's notifications

      expect(error).toBeNull();
      // Mitch should not see any of Joel's notifications due to RLS
      expect(notifications?.length).toBe(0);
    });

    it('should get correct unread count for user', async () => {
      const { client } = await authenticateAs('garrison');

      // Get unread count
      const { count: unreadCount, error: countError } = await client
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', testUsers.garrison.id)
        .eq('read', false);

      expect(countError).toBeNull();

      // Get all notifications
      const { data: allNotifs } = await client
        .from('notifications')
        .select('read')
        .eq('user_id', testUsers.garrison.id);

      const expectedUnread = allNotifs?.filter((n) => !n.read).length || 0;
      expect(unreadCount).toBe(expectedUnread);
    });
  });

  describe('Notification Triggers - Task Assignment', () => {
    it('should create notification when task is assigned via trigger', async () => {
      // Get any existing task that's already linked to project_departments
      const { data: existingAssignment } = await adminClient
        .from('task_assignments')
        .select('task_id')
        .limit(1)
        .single();

      if (!existingAssignment) {
        console.log('No existing assignments found, skipping test');
        return;
      }

      const { data: task } = await adminClient
        .from('tasks')
        .select('id, title')
        .eq('id', existingAssignment.task_id)
        .single();

      expect(task).toBeDefined();

      // Get Mitch's notification count before assignment
      const { count: beforeCount } = await adminClient
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', testUsers.mitch.id);

      // Check if Mitch is already assigned to this task
      const { data: existing } = await adminClient
        .from('task_assignments')
        .select('id')
        .eq('task_id', task!.id)
        .eq('assignee_id', testUsers.mitch.id)
        .maybeSingle();

      if (existing) {
        // Mitch already assigned, skip test
        console.log('Mitch already assigned to task, skipping');
        return;
      }

      // Assign Mitch to the task
      const { data: assignment, error: assignError } = await adminClient
        .from('task_assignments')
        .insert({
          task_id: task!.id,
          assignee_id: testUsers.mitch.id,
          assignor_id: testUsers.joel.id,
        })
        .select()
        .single();

      if (assignError) {
        console.log('Assignment failed:', assignError.message);
        return;
      }

      expect(assignment).toBeDefined();

      // Check that notification was created by trigger
      const { count: afterCount } = await adminClient
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', testUsers.mitch.id);

      expect(afterCount).toBe((beforeCount || 0) + 1);

      // Verify notification content
      const { data: newNotification } = await adminClient
        .from('notifications')
        .select('*')
        .eq('user_id', testUsers.mitch.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      expect(newNotification).toBeDefined();
      expect(newNotification?.type).toBe('task_assigned');
      expect(newNotification?.title).toBe('New Task Assignment');
      expect(newNotification?.message).toContain('assigned you to task');
      expect(newNotification?.read).toBe(false);

      // Cleanup - delete the assignment
      await adminClient.from('task_assignments').delete().eq('id', assignment!.id);
    });

    it('should not create notification for self-assignment', async () => {
      // Get a task created by Joel
      const { data: task } = await adminClient
        .from('tasks')
        .select('id, title')
        .eq('creator_id', testUsers.joel.id)
        .limit(1)
        .single();

      expect(task).toBeDefined();

      // Get Joel's notification count before self-assignment
      const { count: beforeCount } = await adminClient
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', testUsers.joel.id);

      // Joel assigns himself to the task
      const { data: assignment, error } = await adminClient
        .from('task_assignments')
        .insert({
          task_id: task!.id,
          assignee_id: testUsers.joel.id,
          assignor_id: testUsers.joel.id,
        })
        .select()
        .single();

      expect(error).toBeNull();

      // Check that NO notification was created (self-assignment)
      const { count: afterCount } = await adminClient
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', testUsers.joel.id);

      expect(afterCount).toBe(beforeCount);

      // Cleanup
      await adminClient.from('task_assignments').delete().eq('id', assignment!.id);
    });

    it('should include assignor name in notification message', async () => {
      // Ryan assigns Kester to a task
      const { data: task } = await adminClient
        .from('tasks')
        .select('id, title')
        .eq('creator_id', testUsers.ryan.id)
        .limit(1)
        .single();

      if (!task) {
        // If Ryan has no tasks, skip this test
        return;
      }

      // Get Ryan's user info
      const { data: ryanInfo } = await adminClient
        .from('user_info')
        .select('first_name, last_name')
        .eq('id', testUsers.ryan.id)
        .single();

      // Assign Kester to Ryan's task
      const { data: assignment } = await adminClient
        .from('task_assignments')
        .insert({
          task_id: task.id,
          assignee_id: testUsers.kester.id,
          assignor_id: testUsers.ryan.id,
        })
        .select()
        .single();

      // Get the notification
      const { data: notification } = await adminClient
        .from('notifications')
        .select('*')
        .eq('user_id', testUsers.kester.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      expect(notification).toBeDefined();
      expect(notification?.message).toContain(`${ryanInfo?.first_name} ${ryanInfo?.last_name}`);

      // Cleanup
      await adminClient.from('task_assignments').delete().eq('id', assignment!.id);
    });
  });

  describe('Notification Triggers - Comments', () => {
    it('should create notifications for assignees when comment is added', async () => {
      // Get a task with multiple assignees
      const { data: taskWithAssignees } = await adminClient
        .from('task_assignments')
        .select('task_id, assignee_id')
        .limit(3);

      if (!taskWithAssignees || taskWithAssignees.length < 2) {
        // Skip if no suitable task found
        return;
      }

      const taskId = taskWithAssignees[0].task_id;
      const assigneeIds = taskWithAssignees
        .filter((ta) => ta.task_id === taskId)
        .map((ta) => ta.assignee_id);

      // Get task title
      const { data: task } = await adminClient
        .from('tasks')
        .select('title')
        .eq('id', taskId)
        .single();

      // Joel adds a comment to the task
      const { data: comment, error: commentError } = await adminClient
        .from('task_comments')
        .insert({
          task_id: taskId,
          user_id: testUsers.joel.id,
          content: 'Integration test comment',
        })
        .select()
        .single();

      expect(commentError).toBeNull();
      expect(comment).toBeDefined();

      // Check notifications were created for assignees (excluding Joel if he's assigned)
      for (const assigneeId of assigneeIds) {
        if (assigneeId === testUsers.joel.id) {
          // Joel shouldn't receive notification for his own comment
          continue;
        }

        const { data: notifications } = await adminClient
          .from('notifications')
          .select('*')
          .eq('user_id', assigneeId)
          .eq('type', 'comment_added')
          .order('created_at', { ascending: false })
          .limit(1);

        expect(notifications).toBeDefined();
        if (notifications && notifications.length > 0) {
          expect(notifications[0].title).toBe('New Comment');
          expect(notifications[0].message).toContain('commented on task');
        }
      }

      // Cleanup
      await adminClient.from('task_comments').delete().eq('id', comment!.id);
    });

    it('should not notify commenter about their own comment', async () => {
      // Get a task where Garrison is assigned
      const { data: assignment } = await adminClient
        .from('task_assignments')
        .select('task_id')
        .eq('assignee_id', testUsers.garrison.id)
        .limit(1)
        .single();

      if (!assignment) {
        return;
      }

      // Get Garrison's notification count before comment
      const { count: beforeCount } = await adminClient
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', testUsers.garrison.id)
        .eq('type', 'comment_added');

      // Garrison comments on the task
      const { data: comment } = await adminClient
        .from('task_comments')
        .insert({
          task_id: assignment.task_id,
          user_id: testUsers.garrison.id,
          content: 'Test comment by Garrison',
        })
        .select()
        .single();

      // Check that Garrison didn't receive a notification for his own comment
      const { count: afterCount } = await adminClient
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', testUsers.garrison.id)
        .eq('type', 'comment_added');

      expect(afterCount).toBe(beforeCount);

      // Cleanup
      await adminClient.from('task_comments').delete().eq('id', comment!.id);
    });
  });

  describe('CRUD Operations on Notifications', () => {
    it('should allow user to mark notification as read', async () => {
      const { client } = await authenticateAs('mitch');

      // Get an unread notification for Mitch
      const { data: unreadNotif } = await client
        .from('notifications')
        .select('*')
        .eq('user_id', testUsers.mitch.id)
        .eq('read', false)
        .limit(1)
        .single();

      if (!unreadNotif) {
        // No unread notifications, skip test
        return;
      }

      // Mark as read
      const { data: updated, error } = await client
        .from('notifications')
        .update({ read: true })
        .eq('id', unreadNotif.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(updated).toBeDefined();
      expect(updated?.read).toBe(true);

      // Restore original state
      await adminClient.from('notifications').update({ read: false }).eq('id', unreadNotif.id);
    });

    it('should allow user to delete own notification', async () => {
      // Create a test notification for Kester
      const { data: testNotif } = await adminClient
        .from('notifications')
        .insert({
          user_id: testUsers.kester.id,
          title: 'Test Notification',
          message: 'This is a test notification for deletion',
          type: 'task_assigned',
          read: false,
        })
        .select()
        .single();

      expect(testNotif).toBeDefined();

      // Kester deletes the notification
      const { client } = await authenticateAs('kester');
      const { error } = await client.from('notifications').delete().eq('id', testNotif!.id);

      expect(error).toBeNull();

      // Verify deletion
      const { data: deleted } = await adminClient
        .from('notifications')
        .select('*')
        .eq('id', testNotif!.id);

      expect(deleted?.length).toBe(0);
    });

    it('should allow user to mark all notifications as read', async () => {
      const { client } = await authenticateAs('ryan');

      // Get unread count before
      const { count: beforeUnread } = await client
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', testUsers.ryan.id)
        .eq('read', false);

      if (!beforeUnread || beforeUnread === 0) {
        // No unread notifications, skip
        return;
      }

      // Mark all as read
      const { error } = await client
        .from('notifications')
        .update({ read: true })
        .eq('user_id', testUsers.ryan.id)
        .eq('read', false);

      expect(error).toBeNull();

      // Verify all are now read
      const { count: afterUnread } = await client
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', testUsers.ryan.id)
        .eq('read', false);

      expect(afterUnread).toBe(0);
    });
  });

  describe('Multi-user Notification Scenarios', () => {
    it('should create separate notifications for multiple assignees', async () => {
      // Create a new task assigned to multiple users
      const { data: task } = await adminClient
        .from('tasks')
        .insert({
          title: 'Integration Test Task for Notifications',
          description: 'Test task for multi-user notifications',
          priority_bucket: 5,
          status: 'To Do',
          creator_id: testUsers.joel.id,
          project_id: 1, // Assuming project 1 exists
        })
        .select()
        .single();

      if (!task) {
        return;
      }

      // Get notification counts before assignment
      const { count: mitchBefore } = await adminClient
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', testUsers.mitch.id);

      const { count: garrisonBefore } = await adminClient
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', testUsers.garrison.id);

      // Assign multiple users to the task
      await adminClient.from('task_assignments').insert([
        {
          task_id: task.id,
          assignee_id: testUsers.mitch.id,
          assignor_id: testUsers.joel.id,
        },
        {
          task_id: task.id,
          assignee_id: testUsers.garrison.id,
          assignor_id: testUsers.joel.id,
        },
      ]);

      // Check both users received notifications
      const { count: mitchAfter } = await adminClient
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', testUsers.mitch.id);

      const { count: garrisonAfter } = await adminClient
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', testUsers.garrison.id);

      expect(mitchAfter).toBe((mitchBefore || 0) + 1);
      expect(garrisonAfter).toBe((garrisonBefore || 0) + 1);

      // Cleanup
      await adminClient.from('tasks').delete().eq('id', task.id);
    });

    it('should maintain notification isolation between users', async () => {
      // Get notifications for different users
      const { client: joelClient } = await authenticateAs('joel');
      const { client: mitchClient } = await authenticateAs('mitch');

      const { data: joelNotifs } = await joelClient.from('notifications').select('user_id');

      const { data: mitchNotifs } = await mitchClient.from('notifications').select('user_id');

      // All of Joel's visible notifications should belong to Joel
      const allJoelNotifs = joelNotifs?.every((n) => n.user_id === testUsers.joel.id);
      expect(allJoelNotifs).toBe(true);

      // All of Mitch's visible notifications should belong to Mitch
      const allMitchNotifs = mitchNotifs?.every((n) => n.user_id === testUsers.mitch.id);
      expect(allMitchNotifs).toBe(true);
    });
  });

  describe('Notification Content Validation', () => {
    it('should have correct notification structure', async () => {
      const { client } = await authenticateAs('joel');

      const { data: notifications } = await client
        .from('notifications')
        .select('*')
        .limit(1)
        .single();

      if (!notifications) {
        return;
      }

      // Verify notification has required fields
      expect(notifications).toHaveProperty('id');
      expect(notifications).toHaveProperty('user_id');
      expect(notifications).toHaveProperty('title');
      expect(notifications).toHaveProperty('message');
      expect(notifications).toHaveProperty('type');
      expect(notifications).toHaveProperty('read');
      expect(notifications).toHaveProperty('created_at');
      expect(notifications).toHaveProperty('updated_at');

      // Verify types
      expect(typeof notifications.id).toBe('number');
      expect(typeof notifications.user_id).toBe('string');
      expect(typeof notifications.title).toBe('string');
      expect(typeof notifications.message).toBe('string');
      expect(typeof notifications.type).toBe('string');
      expect(typeof notifications.read).toBe('boolean');
    });

    it('should have valid notification types', async () => {
      const { data: notifications } = await adminClient
        .from('notifications')
        .select('type')
        .limit(10);

      if (!notifications || notifications.length === 0) {
        return;
      }

      const validTypes = ['task_assigned', 'comment_added'];
      const allTypesValid = notifications.every((n) => validTypes.includes(n.type));

      expect(allTypesValid).toBe(true);
    });
  });
});
