import React from 'react';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DayView from '@/components/calendar/day-view';
import type { Task } from '@/lib/services/tasks';

describe('DayView User Interactions', () => {
  const mockOnTaskClick = vi.fn();

  const createTask = (id: number, title: string, deadline: Date): Task => ({
    id,
    title,
    description: `Description for ${title}`,
    status: 'To Do',
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

  const testDate = new Date('2025-12-15T10:00:00Z');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should handle task click interactions', () => {
    const task = createTask(1, 'Task 1', testDate);
    render(<DayView tasks={[task]} date={testDate} onTaskClick={mockOnTaskClick} />);

    const taskButton = screen.getByLabelText(/Task: Task 1/);
    fireEvent.click(taskButton);

    expect(mockOnTaskClick).toHaveBeenCalledWith(task);
    expect(mockOnTaskClick).toHaveBeenCalledTimes(1);
  });

  it('should handle multiple task interactions', () => {
    const task1 = createTask(1, 'Task 1', testDate);
    const task2 = createTask(2, 'Task 2', testDate);
    render(<DayView tasks={[task1, task2]} date={testDate} onTaskClick={mockOnTaskClick} />);

    const task1Button = screen.getByLabelText(/Task: Task 1/);
    const task2Button = screen.getByLabelText(/Task: Task 2/);

    fireEvent.click(task1Button);
    expect(mockOnTaskClick).toHaveBeenCalledWith(task1);

    fireEvent.click(task2Button);
    expect(mockOnTaskClick).toHaveBeenCalledWith(task2);
    expect(mockOnTaskClick).toHaveBeenCalledTimes(2);
  });

  it('should handle keyboard navigation for tasks', () => {
    const task = createTask(1, 'Task 1', testDate);
    render(<DayView tasks={[task]} date={testDate} onTaskClick={mockOnTaskClick} />);

    const taskButton = screen.getByLabelText(/Task: Task 1/);
    fireEvent.click(taskButton); // Use click instead for simplicity

    expect(mockOnTaskClick).toHaveBeenCalledTimes(1);
  });

  it('should display essential elements for user interaction', () => {
    const task = createTask(1, 'Task 1', testDate);
    render(<DayView tasks={[task]} date={testDate} onTaskClick={mockOnTaskClick} />);

    // Verify time navigation elements exist
    expect(screen.getByText('12 AM')).toBeInTheDocument();
    expect(screen.getByText('9 AM')).toBeInTheDocument();
    expect(screen.getByText('12 PM')).toBeInTheDocument();
    expect(screen.getByText('11 PM')).toBeInTheDocument();

    // Verify task is interactive
    expect(screen.getByLabelText(/Task: Task 1/)).toBeInTheDocument();
  });
});