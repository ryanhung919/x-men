"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts";
import { start } from "repl";

interface Props {
  departmentIds?: number[];
  projectIds?: number[];
  startDate?: string;
  endDate?: string;
}

interface CompletionData {
  assignee: string;
  completed: number;
  color: string;
}

export function TaskCompletionsChart({ departmentIds = [], projectIds = [], startDate, endDate }: Props) {
  const [data, setData] = useState<CompletionData[]>([]);
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
        if (!res.ok) throw new Error("Failed to fetch analytics");
        const json = await res.json();
        const tasks = json?.tasks ?? [];
        const map: Record<string, number> = {};
        tasks.forEach((t: any) => {
          if (t.status === "Done") {
            const assignee = t.assignee?.username || "Unassigned";
            map[assignee] = (map[assignee] || 0) + 1;
          }
        });
        setData(
          Object.entries(map).map(([assignee, completed], idx) => ({
            assignee,
            completed,
            color: `hsl(${(idx * 60) % 360}, 70%, 50%)`,
          }))
        );
      } catch (err) {
        console.error(err);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [departmentIds, projectIds, startDate, endDate]);

  if (loading) return <div className="animate-pulse h-64 bg-muted rounded" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Task Completions</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="assignee" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="completed">
              {data.map((entry, idx) => (
                <Cell key={idx} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
