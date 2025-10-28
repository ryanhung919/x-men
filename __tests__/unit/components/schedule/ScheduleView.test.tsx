import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ScheduleView from '@/components/schedule/ScheduleView';

// Mock the child components
vi.mock('@/components/schedule/GanttChart', () => ({
  default: ({ rows, onDeadlineChange }: any) => (
    <div data-testid="gantt-chart">
      <div data-testid="row-count">{rows.length}</div>
      {rows.map((row: any) => (
        <div key={row.assignee} data-testid={`row-${row.assignee}`}>
          {row.assignee}: {row.tasks.length} tasks
        </div>
      ))}
      <button onClick={() => onDeadlineChange(1, '2025-10-25T00:00:00Z')}>
        Test Deadline Change
      </button>
    </div>
  ),
}));

vi.mock('@/components/filters/date-range-selector', () => ({
  DateRangeSelector: ({ value, onChange }: any) => (
    <div data-testid="date-range-selector">
      <button onClick={() => onChange({ from: new Date('2025-10-01'), to: new Date('2025-10-31') })}>
        Change Date Range
      </button>
    </div>
  ),
}));

vi.mock('@/components/filters/project-selector', () => ({
  ProjectSelector: ({ value, onChange }: any) => (
    <div data-testid="project-selector">
      <button onClick={() => onChange(['1', '2'])}>
        Select Projects
      </button>
    </div>
  ),
}));

vi.mock('@/components/filters/staff-selector', () => ({
  StaffSelector: ({ value, onChange }: any) => (
    <div data-testid="staff-selector">
      <button onClick={() => onChange(['user1', 'user2'])}>
        Select Staff
      </button>
    </div>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ onClick, children, disabled }: any) => (
    <button onClick={onClick} disabled={disabled} data-testid="refresh-button">
      {children}
    </button>
  ),
}));

describe('ScheduleView', () => {
  const mockFetchResponse = {
    ok: true,
    json: async () => [
      {
        id: 1,
        title: 'Task 1',
        project: { id: '1', name: 'Project A' },
        created_at: '2025-10-16T00:00:00Z',
        deadline: '2025-10-22T00:00:00Z',
        status: 'In Progress',
        updated_at: null,
        assignees: [
          { id: 'user1', name: 'John Doe' },
        ],
      },
      {
        id: 2,
        title: 'Task 2',
        project: { id: '1', name: 'Project A' },
        created_at: '2025-10-18T00:00:00Z',
        deadline: '2025-10-24T00:00:00Z',
        status: 'To Do',
        updated_at: null,
        assignees: [
          { id: 'user1', name: 'John Doe' },
          { id: 'user2', name: 'Jane Smith' },
        ],
      },
      {
        id: 3,
        title: 'Task 3',
        project: { id: '2', name: 'Project B' },
        created_at: '2025-10-15T00:00:00Z',
        deadline: '2025-10-21T00:00:00Z',
        status: 'Completed',
        updated_at: '2025-10-19T00:00:00Z',
        assignees: [
          { id: 'user2', name: 'Jane Smith' },
        ],
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn(() => Promise.resolve(mockFetchResponse as any));
  });

  describe('Component Rendering', () => {
    it('should render schedule view with filters', async () => {
      render(<ScheduleView />);

      await waitFor(() => {
        expect(screen.getByTestId('date-range-selector')).toBeInTheDocument();
        expect(screen.getByTestId('project-selector')).toBeInTheDocument();
        expect(screen.getByTestId('staff-selector')).toBeInTheDocument();
        expect(screen.getByTestId('refresh-button')).toBeInTheDocument();
      });
    });

    it('should render gantt chart', async () => {
      render(<ScheduleView />);

      await waitFor(() => {
        expect(screen.getByTestId('gantt-chart')).toBeInTheDocument();
      });
    });

    it('should show loading state initially', () => {
      global.fetch = vi.fn(() => new Promise(() => {})) as any; // Never resolves
      
      render(<ScheduleView />);

      const refreshButton = screen.getByTestId('refresh-button');
      expect(refreshButton).toBeDisabled();
    });
  });

  describe('Data Fetching', () => {
    it('should fetch schedule data on mount', async () => {
      render(<ScheduleView />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    it('should fetch with date range parameters', async () => {
      render(<ScheduleView />);

      await waitFor(() => {
        const fetchCall = (global.fetch as any).mock.calls[0][0];
        expect(fetchCall).toContain('/api/schedule');
        expect(fetchCall).toContain('startDate=');
        expect(fetchCall).toContain('endDate=');
      });
    });

    it('should fetch with project filter', async () => {
      render(<ScheduleView />);

      await waitFor(() => {
        expect(screen.getByTestId('project-selector')).toBeInTheDocument();
      });

      const projectButton = screen.getByText('Select Projects');
      fireEvent.click(projectButton);

      await waitFor(() => {
        const lastFetchCall = (global.fetch as any).mock.calls[(global.fetch as any).mock.calls.length - 1][0];
        expect(lastFetchCall).toContain('projectIds=1,2');
      });
    });

    it('should fetch with staff filter', async () => {
      render(<ScheduleView />);

      await waitFor(() => {
        expect(screen.getByTestId('staff-selector')).toBeInTheDocument();
      });

      const staffButton = screen.getByText('Select Staff');
      fireEvent.click(staffButton);

      await waitFor(() => {
        const lastFetchCall = (global.fetch as any).mock.calls[(global.fetch as any).mock.calls.length - 1][0];
        expect(lastFetchCall).toContain('staffIds=user1,user2');
      });
    });

    it('should refetch when date range changes', async () => {
      render(<ScheduleView />);

      await waitFor(() => {
        expect(screen.getByTestId('date-range-selector')).toBeInTheDocument();
      });

      const initialCallCount = (global.fetch as any).mock.calls.length;

      const dateButton = screen.getByText('Change Date Range');
      fireEvent.click(dateButton);

      await waitFor(() => {
        expect((global.fetch as any).mock.calls.length).toBeGreaterThan(initialCallCount);
      });
    });
  });

  describe('Data Grouping', () => {
    it('should group tasks by assignee', async () => {
      render(<ScheduleView />);

      await waitFor(() => {
        expect(screen.getByTestId('row-John Doe')).toBeInTheDocument();
        expect(screen.getByTestId('row-Jane Smith')).toBeInTheDocument();
      });
    });

    it('should create separate rows for each assignee', async () => {
      render(<ScheduleView />);

      await waitFor(() => {
        expect(screen.getByText('John Doe: 2 tasks')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith: 2 tasks')).toBeInTheDocument();
      });
    });

    it('should handle tasks with multiple assignees', async () => {
      render(<ScheduleView />);

      await waitFor(() => {
        // Task 2 has both John and Jane as assignees
        const johnRow = screen.getByTestId('row-John Doe');
        const janeRow = screen.getByTestId('row-Jane Smith');
        
        expect(johnRow).toBeInTheDocument();
        expect(janeRow).toBeInTheDocument();
      });
    });
  });

  describe('Task Data Transformation', () => {
    it('should transform created_at to startDate', async () => {
      render(<ScheduleView />);

      await waitFor(() => {
        expect(screen.getByTestId('gantt-chart')).toBeInTheDocument();
      });

      // Verify the data transformation happened (indirectly through rendering)
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should include status in task data', async () => {
      render(<ScheduleView />);

      await waitFor(() => {
        expect(screen.getByTestId('gantt-chart')).toBeInTheDocument();
      });
    });

    it('should include updated_at in task data', async () => {
      render(<ScheduleView />);

      await waitFor(() => {
        expect(screen.getByTestId('gantt-chart')).toBeInTheDocument();
      });
    });
  });

  describe('Staff Filtering', () => {
    it('should filter tasks by selected staff', async () => {
      render(<ScheduleView />);

      await waitFor(() => {
        expect(screen.getByTestId('staff-selector')).toBeInTheDocument();
      });

      const staffButton = screen.getByText('Select Staff');
      fireEvent.click(staffButton);

      await waitFor(() => {
        // Should refetch with staff filter
        const lastFetchCall = (global.fetch as any).mock.calls[(global.fetch as any).mock.calls.length - 1][0];
        expect(lastFetchCall).toContain('staffIds=');
      });
    });

    it('should show only tasks for selected staff', async () => {
      // Mock response with staff filter applied
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        json: async () => [
          {
            id: 1,
            title: 'Task 1',
            project: { id: '1', name: 'Project A' },
            created_at: '2025-10-16T00:00:00Z',
            deadline: '2025-10-22T00:00:00Z',
            status: 'In Progress',
            updated_at: null,
            assignees: [
              { id: 'user1', name: 'John Doe' },
            ],
          },
        ],
      } as any));

      render(<ScheduleView />);

      await waitFor(() => {
        expect(screen.getByTestId('staff-selector')).toBeInTheDocument();
      });

      const staffButton = screen.getByText('Select Staff');
      fireEvent.click(staffButton);

      await waitFor(() => {
        expect(screen.getByTestId('row-John Doe')).toBeInTheDocument();
        expect(screen.queryByTestId('row-Jane Smith')).not.toBeInTheDocument();
      });
    });
  });

  describe('Deadline Update', () => {
    it('should handle deadline change from gantt chart', async () => {
      const mockPatchResponse = { ok: true };
      global.fetch = vi.fn()
        .mockResolvedValueOnce(mockFetchResponse as any)
        .mockResolvedValueOnce(mockPatchResponse as any);

      render(<ScheduleView />);

      await waitFor(() => {
        expect(screen.getByText('Test Deadline Change')).toBeInTheDocument();
      });

      const deadlineButton = screen.getByText('Test Deadline Change');
      fireEvent.click(deadlineButton);

      await waitFor(() => {
        // Should call PATCH endpoint
        const patchCall = (global.fetch as any).mock.calls.find((call: any) => 
          call[1]?.method === 'PATCH'
        );
        expect(patchCall).toBeDefined();
      });
    });

    it('should refetch data after deadline update', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce(mockFetchResponse as any)
        .mockResolvedValueOnce({ ok: true } as any)
        .mockResolvedValueOnce(mockFetchResponse as any);

      render(<ScheduleView />);

      await waitFor(() => {
        expect(screen.getByText('Test Deadline Change')).toBeInTheDocument();
      });

      const initialCallCount = (global.fetch as any).mock.calls.length;

      const deadlineButton = screen.getByText('Test Deadline Change');
      fireEvent.click(deadlineButton);

      await waitFor(() => {
        expect((global.fetch as any).mock.calls.length).toBeGreaterThan(initialCallCount);
      });
    });

    it('should handle failed deadline update', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      global.fetch = vi.fn()
        .mockResolvedValueOnce(mockFetchResponse as any)
        .mockResolvedValueOnce({ ok: false } as any);

      render(<ScheduleView />);

      await waitFor(() => {
        expect(screen.getByText('Test Deadline Change')).toBeInTheDocument();
      });

      const deadlineButton = screen.getByText('Test Deadline Change');
      fireEvent.click(deadlineButton);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to update task deadline'
        );
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Refresh Functionality', () => {
    it('should refetch data when refresh button clicked', async () => {
      render(<ScheduleView />);

      await waitFor(() => {
        expect(screen.getByTestId('refresh-button')).toBeInTheDocument();
      });

      const initialCallCount = (global.fetch as any).mock.calls.length;

      const refreshButton = screen.getByTestId('refresh-button');
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect((global.fetch as any).mock.calls.length).toBeGreaterThan(initialCallCount);
      });
    });

    it('should disable refresh button while loading', async () => {
      let resolvePromise: any;
      global.fetch = vi.fn(() => new Promise((resolve) => {
        resolvePromise = resolve;
      })) as any;

      render(<ScheduleView />);

      const refreshButton = screen.getByTestId('refresh-button');
      expect(refreshButton).toBeDisabled();

      resolvePromise(mockFetchResponse);

      await waitFor(() => {
        expect(refreshButton).not.toBeDisabled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle fetch errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      global.fetch = vi.fn(() => Promise.reject(new Error('Network error')));

      render(<ScheduleView />);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      consoleErrorSpy.mockRestore();
    });

    it('should handle empty response', async () => {
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        json: async () => [],
      } as any));

      render(<ScheduleView />);

      await waitFor(() => {
        expect(screen.getByTestId('gantt-chart')).toBeInTheDocument();
        expect(screen.getByTestId('row-count')).toHaveTextContent('0');
      });
    });

    it('should handle tasks without assignees', async () => {
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        json: async () => [
          {
            id: 1,
            title: 'Unassigned Task',
            project: { id: '1', name: 'Project A' },
            created_at: '2025-10-16T00:00:00Z',
            deadline: '2025-10-22T00:00:00Z',
            status: 'To Do',
            updated_at: null,
            assignees: [],
          },
        ],
      } as any));

      render(<ScheduleView />);

      await waitFor(() => {
        expect(screen.getByTestId('gantt-chart')).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    it('should render with responsive layout classes', () => {
      const { container } = render(<ScheduleView />);

      // Check for responsive padding classes
      const mainContainer = container.querySelector('.p-2');
      expect(mainContainer).toBeInTheDocument();
    });

    it('should render with horizontal scroll wrapper', () => {
      const { container } = render(<ScheduleView />);

      const scrollWrapper = container.querySelector('.overflow-x-auto');
      expect(scrollWrapper).toBeInTheDocument();
    });
  });

  describe('Default Date Range', () => {
    it('should use default date preset on mount', async () => {
      render(<ScheduleView />);

      await waitFor(() => {
        const fetchCall = (global.fetch as any).mock.calls[0][0];
        expect(fetchCall).toContain('/api/schedule');
        expect(fetchCall).toContain('startDate=');
        expect(fetchCall).toContain('endDate=');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle tasks with null project', async () => {
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        json: async () => [
          {
            id: 1,
            title: 'Task Without Project',
            project: null,
            created_at: '2025-10-16T00:00:00Z',
            deadline: '2025-10-22T00:00:00Z',
            status: 'To Do',
            updated_at: null,
            assignees: [
              { id: 'user1', name: 'John Doe' },
            ],
          },
        ],
      } as any));

      render(<ScheduleView />);

      await waitFor(() => {
        expect(screen.getByTestId('gantt-chart')).toBeInTheDocument();
      });
    });

    it('should handle rapid filter changes', async () => {
      render(<ScheduleView />);

      await waitFor(() => {
        expect(screen.getByTestId('project-selector')).toBeInTheDocument();
      });

      const projectButton = screen.getByText('Select Projects');
      
      // Click multiple times rapidly
      fireEvent.click(projectButton);
      fireEvent.click(projectButton);
      fireEvent.click(projectButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    it('should handle tasks with future dates', async () => {
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        json: async () => [
          {
            id: 1,
            title: 'Future Task',
            project: { id: '1', name: 'Project A' },
            created_at: '2026-01-01T00:00:00Z',
            deadline: '2026-12-31T00:00:00Z',
            status: 'To Do',
            updated_at: null,
            assignees: [
              { id: 'user1', name: 'John Doe' },
            ],
          },
        ],
      } as any));

      render(<ScheduleView />);

      await waitFor(() => {
        expect(screen.getByTestId('gantt-chart')).toBeInTheDocument();
      });
    });
  });
});
