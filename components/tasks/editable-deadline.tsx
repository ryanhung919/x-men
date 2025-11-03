"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Check, X, Calendar } from "lucide-react"
import { useState } from "react"
import { formatDateToSGT } from "@/lib/utils/timezone"

interface EditableDeadlineProps {
  taskId: number
  initialDeadline: string | null
}

export function EditableDeadline({ taskId, initialDeadline }: EditableDeadlineProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [displayDeadline, setDisplayDeadline] = useState(initialDeadline)
  const [deadline, setDeadline] = useState(initialDeadline ? convertUTCtoLocalInput(initialDeadline) : "")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function convertUTCtoLocalInput(isoString: string): string {
    try {
      const date = new Date(isoString)
      if (isNaN(date.getTime())) return ""

      const sgtDate = new Date(date.getTime() + 16 * 60 * 60 * 1000)

      const year = sgtDate.getUTCFullYear()
      const month = String(sgtDate.getUTCMonth() + 1).padStart(2, "0")
      const day = String(sgtDate.getUTCDate()).padStart(2, "0")
      const hours = String(sgtDate.getUTCHours()).padStart(2, "0")
      const minutes = String(sgtDate.getUTCMinutes()).padStart(2, "0")

      return `${year}-${month}-${day}T${hours}:${minutes}`
    } catch (error) {
      console.error("Error converting date:", error)
      return ""
    }
  }

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
          action: "updateDeadline",
          deadline: deadline ? new Date(deadline).toISOString() : null,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to update deadline")
      }

      const data = await res.json()

      const newDeadline = data.deadline
      setDisplayDeadline(newDeadline)
      setDeadline(newDeadline ? convertUTCtoLocalInput(newDeadline) : "")

      setIsEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setDeadline(displayDeadline ? convertUTCtoLocalInput(displayDeadline) : "")
    setIsEditing(false)
    setError(null)
  }

  if (isEditing) {
    return (
      <div className="space-y-3">
        <Input
          type="datetime-local"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          disabled={isLoading}
          className="w-full max-w-[280px]"
        />
        {error && (
          <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950 p-3 rounded-md border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave} disabled={isLoading} className="bg-green-600 hover:bg-green-700">
            <Check className="w-4 h-4 mr-1" />
            {isLoading ? "Saving..." : "Save"}
          </Button>
          <Button size="sm" onClick={handleCancel} disabled={isLoading} variant="outline">
            <X className="w-4 h-4 mr-1" />
            Cancel
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Time zone: SGT (UTC+8)</p>
      </div>
    )
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className="cursor-pointer p-3 border border-transparent rounded-md hover:border-muted-foreground/25 hover:bg-muted/50 transition-all flex items-center gap-2"
    >
      <Calendar className="w-4 h-4 text-muted-foreground" />
      <p className="text-base">{displayDeadline ? formatDateToSGT(displayDeadline) : "No due date set"}</p>
    </div>
  )
}
