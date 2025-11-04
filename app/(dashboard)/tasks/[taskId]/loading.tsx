import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10" /> {/* BackButton */}
          <Skeleton className="h-8 w-48" /> {/* "Task Details" title */}
        </div>
        <Skeleton className="h-10 w-32" /> {/* ArchiveButton (conditionally shown) */}
      </div>

      <div className="space-y-6">
        {/* Main Task Card */}
        <Card>
          <CardHeader className="pb-4">
            <Skeleton className="h-8 w-3/4" /> {/* Task title */}
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Description Section */}
            <div>
              <Skeleton className="h-5 w-32 mb-2" /> {/* "DESCRIPTION" label */}
              <Skeleton className="h-24 w-full" /> {/* Description content */}
            </div>

            <Separator />

            {/* Status and Priority Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Skeleton className="h-5 w-20 mb-3" /> {/* "STATUS" label */}
                <Skeleton className="h-10 w-32" /> {/* Status badge/button */}
              </div>
              <div>
                <Skeleton className="h-5 w-20 mb-3" /> {/* "PRIORITY" label */}
                <Skeleton className="h-10 w-32" /> {/* Priority badge/button */}
              </div>
            </div>

            <Separator />

            {/* Deadline and Project Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Skeleton className="h-5 w-24 mb-3" /> {/* "DEADLINE" label */}
                <Skeleton className="h-10 w-48" /> {/* Deadline picker/display */}
              </div>
              <div>
                <Skeleton className="h-5 w-20 mb-3" /> {/* "PROJECT" label */}
                <Skeleton className="h-6 w-40" /> {/* Project name text */}
              </div>
            </div>

            <Separator />

            {/* Assignees Section */}
            <div>
              <Skeleton className="h-5 w-24 mb-3" /> {/* "ASSIGNEES" label */}
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" /> {/* Assignee selector/display */}
                <Skeleton className="h-10 w-3/4" /> {/* Additional assignee */}
              </div>
            </div>

            <Separator />

            {/* Creator Section */}
            <div>
              <Skeleton className="h-5 w-20 mb-2" /> {/* "CREATOR" label */}
              <Skeleton className="h-6 w-32" /> {/* Creator name */}
            </div>

            <Separator />

            {/* Notes Section */}
            <div>
              <Skeleton className="h-5 w-16 mb-3" /> {/* "NOTES" label */}
              <Skeleton className="h-20 w-full" /> {/* Notes content */}
            </div>

            <Separator />

            {/* Tags Section */}
            <div>
              <Skeleton className="h-5 w-16 mb-3" /> {/* "TAGS" label */}
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-8 w-20" /> {/* Tag 1 */}
                <Skeleton className="h-8 w-24" /> {/* Tag 2 */}
                <Skeleton className="h-8 w-16" /> {/* Tag 3 */}
              </div>
            </div>

            <Separator />

            {/* Recurrence Section */}
            <div>
              <Skeleton className="h-5 w-24 mb-3" /> {/* "RECURRENCE" label */}
              <Skeleton className="h-10 w-48" /> {/* Recurrence control */}
            </div>
          </CardContent>
        </Card>

        {/* Subtasks Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xl font-semibold">
              <Skeleton className="h-6 w-32" /> {/* "Subtasks" title */}
            </CardTitle>
            <Skeleton className="h-10 w-40" /> {/* CreateSubtaskButton */}
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Show 3 skeleton subtasks */}
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <Skeleton className="h-5 w-48" /> {/* Subtask title link */}
                  <Skeleton className="h-6 w-20 ml-auto" /> {/* Status badge */}
                  <Skeleton className="h-5 w-40" /> {/* Due date text */}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Attachments Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold">
              <Skeleton className="h-6 w-32" /> {/* "Attachments" title */}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {/* Show 2 skeleton attachments */}
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3 flex-1">
                    <Skeleton className="h-5 w-5" /> {/* FileText icon */}
                    <Skeleton className="h-5 w-56" /> {/* Filename link */}
                  </div>
                  <Skeleton className="h-9 w-9" /> {/* Delete button */}
                </div>
              ))}
            </div>
            <Skeleton className="h-10 w-40 mt-4" /> {/* Upload button */}
          </CardContent>
        </Card>

        {/* Comments Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold">
              <Skeleton className="h-6 w-32" /> {/* "Comments" title */}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Comment input area */}
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" /> {/* Comment input */}
                <Skeleton className="h-10 w-32" /> {/* Submit button */}
              </div>

              {/* Show 2 skeleton comments */}
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="border-b pb-4 last:border-b-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Skeleton className="h-5 w-32" /> {/* User name */}
                    <Skeleton className="h-4 w-24" /> {/* Timestamp */}
                  </div>
                  <Skeleton className="h-5 w-full" /> {/* Comment content line 1 */}
                  <Skeleton className="h-5 w-3/4 mt-2" /> {/* Comment content line 2 */}
                  <div className="flex gap-2 mt-2">
                    <Skeleton className="h-8 w-16" /> {/* Edit button */}
                    <Skeleton className="h-8 w-16" /> {/* Delete button */}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}