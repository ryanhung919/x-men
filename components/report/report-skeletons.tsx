'use client';

import { Skeleton } from '@/components/ui/skeleton';

export function LoggedTimeReportSkeleton() {
  return (
    <div className="space-y-5" aria-label="Loading logged time report">
      <div className="grid grid-cols-2 gap-5 rounded-xl border bg-card p-5 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i}>
            <Skeleton className="mb-4 h-3 w-28" />
            <Skeleton className="h-10 w-28" />
            <Skeleton className="mt-3 h-3 w-36" />
          </div>
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.65fr_1fr]">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-2xl border bg-card p-6">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="mt-3 h-3 w-52" />
            <Skeleton className="mt-6 h-[260px] w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ComparisonSkeleton({ weekly = false }: { weekly?: boolean }) {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading report">
      <div className="grid grid-cols-2 gap-5 rounded-xl border bg-card p-6 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i}>
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-9 w-16" />
          </div>
        ))}
      </div>
      {weekly && (
        <div className="rounded-2xl border bg-card p-6">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-6 h-60 w-full" />
        </div>
      )}
      <div className="rounded-2xl border bg-card p-6">
        <Skeleton className="mb-6 h-4 w-40" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-6 border-t py-5">
            <Skeleton className="size-9 shrink-0 rounded-full" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 flex-1" />
          </div>
        ))}
      </div>
    </div>
  );
}
export function TaskCompletionReportSkeleton() {
  return <ComparisonSkeleton />;
}
export function TeamSummaryReportSkeleton() {
  return <ComparisonSkeleton weekly />;
}
