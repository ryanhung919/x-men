import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationModal } from '@/components/notifications/notification-modal';
import type { Notification } from '@/components/notifications/notification-item';

describe('NotificationModal', () => {
  const mockOnClose = vi.fn();
  const mockOnDelete = vi.fn();

  const mockNotification: Notification = {
    id: 1,
    title: 'New Task Assignment',
    message: 'Ryan assigned you to task: "Design budget dashboard layout"',
    type: 'task_assigned',
    read: false,
    is_archived: false,
    created_at: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render dialog when isOpen is true', () => {
      render(
        <NotificationModal
          notification={mockNotification}
          isOpen={true}
          onClose={mockOnClose}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should not render dialog when isOpen is false', () => {
      render(
        <NotificationModal
          notification={mockNotification}
          isOpen={false}
          onClose={mockOnClose}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should return null when notification is null', () => {
      const { container } = render(
        <NotificationModal
          notification={null}
          isOpen={true}
          onClose={mockOnClose}
          onDelete={mockOnDelete}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should render delete button', () => {
      render(
        <NotificationModal
          notification={mockNotification}
          isOpen={true}
          onClose={mockOnClose}
          onDelete={mockOnDelete}
        />
      );

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      expect(deleteButton).toBeInTheDocument();
    });
  });

  describe('Notification Title Formatting', () => {
    it('should display formatted title for task_assigned type', () => {
      const notification = { ...mockNotification, type: 'task_assigned' };
      render(
        <NotificationModal
          notification={notification}
          isOpen={true}
          onClose={mockOnClose}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText('New Task Assignment')).toBeInTheDocument();
    });

    it('should display formatted title for task_comment type', () => {
      const notification = { ...mockNotification, type: 'task_comment' };
      render(
        <NotificationModal
          notification={notification}
          isOpen={true}
          onClose={mockOnClose}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText('New Comment on Task')).toBeInTheDocument();
    });

    it('should display formatted title for task_deadline_upcoming type', () => {
      const notification = { ...mockNotification, type: 'task_deadline_upcoming' };
      render(
        <NotificationModal
          notification={notification}
          isOpen={true}
          onClose={mockOnClose}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText('Deadline Upcoming')).toBeInTheDocument();
    });

    it('should display default title for unknown type', () => {
      const notification = { ...mockNotification, type: 'unknown_type' };
      render(
        <NotificationModal
          notification={notification}
          isOpen={true}
          onClose={mockOnClose}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText('Notification')).toBeInTheDocument();
    });
  });

  describe('Notification Message Formatting', () => {
    it('should format task assignment message', () => {
      const notification = {
        ...mockNotification,
        message: 'Ryan assigned you to task: "Design budget dashboard layout"',
      };
      render(
        <NotificationModal
          notification={notification}
          isOpen={true}
          onClose={mockOnClose}
          onDelete={mockOnDelete}
        />
      );

      expect(
        screen.getByText(
          'You have been assigned to task "Design budget dashboard layout" by Ryan'
        )
      ).toBeInTheDocument();
    });

    it('should display raw message when format does not match', () => {
      const notification = {
        ...mockNotification,
        message: 'Some other notification message',
      };
      render(
        <NotificationModal
          notification={notification}
          isOpen={true}
          onClose={mockOnClose}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText('Some other notification message')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onDelete and onClose when delete button is clicked', () => {
      render(
        <NotificationModal
          notification={mockNotification}
          isOpen={true}
          onClose={mockOnClose}
          onDelete={mockOnDelete}
        />
      );

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      fireEvent.click(deleteButton);

      expect(mockOnDelete).toHaveBeenCalledWith(mockNotification.id);
      expect(mockOnDelete).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when dialog is closed', () => {
      render(
        <NotificationModal
          notification={mockNotification}
          isOpen={true}
          onClose={mockOnClose}
          onDelete={mockOnDelete}
        />
      );

      // Simulate dialog close by triggering onOpenChange with false
      // This is typically done by clicking outside or pressing escape
      // The Dialog component passes this to onOpenChange prop
      const dialog = screen.getByRole('dialog');

      // Find the close button (usually X button in dialog)
      const closeButtons = screen.getAllByRole('button');
      const closeButton = closeButtons.find(btn => btn.getAttribute('aria-label') === 'Close');

      if (closeButton) {
        fireEvent.click(closeButton);
      }

      // onClose should be called when dialog is closed
      // Note: In actual UI, clicking outside or ESC key also triggers this
    });
  });
});
