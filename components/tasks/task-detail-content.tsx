'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarDays,
  CheckSquare,
  FileText,
  FolderKanban,
  LockKeyhole,
  MessageSquare,
  Repeat2,
  UserRound,
} from 'lucide-react';
import type { TaskInspection } from '@/lib/types/tasks';
import { TaskStatus } from './task-status';
import { useTaskInspector } from './task-inspector-context';
import { EditableTitle } from './editable-title';
import { EditableDescription } from './editable-description';
import { EditableStatus } from './editable-status';
import { EditablePriority } from './editable-priority';
import { EditableDeadline } from './editable-deadline';
import { EditableAssignees } from './editable-assignees';
import { EditableRecurrence } from './editable-recurrence';
import { EditableTags } from './editable-tags';
import { EditableNotes } from './editable-notes';
import { TaskAttachments } from './task-attachments';
import { TaskComments } from './task-comments';
import { ArchiveButton } from './archive-button';
import { CreateSubtaskButton } from './create-subtask-wrapper';
import { format } from 'date-fns';

export function TaskDetailContent({
  task,
  onArchived,
  onStructureUpdated,
}: {
  task: TaskInspection;
  onArchived?: () => void;
  onStructureUpdated?: () => void;
}) {
  const router = useRouter();
  const { openTask } = useTaskInspector();
  const [feedback, setFeedback] = useState('');
  const readonly = task.viewer.isReadOnly;
  const updated = () => {
    setFeedback('Changes saved');
    router.refresh();
  };
  const structureUpdated = () => {
    updated();
    onStructureUpdated?.();
  };
  const heading = 'mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground';
  const property = 'space-y-2 border-b border-border/60 pb-5 last:border-0';
  return (
    <article>
      <div className="border-b px-5 py-6 sm:px-7">
        <div className="mb-4 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
          <span className="font-mono">NDL-{task.id}</span>
          <span className="flex items-center gap-1.5">
            <FolderKanban className="size-3" />
            {task.project?.name || 'No project'}
          </span>
          {readonly && (
            <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1">
              <LockKeyhole className="size-3" />
              Read-only demo
            </span>
          )}
        </div>
        {readonly ? (
          <h1 className="text-2xl font-semibold leading-tight tracking-tight">{task.title}</h1>
        ) : (
          <EditableTitle taskId={task.id} initialTitle={task.title} onTitleUpdate={updated} />
        )}
        {feedback && (
          <p className="mt-2 text-[11px] text-positive" aria-live="polite">
            {feedback}
          </p>
        )}
      </div>
      <div className="grid lg:grid-cols-[minmax(0,1fr)_270px]">
        <div className="min-w-0 space-y-6 p-5 sm:p-7">
          <section>
            <h2 className={heading}>
              <FileText className="size-3.5" />
              Description
            </h2>
            {readonly ? (
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/85">
                {task.description || 'No description added.'}
              </p>
            ) : (
              <EditableDescription
                taskId={task.id}
                initialDescription={task.description}
                onDescriptionUpdate={updated}
              />
            )}
          </section>
          <section className="border-t pt-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <CheckSquare className="size-4 text-muted-foreground" />
                Subtasks
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  {task.subtasks.length
                    ? `${task.subtasks.filter((sub) => sub.status === 'Completed').length}/${task.subtasks.length}`
                    : 0}
                </span>
              </h2>
              {!readonly && (
                <CreateSubtaskButton
                  parentTaskId={task.id}
                  parentProjectId={task.project?.id || 0}
                  parentProjectName={task.project?.name}
                  onCreated={structureUpdated}
                />
              )}
            </div>
            {task.subtasks.length ? (
              <ul className="divide-y rounded-lg border">
                {task.subtasks.map((sub) => (
                  <li key={sub.id}>
                    <button
                      onClick={() => openTask(sub.id)}
                      className="flex w-full items-center justify-between gap-3 p-3 text-left hover:bg-muted/50"
                    >
                      <span className="min-w-0">
                        <span className="block break-words text-sm leading-relaxed">
                          {sub.title}
                        </span>
                        <span className="mt-1 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                          <span className="font-mono">NDL-{sub.id}</span>
                          {sub.deadline && (
                            <span>Due {format(new Date(sub.deadline), 'MMM d')}</span>
                          )}
                        </span>
                      </span>
                      <TaskStatus status={sub.status} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">No subtasks yet.</p>
            )}
          </section>
          <section className="border-t pt-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <FileText className="size-4 text-muted-foreground" />
              Attachments
            </h2>
            <TaskAttachments
              taskId={task.id}
              initialAttachments={task.attachments}
              onAttachmentsUpdate={updated}
              readOnly={readonly}
            />
          </section>
          <section className="border-t pt-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <MessageSquare className="size-4 text-muted-foreground" />
              Discussion
            </h2>
            <TaskComments
              taskId={task.id}
              comments={task.comments}
              currentUserId={task.viewer.id}
              isAdmin={task.viewer.isAdmin}
              readOnly={readonly}
            />
          </section>
          <details className="border-t pt-5">
            <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
              Additional notes
            </summary>
            <div className="mt-3">
              {readonly ? (
                <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
                  {task.notes || 'No notes added.'}
                </p>
              ) : (
                <EditableNotes taskId={task.id} initialNotes={task.notes} onNotesUpdate={updated} />
              )}
            </div>
          </details>
        </div>
        <aside className="space-y-5 border-t bg-muted/25 p-5 lg:border-l lg:border-t-0">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Properties
          </h2>
          <div className={property}>
            <h3 className="text-xs text-muted-foreground">Status</h3>
            {readonly ? (
              <TaskStatus status={task.status} />
            ) : (
              <EditableStatus
                taskId={task.id}
                initialStatus={task.status}
                onStatusUpdate={updated}
              />
            )}
          </div>
          <div className={property}>
            <h3 className="text-xs text-muted-foreground">Priority</h3>
            {readonly ? (
              <p className="text-sm tabular-nums">
                {task.priority}
                <span className="text-muted-foreground"> / 10</span>
              </p>
            ) : (
              <EditablePriority
                taskId={task.id}
                initialPriority={task.priority}
                onPriorityUpdate={updated}
              />
            )}
          </div>
          <div className={property}>
            <h3 className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarDays className="size-3" />
              Deadline
            </h3>
            {readonly ? (
              <p className="text-sm">
                {task.deadline ? format(new Date(task.deadline), 'MMM d, yyyy') : 'No deadline'}
              </p>
            ) : (
              <EditableDeadline
                taskId={task.id}
                initialDeadline={task.deadline}
                onDeadlineUpdate={updated}
              />
            )}
          </div>
          <div className={property}>
            <h3 className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <UserRound className="size-3" />
              Assignees
            </h3>
            {readonly ? (
              <div className="space-y-1">
                {task.assignees.length ? (
                  task.assignees.map((a) => (
                    <p key={a.assignee_id} className="text-xs">
                      {a.user_info.first_name} {a.user_info.last_name}
                    </p>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">Unassigned</p>
                )}
              </div>
            ) : (
              <EditableAssignees
                taskId={task.id}
                initialAssignees={task.assignees.map((a) => ({
                  id: a.assignee_id,
                  ...a.user_info,
                }))}
                allUsers={task.allUsers}
                isManager={task.viewer.isManager}
                onAssigneesUpdate={updated}
              />
            )}
          </div>
          <div className={property}>
            <h3 className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Repeat2 className="size-3" />
              Recurrence
            </h3>
            {readonly ? (
              <p className="text-xs">
                {task.recurrence_interval
                  ? { 1: 'Daily', 7: 'Weekly', 30: 'Monthly' }[task.recurrence_interval] ||
                    `Every ${task.recurrence_interval} days`
                  : 'Does not repeat'}
                {task.recurrence_interval > 0 && task.recurrence_date && (
                  <span className="mt-1 block text-muted-foreground">
                    Since {format(new Date(task.recurrence_date), 'MMM d, yyyy')}
                  </span>
                )}
              </p>
            ) : (
              <EditableRecurrence
                taskId={task.id}
                recurrenceInterval={task.recurrence_interval}
                recurrenceDate={task.recurrence_date}
                onRecurrenceUpdate={updated}
              />
            )}
          </div>
          <div className={property}>
            <h3 className="text-xs text-muted-foreground">Tags</h3>
            {readonly ? (
              <div className="flex flex-wrap gap-1.5">
                {task.tags.length ? (
                  task.tags.map((tag) => (
                    <span
                      key={tag}
                      className="max-w-full break-words rounded-md border px-2 py-1 text-[11px] text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">No tags</span>
                )}
              </div>
            ) : (
              <EditableTags taskId={task.id} initialTags={task.tags} onTagsUpdate={updated} />
            )}
          </div>
          <div className={property}>
            <h3 className="text-xs text-muted-foreground">Created by</h3>
            <p className="text-xs">
              {task.creator.user_info.first_name} {task.creator.user_info.last_name}
            </p>
          </div>
          {!readonly && task.viewer.isManager && (
            <ArchiveButton
              taskId={task.id}
              subtaskCount={task.subtasks.length}
              onArchived={onArchived}
            />
          )}
        </aside>
      </div>
    </article>
  );
}
