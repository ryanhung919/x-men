'use client';

import { useEffect, useState } from 'react';
import { DateRangeFilter, DateRangeType, presets } from '@/components/filters/date-range-selector';
import { ProjectSelector } from '@/components/filters/project-selector';
import { StaffSelector } from '@/components/filters/staff-selector';
import GanttChart, { GanttRow } from '@/components/schedule/GanttChart';
import { addDays, endOfDay, startOfDay } from 'date-fns';
import { Button } from '@/components/ui/button';

type Project = { id: number; name: string };
type Staff = { id: string; first_name: string; last_name: string };

export default function ScheduleView() {
  const [date, setDate] = useState<DateRangeType>(() => presets[1].range); // Next 7 days default
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<number[]>([]);
  const [availableStaff, setAvailableStaff] = useState<Staff[]>([]);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [rows, setRows] = useState<GanttRow[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();
  const [userRoles, setUserRoles] = useState<string[]>([]);

  const startDate = date.startDate ? startOfDay(date.startDate) : startOfDay(new Date());
  const endDate = date.endDate ? endOfDay(date.endDate) : endOfDay(addDays(new Date(), 6));
  
  // Fetch current user and roles from API
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await fetch('/api/user/role');
        if (response.ok) {
          const data = await response.json();
          setCurrentUserId(data.userId);
          setUserRoles(data.roles || []);
        }
      } catch (error) {
        console.error('Error fetching user info:', error);
      }
    };
    
    fetchUserInfo();
  }, []);

  // Load filter options when dependencies change
  useEffect(() => {
    const loadFilters = async () => {
      setLoadingFilters(true);
      try {
        const projRes = await fetch(`/api/schedule/projects`);
        const projData = await projRes.json();
        setProjects(projData || []);
      } finally {
        setLoadingFilters(false);
      }
    };
    loadFilters();
  }, []); // Load projects only once on mount

  // Load available staff when projects change
  useEffect(() => {
    const loadStaff = async () => {
      if (selectedProjects.length === 0) {
        setAvailableStaff([]);
        setSelectedStaffIds([]);
        return;
      }

      try {
        const params = new URLSearchParams();
        params.set('projectIds', selectedProjects.join(','));
        const res = await fetch(`/api/schedule/staff?${params.toString()}`);
        const data = await res.json();
        setAvailableStaff(data || []);
        
        // Clear selected staff that are no longer in the available list
        const availableIds = new Set((data || []).map((s: Staff) => s.id));
        setSelectedStaffIds(prev => prev.filter(id => availableIds.has(id)));
      } catch (error) {
        console.error('Error loading staff:', error);
        setAvailableStaff([]);
      }
    };
    loadStaff();
  }, [selectedProjects.join(',')]);

  // Load schedule data
  const reload = async () => {
    setLoadingData(true);
    try {
      const params = new URLSearchParams();
      params.set('startDate', startDate.toISOString());
      params.set('endDate', endDate.toISOString());
      if (selectedProjects.length) params.set('projectIds', selectedProjects.join(','));
      if (selectedStaffIds.length) params.set('staffIds', selectedStaffIds.join(','));
      
      const res = await fetch(`/api/schedule?${params.toString()}`);
      const data = await res.json();
      const grouped: Record<string, GanttRow> = {};
      (data || []).forEach((t: any) => {
        (t.assignees || []).forEach((a: any) => {
          // If staff filter is active, only show tasks for selected staff
          if (selectedStaffIds.length > 0 && !selectedStaffIds.includes(a.id)) {
            return; // Skip this assignee
          }
          
          const key = a.id;
          if (!grouped[key]) grouped[key] = { assigneeId: key, assigneeName: `${a.first_name} ${a.last_name}`, tasks: [] };
          grouped[key].tasks.push({ 
            id: t.id, 
            title: t.title, 
            project: t.project_name, 
            startDate: t.created_at,
            deadline: t.deadline,
            status: t.status,
            updatedAt: t.updated_at,
            assignee: { id: a.id, name: `${a.first_name} ${a.last_name}` } 
          });
        });
      });
      setRows(Object.values(grouped));
    } catch (error) {
      console.error('Failed to load schedule data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date.startDate?.toISOString(), date.endDate?.toISOString(), selectedProjects.join(','), selectedStaffIds.join(',')]);

  const handleChangeDeadline = async (taskId: number, newDate: Date) => {
    try {
      const response = await fetch('/api/schedule', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, deadline: newDate.toISOString() }),
      });
      
      if (!response.ok) {
        console.error('Failed to update task deadline');
        return;
      }
      
      reload();
    } catch (error) {
      console.error('Failed to update task deadline');
    }
  };

  return (
    <div className="space-y-4 p-2 sm:p-4">
      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3 items-stretch sm:items-center">
        <DateRangeFilter value={date} onChange={setDate} />
        <ProjectSelector
          projects={projects as any}
          selectedProjects={selectedProjects}
          onChange={setSelectedProjects}
          loading={loadingFilters}
        />
        <StaffSelector
          staff={availableStaff}
          selectedStaffIds={selectedStaffIds}
          onChange={setSelectedStaffIds}
          loading={loadingFilters}
        />
        <Button variant="secondary" onClick={reload} disabled={loadingData} className="w-full sm:w-auto">
          Refresh
        </Button>
      </div>

      <div className="-mx-2 sm:mx-0">
        <GanttChart 
          rows={rows} 
          startDate={startOfDay(startDate)} 
          endDate={endOfDay(endDate)} 
          currentUserId={currentUserId}
          userRoles={userRoles}
          onChangeDeadline={handleChangeDeadline} 
        />
      </div>
    </div>
  );
}
