import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NotificationPanel } from '@/components/notifications/notification-panel';
import type { Notification } from '@/components/notifications/notification-item';

// Mock the useNotifications hook
const mockUseNotifications = vi.fn();
vi.mock('@/hooks/use-notifications', () => ({
  useNotifications: () => mockUseNotifications(),
}));

// Mock notification actions
vi.mock('@/app/actions/notifs', () => ({
  getNotifications: vi.fn(),
  getUnreadNotificationCount: vi.fn(),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  deleteNotificationAction: vi.fn(),
}));

describe('NotificationPanel', () => {
  const mockNotifications: Notification[] = [
    {
      id: 1,
      title: 'New Task Assignment',
      message: 'You have been assigned to "Design budget dashboard layout".',
      type: 'task_updated',
      read: false,
      is_archived: false,
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 2,
      title: 'Task Completed',
      message: 'Ryan completed "Setup CI/CD pipeline".',
      type: 'task_updated',
      read: true,
      is_archived: false,
      created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 3,
      title: 'New Comment',
      message: 'Mitch commented on "Setup analytics dashboards".',
      type: 'task_updated',
      read: false,
      is_archived: false,
      created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    },
  ];

  const defaultMockReturn = {
    notifications: mockNotifications,
    unreadCount: 2,
    isLoading: false,
    isDeleting: false,
    handleMarkAsRead: vi.fn(),
    handleMarkAllAsRead: vi.fn(),
    handleDelete: vi.fn(),
    handleDeleteAll: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseNotifications.mockReturnValue(defaultMockReturn);
  });

  describe('Component Rendering', () => {
    it('should render bell button', () => {
      render(<NotificationPanel />);

      const bellButton = screen.getByRole('button');
      expect(bellButton).toBeInTheDocument();
    });

    it('should show unread count badge when unreadCount > 0', () => {
      render(<NotificationPanel />);

      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('should not show badge when unreadCount is 0', () => {
      mockUseNotifications.mockReturnValue({
        ...defaultMockReturn,
        unreadCount: 0,
      });

      render(<NotificationPanel />);

      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });

    it('should show "9+" when unreadCount > 9', () => {
      mockUseNotifications.mockReturnValue({
        ...defaultMockReturn,
        unreadCount: 15,
      });

      render(<NotificationPanel />);

      expect(screen.getByText('9+')).toBeInTheDocument();
    });

    it('should open sheet when bell button is clicked', async () => {
      render(<NotificationPanel />);

      const bellButton = screen.getByRole('button');
      fireEvent.click(bellButton);

      await waitFor(() => {
        expect(screen.getByText('Notifications')).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner when isLoading is true', async () => {
      mockUseNotifications.mockReturnValue({
        ...defaultMockReturn,
        isLoading: true,
        notifications: [],
      });

      render(<NotificationPanel />);

      const bellButton = screen.getByRole('button');
      fireEvent.click(bellButton);

      await waitFor(() => {
        // Sheet renders to portal, so use document.querySelector
        const spinner = document.querySelector('.animate-spin');
        expect(spinner).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no notifications', async () => {
      mockUseNotifications.mockReturnValue({
        ...defaultMockReturn,
        notifications: [],
        unreadCount: 0,
      });

      render(<NotificationPanel />);

      const bellButton = screen.getByRole('button');
      fireEvent.click(bellButton);

      await waitFor(() => {
        expect(screen.getByText('No notifications yet')).toBeInTheDocument();
      });
    });
  });

  describe('Populated State', () => {
    it('should render list of notifications', async () => {
      render(<NotificationPanel />);

      const bellButton = screen.getByRole('button');
      fireEvent.click(bellButton);

      await waitFor(() => {
        expect(screen.getByText('New Task Assignment')).toBeInTheDocument();
        expect(screen.getByText('Task Completed')).toBeInTheDocument();
        expect(screen.getByText('New Comment')).toBeInTheDocument();
      });
    });

    it('should show action buttons when has notifications', async () => {
      render(<NotificationPanel />);

      const bellButton = screen.getByRole('button');
      fireEvent.click(bellButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /mark all read/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /delete all/i })).toBeInTheDocument();
      });
    });

    it('should show "Mark all read" button only when unreadCount > 0', async () => {
      render(<NotificationPanel />);

      const bellButton = screen.getByRole('button');
      fireEvent.click(bellButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /mark all read/i })).toBeInTheDocument();
      });
    });

    it('should not show "Mark all read" button when unreadCount is 0', async () => {
      mockUseNotifications.mockReturnValue({
        ...defaultMockReturn,
        unreadCount: 0,
      });

      render(<NotificationPanel />);

      const bellButton = screen.getByRole('button');
      fireEvent.click(bellButton);

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /mark all read/i })).not.toBeInTheDocument();
      });
    });
  });

  describe('Deleting State', () => {
    it('should show deleting message when isDeleting is true', async () => {
      mockUseNotifications.mockReturnValue({
        ...defaultMockReturn,
        isDeleting: true,
      });

      render(<NotificationPanel />);

      const bellButton = screen.getByRole('button');
      fireEvent.click(bellButton);

      await waitFor(() => {
        expect(screen.getByText('Deleting all notifications...')).toBeInTheDocument();
      });
    });

    it('should not show action buttons when isDeleting is true', async () => {
      mockUseNotifications.mockReturnValue({
        ...defaultMockReturn,
        isDeleting: true,
      });

      render(<NotificationPanel />);

      const bellButton = screen.getByRole('button');
      fireEvent.click(bellButton);

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /mark all read/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /delete all/i })).not.toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    it('should call handleMarkAllAsRead when "Mark all read" is clicked', async () => {
      const mockHandleMarkAllAsRead = vi.fn();
      mockUseNotifications.mockReturnValue({
        ...defaultMockReturn,
        handleMarkAllAsRead: mockHandleMarkAllAsRead,
      });

      render(<NotificationPanel />);

      const bellButton = screen.getByRole('button');
      fireEvent.click(bellButton);

      await waitFor(async () => {
        const markAllReadButton = screen.getByRole('button', { name: /mark all read/i });
        fireEvent.click(markAllReadButton);
      });

      expect(mockHandleMarkAllAsRead).toHaveBeenCalledTimes(1);
    });

    it('should call handleDeleteAll when "Delete all" is clicked', async () => {
      const mockHandleDeleteAll = vi.fn();
      mockUseNotifications.mockReturnValue({
        ...defaultMockReturn,
        handleDeleteAll: mockHandleDeleteAll,
      });

      render(<NotificationPanel />);

      const bellButton = screen.getByRole('button');
      fireEvent.click(bellButton);

      await waitFor(async () => {
        const deleteAllButton = screen.getByRole('button', { name: /delete all/i });
        fireEvent.click(deleteAllButton);
      });

      expect(mockHandleDeleteAll).toHaveBeenCalledTimes(1);
    });

    it('should call handleMarkAsRead when notification is clicked', async () => {
      const mockHandleMarkAsRead = vi.fn();
      mockUseNotifications.mockReturnValue({
        ...defaultMockReturn,
        handleMarkAsRead: mockHandleMarkAsRead,
      });

      render(<NotificationPanel />);

      const bellButton = screen.getByRole('button');
      fireEvent.click(bellButton);

      await waitFor(async () => {
        const notification = screen.getByText('New Task Assignment');
        fireEvent.click(notification);
      });

      // Should be called with the unread notification id
      expect(mockHandleMarkAsRead).toHaveBeenCalledWith(1);
    });
  });
});
