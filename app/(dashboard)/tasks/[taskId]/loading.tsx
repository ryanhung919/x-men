import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Loading() {
  return (
    <div className="container mx-auto p-6">
      {/* Header with Title and Archive Button */}
      <div className="flex justify-between items-center mb-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Back Button */}
      <Skeleton className="h-10 w-20 mb-4" />

      <div className="space-y-4">
        {/* Main Task Details Card */}
        <Card>
          <CardHeader>
            <Skeleton className="h-7 w-3/4" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Description */}
              <div>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
              {/* Priority */}
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-6 w-12" />
              </div>
              {/* Status */}
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-14" />
                <Skeleton className="h-6 w-24" />
              </div>
              {/* Creator */}
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-32" />
              </div>
              {/* Assignees */}
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-48" />
              </div>
              {/* Due Date */}
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-32" />
              </div>
              {/* Tags */}
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-12" />
                <div className="flex gap-1">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-14" />
                </div>
              </div>
              {/* Project */}
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-28" />
              </div>
              {/* Notes */}
              <div>
                <Skeleton className="h-4 w-14 mb-2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subtasks Card */}
        <Card>
          <CardHeader>
            <CardTitle>Subtasks</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-4 space-y-2">
              {Array.from({ length: 1 }).map((_, i) => (
                <li key={i} className="flex items-center gap-2">
                  <Skeleton className="h-4 w-48" />
                  <span>-</span>
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-4 w-32" />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Attachments Card */}
        <Card>
          <CardHeader>
            <CardTitle>Attachments</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-4 space-y-2">
              {Array.from({ length: 1 }).map((_, i) => (
                <li key={i}>
                  <Skeleton className="h-4 w-64" />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Activity History Card */}
        <Card>
          <CardHeader>
            <CardTitle>Activity History</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <li key={i} className="border-b pb-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
