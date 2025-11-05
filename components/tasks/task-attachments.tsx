"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { FileText, X } from "lucide-react"
import { useRef, useState } from "react"
import { FileUploadZone } from "./file-upload-zone"
import { Card, CardContent } from "@/components/ui/card"

interface TaskAttachmentsProps {
  taskId: number
  initialAttachments: { id: number; storage_path: string; public_url?: string }[]
  onAttachmentsUpdate?: (newAttachments: any[]) => void
}

export function TaskAttachments({ taskId, initialAttachments, onAttachmentsUpdate }: TaskAttachmentsProps) {
  const [attachments, setAttachments] = useState(initialAttachments)
  const [isUploading, setIsUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([])

  const handleFileSelect = (selectedFiles: File[]) => {
    setUploadingFiles(selectedFiles)
  }

  const handleUpload = async () => {
    if (uploadingFiles.length === 0) return

    setIsUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("action", "addAttachments")

      uploadingFiles.forEach((file, index) => {
        formData.append(`file_${index}`, file)
      })

      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        body: formData,
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to upload attachments")
      }

      const data = await res.json()
      console.log("[v0] Upload response:", data)

      await new Promise((resolve) => setTimeout(resolve, 500))

      // Refetch the task to get the updated attachments with public_url
      const refetchRes = await fetch(`/api/tasks/${taskId}`)
      if (refetchRes.ok) {
        const taskData = await refetchRes.json()
        console.log("[v0] Refetched task data:", taskData)
        if (taskData.attachments) {
          setAttachments(taskData.attachments)
          onAttachmentsUpdate?.(taskData.attachments)
        }
      } else {
        // Fallback: use the response data if refetch fails
        const newAttachments = [...attachments, ...data.attachments]
        setAttachments(newAttachments)
        onAttachmentsUpdate?.(newAttachments)
      }

      setUploadingFiles([])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to upload attachments"
      setError(errorMessage)
      console.error("Failed to upload attachments:", err)
    } finally {
      setIsUploading(false)
    }
  }

  const handleAttachmentDelete = async (attachmentId: number) => {
    setDeletingId(attachmentId)
    setError(null)

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "removeAttachment",
          attachment_id: attachmentId,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to remove attachment")
      }

      const newAttachments = attachments.filter((a) => a.id !== attachmentId)
      setAttachments(newAttachments)
      onAttachmentsUpdate?.(newAttachments)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to remove attachment"
      setError(errorMessage)
      console.error("Failed to remove attachment:", err)
    } finally {
      setDeletingId(null)
    }
  }

  const getFileName = (path: string) => {
    return path.split("/").pop() || "Unknown file"
  }

  return (
    <div className="space-y-4">
      {/* Error Message */}
      {error && (
        <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950 p-3 rounded-md border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      {/* Existing Attachments Section */}
      {attachments.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Uploaded Files ({attachments.length})</h4>
          </div>
          <div className="space-y-2">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center justify-between p-3 bg-muted/50 hover:bg-muted rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <FileText className="w-5 h-5 text-blue-500 flex-shrink-0" />
                  {att.public_url ? (
                    <a
                      href={att.public_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline truncate font-medium"
                    >
                      {getFileName(att.storage_path)}
                    </a>
                  ) : (
                    <span className="text-sm text-muted-foreground truncate">{getFileName(att.storage_path)}</span>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleAttachmentDelete(att.id)}
                  disabled={deletingId === att.id}
                  className="text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-950 ml-2 flex-shrink-0"
                >
                  {deletingId === att.id ? <span className="text-xs">Deleting...</span> : <X className="w-4 h-4" />}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Zone Section */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold">Add New Files</h4>
        <FileUploadZone 
          files={uploadingFiles} 
          onChange={handleFileSelect}
          maxTotalSize={50 * 1024 * 1024}
          maxFiles={10}
        />
      </div>

      {/* Upload Button */}
      {uploadingFiles.length > 0 && (
        <div className="flex gap-2">
          <Button 
            onClick={handleUpload}
            disabled={isUploading}
            className="flex-1"
          >
            {isUploading ? "Uploading..." : `Upload ${uploadingFiles.length} File(s)`}
          </Button>
          <Button
            variant="outline"
            onClick={() => setUploadingFiles([])}
            disabled={isUploading}
          >
            Cancel
          </Button>
        </div>
      )}

      {/* Empty State */}
      {attachments.length === 0 && uploadingFiles.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No attachments yet. Upload files to get started.
        </p>
      )}
    </div>
  )
}