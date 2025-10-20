'use client';

import { useRef, useState, DragEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UploadIcon, XIcon, FileIcon, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadZoneProps {
  files: File[];
  onChange: (files: File[]) => void;
  maxTotalSize?: number; // in bytes
  maxFiles?: number;
}

export function FileUploadZone({
  files,
  onChange,
  maxTotalSize = 50 * 1024 * 1024, // 50MB default
  maxFiles = 10,
}: FileUploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const getTotalSize = (fileList: File[]): number => {
    return fileList.reduce((sum, file) => sum + file.size, 0);
  };

  const validateFiles = (newFiles: File[]): string | null => {
    const allFiles = [...files, ...newFiles];

    // Check max files
    if (allFiles.length > maxFiles) {
      return `Maximum ${maxFiles} files allowed`;
    }

    // Check total size
    const totalSize = getTotalSize(allFiles);
    if (totalSize > maxTotalSize) {
      return `Total size exceeds ${formatFileSize(maxTotalSize)} limit`;
    }

    return null;
  };

  const addFiles = (newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    const validationError = validateFiles(fileArray);

    if (validationError) {
      setError(validationError);
      return;
    }

    // Filter out duplicates
    const uniqueFiles = fileArray.filter(
      (newFile) => !files.some((existingFile) => existingFile.name === newFile.name)
    );

    onChange([...files, ...uniqueFiles]);
    setError(null);
  };

  const removeFile = (index: number) => {
    onChange(files.filter((_, i) => i !== index));
    setError(null);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
      e.target.value = ''; // Reset input
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'];
    return imageExts.includes(ext || '') ? ImageIcon : FileIcon;
  };

  const totalSize = getTotalSize(files);
  const sizePercentage = (totalSize / maxTotalSize) * 100;

  return (
    <div className="space-y-3">
      {/* Drag and Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
          isDragOver
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-accent/50'
        )}
        onClick={handleBrowseClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileInputChange}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp,.txt,.csv"
        />
        <UploadIcon className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm font-medium">Drag files here or click to browse</p>
        <p className="text-xs text-muted-foreground mt-1">
          Supports images, PDFs, docs, spreadsheets
        </p>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{files.length} file(s)</span>
            <span className="text-muted-foreground">
              {formatFileSize(totalSize)} / {formatFileSize(maxTotalSize)}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full transition-all',
                sizePercentage > 90 ? 'bg-red-500' : sizePercentage > 70 ? 'bg-yellow-500' : 'bg-primary'
              )}
              style={{ width: `${Math.min(sizePercentage, 100)}%` }}
            />
          </div>

          {/* File Items */}
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {files.map((file, index) => {
              const FileIconComponent = getFileIcon(file.name);
              return (
                <div
                  key={index}
                  className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/50 hover:bg-muted"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileIconComponent className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm truncate" title={file.name}>
                      {file.name}
                    </span>
                    <Badge variant="outline" className="text-xs ml-auto flex-shrink-0">
                      {formatFileSize(file.size)}
                    </Badge>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(index);
                    }}
                    className="p-1 rounded-full hover:bg-background"
                  >
                    <XIcon className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="text-xs text-red-500 bg-red-50 border border-red-200 px-3 py-2 rounded">
          {error}
        </div>
      )}
    </div>
  );
}
