'use client';

import type React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { Check, Edit2, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';

interface Comment {
  id: number;
  content: string;
  created_at: string;
  updated_at?: string;
  user_id: string;
  user_info?: {
    first_name: string;
    last_name: string;
  };
}

interface TaskCommentsProps {
  taskId: number;
  comments: Comment[];
  currentUserId: string;
  isAdmin: boolean;
  readOnly?: boolean;
}

export function TaskComments({
  taskId,
  comments: initialComments,
  currentUserId,
  isAdmin,
  readOnly = false,
}: TaskCommentsProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showCommentInput, setShowCommentInput] = useState(false);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'addComment',
          content: newComment,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to add comment');
      }

      const data = await res.json();
      const updatedComments = [
        ...comments,
        {
          ...data.comment,
          user_info: {
            first_name: 'You',
            last_name: '',
          },
        },
      ];
      setComments(updatedComments);
      setNewComment('');
      setShowCommentInput(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditStart = (comment: Comment) => {
    setEditingId(comment.id);
    setEditContent(comment.content);
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditContent('');
  };

  const handleSaveEdit = async (commentId: number) => {
    setError(null);
    setIsSavingEdit(true);

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'updateComment',
          commentId,
          content: editContent,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update comment');
      }

      const data = await res.json();
      const updatedComments = comments.map((c) =>
        c.id === commentId
          ? {
              ...c,
              content: data.comment.content,
              updated_at: data.comment.updated_at,
            }
          : c
      );
      setComments(updatedComments);
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update comment');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    setError(null);
    setDeletingId(commentId);

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'deleteComment',
          commentId,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete comment');
      }

      const updatedComments = comments.filter((c) => c.id !== commentId);
      setComments(updatedComments);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete comment');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-problem/20 bg-problem-soft p-3 text-sm text-problem"
        >
          {error}
        </div>
      )}

      {!readOnly && !showCommentInput && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowCommentInput(true)}
          className="w-fit"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Comment
        </Button>
      )}

      {!readOnly && showCommentInput && (
        <form onSubmit={handleAddComment} className="space-y-3 rounded-xl border bg-muted/20 p-4">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            maxLength={5000}
            rows={3}
            disabled={isSubmitting}
            autoFocus
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] text-muted-foreground">{newComment.length}/5000</span>
            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={isSubmitting || newComment.trim().length === 0}
                size="sm"
              >
                {isSubmitting ? 'Posting...' : 'Post Comment'}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowCommentInput(false);
                  setNewComment('');
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* Comments List */}
      <div className="space-y-0">
        {comments.length === 0 ? (
          <p className="text-xs text-muted-foreground">No discussion yet.</p>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className="relative space-y-2 border-b border-border/60 py-4 pl-11 last:border-0 last:pb-0"
            >
              <span
                aria-hidden="true"
                className="absolute left-0 top-4 flex size-8 items-center justify-center rounded-full border bg-muted/50 text-[10px] font-medium text-muted-foreground"
              >
                {`${comment.user_info?.first_name?.[0] || ''}${comment.user_info?.last_name?.[0] || ''}` ||
                  '?'}
              </span>
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">
                    {comment.user_id === currentUserId
                      ? 'You'
                      : `${comment.user_info?.first_name || ''} ${comment.user_info?.last_name || ''}`.trim() ||
                        'Unknown user'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground">
                    {format(new Date(comment.created_at), 'MMM d, yyyy HH:mm')}
                  </span>
                  {comment.updated_at && (
                    <span className="text-[10px] text-muted-foreground">(edited)</span>
                  )}
                </div>
              </div>

              {/* Comment Content */}
              {editingId === comment.id ? (
                <div className="space-y-2">
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    maxLength={5000}
                    rows={3}
                    disabled={isSavingEdit}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleSaveEdit(comment.id)}
                      disabled={isSavingEdit || editContent.trim().length === 0}
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleEditCancel}
                      disabled={isSavingEdit}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/85">
                  {comment.content}
                </p>
              )}

              {/* Actions */}
              {!readOnly && editingId !== comment.id && (
                <div className="flex gap-2 pt-2">
                  {comment.user_id === currentUserId && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEditStart(comment)}
                      className="h-7 px-2 text-xs text-muted-foreground hover:bg-positive-soft hover:text-positive"
                      disabled={isSavingEdit || deletingId === comment.id}
                    >
                      <Edit2 className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  )}
                  {isAdmin && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteComment(comment.id)}
                      className="h-7 px-2 text-xs text-muted-foreground hover:bg-problem-soft hover:text-problem"
                      disabled={deletingId === comment.id}
                    >
                      {deletingId === comment.id ? (
                        <span className="text-xs">Deleting...</span>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
