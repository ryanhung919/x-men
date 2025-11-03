"use client"

import { useEffect, useRef, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Pencil } from "lucide-react"

interface EditableProjectProps {
  taskId: number
  initialProjectId: number | null
  initialProjectName: string | null
  allProjects: { id: number; name: string }[]
  onProjectUpdate?: (newProjectId: number | null) => void
}

export function EditableProject({
  taskId,
  initialProjectId,
  initialProjectName,
  allProjects,
  onProjectUpdate,
}: EditableProjectProps) {
  const [projectId, setProjectId] = useState(initialProjectId)
  const [projectName, setProjectName] = useState(initialProjectName)
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

  const handleProjectChange = async (newProjectId: string) => {
    const projId = Number(newProjectId)

    if (projId === initialProjectId) {
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
          action: "updateProject",
          project_id: projId,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to update project")
      }

      const selectedProject = allProjects.find((p) => p.id === projId)
      setProjectId(projId)
      setProjectName(selectedProject?.name || null)
      onProjectUpdate?.(projId)
      setIsEditing(false)
    } catch (err) {
      console.error("Failed to update project:", err)
      setProjectId(initialProjectId)
      setProjectName(initialProjectName)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-sm px-3 py-1">
          {projectName || "No project"}
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
        value={projectId?.toString() || ""}
        onValueChange={handleProjectChange}
        disabled={isLoading}
        open={isEditing}
        onOpenChange={setIsEditing}
      >
        <SelectTrigger className="w-full max-w-[280px]">
          <SelectValue placeholder="Select a project" />
        </SelectTrigger>
        <SelectContent>
          {allProjects.map((project) => (
            <SelectItem key={project.id} value={project.id.toString()}>
              {project.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
