"use client"

import { useEffect, useRef, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Pencil } from "lucide-react"

interface EditableStatusProps {
  taskId: number
  initialStatus: "To Do" | "In Progress" | "Completed" | "Blocked"
  onStatusUpdate?: (newStatus: string) => void
}

export function EditableStatus({ taskId, initialStatus, onStatusUpdate }: EditableStatusProps) {
  const [status, setStatus] = useState(initialStatus)
  const [isLoading, setIsLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const selectRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsEditing(false)
      }
    }

    if (isEditing) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isEditing])

  const handleStatusChange = async (newStatus: string) => {
    const typedStatus = newStatus as "To Do" | "In Progress" | "Completed" | "Blocked"

    if (typedStatus === status) {
      setIsEditing(false)
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "updateStatus",
          status: typedStatus,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to update status")
      }

      setStatus(typedStatus)
      onStatusUpdate?.(typedStatus)
      setIsEditing(false)
    } catch (err) {
      console.error("Failed to update status:", err)
      setStatus(status)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-sm px-3 py-1">
          {status}
        </Badge>
        <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)} className="h-8 w-8 p-0">
          <Pencil className="w-3.5 h-3.5" />
        </Button>
      </div>
    )
  }

  return (
    <div ref={selectRef as any}>
      <Select
        value={status}
        onValueChange={handleStatusChange}
        disabled={isLoading}
        open={isEditing}
        onOpenChange={setIsEditing}
      >
        <SelectTrigger className="w-full max-w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="To Do">To Do</SelectItem>
          <SelectItem value="In Progress">In Progress</SelectItem>
          <SelectItem value="Completed">Completed</SelectItem>
          <SelectItem value="Blocked">Blocked</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
