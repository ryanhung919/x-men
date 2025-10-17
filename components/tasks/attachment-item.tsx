'use client';

import { useState } from 'react';

type AttachmentItemProps = {
  id: number;
  storage_path: string;
  public_url?: string;
};

function isImageFile(storagePath: string): boolean {
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
  return imageExtensions.some((ext) => storagePath.toLowerCase().endsWith(ext));
}

export function AttachmentItem({ id, storage_path, public_url }: AttachmentItemProps) {
  const [imageError, setImageError] = useState(false);
  const fileName = storage_path.split('/').pop() || storage_path;

  if (!public_url) {
    return (
      <li key={id}>
        <span className="text-gray-500">
          {fileName} <span className="text-xs">(File not found)</span>
        </span>
      </li>
    );
  }

  if (isImageFile(storage_path)) {
    return (
      <li key={id}>
        <div>
          <a
            href={public_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            {fileName}
          </a>
          {!imageError && (
            <img
              src={public_url}
              alt={fileName}
              className="max-w-xs h-auto mt-2 rounded border"
              onError={() => setImageError(true)}
            />
          )}
        </div>
      </li>
    );
  }

  return (
    <li key={id}>
      <a
        href={public_url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:underline"
      >
        {fileName}
      </a>
    </li>
  );
}
