import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function Loading() {
  return (
    <div className="container mx-auto p-6 space-y-4">
      {/* Page Title Skeleton */}
      <Skeleton className="h-8 w-32" />

      {/* Create Task Button Skeleton */}
      <Skeleton className="h-10 w-40" />

      {/* Filter Bar Skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-background p-4 rounded-lg border">
        <Skeleton className="h-10 w-40" />
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      {/* Task Table Skeleton */}
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">
                <Skeleton className="h-8 w-20" />
              </TableHead>
              <TableHead>
                <Skeleton className="h-8 w-16" />
              </TableHead>
              <TableHead>
                <Skeleton className="h-8 w-16" />
              </TableHead>
              <TableHead>
                <Skeleton className="h-8 w-20" />
              </TableHead>
              <TableHead>
                <Skeleton className="h-8 w-16" />
              </TableHead>
              <TableHead>
                <Skeleton className="h-8 w-20" />
              </TableHead>
              <TableHead>
                <Skeleton className="h-8 w-16" />
              </TableHead>
              <TableHead>
                <Skeleton className="h-8 w-20" />
              </TableHead>
              <TableHead>
                <Skeleton className="h-8 w-24" />
              </TableHead>
              <TableHead>
                <Skeleton className="h-8 w-16" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {/* Title */}
                <TableCell>
                  <Skeleton className="h-5 w-48" />
                </TableCell>
                {/* Priority */}
                <TableCell>
                  <Skeleton className="h-6 w-8" />
                </TableCell>
                {/* Status */}
                <TableCell>
                  <Skeleton className="h-6 w-24" />
                </TableCell>
                {/* Assignees */}
                <TableCell>
                  <div className="flex gap-1">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <Skeleton className="h-6 w-6 rounded-full" />
                  </div>
                </TableCell>
                {/* Creator */}
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </TableCell>
                {/* Due Date */}
                <TableCell>
                  <Skeleton className="h-5 w-28" />
                </TableCell>
                {/* Project */}
                <TableCell>
                  <Skeleton className="h-5 w-20" />
                </TableCell>
                {/* Subtasks */}
                <TableCell>
                  <Skeleton className="h-5 w-12" />
                </TableCell>
                {/* Attachments */}
                <TableCell>
                  <Skeleton className="h-5 w-12" />
                </TableCell>
                {/* Tags */}
                <TableCell>
                  <div className="flex gap-1">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
