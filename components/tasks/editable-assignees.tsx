"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, X, Users } from "lucide-react"
import { useState } from "react"

interface EditableAssigneesProps {
  taskId: number
  initialAssignees: { id: string; first_name: string; last_name: string }[]
  allUsers: { id: string; first_name: string; last_name: string }[]
  isManager: boolean
  onAssigneesUpdate?: (newAssignees: string[]) => void
}

export function EditableAssignees({
  taskId,
  initialAssignees,
  allUsers,
  isManager,
  onAssigneesUpdate,
}: EditableAssigneesProps) {
  const [assignees, setAssignees] = useState(initialAssignees)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [showAddDropdown, setShowAddDropdown] = useState(false)

  // Filter out already assigned users
  const availableUsers = allUsers.filter((user) => !assignees.some((assignee) => assignee.id === user.id))

  const handleAddAssignee = async () => {
    if (!selectedUserId) return

    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "addAssignee",
          assignee_id: selectedUserId,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to add assignee")
      }

      const newUser = allUsers.find((u) => u.id === selectedUserId)
      if (newUser) {
        const updatedAssignees = [...assignees, newUser]
        setAssignees(updatedAssignees)
        setSelectedUserId("")
        setShowAddDropdown(false)
        onAssigneesUpdate?.(updatedAssignees.map((a) => a.id))
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to add assignee"
      setError(errorMessage)
      console.error("Failed to add assignee:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveAssignee = async (userId: string) => {
    if (!isManager) {
      setError("Only managers can remove assignees")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "removeAssignee",
          assignee_id: userId,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to remove assignee")
      }

      const updatedAssignees = assignees.filter((a) => a.id !== userId)
      setAssignees(updatedAssignees)
      onAssigneesUpdate?.(updatedAssignees.map((a) => a.id))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to remove assignee"
      setError(errorMessage)
      console.error("Failed to remove assignee:", err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950 p-3 rounded-md border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {assignees.length > 0 ? (
          assignees.map((assignee) => (
            <Badge key={assignee.id} variant="secondary" className="flex items-center gap-2 px-3 py-1.5">
              <Users className="w-3 h-3" />
              <span>
                {assignee.first_name} {assignee.last_name}
              </span>
              {isManager && (
                <button
                  onClick={() => handleRemoveAssignee(assignee.id)}
                  disabled={isLoading}
                  className="ml-1 hover:text-red-600 disabled:opacity-50 transition-colors"
                  aria-label={`Remove ${assignee.first_name} ${assignee.last_name}`}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </Badge>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No assignees yet</p>
        )}

        {availableUsers.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAddDropdown(!showAddDropdown)}
            className="h-8 w-8 p-0 rounded-full"
          >
            <Plus className="w-4 h-4" />
          </Button>
        )}
      </div>

      {showAddDropdown && availableUsers.length > 0 && (
        <div className="flex gap-2 pt-2">
          <Select value={selectedUserId} onValueChange={setSelectedUserId} disabled={isLoading}>
            <SelectTrigger className="w-full max-w-[240px]">
              <SelectValue placeholder="Select user" />
            </SelectTrigger>
            <SelectContent>
              {availableUsers.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.first_name} {user.last_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={handleAddAssignee} disabled={!selectedUserId || isLoading} variant="outline">
            Add
          </Button>
          <Button size="sm" onClick={() => setShowAddDropdown(false)} variant="ghost">
            Cancel
          </Button>
        </div>
      )}
    </div>
  )
}
