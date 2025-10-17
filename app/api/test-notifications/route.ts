import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Test Notifications API Endpoint
 *
 * PURPOSE:
 * Test in-app notification system for task assignments, comments, updates, attachments, and more.
 *
 * SETUP:
 * 1. Log in as Kester (kester.yeo.2024@computing.smu.edu.sg) - RUNS THE TESTS (Admin)
 * 2. Log in as Ryan (ryan.hung.2023@scis.smu.edu.sg) - RECEIVES NOTIFICATIONS (current assignee)
 * 3. Log in as Joel (joel.wang.03@gmail.com) - RECEIVES NOTIFICATIONS (new assignee)
 *
 * SCENARIO:
 * - Task ID 2: Should have Kester and Ryan as initial assignees
 * - Flow: Kester (logged in) performs all actions, Ryan and Joel receive notifications
 *
 * EXPECTED NOTIFICATIONS:
 * 1. Task Assignment: Kester assigns Joel → Ryan gets "new team member" notif, Joel gets "assigned to task" notif
 * 2. Multiple Single Updates: Recurrence interval, priority, notes, deadline, etc. → Each creates separate notification
 * 3. Batch Update: Multiple fields at once → Single notification listing all changes
 * 4. Team Member Removal: Remove Joel → Joel gets "removed from task", Ryan gets "team member removed"
 * 5. File Attachment: Add file → Ryan gets "file attached" notification
 * 6. Re-assignment: Add Joel back → Ryan gets "new team member", Joel gets "assigned to task"
 * 7. File Removal: Remove file → Ryan gets "file removed" notification
 * 8. Tag Addition: Add tag to task → Ryan gets "tag added" notification
 * 9. Tag Removal: Remove tag from task → Ryan gets "tag removed" notification
 * 10. Subtask Creation: Create new task as subtask of task 2 (COMMENTED OUT for now)
 *
 * USAGE:
 * - Run all tests: GET /api/test-notifications
 * - Individual tests: GET /api/test-notifications?action={assignJoel|singleUpdates|batchUpdate|removeJoel|addAttachment|reassignJoel|removeAttachment|addTag|removeTag}
 *
 * NEW INDIVIDUAL TESTS:
 * - assignJoel: Assign Joel to task 2 (Ryan gets "new team member", Joel gets "assigned to task")
 * - singleUpdates: Run all 5 single field updates in sequence
 * - batchUpdate: Reset all fields back to original state
 * - removeJoel: Remove Joel from task (Joel gets "removed from task", Ryan gets "team member removed")
 * - addAttachment: Add test-document.pdf (Ryan gets "file attached")
 * - reassignJoel: Assign Joel back to task (Ryan gets "new team member", Joel gets "assigned to task")
 * - removeAttachment: Remove test-document.pdf (Ryan gets "file removed")
 * - addTag: Add tag ID 5 to task (Ryan gets "tag added" notification)
 * - removeTag: Remove tag ID 5 from task (Ryan gets "tag removed" notification)
 * - makeSubtask: Create new subtask (TODO: Waiting for teammate to finalize process)
 */

// Constants
const TEST_USERS = {
  KESTER: { id: '67393282-3a06-452b-a05a-9c93a95b597f', name: 'Kester' },
  RYAN: { id: '61ca6b82-6d42-4058-bb4c-9316e7079b24', name: 'Ryan' },
  JOEL: { id: '8d7a0c21-17ba-40f3-9e6d-dac4ae3cbe2a', name: 'Joel' },
} as const;

const TEST_TASK_ID = 2;
const TEST_ATTACHMENT_NAME = 'test-document.pdf';

// Original values from sample-data.ts for task ID 2
const TASK_ORIGINAL_STATE = {
  recurrence_interval: 0,
  priority_bucket: '5',
  notes: 'Prevent self-parenting on move.',
  deadline: new Date('2025-10-10T17:00:00+08:00').toISOString(),
  description: 'Kanban by status with optimistic updates + Realtime.',
} as const;

const SINGLE_UPDATES = [
  { field: 'recurrence_interval', value: 7, description: 'Set recurrence to 7 days' },
  { field: 'priority_bucket', value: 8, description: 'Changed priority to 8' },
  { field: 'notes', value: 'Updated notes for testing purposes', description: 'Added notes' },
  {
    field: 'deadline',
    value: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    description: 'Set deadline to 30 days from now',
  },
  { field: 'description', value: 'Updated description for testing', description: 'Changed description' },
] as const;

// Helper function for consistent error handling
async function handleAction(fn: () => Promise<any>) {
  try {
    const result = await fn();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Action error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET endpoint - supports query parameters, runs all if none provided
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized - Please login first' }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url || '');
    const action = searchParams.get('action');
    const content = searchParams.get('content');

    const results = [];

    // If no action specified, run all tests in sequence
    if (!action) {
      // First, ensure task 2 has the correct initial state (Kester and Ryan as assignees)
      await ensureInitialTaskState(supabase);
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Test 1: Kester assigns Joel to task 2
      // Expected: Ryan gets "new team member" notification, Joel gets "assigned to task" notification
      try {
        const result = await handleTaskAssignment(TEST_USERS.JOEL, supabase);
        results.push({
          action: 'assignJoel',
          success: true,
          result,
          note: 'Ryan gets "new team member" notif, Joel gets "assigned to task" notif',
        });
      } catch (error) {
        results.push({
          action: 'assignJoel',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Test 2: Multiple single field updates
      // Each update should create a separate notification
      for (let i = 0; i < SINGLE_UPDATES.length; i++) {
        const update = SINGLE_UPDATES[i];
        try {
          const result = await handleTaskUpdate(
            {
              taskId: TEST_TASK_ID,
              updates: { [update.field]: update.value },
            },
            supabase
          );
          results.push({
            action: `singleUpdate${i + 1}`,
            success: true,
            result,
            description: update.description,
          });
        } catch (error) {
          results.push({
            action: `singleUpdate${i + 1}`,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            description: update.description,
          });
        }
        await new Promise((resolve) => setTimeout(resolve, 800));
      }

      // Test 8: Add tag to task (before batch update)
      // Expected: Ryan gets "tag added" notification
      try {
        const result = await handleTagAddition({ tagId: 5 }, supabase);
        results.push({
          action: 'addTag',
          success: true,
          result,
          note: 'Ryan gets "tag added" notification',
        });
      } catch (error) {
        results.push({
          action: 'addTag',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Test 9: Remove tag from task (before batch update)
      // Expected: Ryan gets "tag removed" notification
      try {
        const result = await handleTagRemoval({ tagId: 5 }, supabase);
        results.push({
          action: 'removeTag',
          success: true,
          result,
          note: 'Ryan gets "tag removed" notification',
        });
      } catch (error) {
        results.push({
          action: 'removeTag',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Test 3: Batch update back to original state
      // Should create a single notification listing all changed fields
      try {
        const result = await handleTaskUpdate(
          {
            taskId: TEST_TASK_ID,
            updates: TASK_ORIGINAL_STATE,
          },
          supabase
        );
        results.push({
          action: 'batchUpdate',
          success: true,
          result,
          note: 'Single notification listing all changed fields',
        });
      } catch (error) {
        results.push({
          action: 'batchUpdate',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Test 4: Remove Joel from task
      // Expected: Joel gets "removed from task" notification, Ryan gets "team member removed" notification
      try {
        const result = await handleTaskAssignmentRemoval(TEST_USERS.JOEL, supabase);
        results.push({
          action: 'removeJoel',
          success: true,
          result,
          note: 'Joel gets "removed from task" notif, Ryan gets "team member removed" notif',
        });
      } catch (error) {
        results.push({
          action: 'removeJoel',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Test 5: Add file attachment
      // Expected: Ryan gets "file attached" notification
      try {
        const result = await handleTaskAttachment({ fileName: TEST_ATTACHMENT_NAME }, supabase);
        results.push({
          action: 'addAttachment',
          success: true,
          result,
          note: 'Ryan gets "file attached" notification',
        });
      } catch (error) {
        results.push({
          action: 'addAttachment',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Test 6: Assign Joel back to task
      // Expected: Ryan gets "new team member" notification, Joel gets "assigned to task" notification again
      try {
        const result = await handleTaskAssignment(TEST_USERS.JOEL, supabase);
        results.push({
          action: 'reassignJoel',
          success: true,
          result,
          note: 'Ryan gets "new team member" notif, Joel gets "assigned to task" notif again',
        });
      } catch (error) {
        results.push({
          action: 'reassignJoel',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Test 7: Remove file attachment
      // Expected: Ryan gets "file removed" notification
      try {
        const result = await handleTaskAttachmentRemoval({ fileName: TEST_ATTACHMENT_NAME }, supabase);
        results.push({
          action: 'removeAttachment',
          success: true,
          result,
          note: 'Ryan gets "file removed" notification',
        });
      } catch (error) {
        results.push({
          action: 'removeAttachment',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Test 8: Create subtask (COMMENTED OUT AS REQUESTED)
      // Expected: Parent task assignees get notification about new subtask
      /*
      try {
        const result = await handleCreateSubtask({
          parentTaskId: 2,
          title: 'Test Subtask for Notification Testing',
          description: 'This is a subtask created to test notifications'
        }, supabase);
        results.push({ action: 'makeSubtask', success: true, result, note: 'Parent task assignees get subtask notification' });
      } catch (error) {
        results.push({ action: 'makeSubtask', success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
      */

      return NextResponse.json({
        success: true,
        message:
          'All notification tests completed in sequence! Check Ryan and Joel screens for notifications. Flow: 1) Assign Joel → 2) Multiple single updates → 3) Add tag → 4) Remove tag → 5) Batch update → 6) Remove Joel → 7) Add attachment → 8) Re-assign Joel → 9) Remove attachment (subtask creation pending teammate)',
        user: user.email,
        results,
        testFlow: [
          '1. Task Assignment: Kester assigns Joel → Ryan & Joel get notifications',
          '2. Single Updates: 5 separate field changes → 5 separate notifications',
          '3. Tag Addition: Tag ID 5 added → Ryan gets "tag added" notification',
          '4. Tag Removal: Tag ID 5 removed → Ryan gets "tag removed" notification',
          '5. Batch Update: Multiple fields reset → 1 notification listing all changes',
          '6. Team Removal: Joel removed → Joel & Ryan get removal notifications',
          '7. File Attachment: File added → Ryan gets attachment notification',
          '8. Re-assignment: Joel added back → Ryan & Joel get notifications again',
          '9. File Removal: File removed → Ryan gets removal notification',
          '10. Subtask Creation: (Pending teammate) Will create subtask notification when ready',
        ],
      });
    }

    // If action is specified, run that specific test
    switch (action) {
      case 'assignJoel':
        return handleAction(async () => {
          console.log('Attempting to assign Joel to task...');
          const result = await handleTaskAssignment(TEST_USERS.JOEL, supabase);
          console.log('Assignment result:', result);
          return { action: 'assignJoel', result, message: 'Joel assigned successfully!' };
        });

      case 'comment':
        return handleAction(async () => {
          const result = await handleComment(
            { taskId: TEST_TASK_ID, content: content || 'Test comment from query parameter' },
            supabase
          );
          return { action: 'comment', result, message: 'Comment added successfully!' };
        });

      case 'singleUpdate':
        return handleAction(async () => {
          const result = await handleTaskUpdate(
            { taskId: TEST_TASK_ID, updates: { status: 'In Progress' } },
            supabase
          );
          return { action: 'singleUpdate', result, message: 'Single field update completed!' };
        });

      case 'batchUpdate':
        return handleAction(async () => {
          const result = await handleTaskUpdate(
            { taskId: TEST_TASK_ID, updates: TASK_ORIGINAL_STATE },
            supabase
          );
          return {
            action: 'batchUpdate',
            result,
            message: 'Batch update completed - all fields reset to original state!',
          };
        });

      case 'removeAssignment':
        return handleAction(async () => {
          const result = await handleTaskAssignmentRemoval(TEST_USERS.RYAN, supabase);
          return { action: 'removeAssignment', result, message: 'Assignment removal completed!' };
        });

      case 'addAttachment':
        return handleAction(async () => {
          const result = await handleTaskAttachment(
            { fileName: content || TEST_ATTACHMENT_NAME },
            supabase
          );
          return { action: 'addAttachment', result, message: 'File attachment added!' };
        });

      case 'removeAttachment':
        return handleAction(async () => {
          const result = await handleTaskAttachmentRemoval(
            { fileName: content || TEST_ATTACHMENT_NAME },
            supabase
          );
          return { action: 'removeAttachment', result, message: 'File attachment removed!' };
        });

      case 'singleUpdates':
        return handleAction(async () => {
          const results = [];
          for (let i = 0; i < SINGLE_UPDATES.length; i++) {
            const update = SINGLE_UPDATES[i];
            try {
              const result = await handleTaskUpdate(
                { taskId: TEST_TASK_ID, updates: { [update.field]: update.value } },
                supabase
              );
              results.push({ update: update.description, success: true, result });
              await new Promise((resolve) => setTimeout(resolve, 500));
            } catch (error) {
              results.push({
                update: update.description,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
              });
            }
          }
          return { action: 'singleUpdates', results, message: 'All single field updates completed!' };
        });

      case 'removeJoel':
        return handleAction(async () => {
          const result = await handleTaskAssignmentRemoval(TEST_USERS.JOEL, supabase);
          return { action: 'removeJoel', result, message: 'Joel removed from task - check for notifications!' };
        });

      case 'reassignJoel':
        return handleAction(async () => {
          const result = await handleTaskAssignment(TEST_USERS.JOEL, supabase);
          return {
            action: 'reassignJoel',
            result,
            message: 'Joel reassigned to task - check for notifications!',
          };
        });

      case 'addTag':
        return handleAction(async () => {
          const result = await handleTagAddition({ tagId: 5 }, supabase);
          return { action: 'addTag', result, message: 'Tag added successfully!' };
        });

      case 'removeTag':
        return handleAction(async () => {
          const result = await handleTagRemoval({ tagId: 5 }, supabase);
          return { action: 'removeTag', result, message: 'Tag removed successfully!' };
        });

      // Subtask creation commented out for now
      /*
      case 'makeSubtask':
        try {
          const result = await handleCreateSubtask({
            parentTaskId: 2,
            title: 'Test Subtask for Notification Testing',
            description: 'This is a subtask created to test notifications'
          }, supabase);
          return NextResponse.json({
            success: true,
            action: 'makeSubtask',
            result,
            message: 'New subtask created - parent task assignees should get notifications!'
          });
        } catch (error) {
          return NextResponse.json({
            success: false,
            action: 'makeSubtask',
            error: error instanceof Error ? error.message : 'Unknown error'
          }, { status: 500 });
        }
      */

      default:
        return NextResponse.json(
          {
            error: `Unknown action: ${action}. Available actions: assignJoel, comment, singleUpdate, batchUpdate, removeAssignment, addAttachment, removeAttachment, singleUpdates, batchUpdate, removeJoel, reassignJoel, addTag, removeTag`,
          },
          { status: 400 }
        );
    }
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

export async function POST(req: NextRequest) {
  const { action, ...params } = await req.json();
  const supabase = await createClient();

  return handleAction(async () => {
    let result;

    switch (action) {
      case 'assignJoel':
        result = await handleTaskAssignment(TEST_USERS.JOEL, supabase);
        break;

      case 'comment':
        result = await handleComment(
          { taskId: TEST_TASK_ID, content: params.content || 'Test comment from Kester' },
          supabase
        );
        break;

      case 'singleUpdate':
        result = await handleTaskUpdate(
          { taskId: TEST_TASK_ID, updates: params.updates || { status: 'In Progress' } },
          supabase
        );
        break;

      case 'batchUpdate':
        result = await handleTaskUpdate({ taskId: TEST_TASK_ID, updates: TASK_ORIGINAL_STATE }, supabase);
        break;

      case 'removeAssignment':
        result = await handleTaskAssignmentRemoval(
          {
            id: params.assigneeId || TEST_USERS.RYAN.id,
            name: params.assigneeName || TEST_USERS.RYAN.name,
          },
          supabase
        );
        break;

      case 'addAttachment':
        result = await handleTaskAttachment(
          { fileName: params.fileName || TEST_ATTACHMENT_NAME },
          supabase
        );
        break;

      case 'removeAttachment':
        result = await handleTaskAttachmentRemoval(
          { fileName: params.fileName || TEST_ATTACHMENT_NAME },
          supabase
        );
        break;

      case 'addTag':
        result = await handleTagAddition({ tagId: params.tagId || 5 }, supabase);
        break;

      case 'removeTag':
        result = await handleTagRemoval({ tagId: params.tagId || 5 }, supabase);
        break;

      case 'taskAssignment':
      case 'bulkTaskUpdate':
        result = await handleBulkTaskUpdate(params, supabase);
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return { action, result, message: `${action} completed - check notifications!` };
  });
}

// Handle task assignment notification (assign new user to existing task)
async function handleTaskAssignment({ id, name }: { id: string; name: string }, supabase: any) {
  console.log('handleTaskAssignment called with:', { id, name });

  // Get current user (Kester) as assignor
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  console.log('Auth result:', { user: user?.id, email: user?.email, authError });

  if (authError || !user) {
    console.error('Auth error:', authError);
    throw new Error('Unauthorized');
  }

  const assignorId = user.id;
  console.log('Assignor ID:', assignorId);

  // No notifications for self-assignment
  if (id === assignorId) {
    console.log('Self-assignment detected');
    return { message: 'Self-assignment - no notification needed' };
  }

  console.log('Checking if already assigned...');

  // Check if already assigned to prevent duplicates
  const { data: existingAssignment, error: checkError } = await supabase
    .from('task_assignments')
    .select('*')
    .eq('task_id', TEST_TASK_ID)
    .eq('assignee_id', id)
    .single();

  if (checkError && checkError.code !== 'PGRST116') {
    console.error('Error checking existing assignment:', checkError);
    throw checkError;
  }

  if (existingAssignment) {
    console.log('User already assigned to this task');
    return { message: `${name} is already assigned to this task` };
  }

  console.log('Creating assignment...');

  // Create the assignment first (Database trigger will create notification)
  const { data: assignment, error: assignError } = await supabase
    .from('task_assignments')
    .insert({
      task_id: TEST_TASK_ID,
      assignee_id: id,
      assignor_id: assignorId,
    })
    .select()
    .single();

  console.log('Assignment result:', { assignment, assignError });

  if (assignError) {
    console.error('Assignment error:', assignError);
    if (assignError.code === '23505') {
      return { message: `${name} is already assigned to this task` };
    }
    throw assignError;
  }

  return {
    success: true,
    message: `Successfully assigned ${name} to task ID ${TEST_TASK_ID}`,
    assignment,
    note: 'Database trigger created notification automatically',
  };
}

// Handle comment notification
async function handleComment({ taskId, content }: any, supabase: any) {
  // Get current user as commenter
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Unauthorized');
  }

  const commenterId = user.id;

  // Create the comment (Database trigger will create notifications)
  const { data: comment, error: commentError } = await supabase
    .from('task_comments')
    .insert({
      task_id: taskId,
      user_id: commenterId,
      content: content || 'Test comment from API',
    })
    .select()
    .single();

  if (commentError) throw commentError;
  if (!comment) throw new Error('Comment creation failed');

  return {
    success: true,
    message: `Comment added to task ID ${taskId}`,
    comment,
    note: 'Database trigger created notifications for all assignees',
  };
}

// Handle task update notification
async function handleTaskUpdate({ taskId, updates }: any, supabase: any) {
  // Get current user as updater
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Unauthorized');
  }

  console.log('Task update attempt:', { userId: user.id, email: user.email, taskId, updates });

  // Get task state before update for comparison
  const { data: taskBeforeUpdate } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .single();

  if (!taskBeforeUpdate) {
    throw new Error('Task not found');
  }

  // Filter updates to only include fields that actually changed
  const actualChanges: any = {};
  const changedFields: string[] = [];

  for (const [field, newValue] of Object.entries(updates)) {
    const oldValue = taskBeforeUpdate[field];

    // Handle type conversion for comparison (e.g., string vs number)
    const normalizedOld = oldValue?.toString();
    const normalizedNew = newValue?.toString();

    if (normalizedOld !== normalizedNew) {
      actualChanges[field] = newValue;
      changedFields.push(field);
      console.log(`Field "${field}" changed: "${oldValue}" → "${newValue}"`);
    } else {
      console.log(`Field "${field}" unchanged: "${oldValue}"`);
    }
  }

  if (changedFields.length === 0) {
    console.log('No actual changes detected - skipping update and notifications');
    return {
      success: true,
      message: `Task ID ${taskId} - no changes needed`,
      updatedTask: taskBeforeUpdate,
      notificationsCreated: 0,
      note: 'No actual changes detected',
    };
  }

  console.log('Actual changes to update:', actualChanges);

  // Update only the changed fields
  const { data: updatedTask, error: updateError } = await supabase
    .from('tasks')
    .update(actualChanges)
    .eq('id', taskId)
    .select()
    .single();

  console.log('Task update result:', { updatedTask, updateError });

  if (updateError) {
    console.error('Task update failed:', updateError);
    throw updateError;
  }
  if (!updatedTask) throw new Error('Task update failed');

  // Database trigger will handle notifications automatically
  console.log('DB: Database trigger will handle notifications automatically');

  // Get final notification count
  const { data: finalNotifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('type', 'task_updated')
    .order('created_at', { ascending: false })
    .limit(5);

  // Return detailed debugging info
  return {
    success: true,
    message: `Task ID ${taskId} updated with ${changedFields.length} changes`,
    updatedTask,
    notificationsCreated: finalNotifications?.length || 0,
    recentNotifications: finalNotifications,
    debugInfo: {
      updaterId: user.id,
      taskId: taskId,
      changedFields,
      actualChanges,
      oldTaskTitle: taskBeforeUpdate?.title,
      newTaskTitle: updatedTask?.title,
    },
    note: `Updated ${changedFields.length} field(s): ${changedFields.join(', ')}`,
  };
}

// Handle bulk task updates (multiple scenarios)
async function handleBulkTaskUpdate({ scenarios }: any, supabase: any) {
  const results = [];

  for (const scenario of scenarios) {
    try {
      const result = await handleTaskUpdate(scenario, supabase);
      results.push({ scenario: scenario.name, success: true, result });
    } catch (error) {
      results.push({
        scenario: scenario.name,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return { results, totalScenarios: scenarios.length };
}

// Handle task assignment removal notification (remove user from task)
async function handleTaskAssignmentRemoval({ id, name }: { id: string; name: string }, supabase: any) {
  console.log('handleTaskAssignmentRemoval called with:', { id, name });

  // Get current user (Kester) as remover
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Unauthorized');
  }

  const removerId = user.id;

  // Don't remove yourself
  if (id === removerId) {
    return { message: 'Cannot remove yourself from task' };
  }

  // Find and remove the assignment
  const { data: assignment, error: removeError } = await supabase
    .from('task_assignments')
    .delete()
    .eq('task_id', TEST_TASK_ID)
    .eq('assignee_id', id)
    .select()
    .single();

  if (removeError) throw removeError;
  if (!assignment) {
    return { message: `${name} is not assigned to this task` };
  }

  return {
    success: true,
    message: `Successfully removed ${name} from task ID ${TEST_TASK_ID}`,
    assignment,
    note: 'Database trigger created removal notifications automatically',
  };
}

// Handle task attachment notification (add file to task)
async function handleTaskAttachment({ fileName }: any, supabase: any) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Unauthorized');
  }

  const storagePath = `task-attachments/${fileName}`;

  // Create the attachment (Database trigger will create notifications)
  const { data: attachment, error: attachError } = await supabase
    .from('task_attachments')
    .insert({
      task_id: TEST_TASK_ID,
      storage_path: storagePath,
      uploaded_by: user.id,
    })
    .select()
    .single();

  if (attachError) throw attachError;
  if (!attachment) throw new Error('Attachment creation failed');

  return {
    success: true,
    message: `File "${fileName}" added to task ID ${TEST_TASK_ID}`,
    attachment,
    note: 'Database trigger created notifications for all assignees',
  };
}

// Handle task attachment removal notification (remove file from task)
async function handleTaskAttachmentRemoval({ fileName }: any, supabase: any) {
  const storagePath = `task-attachments/${fileName}`;

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Unauthorized');
  }

  // Find and remove the attachment
  const { data: attachment, error: removeError } = await supabase
    .from('task_attachments')
    .delete()
    .eq('task_id', TEST_TASK_ID)
    .eq('storage_path', storagePath)
    .select()
    .single();

  if (removeError) throw removeError;
  if (!attachment) {
    return { message: `File "${fileName}" not found on task ID ${TEST_TASK_ID}` };
  }

  return {
    success: true,
    message: `File "${fileName}" removed from task ID ${TEST_TASK_ID}`,
    attachment,
    note: 'Database trigger created removal notifications automatically',
  };
}

// Subtask functionality will be added when teammate finalizes the process
// TODO: Add handleMakeSubtask function for making existing tasks into subtasks

// Helper function to ensure task 2 has correct initial state (Kester and Ryan as assignees)
async function ensureInitialTaskState(supabase: any) {
  console.log('Ensuring task 2 has correct initial state...');

  // Remove Joel if he's already assigned
  await supabase
    .from('task_assignments')
    .delete()
    .eq('task_id', TEST_TASK_ID)
    .eq('assignee_id', TEST_USERS.JOEL.id);

  // Ensure Kester is assigned
  const { data: kesterAssignment } = await supabase
    .from('task_assignments')
    .select('*')
    .eq('task_id', TEST_TASK_ID)
    .eq('assignee_id', TEST_USERS.KESTER.id)
    .single();

  if (!kesterAssignment) {
    console.log('Assigning Kester to task 2...');
    await supabase.from('task_assignments').insert({
      task_id: TEST_TASK_ID,
      assignee_id: TEST_USERS.KESTER.id,
      assignor_id: TEST_USERS.KESTER.id, // Self-assignment for initial setup
    });
  } else {
    console.log('Kester already assigned to task 2');
  }

  // Ensure Ryan is assigned
  const { data: ryanAssignment } = await supabase
    .from('task_assignments')
    .select('*')
    .eq('task_id', TEST_TASK_ID)
    .eq('assignee_id', TEST_USERS.RYAN.id)
    .single();

  if (!ryanAssignment) {
    console.log('Assigning Ryan to task 2...');
    await supabase.from('task_assignments').insert({
      task_id: TEST_TASK_ID,
      assignee_id: TEST_USERS.RYAN.id,
      assignor_id: TEST_USERS.KESTER.id,
    });
  } else {
    console.log('Ryan already assigned to task 2');
  }

  // Check final assignment state
  const { data: finalAssignments } = await supabase
    .from('task_assignments')
    .select('assignee_id, user_info!inner(first_name, last_name, email)')
    .eq('task_id', TEST_TASK_ID);

  console.log('Final task 2 assignments:', finalAssignments);

  console.log('Task 2 initial state ensured: Kester and Ryan as assignees, Joel removed');
}

// Subtask functionality will be added when teammate finalizes the process
// TODO: Add handleCreateSubtask and makeSubtask actions when ready

// Handle tag addition notification
async function handleTagAddition({ tagId }: { tagId: number }, supabase: any) {
  console.log('handleTagAddition called with:', { tagId });

  // Get current user (Kester) as tag adder
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Unauthorized');
  }

  // Check if tag is already associated with this task
  const { data: existingTag } = await supabase
    .from('task_tags')
    .select('*')
    .eq('task_id', TEST_TASK_ID)
    .eq('tag_id', tagId)
    .maybeSingle();

  if (existingTag) {
    console.log('Tag already associated with task');
    return { message: `Tag ID ${tagId} is already associated with task ID ${TEST_TASK_ID}` };
  }

  // Add tag to task (Database trigger will create notification)
  const { data: taskTag, error: addError } = await supabase
    .from('task_tags')
    .insert({
      task_id: TEST_TASK_ID,
      tag_id: tagId,
    })
    .select(`
      *,
      tags!inner(name)
    `)
    .single();

  if (addError) throw addError;
  if (!taskTag) throw new Error('Tag addition failed');

  return {
    success: true,
    message: `Tag "${taskTag.tags.name}" (ID: ${tagId}) added to task ID ${TEST_TASK_ID}`,
    tagId,
    tagName: taskTag.tags.name,
    taskTag,
    note: 'Database trigger created notification automatically',
  };
}

// Handle tag removal notification
async function handleTagRemoval({ tagId }: { tagId: number }, supabase: any) {
  console.log('handleTagRemoval called with:', { tagId });

  // Get current user (Kester) as tag remover
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Unauthorized');
  }

  // Get tag info before removal
  const { data: tagInfo } = await supabase
    .from('task_tags')
    .select(`
      *,
      tags!inner(name)
    `)
    .eq('task_id', TEST_TASK_ID)
    .eq('tag_id', tagId)
    .single();

  if (!tagInfo) {
    return { message: `Tag ID ${tagId} is not associated with task ID ${TEST_TASK_ID}` };
  }

  // Remove tag from task (Database trigger will create notification)
  const { data: removedTag, error: removeError } = await supabase
    .from('task_tags')
    .delete()
    .eq('task_id', TEST_TASK_ID)
    .eq('tag_id', tagId)
    .select(`
      *,
      tags!inner(name)
    `)
    .single();

  if (removeError) throw removeError;
  if (!removedTag) throw new Error('Tag removal failed');

  return {
    success: true,
    message: `Tag "${tagInfo.tags.name}" (ID: ${tagId}) removed from task ID ${TEST_TASK_ID}`,
    tagId,
    tagName: tagInfo.tags.name,
    removedTag,
    note: 'Database trigger created removal notification automatically',
  };
}
