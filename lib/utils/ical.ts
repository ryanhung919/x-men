import type { Task } from '@/lib/services/tasks';
import { format } from 'date-fns';

/**
 * Escapes special characters in iCal text fields according to RFC 5545.
 * Escapes backslashes, semicolons, commas, and newlines.
 */
function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Formats a Date object into iCal date format (YYYYMMDD) for all-day dates.
 */
function formatICalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}${month}${day}`;
}

/**
 * Generates a unique identifier for an iCal event.
 */
function generateUID(taskId: number): string {
  return `task-${taskId}@x-men-tasks`;
}

/**
 * Generates an iCal (RFC 5545) file content from an array of tasks.
 * 
 * @param tasks - Array of Task objects to export
 * @param calendarName - Optional name for the calendar (default: "X-Men Tasks")
 * @returns String containing the complete iCal file content
 * 
 * @example
 * const icalContent = generateICalFile(tasks, "My Tasks");
 * const blob = new Blob([icalContent], { type: 'text/calendar' });
 */
export function generateICalFile(tasks: Task[], calendarName = 'X-Men Tasks'): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  
  // iCal file header
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//X-Men Task Management//NONSGML X-Men Tasks 1.0//EN',
    `X-WR-CALNAME:${escapeICalText(calendarName)}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  // Add each task as an all-day VEVENT
  for (const task of tasks) {
    if (!task.deadline) continue; // Skip tasks without deadlines

    const deadline = new Date(task.deadline);
    const uid = generateUID(task.id);
    
    // Build description with all relevant task details
    const descriptionParts = [];
    if (task.description) {
      descriptionParts.push(task.description);
    }
    descriptionParts.push(`\\nStatus: ${task.status}`);
    descriptionParts.push(`Priority: ${task.priority}`);
    if (task.project?.name) {
      descriptionParts.push(`Project: ${task.project.name}`);
    }
    if (task.assignees && task.assignees.length > 0) {
      const assigneeNames = task.assignees
        .map(a => `${a.user_info.first_name} ${a.user_info.last_name}`)
        .join('\\, ');
      descriptionParts.push(`Assignees: ${assigneeNames}`);
    }
    if (task.tags && task.tags.length > 0) {
      descriptionParts.push(`Tags: ${task.tags.join('\\, ')}`);
    }
    
    const description = descriptionParts.join('\\n');
    const summary = escapeICalText(task.title);
    
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${timestamp}`);
    lines.push(`SEQUENCE:0`);
    
    // For recurring tasks, use recurrence_date as start date, deadline as end of recurrence
    // For non-recurring tasks, use deadline as the event date
    let eventStartDate: Date;
    let eventEndDate: Date;
    
    if (task.recurrence_interval > 0 && task.recurrence_date) {
      // Recurring task: starts on recurrence_date
      eventStartDate = new Date(task.recurrence_date);
      // Event itself is 1 day (all-day event)
      eventEndDate = new Date(eventStartDate);
      eventEndDate.setDate(eventEndDate.getDate() + 1);
    } else {
      // Non-recurring task: event on deadline date
      eventStartDate = deadline;
      eventEndDate = new Date(deadline);
      eventEndDate.setDate(eventEndDate.getDate() + 1);
    }
    
    const startDateStr = formatICalDate(eventStartDate);
    const endDateStr = formatICalDate(eventEndDate);
    
    lines.push(`DTSTART;VALUE=DATE:${startDateStr}`);
    lines.push(`DTEND;VALUE=DATE:${endDateStr}`);
    
    lines.push(`SUMMARY:${summary}`);
    
    if (description) {
      lines.push(`DESCRIPTION:${description}`);
    }
    
    // For VEVENT, valid STATUS values are: TENTATIVE, CONFIRMED, CANCELLED
    const icalStatus = task.status === 'Completed' ? 'CONFIRMED' : 
                       task.status === 'In Progress' ? 'CONFIRMED' : 
                       task.status === 'Blocked' ? 'CANCELLED' :
                       'TENTATIVE';
    lines.push(`STATUS:${icalStatus}`);
    
    // Add priority (iCal uses 1-9, 1=highest, 9=lowest)
    // Our priority is 1-9 where higher number = higher priority, so invert it
    const icalPriority = 10 - task.priority;
    lines.push(`PRIORITY:${icalPriority}`);
    
    // Add recurrence rule if task is recurring
    if (task.recurrence_interval > 0) {
      // Determine frequency and interval based on recurrence_interval (in days)
      let freq: string;
      let interval: number;
      
      switch (task.recurrence_interval) {
        case 1:
          // Daily
          freq = 'DAILY';
          interval = 1;
          break;
        case 7:
          // Weekly
          freq = 'WEEKLY';
          interval = 1;
          break;
        case 14:
          // Bi-weekly (every 2 weeks)
          freq = 'WEEKLY';
          interval = 2;
          break;
        case 30:
          // Monthly
          freq = 'MONTHLY';
          interval = 1;
          break;
        default:
          // Custom interval
          if (task.recurrence_interval % 7 === 0) {
            // Multiple of 7 days -> use WEEKLY with interval
            freq = 'WEEKLY';
            interval = task.recurrence_interval / 7;
          } else if (task.recurrence_interval % 30 === 0) {
            // Multiple of 30 days -> use MONTHLY with interval
            freq = 'MONTHLY';
            interval = task.recurrence_interval / 30;
          } else {
            // Any other interval (e.g., every 5 days) -> use DAILY with interval
            freq = 'DAILY';
            interval = task.recurrence_interval;
          }
          break;
      }
      
      // Build RRULE with UNTIL set to deadline (recurring stops at deadline)
      const untilDate = formatICalDate(deadline);
      let rrule = `RRULE:FREQ=${freq}`;
      if (interval > 1) {
        rrule += `;INTERVAL=${interval}`;
      }
      rrule += `;UNTIL=${untilDate}`;
      
      lines.push(rrule);
    }
    
    // Add categories (tags)
    if (task.tags && task.tags.length > 0) {
      const categories = task.tags.map(escapeICalText).join(',');
      lines.push(`CATEGORIES:${categories}`);
    }
    
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');

  // RFC 5545 specifies lines should be terminated with CRLF
  // And lines SHOULD be folded at 75 octets (bytes).
  // Folding: continuation lines start with a single space
  function foldLine(line: string): string {
    if (line.length <= 75) return line;
    
    const result: string[] = [];
    let remaining = line;
    
    // First line can be up to 75 chars
    result.push(remaining.substring(0, 75));
    remaining = remaining.substring(75);
    
    // Continuation lines: space + up to 74 chars (because space counts as 1)
    while (remaining.length > 0) {
      result.push(' ' + remaining.substring(0, 74));
      remaining = remaining.substring(74);
    }
    
    return result.join('\r\n');
  }

  return lines.map(foldLine).join('\r\n');
}

/**
 * Triggers a browser download of an iCal file.
 * 
 * @param tasks - Array of Task objects to export
 * @param filename - Filename for the download (default: "x-men-tasks.ics")
 * 
 * @example
 * downloadICalFile(filteredTasks, "my-tasks.ics");
 */
export function downloadICalFile(tasks: Task[], filename = 'x-men-tasks.ics'): void {
  const icalContent = generateICalFile(tasks);
  const blob = new Blob([icalContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the object URL
  URL.revokeObjectURL(url);
}
