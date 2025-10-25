import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExportButtons } from '@/components/report/export-buttons';
import type { LoggedTimeReport, TeamSummaryReport, TaskCompletionReport } from '@/components/report/export-buttons';

describe('ExportButtons', () => {
  const mockLoggedTimeReport: LoggedTimeReport = {
    kind: 'loggedTime',
    totalTime: 100,
    avgTime: 50,
    completedTasks: 5,
    overdueTasks: 2,
    blockedTasks: 1,
    onTimeCompletionRate: 0.8,
    totalDelayHours: 10,
    incompleteTime: 30,
    overdueTime: 15,
    timeByTask: new Map([[1, 3600], [2, 7200]]),
    kpis: [
      { label: 'Total Time', value: 100, unit: 'h' },
      { label: 'Avg Time', value: 50, unit: 'h' },
    ],
    charts: [
      {
        type: 'bar',
        title: 'Test Chart',
        data: [{ label: 'Test', value: 10 }],
      },
    ],
  };

  const mockTeamSummaryReport: TeamSummaryReport = {
    kind: 'teamSummary',
    totalTasks: 50,
    totalUsers: 10,
    weeklyBreakdown: [
      {
        week: '2025-W01',
        weekStart: '2025-01-01',
        userId: 'user1',
        userName: 'John Doe',
        todo: 5,
        inProgress: 3,
        completed: 2,
        blocked: 1,
        total: 11,
      },
    ],
    userTotals: new Map([
      ['user1', {
        userName: 'John Doe',
        todo: 5,
        inProgress: 3,
        completed: 2,
        blocked: 1,
        total: 11,
      }],
    ]),
    kpis: [
      { label: 'Total Tasks', value: 50, unit: 'tasks' },
      { label: 'Total Users', value: 10, unit: 'users' },
    ],
    charts: [],
  };

  const mockTaskCompletionReport: TaskCompletionReport = {
    kind: 'taskCompletions',
    totalTasks: 20,
    totalCompleted: 10,
    totalInProgress: 5,
    totalTodo: 3,
    totalBlocked: 2,
    overallCompletionRate: 0.5,
    userStats: [
      {
        userId: 'user1',
        userName: 'John Doe',
        totalTasks: 10,
        completedTasks: 5,
        inProgressTasks: 3,
        todoTasks: 1,
        blockedTasks: 1,
        completionRate: 0.5,
        avgCompletionTime: 24,
        onTimeCompletions: 4,
        lateCompletions: 1,
        onTimeRate: 0.8,
        totalLoggedTime: 120,
        avgLoggedTimePerTask: 12,
      },
    ],
    completedByProject: new Map([[1, 5], [2, 5]]),
    kpis: [
      { label: 'Total Tasks', value: 20, unit: 'tasks' },
    ],
    charts: [],
  };

  describe('Component Rendering', () => {
    it('should render export buttons', () => {
      render(<ExportButtons reportData={mockLoggedTimeReport} />);
      
      expect(screen.getByText('Export PDF')).toBeInTheDocument();
      expect(screen.getByText('Export Excel')).toBeInTheDocument();
    });

    it('should render buttons with icons', () => {
      render(<ExportButtons reportData={mockLoggedTimeReport} />);
      
      const pdfButton = screen.getByText('Export PDF').closest('button');
      const excelButton = screen.getByText('Export Excel').closest('button');
      
      expect(pdfButton).toBeInTheDocument();
      expect(excelButton).toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    it('should disable buttons when disabled prop is true', () => {
      render(<ExportButtons reportData={mockLoggedTimeReport} disabled={true} />);
      
      const pdfButton = screen.getByText('Export PDF').closest('button');
      const excelButton = screen.getByText('Export Excel').closest('button');
      
      expect(pdfButton).toBeDisabled();
      expect(excelButton).toBeDisabled();
    });

    it('should enable buttons when disabled prop is false', () => {
      render(<ExportButtons reportData={mockLoggedTimeReport} disabled={false} />);
      
      const pdfButton = screen.getByText('Export PDF').closest('button');
      const excelButton = screen.getByText('Export Excel').closest('button');
      
      expect(pdfButton).not.toBeDisabled();
      expect(excelButton).not.toBeDisabled();
    });

    it('should enable buttons by default when disabled prop is not provided', () => {
      render(<ExportButtons reportData={mockLoggedTimeReport} />);
      
      const pdfButton = screen.getByText('Export PDF').closest('button');
      const excelButton = screen.getByText('Export Excel').closest('button');
      
      expect(pdfButton).not.toBeDisabled();
      expect(excelButton).not.toBeDisabled();
    });
  });

  describe('Export Handlers', () => {
    it('should call PDF export handler when PDF button is clicked', async () => {
      const { jsPDF } = await import('jspdf');
      const mockSave = vi.fn();
      
      (jsPDF as any).mockImplementation(() => ({
        internal: {
          pageSize: {
            getWidth: () => 842,
            getHeight: () => 595,
          },
        },
        setFont: vi.fn().mockReturnThis(),
        setFontSize: vi.fn().mockReturnThis(),
        text: vi.fn().mockReturnThis(),
        addPage: vi.fn().mockReturnThis(),
        save: mockSave,
        splitTextToSize: vi.fn(() => ['line1']),
        rect: vi.fn().mockReturnThis(),
        triangle: vi.fn().mockReturnThis(),
        setFillColor: vi.fn().mockReturnThis(),
        setTextColor: vi.fn().mockReturnThis(),
      }));

      render(<ExportButtons reportData={mockLoggedTimeReport} />);
      
      const pdfButton = screen.getByText('Export PDF').closest('button');
      fireEvent.click(pdfButton!);

      expect(mockSave).toHaveBeenCalledWith(expect.stringContaining('.pdf'));
    });

    it('should call Excel export handler when Excel button is clicked', async () => {
      const XLSX = await import('xlsx');
      const mockWriteFile = vi.fn();
      
      (XLSX.writeFile as any) = mockWriteFile;

      render(<ExportButtons reportData={mockLoggedTimeReport} />);
      
      const excelButton = screen.getByText('Export Excel').closest('button');
      fireEvent.click(excelButton!);

      expect(mockWriteFile).toHaveBeenCalled();
    });

    it('should not call handlers when buttons are disabled', () => {
      const mockSave = vi.fn();
      vi.mocked(import('jspdf')).then(({ jsPDF }) => {
        (jsPDF as any).mockImplementation(() => ({
          save: mockSave,
        }));
      });

      render(<ExportButtons reportData={mockLoggedTimeReport} disabled={true} />);
      
      const pdfButton = screen.getByText('Export PDF').closest('button');
      fireEvent.click(pdfButton!);

      // Handler should not be called because button is disabled
      expect(mockSave).not.toHaveBeenCalled();
    });
  });

  describe('Custom Props', () => {
    it('should use custom report title when provided', () => {
      render(
        <ExportButtons 
          reportData={mockLoggedTimeReport} 
          reportTitle="Custom Report Title"
        />
      );
      
      expect(screen.getByText('Export PDF')).toBeInTheDocument();
      expect(screen.getByText('Export Excel')).toBeInTheDocument();
    });

    it('should handle subtitle prop', () => {
      render(
        <ExportButtons 
          reportData={mockLoggedTimeReport} 
          reportTitle="Main Title"
          subTitle="Subtitle Text"
        />
      );
      
      expect(screen.getByText('Export PDF')).toBeInTheDocument();
      expect(screen.getByText('Export Excel')).toBeInTheDocument();
    });
  });

  describe('Different Report Types', () => {
    it('should handle LoggedTimeReport', () => {
      render(<ExportButtons reportData={mockLoggedTimeReport} />);
      
      expect(screen.getByText('Export PDF')).toBeInTheDocument();
      expect(screen.getByText('Export Excel')).toBeInTheDocument();
    });

    it('should handle TeamSummaryReport', () => {
      render(<ExportButtons reportData={mockTeamSummaryReport} />);
      
      expect(screen.getByText('Export PDF')).toBeInTheDocument();
      expect(screen.getByText('Export Excel')).toBeInTheDocument();
    });

    it('should handle TaskCompletionReport', () => {
      render(<ExportButtons reportData={mockTaskCompletionReport} />);
      
      expect(screen.getByText('Export PDF')).toBeInTheDocument();
      expect(screen.getByText('Export Excel')).toBeInTheDocument();
    });
  });

  describe('Report Data Validation', () => {
    it('should include KPIs in report data', () => {
      const reportWithKPIs: LoggedTimeReport = {
        ...mockLoggedTimeReport,
        kpis: [
          { label: 'Total Time', value: 100, unit: 'h' },
          { label: 'Avg Time', value: 50, unit: 'h' },
          { label: 'Completed Tasks', value: 5, unit: 'tasks' },
        ],
      };

      render(<ExportButtons reportData={reportWithKPIs} />);
      
      const pdfButton = screen.getByText('Export PDF').closest('button');
      expect(pdfButton).toBeInTheDocument();
      expect(pdfButton).not.toBeDisabled();
    });

    it('should include charts in report data', () => {
      const reportWithCharts: LoggedTimeReport = {
        ...mockLoggedTimeReport,
        charts: [
          {
            type: 'bar',
            title: 'Task Status',
            data: [
              { label: 'Completed', value: 5 },
              { label: 'In Progress', value: 3 },
            ],
          },
          {
            type: 'pie',
            title: 'Time Distribution',
            data: [
              { label: 'Working', value: 70 },
              { label: 'Break', value: 30 },
            ],
          },
        ],
      };

      render(<ExportButtons reportData={reportWithCharts} />);
      
      const pdfButton = screen.getByText('Export PDF').closest('button');
      expect(pdfButton).toBeInTheDocument();
    });

    it('should handle empty KPIs array', () => {
      const reportWithoutKPIs: LoggedTimeReport = {
        ...mockLoggedTimeReport,
        kpis: [],
      };

      render(<ExportButtons reportData={reportWithoutKPIs} />);
      
      expect(screen.getByText('Export PDF')).toBeInTheDocument();
      expect(screen.getByText('Export Excel')).toBeInTheDocument();
    });

    it('should handle empty charts array', () => {
      const reportWithoutCharts: LoggedTimeReport = {
        ...mockLoggedTimeReport,
        charts: [],
      };

      render(<ExportButtons reportData={reportWithoutCharts} />);
      
      expect(screen.getByText('Export PDF')).toBeInTheDocument();
      expect(screen.getByText('Export Excel')).toBeInTheDocument();
    });
  });

  describe('Data Transformation', () => {
    it('should handle Maps correctly in LoggedTimeReport', () => {
      const timeByTask = new Map([
        [1, 3600],
        [2, 7200],
        [3, 10800],
      ]);

      const report: LoggedTimeReport = {
        ...mockLoggedTimeReport,
        timeByTask,
      };

      render(<ExportButtons reportData={report} />);
      
      expect(screen.getByText('Export PDF')).toBeInTheDocument();
      expect(screen.getByText('Export Excel')).toBeInTheDocument();
    });

    it('should handle Maps correctly in TeamSummaryReport', () => {
      const userTotals = new Map([
        ['user1', {
          userName: 'John Doe',
          todo: 5,
          inProgress: 3,
          completed: 2,
          blocked: 1,
          total: 11,
        }],
        ['user2', {
          userName: 'Jane Smith',
          todo: 3,
          inProgress: 2,
          completed: 4,
          blocked: 0,
          total: 9,
        }],
      ]);

      const report: TeamSummaryReport = {
        ...mockTeamSummaryReport,
        userTotals,
      };

      render(<ExportButtons reportData={report} />);
      
      expect(screen.getByText('Export PDF')).toBeInTheDocument();
      expect(screen.getByText('Export Excel')).toBeInTheDocument();
    });

    it('should handle Maps correctly in TaskCompletionReport', () => {
      const completedByProject = new Map([
        [1, 5],
        [2, 10],
        [3, 3],
      ]);

      const report: TaskCompletionReport = {
        ...mockTaskCompletionReport,
        completedByProject,
      };

      render(<ExportButtons reportData={report} />);
      
      expect(screen.getByText('Export PDF')).toBeInTheDocument();
      expect(screen.getByText('Export Excel')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle report with zero values', () => {
      const emptyReport: LoggedTimeReport = {
        kind: 'loggedTime',
        totalTime: 0,
        avgTime: 0,
        completedTasks: 0,
        overdueTasks: 0,
        blockedTasks: 0,
        onTimeCompletionRate: 0,
        totalDelayHours: 0,
        incompleteTime: 0,
        overdueTime: 0,
        timeByTask: new Map(),
        kpis: [],
        charts: [],
      };

      render(<ExportButtons reportData={emptyReport} />);
      
      expect(screen.getByText('Export PDF')).toBeInTheDocument();
      expect(screen.getByText('Export Excel')).toBeInTheDocument();
    });

    it('should handle report with large numbers', () => {
      const largeReport: LoggedTimeReport = {
        kind: 'loggedTime',
        totalTime: 999999.99,
        avgTime: 888888.88,
        completedTasks: 10000,
        overdueTasks: 5000,
        blockedTasks: 2000,
        onTimeCompletionRate: 0.95,
        totalDelayHours: 1000,
        incompleteTime: 50000,
        overdueTime: 25000,
        timeByTask: new Map(),
        kpis: [],
        charts: [],
      };

      render(<ExportButtons reportData={largeReport} />);
      
      expect(screen.getByText('Export PDF')).toBeInTheDocument();
      expect(screen.getByText('Export Excel')).toBeInTheDocument();
    });

    it('should handle report with decimal precision', () => {
      const preciseReport: LoggedTimeReport = {
        kind: 'loggedTime',
        totalTime: 123.456789,
        avgTime: 45.678901,
        completedTasks: 15,
        overdueTasks: 3,
        blockedTasks: 2,
        onTimeCompletionRate: 0.847593,
        totalDelayHours: 12.345,
        incompleteTime: 34.567,
        overdueTime: 18.901,
        timeByTask: new Map(),
        kpis: [],
        charts: [],
      };

      render(<ExportButtons reportData={preciseReport} />);
      
      expect(screen.getByText('Export PDF')).toBeInTheDocument();
      expect(screen.getByText('Export Excel')).toBeInTheDocument();
    });
  });
});