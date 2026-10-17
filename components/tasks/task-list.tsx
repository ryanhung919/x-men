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
import { type Task } from '@/lib/types/tasks';
import { Paperclip, CheckSquare, ArrowUpDown, Repeat } from 'lucide-react';
import { type ColumnId } from '@/components/filters/column-visibility-selector';
import { useTaskInspector } from './task-inspector-context';
import Link from 'next/link';
import { TaskStatus, OverdueIndicator } from './task-status';

type TasksListProps = {
  tasks: Task[];
  visibleColumns?: ColumnId[];
  emptyMessage?: string;
  onClear?: () => void;
};

type SortConfig = {
  key: keyof Task | 'project.name';
  direction: 'asc' | 'desc';
};

export default function TasksList({
  tasks,
  visibleColumns = ['status', 'priority', 'dueDate', 'assignees', 'project'],
  emptyMessage = 'No tasks match your scope.',
  onClear,
}: TasksListProps) {
  const { openTask } = useTaskInspector();
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const filteredTasks = tasks;

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

  // Dates have already been normalized once by the shared view scope.
  const tasksWithNextDue = sortedTasks;

  // Toggle sort
  const handleSort = (key: keyof Task | 'project.name') => {
    setSortConfig((prev) => ({
      key,
      direction: prev?.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  return (
    <div>
      <div className="divide-y overflow-hidden rounded-xl border bg-card md:hidden">
        {tasksWithNextDue.length ? (
          tasksWithNextDue.map((task) => (
            <Link
              key={task.id}
              href={`/tasks/${task.id}`}
              onClick={(event) => {
                event.stopPropagation();
                if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
                  event.preventDefault();
                  openTask(task.id);
                }
              }}
              className="block p-4 hover:bg-muted/50"
            >
              <div className="font-medium leading-relaxed">{task.title}</div>
              <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="font-mono">NDL-{task.id}</span>
                {task.recurrence_interval > 0 && <Repeat className="size-3" />}
                {visibleColumns.includes('project') && <span>{task.project?.name}</span>}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                {visibleColumns.includes('status') && <TaskStatus status={task.status} />}
                {visibleColumns.includes('priority') && (
                  <span className="text-xs text-muted-foreground">Priority {task.priority}</span>
                )}
                {visibleColumns.includes('dueDate') && task.deadline && (
                  <span
                    className={`text-xs ${task.isOverdue ? 'text-problem' : 'text-muted-foreground'}`}
                  >
                    {task.isOverdue ? 'Overdue · ' : ''}
                    {format(new Date(task.deadline), 'MMM d')}
                  </span>
                )}
              </div>
              {visibleColumns.includes('assignees') && (
                <div className="mt-3 text-[11px] text-muted-foreground">
                  {task.assignees.length
                    ? task.assignees
                        .map((a) => `${a.user_info.first_name} ${a.user_info.last_name}`)
                        .join(', ')
                    : 'Unassigned'}
                </div>
              )}
            </Link>
          ))
        ) : (
          <div className="p-8 text-center text-sm text-muted-foreground">
            {emptyMessage}
            {onClear && (
              <Button className="mt-3" variant="outline" onClick={onClear}>
                Clear task scope
              </Button>
            )}
          </div>
        )}
      </div>
      {/* Task Table */}
      <div className="hidden overflow-hidden rounded-xl border bg-card md:block">
        <Table className="min-w-[850px] [&_td]:px-4 [&_td]:py-4 [&_th]:px-4 [&_th]:text-xs [&_th]:text-muted-foreground [&_th_button]:h-9 [&_th_button]:px-0 [&_th_button_svg]:size-3 [&_th_button_svg]:opacity-40">
          <TableHeader className="bg-muted/35">
            <TableRow>
              <TableHead className="w-[36%]">
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
                  <div className="py-8">
                    <p className="font-medium text-foreground">{emptyMessage}</p>
                    <p className="mt-1 text-xs">Try another search or adjust the filters above.</p>
                    {onClear && (
                      <Button variant="outline" size="sm" className="mt-4" onClick={onClear}>
                        Clear task scope
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              tasksWithNextDue.map((task) => (
                <TableRow
                  key={task.id}
                  onClick={() => openTask(task.id)}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <TableCell className="min-w-[240px] max-w-[420px] whitespace-normal">
                    <Link
                      href={`/tasks/${task.id}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
                          event.preventDefault();
                          openTask(task.id);
                        }
                      }}

                      className="block font-medium leading-snug hover:text-positive"
                      title={task.title}
                    >
                      {task.title}
                    </Link>
                    <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="font-mono">NDL-{task.id}</span>
                      {task.recurrence_interval > 0 && (
                        <span title={`Repeats every ${task.recurrence_interval} days`}>
                          <Repeat className="size-3" />
                        </span>
                      )}
                      {task.subtasks.length > 0 && (
                        <span className="inline-flex items-center gap-1" title="Subtasks">
                          <CheckSquare className="size-3" />
                          {task.subtasks.length}
                        </span>
                      )}
                      {task.attachments.length > 0 && (
                        <span className="inline-flex items-center gap-1" title="Attachments">
                          <Paperclip className="size-3" />
                          {task.attachments.length}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  {visibleColumns.includes('status') && (
                    <TableCell>
                      <TaskStatus status={task.status} />
                    </TableCell>
                  )}
                  {visibleColumns.includes('priority') && (
                    <TableCell>
                      <span
                        className="inline-flex items-center gap-2 text-xs tabular-nums text-muted-foreground"
                        title={`Priority ${task.priority} out of 10`}
                      >
                        <span className="flex h-3 items-end gap-0.5" aria-hidden="true">
                          {[1, 2, 3].map((level) => (
                            <span
                              key={level}
                              className={`w-0.5 rounded-sm ${task.priority >= level * 3 ? 'bg-foreground/70' : 'bg-border'}`}
                              style={{ height: level * 4 }}
                            />
                          ))}
                        </span>
                        {task.priority}
                      </span>
                    </TableCell>
                  )}
                  {visibleColumns.includes('dueDate') && (
                    <TableCell className="text-xs">
                      {task.deadline ? (
                        <div className="flex flex-col items-start gap-1">
                          <span
                            className={task.isOverdue ? 'text-problem' : 'text-muted-foreground'}
                          >
                            {format(new Date(task.deadline), 'MMM d, yyyy')}
                          </span>
                          {task.isOverdue && <OverdueIndicator />}
                        </div>
                      ) : (
                        'None'
                      )}
                    </TableCell>
                  )}
                  {visibleColumns.includes('assignees') && (
                    <TableCell>
                      <div className="flex -space-x-1.5">
                        {task.assignees.length > 0 ? (
                          task.assignees.slice(0, 3).map((assignee) => {
                            const { first_name, last_name } = assignee.user_info;
                            return (
                              <Avatar
                                key={assignee.assignee_id}
                                title={`${first_name} ${last_name}`}
                                className="h-7 w-7 border-2 border-card"
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
                          <Avatar className="h-7 w-7 border-2 border-card">
                            <AvatarFallback className="text-xs bg-muted">
                              +{task.assignees.length - 3}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    </TableCell>
                  )}
                  {visibleColumns.includes('project') && (
                    <TableCell className="max-w-[180px] whitespace-normal text-xs leading-relaxed text-muted-foreground">
                      {task.project?.name || 'No project'}
                    </TableCell>
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
                        <Avatar className="h-7 w-7 border-2 border-card">
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
