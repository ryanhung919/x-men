// app/report/page.tsx (Server Component)
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import ReportsPageClient from './page-client';
import { filterProjects, filterDepartments } from '@/lib/services/filter';
import { generateLoggedTimeReport } from '@/lib/services/report';

export const dynamic = 'force-dynamic';

// Helper to get user info from cookie
async function getUserInfo() {
  const cookieStore = await cookies();
  const userInfoCookie = cookieStore.get('user-info')?.value;
  
  if (!userInfoCookie) return null;
  
  try {
    return JSON.parse(userInfoCookie);
  } catch {
    return null;
  }
}

export default async function ReportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return <div>Unauthorized</div>;
  }

  const userInfo = await getUserInfo();
  const userDepartmentId = userInfo?.departmentId || null;

  // Preload all necessary data
  let initialDepartments: Array<{id: number; name: string}> = [];
  let initialProjects: any[] = [];
  let initialReportData: any = null;
  let preselectedDepartments: number[] = [];
  let preselectedProjects: number[] = [];

  try {
    // Fetch all departments available to user
    initialDepartments = await filterDepartments(user.id);
    
    // If user has a department, preselect it
    if (userDepartmentId && initialDepartments.some(d => d.id === userDepartmentId)) {
      preselectedDepartments = [userDepartmentId];
      
      // Fetch projects for user's department
      initialProjects = await filterProjects(user.id, preselectedDepartments);
      
      // Get all project IDs for the report
      preselectedProjects = initialProjects.map(p => p.id);
      
      // Generate initial report data if we have projects
      if (preselectedProjects.length > 0) {
        const reportData = await generateLoggedTimeReport({
          projectIds: preselectedProjects,
          startDate: undefined,
          endDate: undefined,
        });
        
        // Convert Map to object for JSON serialization
        initialReportData = {
          kind: reportData.kind,
          totalTime: reportData.totalTime,
          avgTime: reportData.avgTime,
          completedTasks: reportData.completedTasks,
          overdueTasks: reportData.overdueTasks,
          blockedTasks: reportData.blockedTasks,
          incompleteTime: reportData.incompleteTime,
          onTimeCompletionRate: reportData.onTimeCompletionRate,
          totalDelayHours: reportData.totalDelayHours,
          overdueTime: reportData.overdueTime,
          timeByTask: reportData.timeByTask, // Keep as Map for now
        };
      }
    } else {
      // No department preselected, just fetch all projects
      initialProjects = await filterProjects(user.id);
    }
  } catch (error) {
    console.error('Error preloading report data:', error);
  }

  return (
    <ReportsPageClient
      initialDepartmentId={userDepartmentId}
      initialDepartments={initialDepartments}
      initialProjects={initialProjects as any}
      initialReportData={initialReportData}
      preselectedDepartments={preselectedDepartments}
      preselectedProjects={preselectedProjects}
    />
  );
}