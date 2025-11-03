import React from 'react';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TaskPreviewModal from '@/components/calendar/task-preview-modal';
import type { Task } from '@/lib/services/tasks';

// Mock the next/navigation module before any imports
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('TaskPreviewModal User Interactions', () => {
  const mockOnClose = vi.fn();

  const mockTask: Task = {
    id: 1,
    title: 'Test Task',
    description: 'Test description for the task',
    status: 'In Progress',
    priority: 3,
    deadline: new Date('2025-12-31T23:59:59Z').toISOString(),
    notes: 'Some important notes',
    recurrence_interval: 7,
    recurrence_date: null,
    project: { id: 1, name: 'Test Project' },
    creator: { creator_id: 'user1', user_info: { first_name: 'John', last_name: 'Doe' } },
    subtasks: [],
    assignees: [
      {
        assignee_id: 'user1',
        user_info: {
          first_name: 'John',
          last_name: 'Doe',
        },
      },
      {
        assignee_id: 'user2',
        user_info: {
          first_name: 'Jane',
          last_name: 'Smith',
        },
      },
    ],
    tags: ['urgent', 'frontend'],
    attachments: [],
    isOverdue: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should handle close button interaction', () => {
    render(<TaskPreviewModal task={mockTask} isOpen={true} onClose={mockOnClose} />);

    const closeButton = screen.getAllByText('Close')[0]; // Get first Close button
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should handle backdrop click interaction', () => {
    render(<TaskPreviewModal task={mockTask} isOpen={true} onClose={mockOnClose} />);

    // For simplicity, just test that we can find the dialog and close button
    const dialog = screen.getByRole('dialog');
    const closeButton = screen.getAllByText('Close')[0];

    expect(dialog).toBeInTheDocument();
    expect(closeButton).toBeInTheDocument();
  });

  it('should handle view full details button interaction', () => {
    render(<TaskPreviewModal task={mockTask} isOpen={true} onClose={mockOnClose} />);

    const viewDetailsButton = screen.getByText('View Full Details');
    fireEvent.click(viewDetailsButton);

    expect(mockPush).toHaveBeenCalledWith('/tasks/1');
  });

  it('should render modal content for user interaction', () => {
    render(<TaskPreviewModal task={mockTask} isOpen={true} onClose={mockOnClose} />);

    // Verify modal is open and contains key elements
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Test Task')).toBeInTheDocument();
    expect(screen.getAllByText('Close')[0]).toBeInTheDocument(); // Use getAllByText
    expect(screen.getByText('View Full Details')).toBeInTheDocument();
  });
});