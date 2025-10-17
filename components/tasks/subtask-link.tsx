'use client';

import Link from 'next/link';

export function SubtaskLink({ id, title }: { id: number; title: string }) {
  return (
    <Link
      href={`/tasks/${id}`}
      className="text-primary hover:underline font-medium"
      aria-label={`View details for subtask: ${title}`}
    >
      {title}
    </Link>
  );
}
