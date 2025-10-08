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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import TaskDetails from '@/components/tasks/task-details';
import { format, isBefore } from 'date-fns';
import { type Task, calculateNextDueDate } from '@/lib/services/tasks';
import {
  Calendar,
  Paperclip,
  CheckSquare,
  AlertCircle,
  ArrowUpDown,
  Filter,
  X,
} from 'lucide-react';

type TasksListProps = {
  tasks: Task[];
  isManager: boolean;
  isAdmin: boolean;
};

type SortConfig = {
  key: keyof Task | 'project.name';
  direction: 'asc' | 'desc';
};

export default function TasksList({ tasks, isManager, isAdmin }: TasksListProps) {
  const [showCompleted, setShowCompleted] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filters, setFilters] = useState({
    priority: '',
    project: '',
    status: '',
    tags: [] as string[],
    assignee: '',
  });
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  // Unique values for filters
  // Replace priorities with numeric range 1–10
  const priorities = Array.from({ length: 10 }, (_, i) => (i + 1).toString());
  const statuses = ['To Do', 'In Progress', 'Done', 'Blocked'] as const;
  const projects = Array.from(
    new Set(tasks.map((task) => task.project?.name).filter((name): name is string => Boolean(name)))
  );
  const allTags = Array.from(new Set(tasks.flatMap((task) => task.tags)));
  const assignees = Array.from(new Set(tasks.flatMap((task) => task.assignees)));

  // Filter tasks
  const filteredTasks = tasks
    .filter((task) =>
      showCompleted ? true : ['To Do', 'In Progress', 'Blocked'].includes(task.status)
    )
    .filter(
      (task) =>
        (!filters.priority || task.priority.toString() === filters.priority) && // Updated to handle number as string
        (!filters.project || task.project.name === filters.project) &&
        (!filters.status || task.status === filters.status) &&
        (filters.tags.length === 0 || filters.tags.every((tag) => task.tags.includes(tag))) &&
        (!filters.assignee || task.assignees.some((a) => a.assignee_id === filters.assignee))
    );

  // Handle sorting
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

        // Handle null/undefined safely
        if (aValue == null && bValue == null) return 0;
        if (aValue == null) return 1; // nulls go to bottom
        if (bValue == null) return -1;

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return aValue.localeCompare(bValue) * direction;
        }

        if (aValue instanceof Date && bValue instanceof Date) {
          return (aValue.getTime() - bValue.getTime()) * direction;
        }

        // Generic comparison fallback for numbers
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return (aValue - bValue) * direction;
        }

        // Final fallback for mixed/unknown types
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
    setFilters({ priority: '', project: '', status: '', tags: [], assignee: '' });
  };

  // Get status badge variant
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Done':
        return 'default';
      case 'In Progress':
        return 'secondary';
      case 'Blocked':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  // Get priority badge variant based on numeric priority (1–10)
  const getPriorityVariant = (priority: number) => {
    if (priority >= 8) return 'destructive'; // 8–10 (critical)
    if (priority >= 4) return 'secondary'; // 4–7 (moderate)
    return 'outline'; // 1–3 (low)
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
          <Select
            value={filters.priority || 'all'}
            onValueChange={(value) =>
              setFilters({ ...filters, priority: value === 'all' ? '' : value })
            }
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              {priorities.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.status || 'all'}
            onValueChange={(value) =>
              setFilters({ ...filters, status: value === 'all' ? '' : value })
            }
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {statuses.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.project || 'all'}
            onValueChange={(value) =>
              setFilters({ ...filters, project: value === 'all' ? '' : value })
            }
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(isManager || isAdmin) && (
            <Select
              value={filters.assignee || 'all'}
              onValueChange={(value) =>
                setFilters({ ...filters, assignee: value === 'all' ? '' : value })
              }
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assignees</SelectItem>

                {/*
        1. Flatten all assignees from all tasks.
        2. Use Map to deduplicate by assignee_id.
        3. Render each unique assignee with assignee_id as key and value.
      */}
                {Array.from(
                  new Map(
                    tasks.flatMap((task) => task.assignees).map((a) => [a.assignee_id, a])
                  ).values()
                ).map((a) => (
                  <SelectItem key={a.assignee_id} value={a.assignee_id}>
                    {`${a.user_info.first_name} ${a.user_info.last_name}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[140px] justify-between">
                {filters.tags.length > 0 ? `${filters.tags.length} Tags` : 'Tags'}
                <Filter className="h-4 w-4 ml-2" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-4">
              <div className="space-y-2">
                {allTags.map((tag) => (
                  <div key={tag} className="flex items-center gap-2">
                    <Checkbox
                      id={tag}
                      checked={filters.tags.includes(tag)}
                      onCheckedChange={(checked) => {
                        setFilters({
                          ...filters,
                          tags: checked
                            ? [...filters.tags, tag]
                            : filters.tags.filter((t) => t !== tag),
                        });
                      }}
                    />
                    <Label htmlFor={tag} className="text-sm">
                      {tag}
                    </Label>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {(filters.priority ||
            filters.project ||
            filters.status ||
            filters.tags.length > 0 ||
            filters.assignee) && (
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
              <TableHead>Subtasks</TableHead>
              <TableHead>Attachments</TableHead>
              <TableHead>Tags</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasksWithNextDue.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No tasks match the current filters.
                </TableCell>
              </TableRow>
            ) : (
              tasksWithNextDue.map((task) => (
                <TableRow
                  key={task.id}
                  className={`cursor-pointer ${task.isOverdue ? 'bg-destructive/10' : ''}`}
                  onClick={() => setSelectedTask(task)}
                >
                  <TableCell className={`font-medium ${task.isOverdue ? 'text-destructive' : ''}`}>
                    <div className="flex items-center gap-2">
                      {task.isOverdue && <AlertCircle className="h-4 w-4 text-destructive" />}
                      {task.title}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getPriorityVariant(task.priority)}>
                      {task.priority} {/* Display the number */}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(task.status)}>{task.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <>
                        {console.log(
                          'Assignees for task:',
                          task.id,
                          task.assignees.map((a) => ({
                            assignee_id: a.assignee_id,
                            user_info: a.user_info
                              ? `${a.user_info.first_name} ${a.user_info.last_name}`
                              : 'MISSING',
                          }))
                        )}
                      </>
                      {task.assignees.length > 0 ? (
                        task.assignees.slice(0, 3).map((assignee) => {
                          const { first_name, last_name } = assignee.user_info;
                          console.log(assignee.user_info);
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
                  <TableCell>{task.project?.name || 'None'}</TableCell>
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
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Task Details</DialogTitle>
          </DialogHeader>
          {selectedTask && <TaskDetails taskId={selectedTask.id} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
