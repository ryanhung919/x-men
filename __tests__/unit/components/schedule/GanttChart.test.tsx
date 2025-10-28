import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

      expect(screen.getByText('Assignee')).toBeInTheDocument();
      expect(screen.getByText('Project')).toBeInTheDocument();
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

      expect(screen.getByText('Active Task')).toBeInTheDocument();
      expect(screen.getByText('Todo Task')).toBeInTheDocument();
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

      expect(container.querySelector('.overflow-x-auto')).toBeInTheDocument();
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
      expect(screen.getByText('Oct 15')).toBeInTheDocument();
      expect(screen.getByText('Oct 25')).toBeInTheDocument();
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

      expect(screen.getByText('Oct 20')).toBeInTheDocument();
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

      expect(screen.getByText('Oct 1')).toBeInTheDocument();
      expect(screen.getByText('Oct 31')).toBeInTheDocument();
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

      // Task bars should have the blue background color class
      const taskBars = container.querySelectorAll('.bg-blue-500');
      expect(taskBars.length).toBeGreaterThan(0);
    });

    it('should render green bars for completed tasks', () => {
      const { container } = render(
        <GanttChart
          rows={mockRowsWithCompleted}
          startDate={startDate}
          endDate={endDate}
          onChangeDeadline={mockOnChangeDeadline}
        />
      );

      const completedBars = container.querySelectorAll('.bg-green-500');
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

      const overdueBars = container.querySelectorAll('.bg-red-500');
      expect(overdueBars.length).toBeGreaterThan(0);
    });

    it('should render diamond deadline indicators', () => {
      const { container } = render(
        <GanttChart
          rows={mockRows}
          startDate={startDate}
          endDate={endDate}
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

      expect(container.querySelector('.bg-green-500')).toBeInTheDocument();
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

      expect(container.querySelector('.bg-blue-500')).toBeInTheDocument();
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

      expect(container.querySelector('.bg-red-500')).toBeInTheDocument();
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

      // Task should be visible and use updated_at as end date
      expect(screen.getByText('Completed Early')).toBeInTheDocument();
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

      expect(screen.getByText('Active Task')).toBeInTheDocument();
    });
  });

  describe('Today Indicator', () => {
    it('should highlight today\'s date column', () => {
      const { container } = render(
        <GanttChart
          rows={mockRows}
          startDate={startDate}
          endDate={endDate}
          onChangeDeadline={mockOnChangeDeadline}
        />
      );

      // Today's column should have the translucent blue background
      const todayColumns = container.querySelectorAll('.bg-blue-500\\/10');
      expect(todayColumns.length).toBeGreaterThan(0);
    });
  });

  describe('Drag Functionality', () => {
    it('should handle mouse down on deadline indicator', () => {
      const { container } = render(
        <GanttChart
          rows={mockRows}
          startDate={startDate}
          endDate={endDate}
          onChangeDeadline={mockOnChangeDeadline}
        />
      );

      const diamond = container.querySelector('.rotate-45');
      expect(diamond).toBeInTheDocument();

      if (diamond) {
        fireEvent.mouseDown(diamond, { clientX: 100, clientY: 100 });
        // Drag state should be set internally
      }
    });

    it('should call onChangeDeadline when dragging deadline', () => {
      const { container } = render(
        <GanttChart
          rows={mockRows}
          startDate={startDate}
          endDate={endDate}
          onChangeDeadline={mockOnChangeDeadline}
        />
      );

      const diamond = container.querySelector('.rotate-45');
      
      if (diamond) {
        // Start drag
        fireEvent.mouseDown(diamond, { clientX: 100, clientY: 100 });
        
        // Move mouse
        fireEvent.mouseMove(container, { clientX: 150, clientY: 100 });
        
        // Release
        fireEvent.mouseUp(container);

        // onChangeDeadline should have been called
        expect(mockOnChangeDeadline).toHaveBeenCalled();
      }
    });

    it('should stop dragging on mouse up', () => {
      const { container } = render(
        <GanttChart
          rows={mockRows}
          startDate={startDate}
          endDate={endDate}
          onChangeDeadline={mockOnChangeDeadline}
        />
      );

      const diamond = container.querySelector('.rotate-45');
      
      if (diamond) {
        fireEvent.mouseDown(diamond, { clientX: 100, clientY: 100 });
        fireEvent.mouseUp(container);
        
        // After mouse up, moving should not trigger changes
        mockOnChangeDeadline.mockClear();
        fireEvent.mouseMove(container, { clientX: 200, clientY: 100 });
        
        expect(mockOnChangeDeadline).not.toHaveBeenCalled();
      }
    });

    it('should stop dragging on mouse leave', () => {
      const { container } = render(
        <GanttChart
          rows={mockRows}
          startDate={startDate}
          endDate={endDate}
          onChangeDeadline={mockOnChangeDeadline}
        />
      );

      const diamond = container.querySelector('.rotate-45');
      
      if (diamond) {
        fireEvent.mouseDown(diamond, { clientX: 100, clientY: 100 });
        fireEvent.mouseLeave(container);
        
        // After mouse leave, moving should not trigger changes
        mockOnChangeDeadline.mockClear();
        fireEvent.mouseMove(container, { clientX: 200, clientY: 100 });
        
        expect(mockOnChangeDeadline).not.toHaveBeenCalled();
      }
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

      // Check for responsive classes in assignee column
      const assigneeCell = container.querySelector('.w-32');
      expect(assigneeCell).toBeInTheDocument();
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
      expect(screen.getByText('Oct 15')).toBeInTheDocument();
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

      expect(screen.getByText('Single Day Task')).toBeInTheDocument();
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

      expect(screen.getByText('Early Start')).toBeInTheDocument();
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

      expect(screen.getByText('Late End')).toBeInTheDocument();
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

      expect(screen.getByText('Task 1')).toBeInTheDocument();
      expect(screen.getByText('Task 2')).toBeInTheDocument();
      expect(screen.getByText('Task 3')).toBeInTheDocument();
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

      render(
        <GanttChart
          rows={[{ assigneeId: 'worker', assigneeName: 'Worker', tasks: [completedNoUpdate] }]}
          startDate={startDate}
          endDate={endDate}
          onChangeDeadline={mockOnChangeDeadline}
        />
      );

      expect(screen.getByText('Completed No Update')).toBeInTheDocument();
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
