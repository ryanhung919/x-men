// app/report/page.tsx (Server Component)
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import ReportsPageClient from '@/components/report/page-client';
import { Suspense } from 'react';
import { LoggedTimeReportSkeleton } from '@/components/report/report-skeletons';

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

// Separate async component for data loading
async function ReportsPageData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <div>Unauthorized</div>;
  }

  const userInfo = await getUserInfo();
  const userDepartmentId = userInfo?.departmentId || null;

  // Dynamically import to avoid blocking initial render
  const { filterProjects, filterDepartments } = await import('@/lib/services/filter');
  const { generateLoggedTimeReport } = await import('@/lib/services/report');

  let initialDepartments: Array<{ id: number; name: string }> = [];
  let initialProjects: any[] = [];
  let initialReportData: any = null;
  let preselectedDepartments: number[] = [];
  let preselectedProjects: number[] = [];

  try {
    // Fetch departments and projects in parallel
    const [departments, projects] = await Promise.all([
      filterDepartments(user.id),
      filterProjects(user.id),
    ]);

    initialDepartments = departments;
    initialProjects = projects;

    // If user has a department, preselect it and generate report
    if (userDepartmentId && initialDepartments.some((d) => d.id === userDepartmentId)) {
      preselectedDepartments = [userDepartmentId];

      // Filter projects for user's department
      const userProjects = initialProjects.filter((p) =>
        p.departments?.some((d: any) => d.id === userDepartmentId)
      );

      preselectedProjects = userProjects.map((p) => p.id);

      // Generate initial report data if we have projects
      if (preselectedProjects.length > 0) {
        const reportData = await generateLoggedTimeReport({
          projectIds: preselectedProjects,
          startDate: undefined,
          endDate: undefined,
        });

        // Convert for JSON serialization
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
          timeByTask: reportData.timeByTask,
        };
      }
    }
  } catch (error) {
    console.error('Error preloading report data:', error);
  }

  return (
    <ReportsPageClient
      initialDepartmentId={userDepartmentId}
      initialDepartments={initialDepartments}
      initialProjects={initialProjects}
      initialReportData={initialReportData}
      preselectedDepartments={preselectedDepartments}
      preselectedProjects={preselectedProjects}
    />
  );
}

// Skeleton that matches the exact layout of the filters and report
function ReportsPageSkeleton() {
  return (
    <div className="space-y-6 p-4">
      {/* Filter Controls Row */}
      <div className="flex flex-wrap gap-4 items-center">
        {/* Department Selector Skeleton */}
        <div className="relative">
          <div className="w-52 h-10 rounded-md border border-input bg-muted animate-pulse" />
        </div>

        {/* Project Selector Skeleton */}
        <div className="relative">
          <div className="w-52 h-10 rounded-md border border-input bg-muted animate-pulse" />
        </div>

        {/* Date Range Selector Skeleton */}
        <div className="relative">
          <div className="w-52 h-10 rounded-md border border-input bg-muted animate-pulse" />
        </div>

        {/* Report Type Selector Skeleton */}
        <div className="relative">
          <div className="w-52 h-10 rounded-md border border-input bg-muted animate-pulse" />
        </div>

        {/* Export Buttons Skeleton */}
        <div className="flex gap-2">
          <div className="h-9 w-32 rounded-md bg-muted animate-pulse" />
          <div className="h-9 w-32 rounded-md bg-muted animate-pulse" />
        </div>
      </div>

      {/* Active Filters Badge Skeleton - matches initial preselected state */}
      <div className="flex items-center gap-2 mt-3">
        <div className="h-8 w-48 rounded-full" />
        <div className="h-5 w-20 rounded" />
      </div>

      {/* Report Content Skeleton */}
      <div className="mt-4">
        <LoggedTimeReportSkeleton />
      </div>
    </div>
  );
}

// Main page component with Suspense boundary
export default function ReportsPage() {
  return (
    <Suspense fallback={<ReportsPageSkeleton />}>
      <ReportsPageData />
    </Suspense>
  );
}
