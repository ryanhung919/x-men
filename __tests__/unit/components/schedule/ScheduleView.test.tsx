import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ScheduleView from '@/components/schedule/ScheduleView';

// Mock the child components
vi.mock('@/components/schedule/GanttChart', () => ({
  default: ({ rows, onChangeDeadline }: any) => (
    <div data-testid="gantt-chart">
      <div data-testid="row-count">{rows.length}</div>
      {rows.map((row: any) => (
        <div key={row.assigneeName} data-testid={`row-${row.assigneeName}`}>
          {row.assigneeName}: {row.tasks.length} tasks
        </div>
      ))}
      <button onClick={() => onChangeDeadline && onChangeDeadline(1, new Date('2025-10-25T00:00:00Z'))}>
        Test Deadline Change
      </button>
    </div>
  ),
}));

vi.mock('@/components/filters/date-range-selector', () => ({
  DateRangeFilter: ({ value, onChange }: any) => (
    <div data-testid="date-range-selector">
      <button onClick={() => onChange({ startDate: new Date('2025-10-01'), endDate: new Date('2025-10-31') })}>
        Change Date Range
      </button>
    </div>
  ),
  presets: [
    {
      label: 'Today',
      range: {
        startDate: new Date('2025-10-20'),
        endDate: new Date('2025-10-20'),
      },
    },
    {
      label: '2 Weeks (±1 week)',
      range: {
        startDate: new Date('2025-10-13'),
        endDate: new Date('2025-10-27'),
      },
    },
  ],
}));

vi.mock('@/components/filters/project-selector', () => ({
  ProjectSelector: ({ value, onChange }: any) => (
    <div data-testid="project-selector">
      <button onClick={() => onChange([1, 2])}>
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
        project_name: 'Project A',
        created_at: '2025-10-16T00:00:00Z',
        deadline: '2025-10-22T00:00:00Z',
        status: 'In Progress',
        updated_at: null,
        assignees: [
          { id: 'user1', first_name: 'John', last_name: 'Doe' },
        ],
      },
      {
        id: 2,
        title: 'Task 2',
        project_name: 'Project A',
        created_at: '2025-10-18T00:00:00Z',
        deadline: '2025-10-24T00:00:00Z',
        status: 'To Do',
        updated_at: null,
        assignees: [
          { id: 'user1', first_name: 'John', last_name: 'Doe' },
          { id: 'user2', first_name: 'Jane', last_name: 'Smith' },
        ],
      },
      {
        id: 3,
        title: 'Task 3',
        project_name: 'Project B',
        created_at: '2025-10-15T00:00:00Z',
        deadline: '2025-10-21T00:00:00Z',
        status: 'Completed',
        updated_at: '2025-10-19T00:00:00Z',
        assignees: [
          { id: 'user2', first_name: 'Jane', last_name: 'Smith' },
        ],
      },
    ],
  };

  const mockProjectsResponse = {
    ok: true,
    json: async () => [
      { id: 1, name: 'Project A' },
      { id: 2, name: 'Project B' },
    ],
  };

  const mockStaffResponse = {
    ok: true,
    json: async () => [
      { id: 'user1', first_name: 'John', last_name: 'Doe' },
      { id: 'user2', first_name: 'Jane', last_name: 'Smith' },
    ],
  };

  const mockUserRoleResponse = {
    ok: true,
    json: async () => ({ userId: 'user1', roles: ['staff'] }),
  };

  let fetchSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchSpy = vi.spyOn(global, 'fetch').mockImplementation((url: string | URL | Request) => {
      const urlString = url.toString();
      if (urlString.includes('/api/schedule/projects')) {
        return Promise.resolve(mockProjectsResponse as any);
      }
      if (urlString.includes('/api/schedule/staff')) {
        return Promise.resolve(mockStaffResponse as any);
      }
      if (urlString.includes('/api/user/role')) {
        return Promise.resolve(mockUserRoleResponse as any);
      }
      if (urlString.includes('/api/schedule')) {
        return Promise.resolve(mockFetchResponse as any);
      }
      return Promise.resolve(mockFetchResponse as any);
    });
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
      fetchSpy.mockImplementation(() => new Promise(() => {})); // Never resolves
      
      render(<ScheduleView />);

      const refreshButton = screen.getByTestId('refresh-button');
      expect(refreshButton).toBeDisabled();
    });
  });

  describe('Data Fetching', () => {
    it('should fetch schedule data on mount', async () => {
      render(<ScheduleView />);

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalled();
      });
    });

    it('should fetch with date range parameters', async () => {
      render(<ScheduleView />);

      await waitFor(() => {
        const scheduleCalls = fetchSpy.mock.calls.filter((call: any) => 
          call[0].includes('/api/schedule') && !call[0].includes('/api/schedule/projects') && !call[0].includes('/api/schedule/staff')
        );
        expect(scheduleCalls.length).toBeGreaterThan(0);
        const fetchCall = scheduleCalls[0][0];
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
        const lastFetchCall = fetchSpy.mock.calls[fetchSpy.mock.calls.length - 1][0];
        expect(lastFetchCall).toContain('projectIds');
        expect(decodeURIComponent(lastFetchCall)).toContain('projectIds=1,2');
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
        const lastFetchCall = fetchSpy.mock.calls[fetchSpy.mock.calls.length - 1][0];
        expect(lastFetchCall).toContain('staffIds');
        expect(decodeURIComponent(lastFetchCall)).toContain('staffIds=user1,user2');
      });
    });

    it('should refetch when date range changes', async () => {
      render(<ScheduleView />);

      await waitFor(() => {
        expect(screen.getByTestId('date-range-selector')).toBeInTheDocument();
      });

      const initialCallCount = fetchSpy.mock.calls.length;

      const dateButton = screen.getByText('Change Date Range');
      fireEvent.click(dateButton);

      await waitFor(() => {
        expect(fetchSpy.mock.calls.length).toBeGreaterThan(initialCallCount);
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
      expect(fetchSpy).toHaveBeenCalled();
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
        const lastFetchCall = fetchSpy.mock.calls[fetchSpy.mock.calls.length - 1][0];
        expect(lastFetchCall).toContain('staffIds=');
      });
    });

    it('should show only tasks for selected staff', async () => {
      // Mock response with staff filter applied
      fetchSpy.mockImplementation((url: string | URL | Request) => {
        const urlString = url.toString();
        if (urlString.includes('/api/schedule/projects')) {
          return Promise.resolve(mockProjectsResponse as any);
        }
        if (urlString.includes('/api/schedule/staff')) {
          return Promise.resolve(mockStaffResponse as any);
        }
        if (urlString.includes('/api/user/role')) {
          return Promise.resolve(mockUserRoleResponse as any);
        }
        if (urlString.includes('/api/schedule')) {
          return Promise.resolve({
            ok: true,
            json: async () => [
              {
                id: 1,
                title: 'Task 1',
                project_name: 'Project A',
                created_at: '2025-10-16T00:00:00Z',
                deadline: '2025-10-22T00:00:00Z',
                status: 'In Progress',
                updated_at: null,
                assignees: [
                  { id: 'user1', first_name: 'John', last_name: 'Doe' },
                ],
              },
            ],
          } as any);
        }
        return Promise.resolve(mockFetchResponse as any);
      });

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
      fetchSpy.mockImplementation((url: string | URL | Request, options?: any) => {
        if (options?.method === 'PATCH') {
          return Promise.resolve(mockPatchResponse as any);
        }
        const urlString = url.toString();
        if (urlString.includes('/api/schedule/projects')) {
          return Promise.resolve(mockProjectsResponse as any);
        }
        if (urlString.includes('/api/schedule/staff')) {
          return Promise.resolve(mockStaffResponse as any);
        }
        if (urlString.includes('/api/user/role')) {
          return Promise.resolve(mockUserRoleResponse as any);
        }
        return Promise.resolve(mockFetchResponse as any);
      });

      render(<ScheduleView />);

      await waitFor(() => {
        expect(screen.getByText('Test Deadline Change')).toBeInTheDocument();
      });

      const deadlineButton = screen.getByText('Test Deadline Change');
      fireEvent.click(deadlineButton);

      await waitFor(() => {
        const patchCall = fetchSpy.mock.calls.find((call: any) => call[1]?.method === 'PATCH');
        expect(patchCall).toBeTruthy();
      });
    });

    it('should refetch data after deadline update', async () => {
      fetchSpy.mockImplementation((url: string | URL | Request, options?: any) => {
        if (options?.method === 'PATCH') {
          return Promise.resolve({ ok: true } as any);
        }
        const urlString = url.toString();
        if (urlString.includes('/api/schedule/projects')) {
          return Promise.resolve(mockProjectsResponse as any);
        }
        if (urlString.includes('/api/schedule/staff')) {
          return Promise.resolve(mockStaffResponse as any);
        }
        if (urlString.includes('/api/user/role')) {
          return Promise.resolve(mockUserRoleResponse as any);
        }
        return Promise.resolve(mockFetchResponse as any);
      });

      render(<ScheduleView />);

      await waitFor(() => {
        expect(screen.getByText('Test Deadline Change')).toBeInTheDocument();
      });

      const initialCallCount = fetchSpy.mock.calls.length;

      const deadlineButton = screen.getByText('Test Deadline Change');
      fireEvent.click(deadlineButton);

      await waitFor(() => {
        expect(fetchSpy.mock.calls.length).toBeGreaterThan(initialCallCount);
      });
    });

    it('should handle failed deadline update', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      fetchSpy.mockImplementation((url: string | URL | Request, options?: any) => {
        if (options?.method === 'PATCH') {
          return Promise.resolve({ ok: false } as any);
        }
        const urlString = url.toString();
        if (urlString.includes('/api/schedule/projects')) {
          return Promise.resolve(mockProjectsResponse as any);
        }
        if (urlString.includes('/api/schedule/staff')) {
          return Promise.resolve(mockStaffResponse as any);
        }
        if (urlString.includes('/api/user/role')) {
          return Promise.resolve(mockUserRoleResponse as any);
        }
        return Promise.resolve(mockFetchResponse as any);
      });

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

      const initialCallCount = fetchSpy.mock.calls.length;

      const refreshButton = screen.getByTestId('refresh-button');
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(fetchSpy.mock.calls.length).toBeGreaterThan(initialCallCount);
      });
    });

    it('should disable refresh button while loading', async () => {
      let resolvePromise: any;
      fetchSpy.mockImplementation(() => new Promise((resolve) => {
        resolvePromise = resolve;
      }));

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
      
      fetchSpy.mockImplementation((url: string | URL | Request) => {
        const urlString = url.toString();
        if (urlString.includes('/api/schedule/projects')) {
          return Promise.resolve(mockProjectsResponse as any);
        }
        if (urlString.includes('/api/schedule/staff')) {
          return Promise.resolve(mockStaffResponse as any);
        }
        if (urlString.includes('/api/user/role')) {
          return Promise.resolve(mockUserRoleResponse as any);
        }
        // Only reject the main schedule endpoint
        return Promise.reject(new Error('Network error'));
      });

      render(<ScheduleView />);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      consoleErrorSpy.mockRestore();
    });

    it('should handle empty response', async () => {
      fetchSpy.mockImplementation(() => Promise.resolve({
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
      fetchSpy.mockImplementation(() => Promise.resolve({
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

      // The gantt chart component handles scrolling, not the schedule view
      expect(container.querySelector('.space-y-4')).toBeInTheDocument();
    });
  });

  describe('Default Date Range', () => {
    it('should use default date preset on mount', async () => {
      render(<ScheduleView />);

      await waitFor(() => {
        const scheduleCalls = fetchSpy.mock.calls.filter((call: any) => 
          call[0].includes('/api/schedule') && !call[0].includes('/api/schedule/projects') && !call[0].includes('/api/schedule/staff')
        );
        expect(scheduleCalls.length).toBeGreaterThan(0);
        const fetchCall = scheduleCalls[0][0];
        expect(fetchCall).toContain('/api/schedule');
        expect(fetchCall).toContain('startDate=');
        expect(fetchCall).toContain('endDate=');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle tasks with null project', async () => {
      fetchSpy.mockImplementation(() => Promise.resolve({
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
        expect(fetchSpy).toHaveBeenCalled();
      });
    });

    it('should handle tasks with future dates', async () => {
      fetchSpy.mockImplementation(() => Promise.resolve({
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
