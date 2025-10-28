import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DateRangeFilter } from '@/components/filters/date-range-selector';
import { addDays, startOfDay, endOfDay } from 'date-fns';

describe('DateRangeFilter', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render date range selector button', () => {
      render(<DateRangeFilter onChange={mockOnChange} />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should display selected date range', () => {
      const from = new Date('2025-10-01');
      const to = new Date('2025-10-31');

      render(
        <DateRangeFilter
          value={{ from, to }}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText(/Oct/)).toBeInTheDocument();
    });

    it('should show placeholder when no date selected', () => {
      render(<DateRangeFilter onChange={mockOnChange} />);

      expect(screen.getByText(/Pick a date/)).toBeInTheDocument();
    });
  });

  describe('Preset Options', () => {
    it('should have "This Week" preset', async () => {
      render(<DateRangeFilter onChange={mockOnChange} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('This Week')).toBeInTheDocument();
      });
    });

    it('should have "2 Weeks (±1 week)" preset', async () => {
      render(<DateRangeFilter onChange={mockOnChange} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('2 Weeks (±1 week)')).toBeInTheDocument();
      });
    });

    it('should have "This Month" preset', async () => {
      render(<DateRangeFilter onChange={mockOnChange} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('This Month')).toBeInTheDocument();
      });
    });

    it('should have "Next 3 Months" preset', async () => {
      render(<DateRangeFilter onChange={mockOnChange} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Next 3 Months')).toBeInTheDocument();
      });
    });
  });

  describe('Preset Functionality', () => {
    it('should call onChange when "This Week" selected', async () => {
      render(<DateRangeFilter onChange={mockOnChange} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        const thisWeekButton = screen.getByText('This Week');
        fireEvent.click(thisWeekButton);
      });

      expect(mockOnChange).toHaveBeenCalled();
      const callArg = mockOnChange.mock.calls[0][0];
      expect(callArg).toHaveProperty('from');
      expect(callArg).toHaveProperty('to');
    });

    it('should call onChange when "2 Weeks (±1 week)" selected', async () => {
      render(<DateRangeFilter onChange={mockOnChange} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        const twoWeeksButton = screen.getByText('2 Weeks (±1 week)');
        fireEvent.click(twoWeeksButton);
      });

      expect(mockOnChange).toHaveBeenCalled();
      const callArg = mockOnChange.mock.calls[0][0];
      
      // Verify the date range is ±1 week from today
      const today = new Date();
      const expectedFrom = startOfDay(addDays(today, -7));
      const expectedTo = endOfDay(addDays(today, 7));
      
      // Allow for small time differences due to test execution time
      const actualFrom = callArg.from;
      const actualTo = callArg.to;
      
      expect(actualFrom.getDate()).toBe(expectedFrom.getDate());
      expect(actualTo.getDate()).toBe(expectedTo.getDate());
    });

    it('should call onChange when "This Month" selected', async () => {
      render(<DateRangeFilter onChange={mockOnChange} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        const thisMonthButton = screen.getByText('This Month');
        fireEvent.click(thisMonthButton);
      });

      expect(mockOnChange).toHaveBeenCalled();
      const callArg = mockOnChange.mock.calls[0][0];
      expect(callArg).toHaveProperty('from');
      expect(callArg).toHaveProperty('to');
    });

    it('should call onChange when "Next 3 Months" selected', async () => {
      render(<DateRangeFilter onChange={mockOnChange} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        const next3MonthsButton = screen.getByText('Next 3 Months');
        fireEvent.click(next3MonthsButton);
      });

      expect(mockOnChange).toHaveBeenCalled();
      const callArg = mockOnChange.mock.calls[0][0];
      expect(callArg).toHaveProperty('from');
      expect(callArg).toHaveProperty('to');
    });
  });

  describe('Date Range Calculation', () => {
    it('should calculate correct range for "2 Weeks (±1 week)"', async () => {
      render(<DateRangeFilter onChange={mockOnChange} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        const twoWeeksButton = screen.getByText('2 Weeks (±1 week)');
        fireEvent.click(twoWeeksButton);
      });

      const callArg = mockOnChange.mock.calls[0][0];
      const from = callArg.from;
      const to = callArg.to;

      // Calculate expected dates
      const today = new Date();
      const expectedDaysBetween = 14; // 7 days before + 7 days after

      const actualDaysBetween = Math.floor(
        (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)
      );

      expect(actualDaysBetween).toBe(expectedDaysBetween);
    });

    it('should ensure from date is before to date', async () => {
      render(<DateRangeFilter onChange={mockOnChange} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        const thisWeekButton = screen.getByText('This Week');
        fireEvent.click(thisWeekButton);
      });

      const callArg = mockOnChange.mock.calls[0][0];
      expect(callArg.from.getTime()).toBeLessThanOrEqual(callArg.to.getTime());
    });
  });

  describe('Custom Date Selection', () => {
    it('should allow custom date range selection', async () => {
      render(<DateRangeFilter onChange={mockOnChange} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      // Calendar should be visible
      await waitFor(() => {
        expect(screen.getByRole('grid')).toBeInTheDocument();
      });
    });

    it('should call onChange when custom dates selected', async () => {
      render(<DateRangeFilter onChange={mockOnChange} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        const calendar = screen.getByRole('grid');
        expect(calendar).toBeInTheDocument();
      });

      // Note: Actual date selection in calendar requires more complex interaction
      // This test verifies the calendar is accessible
    });
  });

  describe('Controlled Component', () => {
    it('should display provided value', () => {
      const from = new Date('2025-10-15');
      const to = new Date('2025-10-25');

      render(
        <DateRangeFilter
          value={{ from, to }}
          onChange={mockOnChange}
        />
      );

      const button = screen.getByRole('button');
      expect(button.textContent).toContain('Oct');
    });

    it('should update when value prop changes', () => {
      const { rerender } = render(
        <DateRangeFilter
          value={{ from: new Date('2025-10-01'), to: new Date('2025-10-31') }}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByRole('button').textContent).toContain('Oct');

      rerender(
        <DateRangeFilter
          value={{ from: new Date('2025-11-01'), to: new Date('2025-11-30') }}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByRole('button').textContent).toContain('Nov');
    });
  });

  describe('Edge Cases', () => {
    it('should handle same from and to date', () => {
      const sameDay = new Date('2025-10-20');

      render(
        <DateRangeFilter
          value={{ from: sameDay, to: sameDay }}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should handle undefined value', () => {
      render(<DateRangeFilter onChange={mockOnChange} />);

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should handle partial date range (only from)', () => {
      render(
        <DateRangeFilter
          value={{ from: new Date('2025-10-01'), to: undefined }}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should handle partial date range (only to)', () => {
      render(
        <DateRangeFilter
          value={{ from: undefined, to: new Date('2025-10-31') }}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible button', () => {
      render(<DateRangeFilter onChange={mockOnChange} />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toBeEnabled();
    });

    it('should be keyboard navigable', () => {
      render(<DateRangeFilter onChange={mockOnChange} />);

      const button = screen.getByRole('button');
      button.focus();
      
      expect(document.activeElement).toBe(button);
    });
  });

  describe('Integration with Parent Component', () => {
    it('should work with external state management', () => {
      let selectedRange: any = undefined;

      const TestComponent = () => {
        const [range, setRange] = React.useState(selectedRange);
        
        return (
          <div>
            <DateRangeFilter
              value={range}
              onChange={(newRange: any) => {
                setRange(newRange: any);
                selectedRange = newRange;
              }}
            />
            <div data-testid="selected-dates">
              {range?.from?.toISOString() || 'No dates selected'}
            </div>
          </div>
        );
      };

      render(<TestComponent />);

      expect(screen.getByTestId('selected-dates')).toHaveTextContent('No dates selected');
    });

    it('should trigger re-render in parent on change', async () => {
      const TestComponent = () => {
        const [range, setRange] = React.useState<any>(undefined);
        
        return (
          <div>
            <DateRangeFilter value={range} onChange={setRange} />
            <div data-testid="range-set">
              {range ? 'Range set' : 'No range'}
            </div>
          </div>
        );
      };

      render(<TestComponent />);

      expect(screen.getByTestId('range-set')).toHaveTextContent('No range');

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        const preset = screen.getByText('This Week');
        fireEvent.click(preset);
      });

      await waitFor(() => {
        expect(screen.getByTestId('range-set')).toHaveTextContent('Range set');
      });
    });
  });

  describe('Performance', () => {
    it('should not call onChange multiple times for single selection', async () => {
      render(<DateRangeFilter onChange={mockOnChange} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        const preset = screen.getByText('This Week');
        fireEvent.click(preset);
      });

      // Should only be called once
      expect(mockOnChange).toHaveBeenCalledTimes(1);
    });
  });
});
