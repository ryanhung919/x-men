'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, ListTodo, RefreshCw } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TaskInspectorContext } from './task-inspector-context';
import { TaskDetailContent } from './task-detail-content';
import type { TaskInspection } from '@/lib/types/tasks';

export function TaskInspectorProvider({ children }: { children: React.ReactNode }) {
  const [taskId, setTaskId] = useState<number | null>(null);
  const [task, setTask] = useState<TaskInspection | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const opener = useRef<HTMLElement | null>(null);
  const openTask = useCallback((id: number) => {
    if (!Number.isSafeInteger(id) || id < 1) return;
    if (!document.querySelector('[data-slot=sheet-content]'))
      opener.current = document.activeElement as HTMLElement;
    setTask(null);
    setError('');
    setRevision((value) => value + 1);
    setTaskId(id);
  }, []);
  useEffect(() => {
    if (taskId === null) return;
    const abort = new AbortController();
    setTask(null);
    setError('');
    fetch(`/api/tasks/${taskId}`, { signal: abort.signal, cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok)
          throw Error(
            response.status === 404
              ? 'This task is unavailable or outside your access.'
              : 'Could not load this task. Try again.'
          );
        return response.json() as Promise<TaskInspection>;
      })
      .then((data) => {
        if (!abort.signal.aborted) setTask(data);
      })
      .catch((error) => {
        if (!abort.signal.aborted) setError(error.message);
      });
    return () => abort.abort();
  }, [taskId, revision]);
  return (
    <TaskInspectorContext.Provider value={{ openTask }}>
      {children}
      <Sheet
        open={taskId !== null}
        onOpenChange={(open) => {
          if (!open) setTaskId(null);
        }}
      >
        <SheetContent
          className="w-full gap-0 bg-card p-0 data-[state=open]:duration-200 data-[state=closed]:duration-200 sm:max-w-[960px]"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (opener.current?.isConnected) opener.current.focus();
          }}
        >
          <header className="flex min-h-16 shrink-0 items-center justify-between border-b px-5 pr-14">
            <div className="flex items-center gap-2">
              <ListTodo className="size-4 text-positive" />
              <SheetTitle className="text-sm">Task details</SheetTitle>
            </div>
            {taskId && (
              <Link
                href={`/tasks/${taskId}`}
                onClick={() => setTaskId(null)}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-positive"
              >
                Open full page
                <ArrowUpRight className="size-3.5" />
              </Link>
            )}
            <SheetDescription className="sr-only">
              Inspect work and collaboration while keeping your current view.
            </SheetDescription>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {error ? (
              <div className="p-8">
                <h2 className="text-lg font-semibold">Task unavailable</h2>
                <p className="mt-2 text-sm text-muted-foreground" role="alert">
                  {error}
                </p>
                <Button
                  variant="outline"
                  className="mt-5"
                  onClick={() => setRevision((value) => value + 1)}
                >
                  <RefreshCw className="size-4" />
                  Retry
                </Button>
              </div>
            ) : task ? (
              <TaskDetailContent
                key={task.id}
                task={task}
                onArchived={() => setTaskId(null)}
                onStructureUpdated={() => setRevision((value) => value + 1)}
              />
            ) : (
              <div className="space-y-5 p-6" aria-label="Loading task">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-3/4" />
                <Skeleton className="h-20 w-full" />
                <div className="grid grid-cols-2 gap-5">
                  <Skeleton className="h-56" />
                  <Skeleton className="h-56" />
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </TaskInspectorContext.Provider>
  );
}
