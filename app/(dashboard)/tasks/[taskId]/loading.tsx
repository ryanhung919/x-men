import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Loading() {
  return (
    <div className="container mx-auto p-6">
      {/* Header with "Task Details" title and Archive Button (conditionally shown for managers) */}
      <div className="flex justify-between items-center mb-4">
        <Skeleton className="h-8 w-32" /> {/* "Task Details" text */}
        <Skeleton className="h-10 w-28" /> {/* Archive button */}
      </div>

      {/* Back Button - matches BackButton component structure */}
      <div className="mb-4">
        <div className="inline-flex items-center gap-2 border border-border rounded-lg px-4 h-10">
          <Skeleton className="h-4 w-4" /> {/* ArrowLeft icon */}
          <Skeleton className="h-5 w-28" /> {/* "Back to Tasks" text */}
        </div>
      </div>

      <div className="space-y-4">
        {/* Main Task Details Card - matches exact structure from page.tsx */}
        <Card>
          <CardHeader>
            <Skeleton className="h-7 w-3/4" /> {/* Task title */}
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Description - with label + text */}
            <div className="flex gap-2">
              <Skeleton className="h-5 w-24" /> {/* "Description:" label */}
              <Skeleton className="h-5 w-48" /> {/* Description text */}
            </div>

            {/* Priority - with label + Badge */}
            <div className="flex gap-2 items-center">
              <Skeleton className="h-5 w-16" /> {/* "Priority:" label */}
              <Skeleton className="h-6 w-8" /> {/* Priority badge */}
            </div>

            {/* Status - with label + Badge */}
            <div className="flex gap-2 items-center">
              <Skeleton className="h-5 w-14" /> {/* "Status:" label */}
              <Skeleton className="h-6 w-24" /> {/* Status badge */}
            </div>

            {/* Creator - with label + name */}
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16" /> {/* "Creator:" label */}
              <Skeleton className="h-5 w-32" /> {/* Creator name */}
            </div>

            {/* Assignees - with label + names */}
            <div className="flex gap-2">
              <Skeleton className="h-5 w-20" /> {/* "Assignees:" label */}
              <Skeleton className="h-5 w-56" /> {/* Assignee names (comma-separated) */}
            </div>

            {/* Due Date - with label + formatted date */}
            <div className="flex gap-2">
              <Skeleton className="h-5 w-20" /> {/* "Due Date:" label */}
              <Skeleton className="h-5 w-40" /> {/* Formatted date */}
            </div>

            {/* Recurring - with label + Badge + start date (conditional in real page) */}
            <div className="flex gap-2 items-center">
              <Skeleton className="h-5 w-20" /> {/* "Recurring:" label */}
              <Skeleton className="h-6 w-28" /> {/* "Every X days" badge */}
              <Skeleton className="h-4 w-32" /> {/* "(Started: date)" text */}
            </div>

            {/* Tags - with label + multiple Badges */}
            <div className="flex gap-2 items-center">
              <Skeleton className="h-5 w-12" /> {/* "Tags:" label */}
              <div className="flex gap-1">
                <Skeleton className="h-6 w-16" /> {/* Tag badge 1 */}
                <Skeleton className="h-6 w-20" /> {/* Tag badge 2 */}
                <Skeleton className="h-6 w-14" /> {/* Tag badge 3 */}
              </div>
            </div>

            {/* Project - with label + project name */}
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16" /> {/* "Project:" label */}
              <Skeleton className="h-5 w-32" /> {/* Project name */}
            </div>

            {/* Notes - with label + text */}
            <div className="flex gap-2">
              <Skeleton className="h-5 w-14" /> {/* "Notes:" label */}
              <Skeleton className="h-5 w-64" /> {/* Notes text */}
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
              {/* Show 2 skeleton subtasks */}
              {Array.from({ length: 2 }).map((_, i) => (
                <li key={i} className="flex items-center gap-2">
                  <Skeleton className="h-5 w-48" /> {/* Subtask title (link) */}
                  <span className="text-muted-foreground">-</span>
                  <Skeleton className="h-6 w-20" /> {/* Status badge */}
                  <Skeleton className="h-4 w-32" /> {/* "(Due: date)" text */}
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
              {/* Show 2 skeleton attachments */}
              {Array.from({ length: 2 }).map((_, i) => (
                <li key={i}>
                  <Skeleton className="h-5 w-56" /> {/* Attachment filename (link) */}
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
              {/* Show 3 skeleton comments */}
              {Array.from({ length: 3 }).map((_, i) => (
                <li key={i} className="border-b pb-2">
                  {/* User name + timestamp */}
                  <div className="flex items-center gap-2 mb-1">
                    <Skeleton className="h-5 w-32" /> {/* User name (bold) */}
                    <span className="text-muted-foreground">-</span>
                    <Skeleton className="h-4 w-40" /> {/* Timestamp */}
                  </div>
                  {/* Comment content */}
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-3/4 mt-1" />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
