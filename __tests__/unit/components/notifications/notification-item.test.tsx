import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationItem, type Notification } from '@/components/notifications/notification-item';

describe('NotificationItem', () => {
  const mockOnMarkAsRead = vi.fn();
  const mockOnClick = vi.fn();

  const mockNotificationUnread: Notification = {
    id: 1,
    title: 'New Task Assignment',
    message: 'You have been assigned to "Design budget dashboard layout".',
    type: 'task_updated',
    read: false,
    is_archived: false,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
  };

  const mockNotificationRead: Notification = {
    id: 2,
    title: 'Task Completed',
    message: 'Ryan completed "Setup CI/CD pipeline".',
    type: 'task_updated',
    read: true,
    is_archived: false,
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render notification title', () => {
      render(
        <NotificationItem
          notification={mockNotificationUnread}
          onMarkAsRead={mockOnMarkAsRead}
          onClick={mockOnClick}
        />
      );

      expect(screen.getByText('New Task Assignment')).toBeInTheDocument();
    });

    it('should render notification message', () => {
      render(
        <NotificationItem
          notification={mockNotificationUnread}
          onMarkAsRead={mockOnMarkAsRead}
          onClick={mockOnClick}
        />
      );

      expect(
        screen.getByText('You have been assigned to "Design budget dashboard layout".')
      ).toBeInTheDocument();
    });

    it('should render relative timestamp', () => {
      render(
        <NotificationItem
          notification={mockNotificationUnread}
          onMarkAsRead={mockOnMarkAsRead}
          onClick={mockOnClick}
        />
      );

      // Should show "2 hours ago" or similar
      expect(screen.getByText(/ago$/)).toBeInTheDocument();
    });

    it('should show unread indicator for unread notifications', () => {
      const { container } = render(
        <NotificationItem
          notification={mockNotificationUnread}
          onMarkAsRead={mockOnMarkAsRead}
          onClick={mockOnClick}
        />
      );

      // Check for the blue dot indicator
      const indicator = container.querySelector('.bg-primary');
      expect(indicator).toBeInTheDocument();
    });

    it('should not show unread indicator for read notifications', () => {
      const { container } = render(
        <NotificationItem
          notification={mockNotificationRead}
          onMarkAsRead={mockOnMarkAsRead}
          onClick={mockOnClick}
        />
      );

      // Check that there's no blue dot indicator
      const indicator = container.querySelector('.bg-primary');
      expect(indicator).not.toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should apply accent background for unread notifications', () => {
      const { container } = render(
        <NotificationItem
          notification={mockNotificationUnread}
          onMarkAsRead={mockOnMarkAsRead}
          onClick={mockOnClick}
        />
      );

      const item = container.firstChild as HTMLElement;
      expect(item.className).toContain('bg-accent/50');
    });

    it('should not apply accent background for read notifications', () => {
      const { container } = render(
        <NotificationItem
          notification={mockNotificationRead}
          onMarkAsRead={mockOnMarkAsRead}
          onClick={mockOnClick}
        />
      );

      const item = container.firstChild as HTMLElement;
      expect(item.className).not.toContain('bg-accent/50');
    });

    it('should have cursor-pointer class', () => {
      const { container } = render(
        <NotificationItem
          notification={mockNotificationUnread}
          onMarkAsRead={mockOnMarkAsRead}
          onClick={mockOnClick}
        />
      );

      const item = container.firstChild as HTMLElement;
      expect(item.className).toContain('cursor-pointer');
    });
  });

  describe('User Interactions', () => {
    it('should call onClick when notification is clicked', () => {
      const { container } = render(
        <NotificationItem
          notification={mockNotificationUnread}
          onMarkAsRead={mockOnMarkAsRead}
          onClick={mockOnClick}
        />
      );

      const item = container.firstChild as HTMLElement;
      fireEvent.click(item);

      expect(mockOnClick).toHaveBeenCalledWith(mockNotificationUnread);
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('should call onMarkAsRead for unread notifications when clicked', () => {
      const { container } = render(
        <NotificationItem
          notification={mockNotificationUnread}
          onMarkAsRead={mockOnMarkAsRead}
          onClick={mockOnClick}
        />
      );

      const item = container.firstChild as HTMLElement;
      fireEvent.click(item);

      expect(mockOnMarkAsRead).toHaveBeenCalledWith(mockNotificationUnread.id);
      expect(mockOnMarkAsRead).toHaveBeenCalledTimes(1);
    });

    it('should not call onMarkAsRead for already-read notifications', () => {
      const { container } = render(
        <NotificationItem
          notification={mockNotificationRead}
          onMarkAsRead={mockOnMarkAsRead}
          onClick={mockOnClick}
        />
      );

      const item = container.firstChild as HTMLElement;
      fireEvent.click(item);

      expect(mockOnMarkAsRead).not.toHaveBeenCalled();
      expect(mockOnClick).toHaveBeenCalledWith(mockNotificationRead);
    });
  });
});
