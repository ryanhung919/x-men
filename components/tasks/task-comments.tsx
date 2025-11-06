"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { format } from "date-fns"
import { Check, Edit2, Plus, Trash2, X } from "lucide-react"
import { useState } from "react"

interface Comment {
  id: number
  content: string
  created_at: string
  updated_at?: string
  user_id: string
  user_info?: {
    first_name: string
    last_name: string
  }
}

interface TaskCommentsProps {
  taskId: number
  comments: Comment[]
  currentUserId: string
  isAdmin: boolean
}

export function TaskComments({ taskId, comments: initialComments, currentUserId, isAdmin }: TaskCommentsProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [newComment, setNewComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editContent, setEditContent] = useState("")
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [showCommentInput, setShowCommentInput] = useState(false)

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "addComment",
          content: newComment,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to add comment")
      }

      const data = await res.json()
      const updatedComments = [
        ...comments,
        {
          ...data.comment,
          user_info: {
            first_name: "You",
            last_name: "",
          },
        },
      ]
      setComments(updatedComments)
      setNewComment("")
      setShowCommentInput(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add comment")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditStart = (comment: Comment) => {
    setEditingId(comment.id)
    setEditContent(comment.content)
  }

  const handleEditCancel = () => {
    setEditingId(null)
    setEditContent("")
  }

  const handleSaveEdit = async (commentId: number) => {
    setError(null)
    setIsSavingEdit(true)

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "updateComment",
          commentId,
          content: editContent,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to update comment")
      }

      const data = await res.json()
      const updatedComments = comments.map((c) =>
        c.id === commentId
          ? {
              ...c,
              content: data.comment.content,
              updated_at: data.comment.updated_at,
            }
          : c,
      )
      setComments(updatedComments)
      setEditingId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update comment")
    } finally {
      setIsSavingEdit(false)
    }
  }

  const handleDeleteComment = async (commentId: number) => {
    setError(null)
    setDeletingId(commentId)

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "deleteComment",
          commentId,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to delete comment")
      }

      const updatedComments = comments.filter((c) => c.id !== commentId)
      setComments(updatedComments)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete comment")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-4">
      {error && <div className="p-3 bg-red-100 text-red-800 rounded-md text-sm border border-red-200">{error}</div>}

      {!showCommentInput && (
        <Button size="sm" variant="outline" onClick={() => setShowCommentInput(true)} className="w-fit">
          <Plus className="w-4 h-4 mr-2" />
          Add Comment
        </Button>
      )}

      {showCommentInput && (
        <form onSubmit={handleAddComment} className="space-y-2 bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            maxLength={5000}
            rows={3}
            disabled={isSubmitting}
            autoFocus
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">{newComment.length}/5000</span>
            <div className="flex gap-2">
              <Button type="submit" disabled={isSubmitting || newComment.trim().length === 0} size="sm">
                {isSubmitting ? "Posting..." : "Post Comment"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowCommentInput(false)
                  setNewComment("")
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
      <div className="space-y-3">
        {comments.length === 0 ? (
          <p className="text-sm text-gray-500">No comments yet. Be the first to comment!</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="border rounded-lg p-4 bg-white dark:bg-gray-800 space-y-2">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">
                    {comment.user_id === currentUserId
                      ? "You"
                      : `${comment.user_info?.first_name} ${comment.user_info?.last_name}`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {format(new Date(comment.created_at), "MMM d, yyyy HH:mm")}
                  </span>
                  {comment.updated_at && <span className="text-xs text-gray-400">(edited)</span>}
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
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleEditCancel} disabled={isSavingEdit}>
                      <X className="w-4 h-4 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm whitespace-pre-wrap break-words">{comment.content}</p>
              )}

              {/* Actions */}
              {editingId !== comment.id && (
                <div className="flex gap-2 pt-2">
                  {comment.user_id === currentUserId && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEditStart(comment)}
                      className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950"
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
                      className="text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-950"
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
  )
}
