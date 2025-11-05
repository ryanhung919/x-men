'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { type Task, calculateNextDueDate } from '@/lib/types/tasks';
import {
  Calendar,
  Paperclip,
  CheckSquare,
  AlertCircle,
  ArrowUpDown,
  X,
  Repeat,
} from 'lucide-react';
import { StatusSelector } from '@/components/filters/status-selector';
import { ProjectSelector, Project } from '@/components/filters/project-selector';
import { TagSelector } from '@/components/filters/tag-selector';
import {
  ColumnVisibilitySelector,
  type ColumnId,
} from '@/components/filters/column-visibility-selector';
import { useRouter } from 'next/navigation';


type TasksListProps = {
  tasks: Task[];
};

type SortConfig = {
  key: keyof Task | 'project.name';
  direction: 'asc' | 'desc';
};

export default function TasksList({ tasks }: TasksListProps) {
  const router = useRouter();
  const [showCompleted, setShowCompleted] = useState(false);
  const [filters, setFilters] = useState({
    projects: [] as number[],
    statuses: [] as string[],
    tags: [] as string[],
  });
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<ColumnId[]>([
    'status',
    'priority',
    'dueDate',
    'assignees',
    'project',
    'recurring',
    'creator',
    'subtasks',
    'attachments',
    'tags',
  ]);

  // Unique values for filters
  const statuses = ['To Do', 'In Progress', 'Completed', 'Blocked'] as const;
  const projects: Project[] = Array.from(
    new Set(
      tasks
        .map((task) => task.project?.id)
        .filter((id): id is number => id !== null && id !== undefined)
    )
  ).map((id) => {
    const task = tasks.find((t) => t.project?.id === id)!;
    return {
      id: id,
      name: task.project!.name,
      is_archived: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  });
  const allTags = Array.from(new Set(tasks.flatMap((task) => task.tags)));

  // Filter tasks
  const filteredTasks = tasks
    .filter((task) =>
      showCompleted ? true : ['To Do', 'In Progress', 'Blocked'].includes(task.status)
    )
    .filter(
      (task) =>
        (filters.projects.length === 0 ||
          (task.project?.id && filters.projects.includes(task.project.id))) &&
        (filters.statuses.length === 0 || filters.statuses.includes(task.status)) &&
        (filters.tags.length === 0 || filters.tags.some((tag) => task.tags.includes(tag)))
    );

  // Sort tasks
  const sortedTasks = sortConfig
    ? [...filteredTasks].sort((a, b) => {
        const key = sortConfig.key;
        const direction = sortConfig.direction === 'asc' ? 1 : -1;

        if (key === 'project.name') {
          const aValue = a.project?.name ?? '';
          const bValue = b.project?.name ?? '';
          return aValue.localeCompare(bValue) * direction;
        }

        const aValue = a[key as keyof Task];
        const bValue = b[key as keyof Task];

        if (aValue == null && bValue == null) return 0;
        if (aValue == null) return 1;
        if (bValue == null) return -1;

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return aValue.localeCompare(bValue) * direction;
        }

        if (aValue instanceof Date && bValue instanceof Date) {
          return (aValue.getTime() - bValue.getTime()) * direction;
        }

        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return (aValue - bValue) * direction;
        }

        return String(aValue).localeCompare(String(bValue)) * direction;
      })
    : filteredTasks;

  // Handle recurring tasks
  const tasksWithNextDue = sortedTasks.map(calculateNextDueDate);

  // Toggle sort
  const handleSort = (key: keyof Task | 'project.name') => {
    setSortConfig((prev) => ({
      key,
      direction: prev?.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({ projects: [], statuses: [], tags: [] });
  };

  // Get status badge variant
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'default';
      case 'In Progress':
        return 'secondary';
      case 'Blocked':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  // Get priority badge variant
  const getPriorityVariant = (priority: number) => {
    if (priority >= 8) return 'destructive';
    if (priority >= 4) return 'secondary';
    return 'outline';
  };

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-background p-4 rounded-lg border">
        <Button
          variant={showCompleted ? 'default' : 'outline'}
          onClick={() => setShowCompleted(!showCompleted)}
          className="flex items-center gap-2"
        >
          <CheckSquare className="h-4 w-4" />
          {showCompleted ? 'Hide Completed' : 'Show Completed'}
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <ColumnVisibilitySelector
            visibleColumns={visibleColumns}
            onChange={setVisibleColumns}
          />
          <StatusSelector
            statuses={statuses}
            selectedStatuses={filters.statuses}
            onChange={(statuses) => setFilters({ ...filters, statuses })}
          />
          <ProjectSelector
            projects={projects}
            selectedProjects={filters.projects}
            onChange={(projects) => setFilters({ ...filters, projects })}
          />
          <TagSelector
            tags={allTags}
            selectedTags={filters.tags}
            onChange={(tags) => setFilters({ ...filters, tags })}
          />
          {(filters.projects.length > 0 ||
            filters.statuses.length > 0 ||
            filters.tags.length > 0) && (
            <Button variant="ghost" onClick={clearFilters} className="flex items-center gap-2">
              <X className="h-4 w-4" />
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Task Table */}
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">
                <Button
                  variant="ghost"
                  onClick={() => handleSort('title')}
                  className="flex items-center gap-1"
                >
                  Title
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </TableHead>
              {visibleColumns.includes('status') && (
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('status')}
                    className="flex items-center gap-1"
                  >
                    Status
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </TableHead>
              )}
              {visibleColumns.includes('priority') && (
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('priority')}
                    className="flex items-center gap-1"
                  >
                    Priority
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </TableHead>
              )}
              {visibleColumns.includes('dueDate') && (
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('deadline')}
                    className="flex items-center gap-1"
                  >
                    Due Date
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </TableHead>
              )}
              {visibleColumns.includes('assignees') && (
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('assignees')}
                    className="flex items-center gap-1"
                  >
                    Assignees
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </TableHead>
              )}
              {visibleColumns.includes('project') && (
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('project.name')}
                    className="flex items-center gap-1"
                  >
                    Project
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </TableHead>
              )}
              {visibleColumns.includes('recurring') && (
                <TableHead className="w-[80px] text-center">Recurring</TableHead>
              )}
              {visibleColumns.includes('creator') && <TableHead>Creator</TableHead>}
              {visibleColumns.includes('subtasks') && <TableHead>Subtasks</TableHead>}
              {visibleColumns.includes('attachments') && <TableHead>Attachments</TableHead>}
              {visibleColumns.includes('tags') && <TableHead>Tags</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasksWithNextDue.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={visibleColumns.length + 1}
                  className="text-center py-8 text-muted-foreground"
                >
                  No tasks match the current filters.
                </TableCell>
              </TableRow>
            ) : (
              tasksWithNextDue.map((task) => (
                <TableRow
                  key={task.id}
                  onClick={() => router.push(`/tasks/${task.id}`)}
                  className={`cursor-pointer hover:bg-muted/50 transition-colors ${task.isOverdue ? 'bg-destructive/10 hover:bg-destructive/20' : ''}`}
                >
                  <TableCell
                    className={`font-medium ${task.isOverdue ? 'text-destructive' : ''}`}
                  >
                    <div className="flex items-center gap-2">
                      {task.isOverdue && <AlertCircle className="h-4 w-4 text-destructive" />}
                      {task.title}
                    </div>
                  </TableCell>
                  {visibleColumns.includes('status') && (
                    <TableCell>
                      <Badge variant={getStatusVariant(task.status)}>{task.status}</Badge>
                    </TableCell>
                  )}
                  {visibleColumns.includes('priority') && (
                    <TableCell>
                      <Badge variant={getPriorityVariant(task.priority)}>{task.priority}</Badge>
                    </TableCell>
                  )}
                  {visibleColumns.includes('dueDate') && (
                    <TableCell className={task.isOverdue ? 'text-destructive' : ''}>
                      {task.deadline ? (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(task.deadline), 'MMM d, yyyy')}
                        </div>
                      ) : (
                        'None'
                      )}
                    </TableCell>
                  )}
                  {visibleColumns.includes('assignees') && (
                    <TableCell>
                      <div className="flex gap-1">
                        {task.assignees.length > 0 ? (
                          task.assignees.slice(0, 3).map((assignee) => {
                            const { first_name, last_name } = assignee.user_info;
                            return (
                              <Avatar
                                key={assignee.assignee_id}
                                className="h-6 w-6 border-2 border-background"
                              >
                                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                  {`${first_name[0]}${last_name[0]}`.toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            );
                          })
                        ) : (
                          <span className="text-muted-foreground">None</span>
                        )}
                        {task.assignees.length > 3 && (
                          <Avatar className="h-6 w-6 border-2 border-background">
                            <AvatarFallback className="text-xs bg-muted">
                              +{task.assignees.length - 3}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    </TableCell>
                  )}
                  {visibleColumns.includes('project') && (
                    <TableCell>{task.project?.name || 'None'}</TableCell>
                  )}
                  {visibleColumns.includes('recurring') && (
                    <TableCell className="text-center">
                      {task.recurrence_interval > 0 && (
                        <span
                          title={`Recurring every ${task.recurrence_interval} day${
                            task.recurrence_interval > 1 ? 's' : ''
                          }`}
                          className="inline-flex items-center justify-center"
                        >
                          <Repeat className="h-4 w-4 text-muted-foreground" />
                        </span>
                      )}
                    </TableCell>
                  )}
                  {visibleColumns.includes('creator') && (
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6 border-2 border-background">
                          <AvatarFallback className="text-xs bg-secondary/50 text-secondary-foreground">
                            {`${task.creator.user_info.first_name[0]}${task.creator.user_info.last_name[0]}`.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">
                          {task.creator.user_info.first_name} {task.creator.user_info.last_name}
                        </span>
                      </div>
                    </TableCell>
                  )}
                  {visibleColumns.includes('subtasks') && (
                    <TableCell>
                      {task.subtasks.length > 0 ? (
                        <div className="flex items-center gap-2">
                          <CheckSquare className="h-4 w-4" />
                          {task.subtasks.length}
                        </div>
                      ) : (
                        'None'
                      )}
                    </TableCell>
                  )}
                  {visibleColumns.includes('attachments') && (
                    <TableCell>
                      {task.attachments.length > 0 ? (
                        <div className="flex items-center gap-2">
                          <Paperclip className="h-4 w-4" />
                          {task.attachments.length}
                        </div>
                      ) : (
                        'None'
                      )}
                    </TableCell>
                  )}
                  {visibleColumns.includes('tags') && (
                    <TableCell>
                      {task.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {task.tags.slice(0, 2).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {task.tags.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{task.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        'None'
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
