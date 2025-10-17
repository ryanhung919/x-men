import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Test Notifications API Endpoint
 *
 * PURPOSE:
 * Test in-app notification system for task assignments, comments, and updates.
 *
 * SETUP:
 * 1. Log in as Kester (kester.yeo.2024@computing.smu.edu.sg) - RUNS THE TESTS
 * 2. Log in as Ryan (ryan.hung.2023@scis.smu.edu.sg) - RECEIVES NOTIFICATIONS
 * 3. Log in as Joel (joel.wang.03@gmail.com) - RECEIVES NOTIFICATIONS
 *
 * SCENARIO:
 * - Task ID 2: "Implement task board drag/drop" (Engineering Operations project)
 * - Current Assignees: Ryan (Finance Director) + Mitch (Finance Director)
 * - Test: Kester assigns Joel to Task ID 2, then comments and updates the task
 *
 * EXPECTED NOTIFICATIONS:
 * - Ryan & Joel receive task assignment notifications
 * - Ryan & Joel receive comment notifications when Kester comments
 * - Ryan & Joel receive task update notifications when Kester updates the task
 *
 * USAGE:
 * - Run all tests: GET /api/test-notifications
 * - Individual tests: GET /api/test-notifications?action={assignJoel|comment|singleUpdate|batchUpdate}
 * - Custom comment: GET /api/test-notifications?action=comment&content=Your message
 */

// GET endpoint - supports query parameters, runs all if none provided
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized - Please login first' }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url || '');
    const action = searchParams.get('action');
    const content = searchParams.get('content');

    const results = [];

    // If no action specified, run all tests
    if (!action) {
      // Test 1: Assign Joel (not already assigned to Task ID 2)
      try {
        const result = await handleTaskAssignment({
          assigneeId: '8d7a0c21-17ba-40f3-9e6d-dac4ae3cbe2a', // Joel (SMU)
          assigneeName: 'Joel'
        }, supabase);
        results.push({ action: 'assignJoel', success: true, result });
      } catch (error) {
        results.push({ action: 'assignJoel', success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }

      // Wait a moment between actions
      await new Promise(resolve => setTimeout(resolve, 500));

      // Test 2: Add comment
      try {
        const result = await handleComment({
          taskId: 2,
          content: "Automated test comment - running all notification scenarios"
        }, supabase);
        results.push({ action: 'comment', success: true, result });
      } catch (error) {
        results.push({ action: 'comment', success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }

      // Wait a moment between actions
      await new Promise(resolve => setTimeout(resolve, 500));

      // Test 3: Single field update
      try {
        const result = await handleTaskUpdate({
          taskId: 2,
          updates: { status: 'In Progress' }
        }, supabase);
        results.push({ action: 'singleUpdate', success: true, result });
      } catch (error) {
        results.push({ action: 'singleUpdate', success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }

      // Wait a moment between actions
      await new Promise(resolve => setTimeout(resolve, 500));

      // Test 4: Multiple field update
      try {
        const result = await handleTaskUpdate({
          taskId: 2,
          updates: {
            status: 'Completed',
            priority_bucket: 9,
            notes: 'Automated test: Multiple fields updated at once'
          }
        }, supabase);
        results.push({ action: 'batchUpdate', success: true, result });
      } catch (error) {
        results.push({ action: 'batchUpdate', success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }

      return NextResponse.json({
        success: true,
        message: 'All notification tests completed! Check Ryan & Joel screens for notifications. (Ryan: existing assignee, Joel: newly assigned)',
        user: user.email,
        results
      });
    }

    // If action is specified, run that specific test
    switch (action) {
      case 'assignJoel':
        try {
          console.log('Attempting to assign Joel to task...');
          const result = await handleTaskAssignment({
            assigneeId: '8d7a0c21-17ba-40f3-9e6d-dac4ae3cbe2a', // Joel (SMU)
            assigneeName: 'Joel'
          }, supabase);
          console.log('Assignment result:', result);
          return NextResponse.json({
            success: true,
            action: 'assignJoel',
            result,
            message: 'Joel assigned successfully!'
          });
        } catch (error) {
          console.error('Error assigning Joel:', error);
          return NextResponse.json({
            success: false,
            action: 'assignJoel',
            error: error instanceof Error ? error.message : 'Unknown error',
            details: String(error)
          }, { status: 500 });
        }

  
      case 'comment':
        try {
          const result = await handleComment({
            taskId: 2,
            content: content || "Test comment from query parameter"
          }, supabase);
          return NextResponse.json({
            success: true,
            action: 'comment',
            result,
            message: 'Comment added successfully!'
          });
        } catch (error) {
          return NextResponse.json({
            success: false,
            action: 'comment',
            error: error instanceof Error ? error.message : 'Unknown error'
          }, { status: 500 });
        }

      case 'singleUpdate':
        try {
          const result = await handleTaskUpdate({
            taskId: 2,
            updates: { status: 'In Progress' }
          }, supabase);
          return NextResponse.json({
            success: true,
            action: 'singleUpdate',
            result,
            message: 'Single field update completed!'
          });
        } catch (error) {
          return NextResponse.json({
            success: false,
            action: 'singleUpdate',
            error: error instanceof Error ? error.message : 'Unknown error'
          }, { status: 500 });
        }

      case 'batchUpdate':
        try {
          const result = await handleTaskUpdate({
            taskId: 2,
            updates: {
              status: 'Completed',
              priority_bucket: 8,
              notes: 'Query parameter test: Multiple fields updated'
            }
          }, supabase);
          return NextResponse.json({
            success: true,
            action: 'batchUpdate',
            result,
            message: 'Batch update completed!'
          });
        } catch (error) {
          return NextResponse.json({
            success: false,
            action: 'batchUpdate',
            error: error instanceof Error ? error.message : 'Unknown error'
          }, { status: 500 });
        }

      default:
        return NextResponse.json({
          error: `Unknown action: ${action}. Available actions: assignJoel, comment, singleUpdate, batchUpdate`
        }, { status: 400 });
    }

  } catch (error) {
    console.error('GET test notifications error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { action, ...params } = await req.json();
    const supabase = await createClient();

    let result;

    switch (action) {
      case 'assignJoel':
        result = await handleTaskAssignment({
          assigneeId: '8d7a0c21-17ba-40f3-9e6d-dac4ae3cbe2a', // Joel (SMU)
          assigneeName: 'Joel'
        }, supabase);
        break;

    
      case 'comment':
        result = await handleComment({
          taskId: 2, // Task ID 2 where Kester & Ryan are assigned
          content: params.content || "Test comment from Kester"
        }, supabase);
        break;

      case 'singleUpdate':
        result = await handleTaskUpdate({
          taskId: 2, // Task ID 2
          updates: params.updates || { status: 'In Progress' }
        }, supabase);
        break;

      case 'batchUpdate':
        result = await handleTaskUpdate({
          taskId: 2, // Task ID 2
          updates: params.updates || {
            status: 'Completed',
            priority_bucket: 8,
            notes: 'Updated with multiple changes'
          }
        }, supabase);
        break;

      case 'taskAssignment':
      case 'bulkTaskUpdate':
        result = await handleBulkTaskUpdate(params, supabase);
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return NextResponse.json({
      success: true,
      action,
      result,
      message: `${action} completed - check notifications!`
    });

  } catch (error) {
    console.error('Test notification error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Handle task assignment notification (assign new user to existing task)
async function handleTaskAssignment(
  { assigneeId, assigneeName }: any,
  supabase: any
) {
  console.log('handleTaskAssignment called with:', { assigneeId, assigneeName });

  // Fixed real data - Task ID 2: "Implement task board drag/drop"
  const taskId = 2;
  console.log('Task ID:', taskId);

  // Get current user (Kester) as assignor
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  console.log('Auth result:', { user: user?.id, email: user?.email, authError });

  if (authError || !user) {
    console.error('Auth error:', authError);
    throw new Error('Unauthorized');
  }

  const assignorId = user.id;
  console.log('Assignor ID:', assignorId);

  // No notifications for self-assignment
  if (assigneeId === assignorId) {
    console.log('Self-assignment detected');
    return { message: 'Self-assignment - no notification needed' };
  }

  console.log('Checking if already assigned...');

  // Check if already assigned to prevent duplicates
  const { data: existingAssignment, error: checkError } = await supabase
    .from('task_assignments')
    .select('*')
    .eq('task_id', taskId)
    .eq('assignee_id', assigneeId)
    .single();

  if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
    console.error('Error checking existing assignment:', checkError);
    throw checkError;
  }

  if (existingAssignment) {
    console.log('User already assigned to this task');
    return { message: `${assigneeName} is already assigned to this task` };
  }

  console.log('Creating assignment...');

  // Create the assignment first (Database trigger will create notification)
  const { data: assignment, error: assignError } = await supabase
    .from('task_assignments')
    .insert({
      task_id: taskId,
      assignee_id: assigneeId,
      assignor_id: assignorId,
    })
    .select()
    .single();

  console.log('Assignment result:', { assignment, assignError });

  if (assignError) {
    console.error('Assignment error:', assignError);
    if (assignError.code === '23505') { // Unique violation
      return { message: `${assigneeName} is already assigned to this task` };
    }
    throw assignError;
  }

  return {
    success: true,
    message: `Successfully assigned ${assigneeName} to task ID ${taskId}`,
    assignment,
    note: "Database trigger created notification automatically"
  };
}

// Handle comment notification
async function handleComment(
  { taskId, content }: any,
  supabase: any
) {
  // Get current user as commenter
  const { data: { user }, error: authError } = await supabase.auth.getUser();
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
    note: "Database trigger created notifications for all assignees"
  };
}

// Handle task update notification
async function handleTaskUpdate(
  { taskId, updates }: any,
  supabase: any
) {
  // Get current user as updater (Database trigger will use auth.uid())
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Unauthorized');
  }

  // Update the task (Database trigger will create notifications automatically)
  const { data: updatedTask, error: updateError } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', taskId)
    .select()
    .single();

  if (updateError) throw updateError;
  if (!updatedTask) throw new Error('Task update failed');

  return {
    success: true,
    message: `Task ID ${taskId} updated`,
    updatedTask,
    note: "Database trigger created notifications for all assignees"
  };
}

// Handle bulk task updates (multiple scenarios)
async function handleBulkTaskUpdate(
  { scenarios }: any,
  supabase: any
) {
  const results = [];

  for (const scenario of scenarios) {
    try {
      const result = await handleTaskUpdate(scenario, supabase);
      results.push({ scenario: scenario.name, success: true, result });
    } catch (error) {
      results.push({ scenario: scenario.name, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  return { results, totalScenarios: scenarios.length };
}