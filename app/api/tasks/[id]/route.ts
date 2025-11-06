import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  updateTitle,
  updateDescription,
  updateStatus,
  updatePriority,
  updateDeadline,
  updateNotes,
  updateRecurrence,
  addAssignee,
  removeAssignee,
  addTag,
  removeTag,
  addTaskAttachments,
  removeTaskAttachment,
  addComment,
  updateComment,
  deleteComment,
  linkSubtaskToParent,
} from '@/lib/services/tasks';


export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }  
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params; 
    const taskId = parseInt(resolvedParams.id);
    if (isNaN(taskId)) {
      return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 });
    }

    // const { action, ...updates } = await req.json();

    // Check content type to handle both JSON and FormData
    const contentType = req.headers.get('content-type') || '';
    let action: string;
    let updates: any;

    if (contentType.includes('application/json')) {
      // Parse JSON body
      const body = await req.json();
      action = body.action;
      updates = body;
    } else if (contentType.includes('multipart/form-data')) {
      // Parse FormData body
      const formData = await req.formData();
      action = formData.get('action') as string;
      
      // Collect all form fields into updates object
      updates = { action };
      const files: File[] = [];
      
      for (const [key, value] of formData.entries()) {
        if (key.startsWith('file_')) {
          files.push(value as File);
        } else if (key !== 'action') {
          updates[key] = value;
        }
      }
      
      if (files.length > 0) {
        updates.files = files;
      }
    } else {
      return NextResponse.json({ error: 'Invalid content type' }, { status: 400 });
    }

    switch (action) {
      case 'updateTitle': {
        const { title } = updates;
        if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 });
        const result = await updateTitle(taskId, title, user.id);
        return NextResponse.json(result);
      }

      case 'updateDescription': {
        const { description } = updates;
        const result = await updateDescription(taskId, description, user.id);
        return NextResponse.json(result);
      }

      case 'updateStatus': {
        const { status } = updates;
        if (!status) return NextResponse.json({ error: 'Status required' }, { status: 400 });
        const result = await updateStatus(taskId, status, user.id);
        return NextResponse.json(result);
      }

      case 'updatePriority': {
        const { priority_bucket } = updates;
        if (priority_bucket === undefined) return NextResponse.json({ error: 'Priority required' }, { status: 400 });
        const result = await updatePriority(taskId, priority_bucket, user.id);
        return NextResponse.json(result);
      }

      case 'updateDeadline': {
        const { deadline } = updates;
        const result = await updateDeadline(taskId, deadline, user.id);
        return NextResponse.json(result);
      }

      case 'updateNotes': {
        const { notes } = updates;
        if (notes === undefined) return NextResponse.json({ error: 'Notes required' }, { status: 400 });
        const result = await updateNotes(taskId, notes, user.id);
        return NextResponse.json(result);
      }

      // ASSIGNEES
      case 'addAssignee': {
        const { assignee_id } = updates;
        if (!assignee_id || typeof assignee_id !== 'string') {
          return NextResponse.json({ error: 'Assignee ID required' }, { status: 400 });
        }
      
        const result = await addAssignee(taskId, assignee_id, user.id);
        return NextResponse.json({ success: true, assignee_id: result });
      }
      
      case 'removeAssignee': {
        const { assignee_id } = updates;
        if (!assignee_id || typeof assignee_id !== 'string') {
          return NextResponse.json({ error: 'Assignee ID required' }, { status: 400 });
        }
      
        const result = await removeAssignee(taskId, assignee_id, user.id);
        return NextResponse.json({ success: true, assignee_id: result });
      }
      
      // TAGS

      case 'addTag': {
        const { tag_name } = updates;
        if (!tag_name || typeof tag_name !== 'string') {
          return NextResponse.json({ error: 'Tag name required' }, { status: 400 });
        }

        const result = await addTag(taskId, tag_name, user.id);
        return NextResponse.json({ success: true, tag: result });
      }

      case 'removeTag': {
        const { tag_name } = updates;
        if (!tag_name || typeof tag_name !== 'string') {
          return NextResponse.json({ error: 'Tag name required' }, { status: 400 });
        }

        const result = await removeTag(taskId, tag_name, user.id);
        return NextResponse.json({ success: true, tag: result });
      }

      // ATTACHMENTS

      case 'addAttachments': {
        // Files are already in updates.files from parsing above
        const files = updates.files as File[];
        
        if (!files || files.length === 0) {
          return NextResponse.json({ error: 'No files provided' }, { status: 400 });
        }
      
        const result = await addTaskAttachments(taskId, files, user.id);
        return NextResponse.json({ 
          success: true, 
          attachments: result 
        });
      }
      
      case 'removeAttachment': {
        const { attachment_id } = updates;
        if (!attachment_id || typeof attachment_id !== 'number') {
          return NextResponse.json({ error: 'Attachment ID required' }, { status: 400 });
        }
      
        const result = await removeTaskAttachment(taskId, attachment_id, user.id);
        return NextResponse.json({ 
          success: true, 
          removed_path: result 
        });
      }

      // Recurrence 
      case 'updateRecurrence': {
        const { recurrenceInterval, recurrenceDate } = updates;
        
        if (recurrenceInterval === undefined || recurrenceInterval === null) {
          return NextResponse.json(
            { error: 'Recurrence interval required' },
            { status: 400 }
          );
        }
      
        if (typeof recurrenceInterval !== 'number') {
          return NextResponse.json(
            { error: 'Recurrence interval must be a number' },
            { status: 400 }
          );
        }
      
        try {
          const result = await updateRecurrence(
            taskId,
            recurrenceInterval,
            recurrenceDate || null,
            user.id
          );
          return NextResponse.json({
            success: true,
            recurrence: result,
          });
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to update recurrence';
          return NextResponse.json({ error: errorMessage }, { status: 400 });
        }
      }
      // Comments
      
      case 'addComment': {
        const { content } = updates;
        if (!content || typeof content !== 'string' || content.trim().length === 0) {
          return NextResponse.json({ error: 'Comment content required' }, { status: 400 });
        }
      
        try {
          const result = await addComment(taskId, content, user.id);
          return NextResponse.json({
            success: true,
            comment: result,
          });
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to add comment';
          return NextResponse.json({ error: errorMessage }, { status: 400 });
        }
      }
      
      case 'updateComment': {
        const { commentId, content } = updates;
        if (!commentId || typeof commentId !== 'number') {
          return NextResponse.json({ error: 'Comment ID required' }, { status: 400 });
        }
        if (!content || typeof content !== 'string' || content.trim().length === 0) {
          return NextResponse.json({ error: 'Comment content required' }, { status: 400 });
        }
      
        try {
          const result = await updateComment(commentId, content, user.id);
          return NextResponse.json({
            success: true,
            comment: result,
          });
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to update comment';
          return NextResponse.json({ error: errorMessage }, { status: 400 });
        }
      }
      
      case 'deleteComment': {
        const { commentId } = updates;
        if (!commentId || typeof commentId !== 'number') {
          return NextResponse.json({ error: 'Comment ID required' }, { status: 400 });
        }
      
        try {
          await deleteComment(commentId, user.id);
          return NextResponse.json({
            success: true,
            message: 'Comment deleted successfully',
          });
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to delete comment';
          return NextResponse.json({ error: errorMessage }, { status: 400 });
        }
      }
      // subtasks

      case 'linkSubtask': {
        const { subtaskId } = updates;
        if (!subtaskId || typeof subtaskId !== 'number') {
          return NextResponse.json(
            { error: 'Subtask ID required' },
            { status: 400 }
          );
        }
      
        try {
          await linkSubtaskToParent(subtaskId, taskId);
          return NextResponse.json({
            success: true,
            message: 'Subtask linked successfully',
          });
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to link subtask';
          return NextResponse.json({ error: errorMessage }, { status: 400 });
        }
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update task' },
      { status: 500 }
    );
  }
}