"use client"

import type React from "react"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { X, Plus } from "lucide-react"

interface EditableTagsProps {
  taskId: number
  initialTags: string[]
  onTagsUpdate?: (newTags: string[]) => void
}

export function EditableTags({ taskId, initialTags, onTagsUpdate }: EditableTagsProps) {
  const [tags, setTags] = useState(initialTags)
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showAddInput, setShowAddInput] = useState(false)

  const handleAddTag = async () => {
    const tagInput = inputValue.trim()

    if (!tagInput || tags.includes(tagInput)) {
      setInputValue("")
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
          action: "addTag",
          tag_name: tagInput,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to add tag")
      }

      const newTags = [...tags, tagInput]
      setTags(newTags)
      setInputValue("")
      setShowAddInput(false)
      onTagsUpdate?.(newTags)
    } catch (err) {
      console.error("Failed to add tag:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveTag = async (tagToRemove: string) => {
    setIsLoading(true)

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "removeTag",
          tag_name: tagToRemove,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to remove tag")
      }

      const newTags = tags.filter((tag) => tag !== tagToRemove)
      setTags(newTags)
      onTagsUpdate?.(newTags)
    } catch (err) {
      console.error("Failed to remove tag:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddTag()
    } else if (e.key === "Escape") {
      setShowAddInput(false)
      setInputValue("")
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        {tags.length > 0 ? (
          tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="flex items-center gap-1 px-3 py-1">
              {tag}
              <button
                onClick={() => handleRemoveTag(tag)}
                disabled={isLoading}
                className="ml-1 hover:text-red-600 disabled:opacity-50"
                aria-label={`Remove tag ${tag}`}
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No tags yet</p>
        )}

        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowAddInput(!showAddInput)}
          className="h-8 w-8 p-0 rounded-full"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {showAddInput && (
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Type tag name and press Enter"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            className="w-full max-w-md"
            autoFocus
          />
          <Button size="sm" onClick={handleAddTag} disabled={!inputValue.trim() || isLoading} variant="outline">
            Add
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setShowAddInput(false)
              setInputValue("")
            }}
            variant="ghost"
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  )
}
