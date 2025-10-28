import { createClient } from "@/lib/supabase/server";

interface GetTasksOpts {
  departmentIds?: number[];
  projectIds?: number[];
  startDate?: Date;
  endDate?: Date;
}

export async function getTasks(opts: GetTasksOpts) {
  const { projectIds, startDate, endDate } = opts;
  const supabase = await createClient();

  // Base query selecting all relevant task fields
  let query = supabase
    .from("tasks")
    .select(`
      id,
      title,
      description,
      priority_bucket,
      status,
      creator_id,
      project_id,
      deadline,
      parent_task_id,
      logged_time,
      created_at,
      updated_at,
      is_archived
    `)
    .eq("is_archived", false); 

  // Filter by projectIds if provided
  if (projectIds && projectIds.length > 0) {
    query = query.in("project_id", projectIds);
  }

  // Filter by startDate / endDate if provided
  if (startDate) query = query.gte("created_at", startDate.toISOString());
  if (endDate) query = query.lte("created_at", endDate.toISOString());

  const { data: tasks, error } = await query;
  if (error) throw error;

  return tasks ?? [];
}

export interface UserInfo {
  id: string;
  first_name: string;
  last_name: string;
}

export async function getUsersByIds(userIds: string[]): Promise<UserInfo[]> {
  if (userIds.length === 0) return [];
  
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('user_info')
    .select('id, first_name, last_name')
    .in('id', userIds);

  if (error) throw error;
  return data ?? [];
}

export interface WeeklyTaskStats {
  week: string; // ISO week format: "2024-W01"
  weekStart: string; // ISO date of week start
  userId: string;
  userName: string;
  todo: number;
  inProgress: number;
  completed: number;
  blocked: number;
  total: number;
}

export async function getWeeklyTaskStatsByUser(opts: GetTasksOpts): Promise<WeeklyTaskStats[]> {
  const { projectIds, startDate, endDate } = opts;
  const supabase = await createClient();

  // Get tasks with creator info
  let query = supabase
    .from("tasks")
    .select(`
      id,
      status,
      creator_id,
      created_at,
      is_archived
    `)
    .eq("is_archived", false); // Only fetch non-archived tasks

  if (projectIds && projectIds.length > 0) {
    query = query.in("project_id", projectIds);
  }

  if (startDate) query = query.gte("created_at", startDate.toISOString());
  if (endDate) query = query.lte("created_at", endDate.toISOString());

  const { data: tasks, error } = await query;
  if (error) throw error;

  if (!tasks || tasks.length === 0) return [];

  // Get unique user IDs
  const uniqueUserIds = [...new Set(tasks.map((t: { creator_id: string }) => t.creator_id))].filter(
    (id): id is string => typeof id === 'string'
  );
  const usersData = await getUsersByIds(uniqueUserIds);
  const userNameMap = new Map(
    usersData.map((u) => [u.id, `${u.first_name} ${u.last_name}`])
  );

  // Group tasks by user and week
  const statsMap = new Map<string, WeeklyTaskStats>();

  tasks.forEach((task: { id: number; status: string; creator_id: string; created_at: string }) => {
    const userId = task.creator_id || 'Unassigned';
    const createdDate = new Date(task.created_at);
    
    // Get ISO week number
    const weekStart = getWeekStart(createdDate);
    const weekKey = getISOWeek(createdDate);
    const mapKey = `${userId}-${weekKey}`;

    if (!statsMap.has(mapKey)) {
      statsMap.set(mapKey, {
        week: weekKey,
        weekStart: weekStart.toISOString(),
        userId,
        userName: userNameMap.get(userId) || (userId === 'Unassigned' ? 'Unassigned' : 'Unknown User'),
        todo: 0,
        inProgress: 0,
        completed: 0,
        blocked: 0,
        total: 0,
      });
    }

    const stats = statsMap.get(mapKey)!;
    stats.total += 1;

    switch (task.status) {
      case 'To Do':
        stats.todo += 1;
        break;
      case 'In Progress':
        stats.inProgress += 1;
        break;
      case 'Completed':
        stats.completed += 1;
        break;
      case 'Blocked':
        stats.blocked += 1;
        break;
    }
  });

  return Array.from(statsMap.values()).sort((a, b) => {
    // Sort by week first, then by user
    if (a.week !== b.week) return a.week.localeCompare(b.week);
    return a.userName.localeCompare(b.userName);
  });
}

// Helper function to get ISO week number
function getISOWeek(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

// Helper function to get start of week (Monday)
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}