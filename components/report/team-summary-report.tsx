'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { TeamSummaryReport as TeamSummaryReportType } from '@/components/report/export-buttons';

interface Props {
  departmentIds?: number[];
  projectIds?: number[];
  startDate?: string;
  endDate?: string;
}

interface TeamStatusData {
  staff: string;
  'To Do': number;
  'In Progress': number;
  Completed: number;
}

export function TeamSummaryChart({
  departmentIds = [],
  projectIds = [],
  startDate,
  endDate,
}: Props) {
  const [data, setData] = useState<TeamStatusData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!departmentIds.length) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          action: 'report',
          departmentIds: departmentIds.join(','),
          projectIds: projectIds.join(','),
        });

        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);

        const res = await fetch(`/api/reports?${params}`);
        if (!res.ok) throw new Error('Failed to fetch analytics');
        const json = await res.json();
        const tasks = json?.tasks ?? [];
        const summaryMap: Record<string, TeamStatusData> = {};
        tasks.forEach((t: any) => {
          const staffName = t.assignee?.username || 'Unassigned';
          if (!summaryMap[staffName])
            summaryMap[staffName] = {
              staff: staffName,
              'To Do': 0,
              'In Progress': 0,
              Completed: 0,
            };
          const status = t.status as 'To Do' | 'In Progress' | 'Completed';
          if (status) summaryMap[staffName][status] += 1;
        });
        setData(Object.values(summaryMap));
      } catch (err) {
        console.error(err);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [departmentIds, projectIds, startDate, endDate]);

  if (loading)
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} stackOffset="expand">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="staff" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="To Do" stackId="a" fill="#94a3b8" />
            <Bar dataKey="In Progress" stackId="a" fill="#3b82f6" />
            <Bar dataKey="Completed" stackId="a" fill="#10b981" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
