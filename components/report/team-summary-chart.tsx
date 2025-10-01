"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

interface Props {
  departmentIds?: number[];
  projectIds?: number[];
  timeRange?: "week" | "month" | "quarter";
}

interface TeamStatusData {
  staff: string;
  "To Do": number;
  "In Progress": number;
  "Done": number;
}

export function TeamSummaryChart({ departmentIds = [], projectIds = [], timeRange = "month" }: Props) {
  const [data, setData] = useState<TeamStatusData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!departmentIds.length) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          action: "analytics",
          departmentIds: departmentIds.join(","),
          projectIds: projectIds.join(","),
          timeRange,
        });
        const res = await fetch(`/api/reports?${params}`);
        if (!res.ok) throw new Error("Failed to fetch analytics");
        const json = await res.json();
        const tasks = json?.tasks ?? [];
        const summaryMap: Record<string, TeamStatusData> = {};
        tasks.forEach((t: any) => {
          const staffName = t.assignee?.username || "Unassigned";
          if (!summaryMap[staffName]) summaryMap[staffName] = { staff: staffName, "To Do": 0, "In Progress": 0, "Done": 0 };
          const status = t.status as "To Do" | "In Progress" | "Done";
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
  }, [departmentIds, projectIds, timeRange]);

  if (loading) return (
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
            <Bar dataKey="Done" stackId="a" fill="#10b981" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
