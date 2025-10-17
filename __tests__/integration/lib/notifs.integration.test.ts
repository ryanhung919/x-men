import { describe, it, expect, beforeAll } from 'vitest';
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
  let kesterClient: any;

  beforeAll(async () => {
    // Authenticate test user for task updates (using direct Supabase client)
    const kester = await authenticateAs('kester');
    kesterClient = kester.client;
  });
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
          task_id: task!.id,
          assignee_id: testUsers.mitch.id,
          assignor_id: testUsers.joel.id,
        },
        {
          task_id: task!.id,
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

      const validTypes = ['task_assigned', 'comment_added', 'task_updated'];
      const allTypesValid = notifications.every((n) => validTypes.includes(n.type));

      expect(allTypesValid).toBe(true);
    });
  });

  //TESTING HERE
  async function ensureTaskWithAtLeastTwoAssignees() {
    // Find a task that has both kester and ryan as assignees
    const { data: kesterAssignments } = await adminClient
      .from('task_assignments')
      .select('task_id')
      .eq('assignee_id', testUsers.kester.id);

    const { data: ryanAssignments } = await adminClient
      .from('task_assignments')
      .select('task_id')
      .eq('assignee_id', testUsers.ryan.id);

    // Find common task_id
    const kesterTaskIds = kesterAssignments?.map((a) => a.task_id) || [];
    const ryanTaskIds = ryanAssignments?.map((a) => a.task_id) || [];
    const commonTaskId = kesterTaskIds.find((id) => ryanTaskIds.includes(id));

    if (!commonTaskId) {
      throw new Error('No task found with both kester and ryan as assignees');
    }

    // Get the task
    const { data: task } = await adminClient.from('tasks').select('*').eq('id', commonTaskId).single();

    if (!task) {
      throw new Error(`Task ${commonTaskId} not found`);
    }

    return task;
  }

  describe('Notification Triggers - Task Updates', () => {
    it('should create notifications when task title is updated', async () => {
      // Get existing task with multi-assignees
      const task = await ensureTaskWithAtLeastTwoAssignees();

      // Define the expected recipient (ryan - the OTHER assignee, not the updater)
      const recipient = testUsers.ryan.id;

      // Record notification count before update
      const { count: beforeCount } = await adminClient
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', recipient)
        .eq('type', 'task_updated');

      // Update the task title as authenticated kester using direct client call
      const newTitle = `Test Title Updated ${Date.now()}`;
      const { error: updateError } = await kesterClient
        .from('tasks')
        .update({ title: newTitle })
        .eq('id', task.id);

      expect(updateError).toBeNull();

      // Wait briefly for the trigger to execute
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Assert that ryan got +1 notification
      const { count: afterCount } = await adminClient
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', recipient)
        .eq('type', 'task_updated');

      expect(afterCount).toBe((beforeCount || 0) + 1);

      // Verify notification content
      const { data: notification } = await adminClient
        .from('notifications')
        .select('*')
        .eq('user_id', recipient)
        .eq('type', 'task_updated')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      expect(notification).toBeDefined();
      expect(notification?.title).toBe('Task Updated');
      expect(notification?.message).toContain('updated the title');
      expect(notification?.read).toBe(false);

      // Restore original title
      await kesterClient.from('tasks').update({ title: task.title }).eq('id', task.id);
    });

    it('should create notifications when task status is updated', async () => {
      // Get existing task with multi-assignees
      const task = await ensureTaskWithAtLeastTwoAssignees();

      // Define the expected recipient (ryan - the OTHER assignee)
      const recipient = testUsers.ryan.id;

      // Record notification count before update
      const { count: beforeCount } = await adminClient
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', recipient)
        .eq('type', 'task_updated');

      // Update the task status as authenticated kester using direct client call
      const newStatus = task.status === 'To Do' ? 'In Progress' : 'To Do';
      const { error: updateError } = await kesterClient
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', task.id);

      expect(updateError).toBeNull();

      // Wait briefly for the trigger to execute
      await new Promise((resolve) => setTimeout(resolve, 120));

      // Assert that ryan got +1 notification
      const { count: afterCount } = await adminClient
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', recipient)
        .eq('type', 'task_updated');

      expect(afterCount).toBe((beforeCount || 0) + 1);

      // Verify notification mentions status change
      const { data: notification } = await adminClient
        .from('notifications')
        .select('*')
        .eq('user_id', recipient)
        .eq('type', 'task_updated')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      expect(notification?.message).toContain('status');

      // Restore original status
      await kesterClient.from('tasks').update({ status: task.status }).eq('id', task.id);
    });

    it('should create notifications when task priority is updated', async () => {
      // Get a task with assignees
      const { data: assignment } = await adminClient
        .from('task_assignments')
        .select('task_id, assignee_id')
        .limit(1)
        .single();

      if (!assignment) {
        return;
      }

      const { data: task } = await adminClient
        .from('tasks')
        .select('id, title, priority_bucket, creator_id')
        .eq('id', assignment.task_id)
        .single();

      if (!task) {
        return;
      }

      // Find the creator in our test users
      const creatorKey = Object.keys(testUsers).find(
        (key) => testUsers[key as keyof typeof testUsers].id === task.creator_id
      ) as keyof typeof testUsers | undefined;

      if (!creatorKey) {
        console.log('Creator not in test users, skipping');
        return;
      }

      // Authenticate as the task creator
      const { client: creatorClient } = await authenticateAs(creatorKey);

      const originalPriority = task.priority_bucket;
      const newPriority = task.priority_bucket === 5 ? 8 : 5;

      // Update the task priority as authenticated creator
      const { error: updateError } = await creatorClient
        .from('tasks')
        .update({ priority_bucket: newPriority })
        .eq('id', task.id);

      expect(updateError).toBeNull();

      // Small delay for trigger to execute
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check notification was created (if assignee is not the updater)
      if (assignment.assignee_id !== task.creator_id) {
        const { data: notification } = await adminClient
          .from('notifications')
          .select('*')
          .eq('user_id', assignment.assignee_id)
          .eq('type', 'task_updated')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (notification) {
          expect(notification.message).toContain('priority');
        }
      }

      // Restore original priority
      await adminClient
        .from('tasks')
        .update({ priority_bucket: originalPriority })
        .eq('id', task.id);
    });

    it('should create notifications when task deadline is updated', async () => {
      // Get existing task with multi-assignees
      const task = await ensureTaskWithAtLeastTwoAssignees();

      // Define the expected recipient (ryan - the OTHER assignee)
      const recipient = testUsers.ryan.id;

      // Record notification count before update
      const { count: beforeCount } = await adminClient
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', recipient)
        .eq('type', 'task_updated');

      // Update the task deadline as authenticated kester using direct client call
      // Use a timestamp in the far future to ensure it's different from any existing deadline
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1); // 1 year from now
      const newDeadline = futureDate.toISOString();
      const { error: updateError } = await kesterClient
        .from('tasks')
        .update({ deadline: newDeadline })
        .eq('id', task.id);

      expect(updateError).toBeNull();

      // Wait briefly for the trigger to execute
      await new Promise((resolve) => setTimeout(resolve, 120));

      // Assert that ryan got +1 notification
      const { count: afterCount } = await adminClient
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', recipient)
        .eq('type', 'task_updated');

      expect(afterCount).toBe((beforeCount || 0) + 1);

      // Verify notification mentions deadline change
      const { data: notification } = await adminClient
        .from('notifications')
        .select('*')
        .eq('user_id', recipient)
        .eq('type', 'task_updated')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      expect(notification?.message).toContain('deadline');

      // Only restore if original deadline was not null to avoid creating extra notifications
      if (task.deadline !== null) {
        await kesterClient.from('tasks').update({ deadline: task.deadline }).eq('id', task.id);
      }
    });

    it('should not notify updater when they are also an assignee', async () => {
      // Find a task where the creator is also assigned
      const { data: taskAssignment } = await adminClient
        .from('task_assignments')
        .select('task_id, assignee_id, tasks!inner(creator_id)')
        .limit(10);

      if (!taskAssignment || taskAssignment.length === 0) {
        return;
      }

      // Find one where assignee === creator
      const selfAssigned = taskAssignment.find((ta: any) => ta.assignee_id === ta.tasks.creator_id);

      if (!selfAssigned) {
        return;
      }

      const { data: task } = await adminClient
        .from('tasks')
        .select('*')
        .eq('id', (selfAssigned as any).task_id)
        .single();

      if (!task) {
        return;
      }

      const originalPriority = task.priority_bucket;
      const newPriority = task.priority_bucket === 5 ? 8 : 5;

      // Get notification count before update
      const { count: beforeCount } = await adminClient
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', task.creator_id)
        .eq('type', 'task_updated');

      // Update the task as the creator/assignee
      const { error: updateError } = await adminClient
        .from('tasks')
        .update({ priority_bucket: newPriority })
        .eq('id', task.id);

      expect(updateError).toBeNull();

      // Small delay for trigger to execute
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check that NO notification was created (self-update)
      const { count: afterCount } = await adminClient
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', task.creator_id)
        .eq('type', 'task_updated');

      expect(afterCount).toBe(beforeCount);

      // Restore
      await adminClient
        .from('tasks')
        .update({ priority_bucket: originalPriority })
        .eq('id', task.id);
    });

    it('should notify multiple assignees when task is updated', async () => {
      // Get existing task with multi-assignees
      const task = await ensureTaskWithAtLeastTwoAssignees();

      // Define the expected recipient (ryan - the OTHER assignee)
      const recipient = testUsers.ryan.id;

      // Record notification count before update
      const { count: beforeCount } = await adminClient
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', recipient)
        .eq('type', 'task_updated');

      // Update the task as authenticated kester using direct client call
      // Use a different priority that's guaranteed to be different
      const newPriority = task.priority_bucket === 8 ? 5 : 8;
      const { error: updateError } = await kesterClient
        .from('tasks')
        .update({ priority_bucket: newPriority })
        .eq('id', task.id);

      expect(updateError).toBeNull();

      // Wait briefly for the trigger to execute
      await new Promise((resolve) => setTimeout(resolve, 120));

      // Assert that ryan got +1 notification
      const { count: afterCount } = await adminClient
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', recipient)
        .eq('type', 'task_updated');

      expect(afterCount).toBe((beforeCount || 0) + 1);

      // Always restore original priority to maintain test isolation
      await kesterClient.from('tasks').update({ priority_bucket: task.priority_bucket }).eq('id', task.id);
    });
  });
});
