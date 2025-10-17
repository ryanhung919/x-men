'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export function BackButton() {
  return (
    <Button
      asChild
      variant="outline"
      className="mb-4 flex items-center gap-2 text-primary border-primary/20 hover:bg-primary/10 hover:text-primary transition-colors rounded-lg px-4 py-2"
      aria-label="Back to tasks list"
    >
      <Link href="/tasks">
        <ArrowLeft className="h-4 w-4" />
        Back to Tasks
      </Link>
    </Button>
  );
}
