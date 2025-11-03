"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Check, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"

interface EditableNotesProps {
  taskId: number
  initialNotes: string | null
  onNotesUpdate?: (newNotes: string) => void
}

export function EditableNotes({ taskId, initialNotes, onNotesUpdate }: EditableNotesProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [notes, setNotes] = useState(initialNotes || "")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isEditing])

  const handleSave = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "updateNotes",
          notes: notes.trim(),
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to update notes")
      }

      setIsEditing(false)
      onNotesUpdate?.(notes.trim())
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setNotes(initialNotes || "")
    setIsEditing(false)
    setError(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.ctrlKey) {
      handleSave()
    } else if (e.key === "Escape") {
      handleCancel()
    }
  }

  if (isEditing) {
    return (
      <div>
        <Textarea
          ref={textareaRef}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add notes..."
          className="min-h-[120px] resize-none text-base mb-3"
          disabled={isLoading}
        />
        {error && (
          <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950 p-3 rounded-md border border-red-200 dark:border-red-800 mb-3">
            {error}
          </div>
        )}
        <div className="flex gap-2 mb-2">
          <Button size="sm" onClick={handleSave} disabled={isLoading} className="bg-green-600 hover:bg-green-700">
            <Check className="w-4 h-4 mr-1" />
            {isLoading ? "Saving..." : "Save"}
          </Button>
          <Button size="sm" onClick={handleCancel} disabled={isLoading} variant="outline">
            <X className="w-4 h-4 mr-1" />
            Cancel
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Press Ctrl+Enter to save, Esc to cancel</p>
      </div>
    )
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className="cursor-pointer p-3 border border-transparent rounded-md hover:border-muted-foreground/25 hover:bg-muted/50 transition-all min-h-[60px]"
    >
      {notes ? (
        <p className="text-base whitespace-pre-wrap">{notes}</p>
      ) : (
        <p className="text-base text-muted-foreground italic">Click to add notes...</p>
      )}
    </div>
  )
}
