import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TaskInspectorProvider } from '@/components/tasks/task-inspector-provider';
import { useTaskInspector } from '@/components/tasks/task-inspector-context';
import type { TaskInspection } from '@/lib/types/tasks';

vi.mock('@/components/tasks/create-subtask-wrapper', () => ({
  CreateSubtaskButton: () => null,
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function OpenTask() {
  const { openTask } = useTaskInspector();
  return <button onClick={() => openTask(1)}>Inspect task</button>;
}

it('keeps the inspector open and cancels back to the latest saved title after editing', async () => {
  let title = 'Original title';
  const task: TaskInspection = {
    id: 1,
    title,
    description: 'Example task',
    priority: 3,
    status: 'To Do',
    deadline: null,
    notes: null,
    recurrence_interval: 0,
    recurrence_date: null,
    project: { id: 1, name: 'Demo' },
    creator: { creator_id: 'user', user_info: { first_name: 'Demo', last_name: 'User' } },
    subtasks: [],
    assignees: [],
    tags: [],
    attachments: [],
    comments: [],
    isOverdue: false,
    allUsers: [],
    viewer: { id: 'user', isManager: false, isAdmin: false, isReadOnly: false },
  };
  let reads = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, options?: RequestInit) => {
      if (options?.method === 'PATCH') {
        title = JSON.parse(options.body as string).title;
        return { ok: true, json: async () => ({ success: true }) };
      }
      reads++;
      return { ok: true, json: async () => ({ ...task, title }) };
    })
  );
  render(
    <TaskInspectorProvider>
      <OpenTask />
    </TaskInspectorProvider>
  );
  fireEvent.click(screen.getByRole('button', { name: 'Inspect task' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Edit task title' }));
  fireEvent.change(screen.getByPlaceholderText('Enter task title...'), {
    target: { value: 'Saved title' },
  });
  fireEvent.click(screen.getByRole('button', { name: /^Save$/ }));
  await waitFor(() => expect(reads).toBe(2));
  fireEvent.click(await screen.findByRole('button', { name: 'Edit task title' }));
  fireEvent.change(screen.getByPlaceholderText('Enter task title...'), {
    target: { value: 'Discard this' },
  });
  fireEvent.click(screen.getByRole('button', { name: /^Cancel$/ }));
  expect(screen.getByRole('button', { name: 'Edit task title' })).toHaveTextContent('Saved title');
  expect(screen.getByRole('dialog')).toBeInTheDocument();
});
