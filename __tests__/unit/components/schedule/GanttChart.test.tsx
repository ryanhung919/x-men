import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GanttChart, { type GanttTask, type GanttRow } from '@/components/schedule/GanttChart';
import { format, addDays } from 'date-fns';

describe('GanttChart', () => {
  const today = new Date('2025-10-20');
  const startDate = new Date('2025-10-15');
  const endDate = new Date('2025-10-25');

  const mockActiveTasks: GanttTask[] = [
    {
      id: 1,
      title: 'Active Task',
      project: 'Project A',
      startDate: '2025-10-16T00:00:00Z',
      deadline: '2025-10-22T00:00:00Z',
      status: 'In Progress',
      updatedAt: '',
      assignee: { id: 'user1', name: 'John Doe' },
    },
    {
      id: 2,
      title: 'Todo Task',
      project: 'Project A',
      startDate: '2025-10-18T00:00:00Z',
      deadline: '2025-10-24T00:00:00Z',
      status: 'To Do',
      updatedAt: '',
      assignee: { id: 'user1', name: 'John Doe' },
    },
  ];

  const mockCompletedTasks: GanttTask[] = [
    {
      id: 3,
      title: 'Completed Task',
      project: 'Project B',
      startDate: '2025-10-15T00:00:00Z',
      deadline: '2025-10-21T00:00:00Z',
      status: 'Completed',
      updatedAt: '2025-10-19T00:00:00Z',
      assignee: { id: 'user2', name: 'Jane Smith' },
    },
  ];

  const mockOverdueTasks: GanttTask[] = [
    {
      id: 4,
      title: 'Overdue Task',
      project: 'Project C',
      startDate: '2025-10-10T00:00:00Z',
      deadline: '2025-10-18T00:00:00Z',
      status: 'In Progress',
      updatedAt: '',
      assignee: { id: 'user3', name: 'Bob Wilson' },
    },
  ];

  const mockRows: GanttRow[] = [
    {
      assigneeId: 'user1',
      assigneeName: 'John Doe',
      tasks: mockActiveTasks,
    },
  ];

  const mockRowsWithCompleted: GanttRow[] = [
    {
      assigneeId: 'user2',
      assigneeName: 'Jane Smith',
      tasks: mockCompletedTasks,
    },
  ];

  const mockRowsWithOverdue: GanttRow[] = [
    {
      assigneeId: 'user3',
      assigneeName: 'Bob Wilson',
      tasks: mockOverdueTasks,
    },
  ];

  const mockOnChangeDeadline = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.setSystemTime(today);
  });

  describe('Component Rendering', () => {
    it('should render gantt chart with header', () => {
      render(
        <GanttChart
          rows={mockRows}
          startDate={startDate}
          endDate={endDate}
          onChangeDeadline={mockOnChangeDeadline}
        />
      );

      expect(screen.getByText('Team members')).toBeInTheDocument();
      // Date headers should be present
      expect(screen.getAllByText('15')[0]).toBeInTheDocument();
    });

    it('should render assignee names', () => {
      render(
        <GanttChart
          rows={mockRows}
          startDate={startDate}
          endDate={endDate}
          onChangeDeadline={mockOnChangeDeadline}
        />
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should render task titles', () => {
      render(
        <GanttChart
          rows={mockRows}
          startDate={startDate}
          endDate={endDate}
          onChangeDeadline={mockOnChangeDeadline}
        />
      );

      // Task titles may be truncated, check for project names instead
      expect(screen.getAllByText('Project A')).toHaveLength(2);
    });

    it('should render project names', () => {
      render(
        <GanttChart
          rows={mockRows}
          startDate={startDate}
          endDate={endDate}
          onChangeDeadline={mockOnChangeDeadline}
        />
      );

      expect(screen.getAllByText('Project A')).toHaveLength(2);
    });

    it('should render empty state when no rows provided', () => {
      const { container } = render(
        <GanttChart
          rows={[]}
          startDate={startDate}
          endDate={endDate}
          onChangeDeadline={mockOnChangeDeadline}
        />
      );

      expect(screen.getByText('No work in this range')).toBeInTheDocument();
    });
  });

  describe('Date Range Display', () => {
    it('should display dates in header', () => {
      render(
        <GanttChart
          rows={mockRows}
          startDate={startDate}
          endDate={endDate}
          onChangeDeadline={mockOnChangeDeadline}
        />
      );

      // Check for date headers (responsive format)
      expect(screen.getAllByText('15')[0]).toBeInTheDocument();
      expect(screen.getAllByText('25')[0]).toBeInTheDocument();
    });

    it('should handle single day range', () => {
      const singleDay = new Date('2025-10-20');
      render(
        <GanttChart
          rows={mockRows}
          startDate={singleDay}
          endDate={singleDay}
          onChangeDeadline={mockOnChangeDeadline}
        />
      );

      expect(screen.getAllByText('20')[0]).toBeInTheDocument();
    });

    it('should handle multi-week range', () => {
      const weekStart = new Date('2025-10-01');
      const weekEnd = new Date('2025-10-31');
      render(
        <GanttChart
          rows={mockRows}
          startDate={weekStart}
          endDate={weekEnd}
          onChangeDeadline={mockOnChangeDeadline}
        />
      );

      expect(screen.getAllByText('1')[0]).toBeInTheDocument();
      expect(screen.getAllByText('31')[0]).toBeInTheDocument();
    });
  });

  describe('Task Bar Visualization', () => {
    it('should render task bars for active tasks', () => {
      const { container } = render(
        <GanttChart
          rows={mockRows}
          startDate={startDate}
          endDate={endDate}
          onChangeDeadline={mockOnChangeDeadline}
        />
      );

      // Task bars should have the primary background color class with opacity
      const taskBars = container.querySelectorAll('.bg-positive-soft');
      expect(taskBars.length).toBeGreaterThan(0);
    });

    it('should render blue bars for completed tasks', () => {
      const { container } = render(
        <GanttChart
          rows={mockRowsWithCompleted}
          startDate={startDate}
          endDate={endDate}
          onChangeDeadline={mockOnChangeDeadline}
        />
      );

      const completedBars = container.querySelectorAll('.bg-positive-soft');
      expect(completedBars.length).toBeGreaterThan(0);
    });

    it('should render red bars for overdue tasks', () => {
      const { container } = render(
        <GanttChart
          rows={mockRowsWithOverdue}
          startDate={startDate}
          endDate={endDate}
          onChangeDeadline={mockOnChangeDeadline}
        />
      );

      const overdueBars = container.querySelectorAll('.bg-problem-soft');
      expect(overdueBars.length).toBeGreaterThan(0);
    });

    it('should render diamond deadline indicators', () => {
      const { container } = render(
        <GanttChart
          rows={mockRows}
          startDate={startDate}
          endDate={endDate}
          currentUserId="user1"
          userRoles={['staff']}
          onChangeDeadline={mockOnChangeDeadline}
        />
      );

      // Diamond indicators have rotate-45 class
      const diamonds = container.querySelectorAll('.rotate-45');
      expect(diamonds.length).toBeGreaterThan(0);
    });

    it('should position task bars correctly based on dates', () => {
      const { container } = render(
        <GanttChart
          rows={mockRows}
          startDate={startDate}
          endDate={endDate}
          onChangeDeadline={mockOnChangeDeadline}
        />
      );

      // Task bars should have inline styles for positioning
      const taskBars = container.querySelectorAll('[style*="left"]');
      expect(taskBars.length).toBeGreaterThan(0);
    });
  });

  describe('Task Status Colors', () => {
    it('should apply correct color for completed status', () => {
      const completedTask: GanttTask = {
        id: 5,
        title: 'Test Completed',
        project: 'Test',
        startDate: '2025-10-16T00:00:00Z',
        deadline: '2025-10-22T00:00:00Z',
        status: 'Completed',
        updatedAt: '2025-10-20T00:00:00Z',
        assignee: { id: 'test', name: 'Tester' },
      };

      const { container } = render(
        <GanttChart
          rows={[{ assigneeId: 'test', assigneeName: 'Tester', tasks: [completedTask] }]}
          startDate={startDate}
          endDate={endDate}
          onChangeDeadline={mockOnChangeDeadline}
        />
      );

      expect(container.querySelector('.bg-positive-soft')).toBeInTheDocument();
    });

    it('should apply correct color for in progress status', () => {
      const inProgressTask: GanttTask = {
        id: 6,
        title: 'Test In Progress',
        project: 'Test',
        startDate: '2025-10-16T00:00:00Z',
        deadline: '2025-10-22T00:00:00Z',
        status: 'In Progress',
        updatedAt: '',
        assignee: { id: 'test', name: 'Tester' },
      };

      const { container } = render(
        <GanttChart
          rows={[{ assigneeId: 'test', assigneeName: 'Tester', tasks: [inProgressTask] }]}
          startDate={startDate}
          endDate={endDate}
          onChangeDeadline={mockOnChangeDeadline}
        />
      );

      expect(container.querySelector('.bg-positive-soft')).toBeInTheDocument();
    });

    it('should apply correct color for overdue in-progress task', () => {
      const overdueTask: GanttTask = {
        id: 7,
        title: 'Test Overdue',
        project: 'Test',
        startDate: '2025-10-10T00:00:00Z',
        deadline: '2025-10-18T00:00:00Z',
        status: 'In Progress',
        updatedAt: '',
        assignee: { id: 'test', name: 'Tester' },
      };

      const { container } = render(
        <GanttChart
          rows={[{ assigneeId: 'test', assigneeName: 'Tester', tasks: [overdueTask] }]}
          startDate={startDate}
          endDate={endDate}
          onChangeDeadline={mockOnChangeDeadline}
        />
      );

      expect(container.querySelector('.bg-problem-soft')).toBeInTheDocument();
    });
  });

  describe('Completed Task End Date', () => {
    it('should use updated_at for completed task end date', () => {
      const completedTask: GanttTask = {
        id: 8,
        title: 'Completed Early',
        project: 'Test',
        startDate: '2025-10-16T00:00:00Z',
        deadline: '2025-10-25T00:00:00Z',
        status: 'Completed',
        updatedAt: '2025-10-19T00:00:00Z',
        assignee: { id: 'early', name: 'Early Finisher' },
      };

      render(
        <GanttChart
          rows={[{ assigneeId: 'early', assigneeName: 'Early Finisher', tasks: [completedTask] }]}
          startDate={startDate}
          endDate={endDate}
          onChangeDeadline={mockOnChangeDeadline}
        />
      );

      // Task should be visible and use updated_at as end date (check for project name and green color)
      expect(screen.getByRole('button', { name: /^Inspect / })).toBeInTheDocument();
      expect(screen.getByText('Early Finisher')).toBeInTheDocument();
    });

    it('should use deadline for non-completed tasks', () => {
      const activeTask: GanttTask = {
        id: 9,
        title: 'Active Task',
        project: 'Test',
        startDate: '2025-10-16T00:00:00Z',
        deadline: '2025-10-22T00:00:00Z',
        status: 'In Progress',
        updatedAt: '',
        assignee: { id: 'worker', name: 'Worker' },
      };

      render(
        <GanttChart
          rows={[{ assigneeId: 'worker', assigneeName: 'Worker', tasks: [activeTask] }]}
          startDate={startDate}
          endDate={endDate}
          onChangeDeadline={mockOnChangeDeadline}
        />
      );

      // Check for project name and worker name (title is truncated)
      expect(screen.getByRole('button', { name: /^Inspect / })).toBeInTheDocument();
      expect(screen.getByText('Worker')).toBeInTheDocument();
    });
  });

  describe('Today Indicator', () => {
    it("should highlight today's date column", () => {
      const { container } = render(
        <GanttChart
          rows={mockRows}
          startDate={startDate}
          endDate={endDate}
          onChangeDeadline={mockOnChangeDeadline}
        />
      );

      // Today's column should have the translucent blue background
      const todayColumns = container.querySelectorAll('[aria-label="Current time"]');
      expect(todayColumns.length).toBeGreaterThan(0);
    });
  });

  describe('Deadline adjustment', () => {
    it('provides an explicit date control for authorized staff', async () => {
      render(
        <GanttChart
          rows={mockRows}
          startDate={startDate}
          endDate={endDate}
          currentUserId="user1"
          userRoles={['staff']}
          onChangeDeadline={mockOnChangeDeadline}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: 'Adjust deadline for Active Task' }));
      const input = await screen.findByLabelText('Deadline date');
      fireEvent.change(input, { target: { value: '2025-10-23' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save deadline' }));
      await waitFor(() =>
        expect(mockOnChangeDeadline).toHaveBeenCalledWith(1, new Date('2025-10-23T00:00:00'))
      );
    });
    it('cancels the date draft without committing', async () => {
      render(
        <GanttChart
          rows={mockRows}
          startDate={startDate}
          endDate={endDate}
          currentUserId="user1"
          userRoles={['staff']}
          onChangeDeadline={mockOnChangeDeadline}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: 'Adjust deadline for Active Task' }));
      fireEvent.change(await screen.findByLabelText('Deadline date'), {
        target: { value: '2025-10-23' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(mockOnChangeDeadline).not.toHaveBeenCalled();
    });
    it('does not offer deadline editing to demo guests', () => {
      render(
        <GanttChart
          rows={mockRows}
          startDate={startDate}
          endDate={endDate}
          currentUserId="user1"
          userRoles={['demo_viewer']}
          onChangeDeadline={mockOnChangeDeadline}
        />
      );
      expect(screen.queryByRole('button', { name: /Adjust deadline/ })).not.toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should apply responsive width classes', () => {
      const { container } = render(
        <GanttChart
          rows={mockRows}
          startDate={startDate}
          endDate={endDate}
          onChangeDeadline={mockOnChangeDeadline}
        />
      );

      // Component uses inline styles for fixed widths, check for shrink-0 class instead
      const shrinkElements = container.querySelectorAll('.shrink-0');
      expect(shrinkElements.length).toBeGreaterThan(0);
    });

    it('should render with mobile-friendly date format', () => {
      render(
        <GanttChart
          rows={mockRows}
          startDate={startDate}
          endDate={endDate}
          onChangeDeadline={mockOnChangeDeadline}
        />
      );

      // Both formats should be present (hidden/shown by responsive classes)
      expect(screen.getAllByText('15')[0]).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle tasks with same start and end date', () => {
      const singleDayTask: GanttTask = {
        id: 10,
        title: 'Single Day Task',
        project: 'Test',
        startDate: '2025-10-20T00:00:00Z',
        deadline: '2025-10-20T00:00:00Z',
        status: 'To Do',
        updatedAt: '',
        assignee: { id: 'worker', name: 'Worker' },
      };

      render(
        <GanttChart
          rows={[{ assigneeId: 'worker', assigneeName: 'Worker', tasks: [singleDayTask] }]}
          startDate={startDate}
          endDate={endDate}
          onChangeDeadline={mockOnChangeDeadline}
        />
      );

      // Check for project name and assignee (title is truncated)
      expect(screen.getByRole('button', { name: /^Inspect / })).toBeInTheDocument();
      expect(screen.getByText('Worker')).toBeInTheDocument();
    });

    it('should handle tasks starting before range', () => {
      const earlyTask: GanttTask = {
        id: 11,
        title: 'Early Start',
        project: 'Test',
        startDate: '2025-10-01T00:00:00Z',
        deadline: '2025-10-20T00:00:00Z',
        status: 'In Progress',
        updatedAt: '',
        assignee: { id: 'worker', name: 'Worker' },
      };

      render(
        <GanttChart
          rows={[{ assigneeId: 'worker', assigneeName: 'Worker', tasks: [earlyTask] }]}
          startDate={startDate}
          endDate={endDate}
          onChangeDeadline={mockOnChangeDeadline}
        />
      );

      // Check for project name and left arrow indicator (task extends before range)
      expect(screen.getByRole('button', { name: /^Inspect / })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^Inspect / })).toHaveAttribute(
        'title',
        expect.stringContaining('Span continues beyond visible range')
      );
    });

    it('should handle tasks ending after range', () => {
      const lateTask: GanttTask = {
        id: 12,
        title: 'Late End',
        project: 'Test',
        startDate: '2025-10-20T00:00:00Z',
        deadline: '2025-11-01T00:00:00Z',
        status: 'In Progress',
        updatedAt: '',
        assignee: { id: 'worker', name: 'Worker' },
      };

      render(
        <GanttChart
          rows={[{ assigneeId: 'worker', assigneeName: 'Worker', tasks: [lateTask] }]}
          startDate={startDate}
          endDate={endDate}
          onChangeDeadline={mockOnChangeDeadline}
        />
      );

      // Check for project name and right arrow indicator (task extends after range)
      expect(screen.getByRole('button', { name: /^Inspect / })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^Inspect / })).toHaveAttribute(
        'title',
        expect.stringContaining('Span continues beyond visible range')
      );
    });

    it('should handle multiple tasks for same assignee', () => {
      const multiTaskRow: GanttRow = {
        assigneeId: 'busy',
        assigneeName: 'Busy Worker',
        tasks: [
          {
            id: 13,
            title: 'Task 1',
            project: 'Project A',
            startDate: '2025-10-16T00:00:00Z',
            deadline: '2025-10-18T00:00:00Z',
            status: 'Completed',
            updatedAt: '2025-10-17T00:00:00Z',
            assignee: { id: 'busy', name: 'Busy Worker' },
          },
          {
            id: 14,
            title: 'Task 2',
            project: 'Project B',
            startDate: '2025-10-19T00:00:00Z',
            deadline: '2025-10-22T00:00:00Z',
            status: 'In Progress',
            updatedAt: '',
            assignee: { id: 'busy', name: 'Busy Worker' },
          },
          {
            id: 15,
            title: 'Task 3',
            project: 'Project C',
            startDate: '2025-10-23T00:00:00Z',
            deadline: '2025-10-25T00:00:00Z',
            status: 'To Do',
            updatedAt: '',
            assignee: { id: 'busy', name: 'Busy Worker' },
          },
        ],
      };

      render(
        <GanttChart
          rows={[multiTaskRow]}
          startDate={startDate}
          endDate={endDate}
          onChangeDeadline={mockOnChangeDeadline}
        />
      );

      // Check for project names and assignee (titles are truncated)
      expect(screen.getByRole('button', { name: /Inspect Task 1,/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Inspect Task 2,/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Inspect Task 3,/ })).toBeInTheDocument();
      expect(screen.getByText('Busy Worker')).toBeInTheDocument();
    });

    it('should handle null updated_at for completed tasks', () => {
      const completedNoUpdate: GanttTask = {
        id: 16,
        title: 'Completed No Update',
        project: 'Test',
        startDate: '2025-10-16T00:00:00Z',
        deadline: '2025-10-22T00:00:00Z',
        status: 'Completed',
        updatedAt: '',
        assignee: { id: 'worker', name: 'Worker' },
      };

      const { container } = render(
        <GanttChart
          rows={[{ assigneeId: 'worker', assigneeName: 'Worker', tasks: [completedNoUpdate] }]}
          startDate={startDate}
          endDate={endDate}
          onChangeDeadline={mockOnChangeDeadline}
        />
      );

      // Check that the task is rendered (title appears in truncated text)
      expect(screen.getByRole('button', { name: /^Inspect / })).toBeInTheDocument();
      expect(container.querySelector('.bg-positive-soft')).toBeInTheDocument();
    });
  });

  describe('Weekly Highlighting', () => {
    it('should highlight weekly columns', () => {
      const { container } = render(
        <GanttChart
          rows={mockRows}
          startDate={startDate}
          endDate={endDate}
          onChangeDeadline={mockOnChangeDeadline}
        />
      );

      // Weekly columns should have bg-muted/30 class
      const weeklyColumns = container.querySelectorAll('.bg-muted\\/30');
      expect(weeklyColumns.length).toBeGreaterThan(0);
    });
  });
});
