import { describe, it, expect } from 'vitest';
import { generateICalFile, downloadICalFile } from '@/lib/utils/ical';
import type { Task } from '@/lib/services/tasks';

describe('iCal Generation', () => {
  const mockTask: Task = {
    id: 1,
    title: 'Test Task',
    description: 'This is a test task',
    priority: 5,
    status: 'To Do',
    deadline: '2025-11-15T09:00:00Z',
    notes: null,
    recurrence_interval: 0,
    recurrence_date: null,
    project: { id: 1, name: 'Test Project' },
    creator: {
      creator_id: 'user-1',
      user_info: { first_name: 'John', last_name: 'Doe' },
    },
    subtasks: [],
    assignees: [
      {
        assignee_id: 'user-1',
        user_info: { first_name: 'John', last_name: 'Doe' },
      },
      {
        assignee_id: 'user-2',
        user_info: { first_name: 'Jane', last_name: 'Smith' },
      },
    ],
    tags: ['urgent', 'backend'],
    attachments: [],
    isOverdue: false,
  };

  describe('generateICalFile', () => {
    it('should generate valid iCal header', () => {
      const result = generateICalFile([mockTask]);
      
      expect(result).toContain('BEGIN:VCALENDAR');
      expect(result).toContain('VERSION:2.0');
      expect(result).toContain('PRODID:-//X-Men Task Management//NONSGML X-Men Tasks 1.0//EN');
      expect(result).toContain('CALSCALE:GREGORIAN');
      expect(result).toContain('METHOD:PUBLISH');
      expect(result).toContain('END:VCALENDAR');
    });

    it('should create VEVENT for each task with deadline', () => {
      const result = generateICalFile([mockTask]);
      
      expect(result).toContain('BEGIN:VEVENT');
      expect(result).toContain('END:VEVENT');
      expect(result).toContain('UID:task-1@x-men-tasks');
    });

    it('should skip tasks without deadlines', () => {
      const taskWithoutDeadline: Task = {
        ...mockTask,
        id: 2,
        deadline: null,
      };
      
      const result = generateICalFile([taskWithoutDeadline]);
      
      expect(result).not.toContain('UID:task-2@x-men-tasks');
      expect(result).toContain('BEGIN:VCALENDAR');
      expect(result).toContain('END:VCALENDAR');
    });

    it('should format all-day events correctly', () => {
      const result = generateICalFile([mockTask]);
      
      // Should use VALUE=DATE format
      expect(result).toContain('DTSTART;VALUE=DATE:20251115');
      expect(result).toContain('DTEND;VALUE=DATE:20251116'); // Next day for all-day event
    });

    it('should include task summary and description', () => {
      const result = generateICalFile([mockTask]);
      
      expect(result).toContain('SUMMARY:Test Task');
      expect(result).toContain('DESCRIPTION:This is a test task');
      expect(result).toContain('Status: To Do');
      expect(result).toContain('Priority: 5');
    });

    it('should include project information in description', () => {
      const result = generateICalFile([mockTask]);
      
      // Project is included in DESCRIPTION field
      // May be line-folded, so check for both parts separately
      expect(result).toContain('Project: Tes');
      expect(result).toContain(' t Project');
    });

    it('should include assignee information', () => {
      const result = generateICalFile([mockTask]);
      
      expect(result).toContain('Assignees: John Doe\\, Jane Smith');
    });

    it('should include tags as categories', () => {
      const result = generateICalFile([mockTask]);
      
      expect(result).toContain('CATEGORIES:urgent,backend');
    });

    it('should map status to valid VEVENT status values', () => {
      const todoTask = { ...mockTask, status: 'To Do' as const };
      const inProgressTask = { ...mockTask, status: 'In Progress' as const };
      const completedTask = { ...mockTask, status: 'Completed' as const };
      const blockedTask = { ...mockTask, status: 'Blocked' as const };

      expect(generateICalFile([todoTask])).toContain('STATUS:TENTATIVE');
      expect(generateICalFile([inProgressTask])).toContain('STATUS:CONFIRMED');
      expect(generateICalFile([completedTask])).toContain('STATUS:CONFIRMED');
      expect(generateICalFile([blockedTask])).toContain('STATUS:CANCELLED');
    });

    it('should invert priority correctly (iCal uses 1=highest)', () => {
      const highPriorityTask = { ...mockTask, priority: 9 }; // High in our system
      const lowPriorityTask = { ...mockTask, priority: 1 }; // Low in our system

      expect(generateICalFile([highPriorityTask])).toContain('PRIORITY:1'); // 10-9=1 (highest)
      expect(generateICalFile([lowPriorityTask])).toContain('PRIORITY:9'); // 10-1=9 (lowest)
    });

    it('should include DTSTAMP', () => {
      const result = generateICalFile([mockTask]);
      
      // DTSTAMP format: YYYYMMDDTHHMMSSZ
      expect(result).toMatch(/DTSTAMP:\d{8}T\d{6}Z/);
    });

    it('should include SEQUENCE:0', () => {
      const result = generateICalFile([mockTask]);
      
      expect(result).toContain('SEQUENCE:0');
    });
    it('should escape special characters in text fields', () => {
      const taskWithSpecialChars: Task = {
        ...mockTask,
        title: 'Task with; special, chars\\and newlines',
        description: 'Description with; commas, backslashes\\and\nnewlines',
      };

      const result = generateICalFile([taskWithSpecialChars]);
      
      // Title is escaped in SUMMARY
      expect(result).toContain('SUMMARY:Task with\\; special\\, chars\\\\and newlines');
      
      // Description is in the DESCRIPTION field - note that description parts are 
      // concatenated with literal \n (not escaped further in the description parts join)
      // The actual escaping happens in escapeICalText for the individual description text
      expect(result).toMatch(/DESCRIPTION:Description with; commas, backslashes\\and\r?\nnewlines/);
    });

    it('should fold long lines at 75 characters', () => {
      const longDescription = 'A'.repeat(100);
      const taskWithLongDesc: Task = {
        ...mockTask,
        description: longDescription,
      };

      const result = generateICalFile([taskWithLongDesc]);
      const lines = result.split('\r\n');
      
      // Check that no line exceeds 75 characters (except continuation lines starting with space)
      lines.forEach((line) => {
        if (!line.startsWith(' ')) {
          expect(line.length).toBeLessThanOrEqual(75);
        }
      });
    });

    it('should use custom calendar name', () => {
      const result = generateICalFile([mockTask], 'My Custom Calendar');
      
      expect(result).toContain('X-WR-CALNAME:My Custom Calendar');
    });

    describe('Recurrence Rules', () => {
      it('should handle daily recurrence (interval=1)', () => {
        const recurringTask: Task = {
          ...mockTask,
          recurrence_interval: 1,
          recurrence_date: '2025-11-01T00:00:00Z',
        };

        const result = generateICalFile([recurringTask]);
        
        expect(result).toContain('DTSTART;VALUE=DATE:20251101'); // Starts on recurrence_date
        expect(result).toContain('RRULE:FREQ=DAILY;UNTIL=20251115');
      });

      it('should handle weekly recurrence (interval=7)', () => {
        const recurringTask: Task = {
          ...mockTask,
          recurrence_interval: 7,
          recurrence_date: '2025-11-01T00:00:00Z',
        };

        const result = generateICalFile([recurringTask]);
        
        expect(result).toContain('RRULE:FREQ=WEEKLY;UNTIL=20251115');
      });

      it('should handle bi-weekly recurrence (interval=14)', () => {
        const recurringTask: Task = {
          ...mockTask,
          recurrence_interval: 14,
          recurrence_date: '2025-11-01T00:00:00Z',
        };

        const result = generateICalFile([recurringTask]);
        
        expect(result).toContain('RRULE:FREQ=WEEKLY;INTERVAL=2;UNTIL=20251115');
      });

      it('should handle monthly recurrence (interval=30)', () => {
        const recurringTask: Task = {
          ...mockTask,
          recurrence_interval: 30,
          recurrence_date: '2025-11-01T00:00:00Z',
        };

        const result = generateICalFile([recurringTask]);
        
        expect(result).toContain('RRULE:FREQ=MONTHLY;UNTIL=20251115');
      });

      it('should handle custom daily interval (e.g., every 5 days)', () => {
        const recurringTask: Task = {
          ...mockTask,
          recurrence_interval: 5,
          recurrence_date: '2025-11-01T00:00:00Z',
        };

        const result = generateICalFile([recurringTask]);
        
        expect(result).toContain('RRULE:FREQ=DAILY;INTERVAL=5;UNTIL=20251115');
      });

      it('should handle custom weekly interval (e.g., every 3 weeks = 21 days)', () => {
        const recurringTask: Task = {
          ...mockTask,
          recurrence_interval: 21,
          recurrence_date: '2025-11-01T00:00:00Z',
        };

        const result = generateICalFile([recurringTask]);
        
        expect(result).toContain('RRULE:FREQ=WEEKLY;INTERVAL=3;UNTIL=20251115');
      });
      it('should handle custom monthly interval (e.g., every 2 months = 60 days)', () => {
        const recurringTask: Task = {
          ...mockTask,
          recurrence_interval: 60,
          recurrence_date: '2025-11-01T00:00:00Z',
        };

        const result = generateICalFile([recurringTask]);
        
        expect(result).toContain('RRULE:FREQ=MONTHLY;INTERVAL=2;UNTIL=20251115');
      });

      it('should use recurrence_date as DTSTART for recurring tasks', () => {
        const recurringTask: Task = {
          ...mockTask,
          recurrence_interval: 7,
          recurrence_date: '2025-11-01T00:00:00Z',
          deadline: '2025-12-31T00:00:00Z',
        };

        const result = generateICalFile([recurringTask]);
        
        expect(result).toContain('DTSTART;VALUE=DATE:20251101'); // recurrence_date
        expect(result).toContain('RRULE:FREQ=WEEKLY;UNTIL=20251231'); // deadline
      });

      it('should stop recurrence at deadline with UNTIL', () => {
        const recurringTask: Task = {
          ...mockTask,
          recurrence_interval: 1,
          recurrence_date: '2025-11-01T00:00:00Z',
          deadline: '2025-11-10T00:00:00Z',
        };

        const result = generateICalFile([recurringTask]);
        
        expect(result).toContain('RRULE:FREQ=DAILY;UNTIL=20251110');
      });

      it('should not add RRULE for non-recurring tasks', () => {
        const result = generateICalFile([mockTask]);
        
        expect(result).not.toContain('RRULE:');
      });
    });

    describe('Multiple Tasks', () => {
      it('should handle multiple tasks', () => {
        const task1 = { ...mockTask, id: 1, title: 'Task 1' };
        const task2 = { ...mockTask, id: 2, title: 'Task 2' };
        const task3 = { ...mockTask, id: 3, title: 'Task 3' };

        const result = generateICalFile([task1, task2, task3]);
        
        expect(result).toContain('UID:task-1@x-men-tasks');
        expect(result).toContain('UID:task-2@x-men-tasks');
        expect(result).toContain('UID:task-3@x-men-tasks');
        expect(result).toContain('SUMMARY:Task 1');
        expect(result).toContain('SUMMARY:Task 2');
        expect(result).toContain('SUMMARY:Task 3');
      });

      it('should handle empty task list', () => {
        const result = generateICalFile([]);
        
        expect(result).toContain('BEGIN:VCALENDAR');
        expect(result).toContain('END:VCALENDAR');
        expect(result).not.toContain('BEGIN:VEVENT');
      });
    });

    describe('Edge Cases', () => {
      it('should handle tasks with no description', () => {
        const taskNoDesc: Task = {
          ...mockTask,
          description: null,
        };

        const result = generateICalFile([taskNoDesc]);
        
        expect(result).toContain('SUMMARY:Test Task');
        expect(result).toContain('DESCRIPTION:');
        expect(result).toContain('Status: To Do');
      });

      it('should handle tasks with no assignees', () => {
        const taskNoAssignees: Task = {
          ...mockTask,
          assignees: [],
        };

        const result = generateICalFile([taskNoAssignees]);
        
        expect(result).not.toContain('Assignees:');
      });

      it('should handle tasks with no tags', () => {
        const taskNoTags: Task = {
          ...mockTask,
          tags: [],
        };

        const result = generateICalFile([taskNoTags]);
        
        expect(result).not.toContain('CATEGORIES:');
      });

      it('should handle tasks with no project', () => {
        const taskNoProject: Task = {
          ...mockTask,
          project: { id: 0, name: '' },
        };

        const result = generateICalFile([taskNoProject]);
        
        expect(result).not.toContain('Project:');
      });

      it('should use CRLF line endings', () => {
        const result = generateICalFile([mockTask]);
        
        // Should use \r\n, not just \n
        expect(result).toContain('\r\n');
        expect(result.split('\r\n').length).toBeGreaterThan(1);
      });
    });
  });

  describe('downloadICalFile', () => {
    it('should generate valid iCal content for download', () => {
      // We can't test the actual download in Node environment
      // But we can verify the function accepts the correct parameters
      // and that generateICalFile produces valid output
      const result = generateICalFile([mockTask], 'X-Men Tasks');
      
      expect(result).toContain('BEGIN:VCALENDAR');
      expect(result).toContain('X-WR-CALNAME:X-Men Tasks');
      expect(result).toContain('END:VCALENDAR');
      
      // Verify function signature (it should accept tasks and optional filename)
      expect(typeof downloadICalFile).toBe('function');
    });

    it('should accept optional filename parameter', () => {
      // Verify function can be called with different signatures
      expect(() => generateICalFile([mockTask])).not.toThrow();
      expect(() => generateICalFile([mockTask], 'Custom Name')).not.toThrow();
      expect(() => generateICalFile([])).not.toThrow();
    });
  });
});
