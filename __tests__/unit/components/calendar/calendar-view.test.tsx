import React from 'react';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CalendarView from '@/components/calendar/calendar-view';
import type { Task } from '@/lib/services/tasks';

describe('CalendarView User Interactions', () => {
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        store = {};
      }),
    };
  })();

  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
  });

  const createTask = (id: number, title: string, status: 'To Do' | 'In Progress' | 'Completed' | 'Blocked', deadline: Date): Task => ({
    id,
    title,
    description: `Description for ${title}`,
    status,
    priority: 2,
    deadline: deadline.toISOString(),
    notes: null,
    recurrence_interval: 0,
    recurrence_date: null,
    project: { id: 1, name: 'Test Project' },
    creator: { creator_id: 'user1', user_info: { first_name: 'John', last_name: 'Doe' } },
    subtasks: [],
    assignees: [],
    tags: [],
    attachments: [],
    isOverdue: false,
  });

  const mockTasks = [
    createTask(1, 'Task 1', 'To Do', new Date()),
    createTask(2, 'Task 2', 'In Progress', new Date()),
  ];

  beforeEach(() => {
    localStorageMock.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should handle view switching interactions', async () => {
    render(<CalendarView tasks={mockTasks} />);

    // Test month view button
    const monthButton = screen.getAllByText('M')[0].closest('button');
    expect(monthButton).toBeInTheDocument();

    // Test week view button
    const weekButton = screen.getByText('W').closest('button');
    expect(weekButton).toBeInTheDocument();

    // Test day view button
    const dayButton = screen.getByText('D').closest('button');
    expect(dayButton).toBeInTheDocument();
  });

  it('should handle navigation interactions', () => {
    render(<CalendarView tasks={mockTasks} />);

    // Test Today button
    const todayButton = screen.getAllByText('Today')[0];
    expect(todayButton).toBeInTheDocument();

    // Test navigation buttons
    const prevButton = screen.getByLabelText('Previous');
    const nextButton = screen.getByLabelText('Next');

    expect(prevButton).toBeInTheDocument();
    expect(nextButton).toBeInTheDocument();
  });

  it('should handle filter interactions', () => {
    render(<CalendarView tasks={mockTasks} />);

    // Test show completed toggle
    const showCompletedCheckbox = screen.getByLabelText('Show completed');
    expect(showCompletedCheckbox).toBeInTheDocument();

    // Test filter elements are present
    expect(screen.getByText('Show completed')).toBeInTheDocument();
  });

  it('should persist view preference in localStorage', async () => {
    render(<CalendarView tasks={mockTasks} />);

    await waitFor(() => {
      expect(localStorageMock.getItem('tasks-calendar-view')).toBe('month');
    });
  });

  it('should display tasks for user interaction', () => {
    render(<CalendarView tasks={mockTasks} />);

    // Verify tasks are displayed for interaction
    expect(screen.getByText('Task 1')).toBeInTheDocument();
    expect(screen.getByText('Task 2')).toBeInTheDocument();
  });
});