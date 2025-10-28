'use client';

import { useMemo, useRef, useState } from 'react';
import { addDays, differenceInCalendarDays, format, isSameDay, startOfDay, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';

export type GanttTask = {
  id: number;
  title: string;
  project: string;
  startDate: string; 
  deadline: string | null;
  status: string;
  updatedAt: string;
  assignee: { id: string; name: string };
};

export type GanttRow = { assigneeId: string; assigneeName: string; tasks: GanttTask[] };

type Props = {
  rows: GanttRow[];
  startDate: Date;
  endDate: Date;
  currentUserId?: string;
  userRoles?: string[];
  onChangeDeadline?: (taskId: number, newDate: Date) => Promise<void> | void;
};

const MAX_DAYS = 60;
const ASSIGNEE_COLUMN_WIDTH = 200; // Fixed width in pixels
const DAY_COLUMN_WIDTH = 80; // Fixed width per day column in pixels

export function GanttChart({ rows, startDate, endDate, currentUserId, userRoles = [], onChangeDeadline }: Props) {
  const days = useMemo(() => {
    const diff = Math.max(1, differenceInCalendarDays(endDate, startDate) + 1);
    // Enforce max days limit
    const limitedDiff = Math.min(diff, MAX_DAYS);
    return Array.from({ length: limitedDiff }, (_, i) => addDays(startDate, i));
  }, [startDate, endDate]);

  const totalDays = useMemo(() => {
    return Math.max(1, differenceInCalendarDays(endDate, startDate) + 1);
  }, [startDate, endDate]);
  
  // Calculate total width for the scrollable area
  const scrollableWidth = days.length * DAY_COLUMN_WIDTH;

  const [drag, setDrag] = useState<{ taskId: number; startX: number } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (taskId: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDrag({ taskId, startX: e.clientX });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!drag || !gridRef.current) return;
    // Visual feedback could be added here if needed
  };

  const handleMouseUp = async (e: React.MouseEvent) => {
    if (!drag || !gridRef.current) return;
    const rect = gridRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const dayIndex = Math.floor(x / DAY_COLUMN_WIDTH);
    const clampedDayIndex = Math.min(Math.max(dayIndex, 0), days.length - 1);
    const newDate = addDays(startDate, clampedDayIndex);
    const id = drag.taskId;
    setDrag(null);
    if (onChangeDeadline) await onChangeDeadline(id, newDate);
  };

  return (
    <div className="border rounded-md overflow-hidden">
      {totalDays > MAX_DAYS && (
        <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-2 text-sm text-yellow-700 dark:text-yellow-400">
          ⚠️ Date range exceeds {MAX_DAYS} days. Showing only the first {MAX_DAYS} days for optimal performance.
        </div>
      )}
      
      {/* Single scrollable container for entire chart */}
      <div className="overflow-x-auto">
        <div className="flex flex-col" style={{ minWidth: `${ASSIGNEE_COLUMN_WIDTH + scrollableWidth}px` }}>
          
          {/* Header Row */}
          <div className="flex bg-muted text-muted-foreground text-xs font-medium border-b">
            {/* Fixed Assignee Column Header */}
            <div className="shrink-0 px-3 py-2 border-r font-semibold" style={{ width: `${ASSIGNEE_COLUMN_WIDTH}px` }}>
              Assignee
            </div>
            
            {/* Date Headers */}
            <div className="flex">
              {days.map((d, idx) => (
                <div 
                  key={idx} 
                  className="shrink-0 px-2 py-2 border-r last:border-r-0 text-center"
                  style={{ width: `${DAY_COLUMN_WIDTH}px` }}
                >
                  <div className="text-[11px] font-medium">{format(d, 'EEE')}</div>
                  <div className="text-xs">{format(d, 'MMM d')}</div>
                </div>
              ))}
            </div>
          </div>

          
          {/* Data Rows */}
          {rows.map((row) => {
            const rowHeight = Math.max(64, row.tasks.length * 28 + 16);
            
            return (
              <div key={row.assigneeId} className="flex border-t">
                {/* Fixed Assignee Column */}
                <div className="shrink-0 px-3 py-2 border-r bg-background" style={{ width: `${ASSIGNEE_COLUMN_WIDTH}px` }}>
                  <div className="text-sm font-medium truncate" title={row.assigneeName}>{row.assigneeName}</div>
                  <div className="text-xs text-muted-foreground">{row.tasks.length} task(s)</div>
                </div>
                
                {/* Chart Area */}
                <div 
                  className="relative" 
                  style={{ width: `${scrollableWidth}px`, minHeight: `${rowHeight}px` }}
                  ref={gridRef}
                  onMouseMove={handleMouseMove} 
                  onMouseUp={handleMouseUp} 
                  onMouseLeave={handleMouseUp}
                >
                  {/* Background Grid */}
                  <div className="flex absolute inset-0">
                    {days.map((d, idx) => {
                      const isToday = isSameDay(d, new Date());
                      return (
                        <div
                          key={idx}
                          className={cn(
                            'shrink-0 border-r last:border-r-0',
                            idx % 7 === 0 && 'bg-muted/30',
                            isToday && 'bg-blue-500/10'
                          )}
                          style={{ width: `${DAY_COLUMN_WIDTH}px`, minHeight: `${rowHeight}px` }}
                        />
                      );
                    })}
                  </div>

                  {/* Task Bars */}
                  <div className="relative" style={{ minHeight: `${rowHeight}px` }}>
                    {row.tasks.map((t, i) => {
                      const taskStart = startOfDay(new Date(t.startDate));
                      // For completed tasks, use updated_at as end date, otherwise use deadline
                      const isCompleted = t.status === 'Completed';
                      const taskEnd = isCompleted && t.updatedAt 
                        ? endOfDay(new Date(t.updatedAt))
                        : (t.deadline ? endOfDay(new Date(t.deadline)) : null);
                      
                      if (!taskEnd) return null;
                      
                      // Check if task overlaps with visible date range
                      const visibleStart = startOfDay(days[0]);
                      const visibleEnd = endOfDay(days[days.length - 1]);
                      
                      // Task is visible if: task ends on/after visible start AND task starts on/before visible end
                      // This includes tasks that completely span the visible range
                      if (taskEnd < visibleStart || taskStart > visibleEnd) {
                        return null; // Task completely outside visible range
                      }
                      
                      // Check if task is overdue (deadline passed and not completed)
                      const isOverdue = !isCompleted && t.deadline && new Date(t.deadline) < new Date();
                      
                      // Calculate position relative to visible days
                      // Clamp the start/end to the visible range
                      const clampedStart = taskStart < visibleStart ? visibleStart : taskStart;
                      const clampedEnd = taskEnd > visibleEnd ? visibleEnd : taskEnd;
                      
                      const startDayIndex = Math.max(0, differenceInCalendarDays(clampedStart, startDate));
                      const endDayIndex = Math.min(days.length - 1, Math.max(0, differenceInCalendarDays(clampedEnd, startDate)));
                      
                      // Calculate pixel positions
                      const barStartPx = startDayIndex * DAY_COLUMN_WIDTH;
                      const barEndPx = (endDayIndex + 1) * DAY_COLUMN_WIDTH;
                      const barWidthPx = barEndPx - barStartPx;
                      
                      // Indicate if task extends beyond visible range
                      const extendsLeft = taskStart < visibleStart;
                      const extendsRight = taskEnd > visibleEnd;
                      
                      // Check if user can drag deadline
                      // Managers can drag all tasks, staff can only drag their own tasks
                      const isManager = userRoles.includes('manager');
                      const isAssignedToUser = t.assignee.id === currentUserId;
                      const canDragDeadline = isManager || isAssignedToUser;
                    
                    return (
                      <div key={t.id} className="absolute" style={{ top: `${i * 28 + 8}px`, left: 0, right: 0 }}>
                        <div className="relative h-6">
                          {/* Left arrow indicator if task extends before visible range */}
                          {extendsLeft && (
                            <div
                              className="absolute h-5 flex items-center justify-center"
                              style={{ 
                                left: `${barStartPx - 16}px`,
                                width: '16px',
                                top: 0
                              }}
                            >
                              <span className="text-sm font-bold opacity-70">◀</span>
                            </div>
                          )}
                          
                          {/* Task bar from start to end */}
                          <div
                            className={cn(
                              "absolute h-5 border flex items-center px-2 transition-colors",
                              isCompleted 
                                ? "bg-green-500/20 border-green-600 hover:bg-green-500/30"
                                : isOverdue
                                  ? "bg-red-500/20 border-red-600 hover:bg-red-500/30"
                                  : "bg-primary/20 border-primary hover:bg-primary/30",
                              // Show partial rounded corners based on visibility
                              extendsLeft ? "" : "rounded-l",
                              extendsRight ? "" : "rounded-r",
                              // Cursor only if deadline is in visible range and not completed
                              !isCompleted && !extendsRight ? "cursor-pointer" : ""
                            )}
                            style={{ 
                              left: `${barStartPx}px`, 
                              width: `${barWidthPx}px`,
                              minWidth: '60px'
                            }}
                            title={`${t.project} · ${t.title}\nStatus: ${t.status}${isOverdue ? ' (OVERDUE)' : ''}\nStart: ${format(taskStart, 'PP')}\n${isCompleted ? 'Completed' : 'Deadline'}: ${format(taskEnd, 'PP')}${extendsLeft || extendsRight ? '\n⚠️ Task extends beyond visible range' : ''}`}
                          >
                            <span className="text-xs font-medium truncate">{t.project}</span>
                            <span className="text-xs opacity-70 ml-1 truncate"> · {t.title}</span>
                          </div>
                          
                          {/* Right arrow indicator if task extends after visible range */}
                          {extendsRight && (
                            <div
                              className="absolute h-5 flex items-center justify-center"
                              style={{ 
                                left: `${barEndPx}px`,
                                width: '16px',
                                top: 0
                              }}
                            >
                              <span className="text-sm font-bold opacity-70">▶</span>
                            </div>
                          )}
                          
                          {/* Draggable diamond deadline indicator - only for non-completed tasks, if deadline is visible, and user has permission */}
                          {!isCompleted && !extendsRight && canDragDeadline && (
                            <div
                              className={cn(
                                "absolute w-3 h-3 rotate-45 cursor-move shadow-sm",
                                isOverdue ? "bg-red-600 hover:bg-red-500 border border-red-700" : "bg-primary hover:bg-primary/80 border border-primary-foreground/20"
                              )}
                              style={{ 
                                left: `${barEndPx - 6}px`,
                                top: '6px'
                              }}
                              title={`Deadline: ${format(taskEnd, 'PP')}${isOverdue ? ' (OVERDUE)' : ''}\nDrag to adjust`}
                              onMouseDown={(e) => handleMouseDown(t.id, e)}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
        
        </div>
      </div>
    </div>
  );
}

export default GanttChart;
