"use client"

import { useEffect, useRef, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Pencil } from "lucide-react"

interface EditablePriorityProps {
  taskId: number
  initialPriority: number
  onPriorityUpdate?: (newPriority: number) => void
}

export function EditablePriority({ taskId, initialPriority, onPriorityUpdate }: EditablePriorityProps) {
  const [priority, setPriority] = useState(initialPriority)
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

  const handlePriorityChange = async (newPriority: string) => {
    const priorityValue = Number(newPriority)

    if (priorityValue === priority) {
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
          action: "updatePriority",
          priority_bucket: priorityValue,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to update priority")
      }

      setPriority(priorityValue)
      onPriorityUpdate?.(priorityValue)
      setIsEditing(false)
    } catch (err) {
      console.error("Failed to update priority:", err)
      setPriority(priority)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-sm px-3 py-1">
          Priority {priority}
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
        value={String(priority)}
        onValueChange={handlePriorityChange}
        disabled={isLoading}
        open={isEditing}
        onOpenChange={setIsEditing}
      >
        <SelectTrigger className="w-full max-w-[120px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
            <SelectItem key={num} value={String(num)}>
              Priority {num}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
