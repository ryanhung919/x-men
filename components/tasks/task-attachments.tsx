'use client';

import { Button } from '@/components/ui/button';
import { FileText, X, Plus, ArrowUpRight } from 'lucide-react';
import { useState } from 'react';
import { FileUploadZone } from './file-upload-zone';

interface TaskAttachmentsProps {
  taskId: number;
  initialAttachments: { id: number; storage_path: string; public_url?: string }[];
  readOnly?: boolean;
  onAttachmentsUpdate?: (newAttachments: any[]) => void;
}

export function TaskAttachments({
  taskId,
  initialAttachments,
  onAttachmentsUpdate,
  readOnly = false,
}: TaskAttachmentsProps) {
  const [attachments, setAttachments] = useState(initialAttachments);
  const [showUpload, setShowUpload] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);

  const handleFileSelect = (selectedFiles: File[]) => {
    setUploadingFiles(selectedFiles);
  };

  const handleUpload = async () => {
    if (uploadingFiles.length === 0) return;

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('action', 'addAttachments');

      uploadingFiles.forEach((file, index) => {
        formData.append(`file_${index}`, file);
      });

      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to upload attachments');
      }

      const data = await res.json();

      await new Promise((resolve) => setTimeout(resolve, 500));

      // Refetch the task to get the updated attachments with public_url
      const refetchRes = await fetch(`/api/tasks/${taskId}`);
      if (refetchRes.ok) {
        const taskData = await refetchRes.json();

        if (taskData.attachments) {
          setAttachments(taskData.attachments);
          onAttachmentsUpdate?.(taskData.attachments);
        }
      } else {
        // Fallback: use the response data if refetch fails
        const newAttachments = [...attachments, ...data.attachments];
        setAttachments(newAttachments);
        onAttachmentsUpdate?.(newAttachments);
      }

      setUploadingFiles([]);
      setShowUpload(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload attachments';
      setError(errorMessage);
      console.error('Failed to upload attachments:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleAttachmentDelete = async (attachmentId: number) => {
    setDeletingId(attachmentId);
    setError(null);

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'removeAttachment',
          attachment_id: attachmentId,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to remove attachment');
      }

      const newAttachments = attachments.filter((a) => a.id !== attachmentId);
      setAttachments(newAttachments);
      onAttachmentsUpdate?.(newAttachments);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove attachment';
      setError(errorMessage);
      console.error('Failed to remove attachment:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const getFileName = (path: string) => {
    return path.split('/').pop() || 'Unknown file';
  };

  return (
    <div className="space-y-3">
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-problem/20 bg-problem-soft p-3 text-sm text-problem"
        >
          {error}
        </div>
      )}
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] text-muted-foreground">
          {attachments.length
            ? `${attachments.length} uploaded file${attachments.length === 1 ? '' : 's'}`
            : 'No files attached.'}
        </p>
        {!readOnly && (
          <Button
            size="sm"
            variant="outline"
            disabled={isUploading}
            aria-expanded={showUpload}
            aria-controls={`task-upload-${taskId}`}
            onClick={() => setShowUpload((open) => !open)}
          >
            <Plus className="size-3.5" />
            Add files
          </Button>
        )}
      </div>
      {attachments.length > 0 && (
        <ul className="divide-y rounded-lg border">
          {attachments.map((att) => {
            const name = getFileName(att.storage_path);
            const extension = name.includes('.') ? name.split('.').pop()?.toUpperCase() : 'FILE';
            return (
              <li
                key={att.id}
                className="flex items-center gap-3 p-3 transition-colors hover:bg-muted/40"
              >
                <span
                  aria-hidden="true"
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-positive-soft text-positive"
                >
                  <FileText className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  {att.public_url ? (
                    <a
                      href={att.public_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block break-all text-xs font-medium text-foreground hover:text-positive hover:underline"
                    >
                      {name}
                    </a>
                  ) : (
                    <span className="block break-all text-xs font-medium">{name}</span>
                  )}
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {extension}
                    {!att.public_url && ' · Link unavailable'}
                  </p>
                </div>
                {att.public_url && (
                  <a
                    href={att.public_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open ${name}`}
                    className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-positive"
                  >
                    <ArrowUpRight className="size-3.5" />
                  </a>
                )}
                {!readOnly && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleAttachmentDelete(att.id)}
                    disabled={deletingId === att.id}
                    aria-label={`Remove ${name}`}
                    className="size-8 shrink-0 text-muted-foreground hover:bg-problem-soft hover:text-problem"
                  >
                    {deletingId === att.id ? (
                      <span className="text-[10px]">…</span>
                    ) : (
                      <X className="size-3.5" />
                    )}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {!readOnly && showUpload && (
        <div id={`task-upload-${taskId}`} className="space-y-3 rounded-lg border bg-muted/20 p-3">
          <FileUploadZone
            files={uploadingFiles}
            onChange={handleFileSelect}
            maxTotalSize={50 * 1024 * 1024}
            maxFiles={10}
          />
          {uploadingFiles.length > 0 && (
            <div className="flex gap-2">
              <Button onClick={handleUpload} disabled={isUploading} size="sm">
                {isUploading ? 'Uploading...' : `Upload ${uploadingFiles.length} File(s)`}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setUploadingFiles([]);
                  setShowUpload(false);
                }}
                disabled={isUploading}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
