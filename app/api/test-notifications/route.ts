import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getNotificationsForUser, archiveNotification as archiveNotificationDB } from '@/lib/db/notifs';

/**
 * Test Notifications API Endpoint
 *
 * PURPOSE: Test in-app notification system for task operations with automatic database triggers.
 *
 * SETUP:
 * - Log in as Kester (admin) to run tests
 * - Ryan and Joel receive notifications
 * - Task ID 2 is used for all test operations
 *
 * USAGE:
 * - Run all tests: GET /api/test-notifications
 * - Individual tests: GET /api/test-notifications?action={testName}
 * - POST tests: POST /api/test-notifications with JSON body
 *
 * AVAILABLE TESTS:
 * - assignJoel: Assign Joel to task 2
 * - removeJoel: Remove Joel from task 2
 * - reassignJoel: Assign Joel back to task 2
 * - singleUpdate: Update single task field
 * - batchUpdate: Reset task to original state
 * - singleUpdates: Run all 5 single field updates
 * - comment: Add comment to task
 * - addAttachment: Add file attachment
 * - removeAttachment: Remove file attachment
 * - addTag: Add tag to task
 * - removeTag: Remove tag from task
 * - makeSubtask: Create subtask with parent task
 * - listNotifications: List current user's non-archived notifications
 * - archiveNotification: Archive the first notification in the list
 */

// ==============================
// CONSTANTS & CONFIGURATION
// ==============================

/** Test users for notification system testing */
const TEST_USERS = {
  /** Kester - Admin user who runs tests and triggers notifications */
  KESTER: { id: '67393282-3a06-452b-a05a-9c93a95b597f', name: 'Kester' },
  /** Ryan - Regular user who receives notifications */
  RYAN: { id: '61ca6b82-6d42-4058-bb4c-9316e7079b24', name: 'Ryan' },
  /** Joel - Regular user who receives notifications */
  JOEL: { id: '8d7a0c21-17ba-40f3-9e6d-dac4ae3cbe2a', name: 'Joel' },
} as const;

/** Task ID used for all test operations */
const TEST_TASK_ID = 2;

/** Test attachment file name */
const TEST_ATTACHMENT_NAME = 'test-document.pdf';

/** Original task state for reset purposes */
const TASK_ORIGINAL_STATE = {
  recurrence_interval: 0,
  priority_bucket: '5',
  notes: 'Prevent self-parenting on move.',
  deadline: new Date('2025-10-10T17:00:00+08:00').toISOString(),
  description: 'Kanban by status with optimistic updates + Realtime.',
} as const;

/** Sequential updates to test individual field change notifications */
const SINGLE_UPDATES = [
  { field: 'recurrence_interval', value: 7 },
  { field: 'priority_bucket', value: 8 },
  { field: 'notes', value: 'Updated notes for testing purposes' },
  { field: 'deadline', value: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() },
  { field: 'description', value: 'Updated description for testing' },
] as const;

// ==============================
// HELPER FUNCTIONS
// ==============================

/**
 * Wraps operations with consistent error handling and response formatting
 */
async function handleAction(fn: () => Promise<any>) {
  try {
    const result = await fn();
    console.log('Action completed successfully:', result);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Action failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Gets authenticated user from Supabase session
 */
async function getAuthenticatedUser(supabase: any) {
  console.log('Authenticating user...');
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error('Authentication failed:', authError);
    throw new Error('Unauthorized - Please login first');
  }

  console.log(`User authenticated: ${user.email} (${user.id})`);
  return user;
}

// ==============================
// TASK OPERATIONS
// ==============================

/**
 * Assigns a user to the test task, triggering assignment notifications
 */
async function assignUserToTask(userId: string, userName: string, supabase: any) {
  console.log(`Assigning ${userName} to task ${TEST_TASK_ID}...`);
  const user = await getAuthenticatedUser(supabase);

  if (userId === user.id) {
    console.log('Self-assignment detected, skipping notifications');
    return { message: 'Self-assignment - no notification needed' };
  }

  const { data: assignment, error } = await supabase
    .from('task_assignments')
    .insert({
      task_id: TEST_TASK_ID,
      assignee_id: userId,
      assignor_id: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error('Assignment failed:', error);
    throw error;
  }

  console.log(`Successfully assigned ${userName} to task ${TEST_TASK_ID}`);
  return {
    success: true,
    message: `Successfully assigned ${userName} to task ID ${TEST_TASK_ID}`,
    assignment,
  };
}

/**
 * Removes a user from the test task, triggering removal notifications
 */
async function removeUserFromTask(userId: string, userName: string, supabase: any) {
  console.log(`Removing ${userName} from task ${TEST_TASK_ID}...`);
  const user = await getAuthenticatedUser(supabase);

  if (userId === user.id) {
    console.log('Cannot remove self from task');
    return { message: 'Cannot remove yourself from task' };
  }

  const { data: assignment, error } = await supabase
    .from('task_assignments')
    .delete()
    .eq('task_id', TEST_TASK_ID)
    .eq('assignee_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Removal failed:', error);
    throw error;
  }

  if (!assignment) {
    console.log(`${userName} was not assigned to this task`);
    return { message: `${userName} is not assigned to this task` };
  }

  console.log(`Successfully removed ${userName} from task ${TEST_TASK_ID}`);
  return {
    success: true,
    message: `Successfully removed ${userName} from task ID ${TEST_TASK_ID}`,
    assignment,
  };
}

/**
 * Updates task fields, triggering update notifications for changed fields
 */
async function updateTask(updates: any, supabase: any) {
  console.log(`Updating task ${TEST_TASK_ID} with:`, updates);
  await getAuthenticatedUser(supabase);

  const { data: updatedTask, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', TEST_TASK_ID)
    .select()
    .single();

  if (error) {
    console.error('Task update failed:', error);
    throw error;
  }

  console.log(`Task ${TEST_TASK_ID} updated successfully`);
  return {
    success: true,
    message: `Task ID ${TEST_TASK_ID} updated`,
    updatedTask,
  };
}

/**
 * Adds a comment to the test task, triggering comment notifications
 */
async function addComment(content: string, supabase: any) {
  console.log(`Adding comment to task ${TEST_TASK_ID}...`);
  const user = await getAuthenticatedUser(supabase);

  const { data: comment, error } = await supabase
    .from('task_comments')
    .insert({
      task_id: TEST_TASK_ID,
      user_id: user.id,
      content,
    })
    .select()
    .single();

  if (error) {
    console.error('Comment creation failed:', error);
    throw error;
  }

  console.log(`Comment added to task ${TEST_TASK_ID}`);
  return {
    success: true,
    message: `Comment added to task ID ${TEST_TASK_ID}`,
    comment,
  };
}

/**
 * Adds a file attachment to the test task, triggering attachment notifications
 */
async function addAttachment(fileName: string, supabase: any) {
  console.log(`Adding attachment "${fileName}" to task ${TEST_TASK_ID}...`);
  const user = await getAuthenticatedUser(supabase);

  const storagePath = `task-attachments/${fileName}`;

  const { data: attachment, error } = await supabase
    .from('task_attachments')
    .insert({
      task_id: TEST_TASK_ID,
      storage_path: storagePath,
      uploaded_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error('Attachment creation failed:', error);
    throw error;
  }

  console.log(`Attachment "${fileName}" added to task ${TEST_TASK_ID}`);
  return {
    success: true,
    message: `File "${fileName}" added to task ID ${TEST_TASK_ID}`,
    attachment,
  };
}

/**
 * Removes a file attachment from the test task, triggering removal notifications
 */
async function removeAttachment(fileName: string, supabase: any) {
  console.log(`Removing attachment "${fileName}" from task ${TEST_TASK_ID}...`);
  await getAuthenticatedUser(supabase);

  const storagePath = `task-attachments/${fileName}`;

  const { data: attachment, error } = await supabase
    .from('task_attachments')
    .delete()
    .eq('task_id', TEST_TASK_ID)
    .eq('storage_path', storagePath)
    .select()
    .single();

  if (error) {
    console.error('Attachment removal failed:', error);
    throw error;
  }

  if (!attachment) {
    console.log(`Attachment "${fileName}" not found on task ${TEST_TASK_ID}`);
    return { message: `File "${fileName}" not found on task ID ${TEST_TASK_ID}` };
  }

  console.log(`Attachment "${fileName}" removed from task ${TEST_TASK_ID}`);
  return {
    success: true,
    message: `File "${fileName}" removed from task ID ${TEST_TASK_ID}`,
    attachment,
  };
}

/**
 * Adds a tag to the test task, triggering tag addition notifications
 */
async function addTag(tagId: number, supabase: any) {
  console.log(`Adding tag ${tagId} to task ${TEST_TASK_ID}...`);
  await getAuthenticatedUser(supabase);

  const { data: taskTag, error } = await supabase
    .from('task_tags')
    .insert({
      task_id: TEST_TASK_ID,
      tag_id: tagId,
    })
    .select('*, tags!inner(name)')
    .single();

  if (error) {
    console.error('Tag addition failed:', error);
    throw error;
  }

  console.log(`Tag "${taskTag.tags.name}" added to task ${TEST_TASK_ID}`);
  return {
    success: true,
    message: `Tag "${taskTag.tags.name}" added to task ID ${TEST_TASK_ID}`,
    tagId,
    tagName: taskTag.tags.name,
  };
}

/**
 * Removes a tag from the test task, triggering tag removal notifications
 */
async function removeTag(tagId: number, supabase: any) {
  console.log(`Removing tag ${tagId} from task ${TEST_TASK_ID}...`);

  const { data: removedTag, error } = await supabase
    .from('task_tags')
    .delete()
    .eq('task_id', TEST_TASK_ID)
    .eq('tag_id', tagId)
    .select('*, tags!inner(name)')
    .single();

  if (error) {
    console.error('Tag removal failed:', error);
    throw error;
  }

  if (!removedTag) {
    console.log(`Tag ${tagId} was not associated with task ${TEST_TASK_ID}`);
    return { message: `Tag ID ${tagId} is not associated with task ID ${TEST_TASK_ID}` };
  }

  console.log(`Tag "${removedTag.tags.name}" removed from task ${TEST_TASK_ID}`);
  return {
    success: true,
    message: `Tag "${removedTag.tags.name}" removed from task ID ${TEST_TASK_ID}`,
    tagId,
    tagName: removedTag.tags.name,
  };
}

/**
 * Creates a subtask linked to a parent task, triggering subtask creation notifications
 * Uses RPC approach to bypass RLS and validation triggers
 */
async function createSubtask(
  parentTaskId: number,
  title: string,
  description: string,
  supabase: any
) {
  console.log(`Creating subtask "${title}" under parent task ${parentTaskId}...`);
  const user = await getAuthenticatedUser(supabase);

  // Get parent task info
  const { data: parentTask, error: parentError } = await supabase
    .from('tasks')
    .select('project_id')
    .eq('id', parentTaskId)
    .single();

  if (parentError) {
    console.error('Parent task query failed:', parentError);
    throw parentError;
  }

  console.log(`Found parent task: project_id=${parentTask.project_id}`);

  // Create subtask using RPC function (bypasses RLS and validation trigger)
  const { data: rpcResult, error: rpcError } = await supabase.rpc('create_task_with_assignment', {
    p_task_title: title,
    p_creator_id: user.id,
    p_project_id: parentTask.project_id,
    p_assignee_id: user.id,
    p_task_description: description,
    p_priority_bucket: 5,
    p_assignor_id: user.id,
  });

  if (rpcError) {
    console.error('RPC subtask creation failed:', rpcError);
    throw rpcError;
  }

  console.log(`Subtask created via RPC with ID: ${rpcResult[0].task_id}`);

  // Update subtask to have parent_task_id (this triggers the notification)
  const { data: subtask, error: updateError } = await supabase
    .from('tasks')
    .update({ parent_task_id: parentTaskId })
    .eq('id', rpcResult[0].task_id)
    .select()
    .single();

  if (updateError) {
    console.error('Subtask parent update failed:', updateError);
    throw updateError;
  }

  console.log(`Subtask "${title}" successfully linked to parent task ${parentTaskId}`);
  return {
    success: true,
    message: `Subtask "${title}" created and linked to parent task ID ${parentTaskId}`,
    subtask,
  };
}

// ==============================
// TEST SETUP FUNCTIONS
// ==============================

/**
 * Ensures the test task has the correct initial state (Kester and Ryan assigned, Joel removed)
 */
async function ensureInitialTaskState(supabase: any) {
  console.log('Setting up initial task state...');

  // Remove Joel if assigned
  console.log('Removing Joel from task if assigned...');
  await supabase
    .from('task_assignments')
    .delete()
    .eq('task_id', TEST_TASK_ID)
    .eq('assignee_id', TEST_USERS.JOEL.id);

  // Ensure Kester and Ryan are assigned
  for (const user of [TEST_USERS.KESTER, TEST_USERS.RYAN]) {
    console.log(`Checking if ${user.name} is assigned to task...`);
    const { data: assignment } = await supabase
      .from('task_assignments')
      .select('*')
      .eq('task_id', TEST_TASK_ID)
      .eq('assignee_id', user.id)
      .maybeSingle();

    if (!assignment) {
      console.log(`Assigning ${user.name} to task...`);
      await supabase.from('task_assignments').insert({
        task_id: TEST_TASK_ID,
        assignee_id: user.id,
        assignor_id: TEST_USERS.KESTER.id,
      });
    } else {
      console.log(`${user.name} is already assigned to task`);
    }
  }

  console.log('Initial task state setup complete');
}

/**
 * Creates test actions with the provided Supabase client
 */
function getTestActions(supabase: any) {
  return {
    /** Assign Joel to the test task */
    assignJoel: () => assignUserToTask(TEST_USERS.JOEL.id, TEST_USERS.JOEL.name, supabase),

    /** Remove Joel from the test task */
    removeJoel: () => removeUserFromTask(TEST_USERS.JOEL.id, TEST_USERS.JOEL.name, supabase),

    /** Reassign Joel to the test task */
    reassignJoel: () => assignUserToTask(TEST_USERS.JOEL.id, TEST_USERS.JOEL.name, supabase),

    /** Update single task field */
    singleUpdate: () => updateTask({ status: 'In Progress' }, supabase),

    /** Reset task to original state */
    batchUpdate: () => updateTask(TASK_ORIGINAL_STATE, supabase),

    /** Run all single field updates sequentially */
    singleUpdates: async () => {
      console.log('Running sequential single field updates...');
      const results = [];
      for (const update of SINGLE_UPDATES) {
        console.log(`Updating field: ${update.field}`);
        const result = await updateTask({ [update.field]: update.value }, supabase);
        results.push({ field: update.field, ...result });
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      console.log('Single field updates completed');
      return { action: 'singleUpdates', results };
    },

    /** Add comment to task */
    comment: (content?: string) => addComment(content || 'Test comment', supabase),

    /** Add file attachment to task */
    addAttachment: (fileName?: string) => addAttachment(fileName || TEST_ATTACHMENT_NAME, supabase),

    /** Remove file attachment from task */
    removeAttachment: (fileName?: string) =>
      removeAttachment(fileName || TEST_ATTACHMENT_NAME, supabase),

    /** Add tag to task */
    addTag: () => addTag(5, supabase),

    /** Remove tag from task */
    removeTag: () => removeTag(5, supabase),

    /** Create subtask with default or custom parameters */
    makeSubtask: (params?: any) =>
      createSubtask(
        params?.parentTaskId || 2,
        params?.title || 'Test Subtask',
        params?.description || 'Test subtask description',
        supabase
      ),

    /** List current user's non-archived notifications */
    listNotifications: async () => {
      const user = await getAuthenticatedUser(supabase);
      const notifications = await getNotificationsForUser(user.id);
      return {
        success: true,
        message: `Found ${notifications.length} non-archived notifications for ${user.email}`,
        count: notifications.length,
        notifications: notifications.map((n) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          read: n.read,
          is_archived: n.is_archived,
        })),
      };
    },

    /** Archive the first notification in the user's list */
    archiveNotification: async () => {
      const user = await getAuthenticatedUser(supabase);
      const notifications = await getNotificationsForUser(user.id);

      if (notifications.length === 0) {
        return {
          success: false,
          message: `No notifications found for ${user.email} to archive`,
        };
      }

      const firstNotification = notifications[0];
      const result = await archiveNotificationDB(firstNotification.id);

      return {
        success: true,
        message: `Archived notification ID ${firstNotification.id}: "${firstNotification.title}" for ${user.email}`,
        archivedNotification: {
          id: result?.id,
          title: result?.title,
          is_archived: result?.is_archived,
        },
      };
    },
  };
}

// GET endpoint - run tests via query parameters
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await getAuthenticatedUser(supabase);
    const testActions = getTestActions(supabase);

    const { searchParams } = new URL(req.url || '');
    const action = searchParams.get('action');
    const content = searchParams.get('content');

    // If no action specified, run all tests in sequence
    if (!action) {
      await ensureInitialTaskState(supabase);
      await new Promise((resolve) => setTimeout(resolve, 500));

      const testSequence = [
        { name: 'assignJoel', action: () => testActions.assignJoel() },
        { name: 'singleUpdates', action: () => testActions.singleUpdates() },
        { name: 'addTag', action: () => testActions.addTag() },
        { name: 'removeTag', action: () => testActions.removeTag() },
        { name: 'batchUpdate', action: () => testActions.batchUpdate() },
        { name: 'removeJoel', action: () => testActions.removeJoel() },
        { name: 'addAttachment', action: () => testActions.addAttachment() },
        { name: 'reassignJoel', action: () => testActions.reassignJoel() },
        { name: 'removeAttachment', action: () => testActions.removeAttachment() },
        { name: 'makeSubtask', action: () => testActions.makeSubtask() },
        { name: 'archiveNotification', action: () => testActions.archiveNotification() },
      ];

      const results = [];

      for (const test of testSequence) {
        try {
          const result = await test.action();
          results.push({ action: test.name, success: true, ...result });
        } catch (error) {
          results.push({
            action: test.name,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      return NextResponse.json({
        success: true,
        message: 'All notification tests completed!',
        user: user.email,
        results,
      });
    }

    // Handle specific actions
    if (action in testActions) {
      return handleAction(async () => {
        const result = await (testActions as any)[action](content);
        return { action, result, message: `${action} completed!` };
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('GET test notifications error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// POST endpoint - run tests via JSON body
export async function POST(req: NextRequest) {
  const { action, ...params } = await req.json();
  const supabase = await createClient();
  const testActions = getTestActions(supabase);

  return handleAction(async () => {
    if (action in testActions) {
      const result = await (testActions as any)[action](params);
      return { action, result, message: `${action} completed!` };
    }
    throw new Error(`Unknown action: ${action}`);
  });
}
