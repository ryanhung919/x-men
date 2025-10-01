"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface ProductivityMetricsProps {
  departmentIds?: number[];
  projectIds?: number[];
  timeRange?: "week" | "month" | "quarter";
}

interface Metrics {
  completionRate: number;
  totalTasks: number;
  totalCompleted: number;
  totalOverdue: number;
}

export function ProductivityMetrics({ departmentIds = [], projectIds = [], timeRange = "month" }: ProductivityMetricsProps) {
  const [metrics, setMetrics] = useState<Metrics>({
    completionRate: 0,
    totalTasks: 0,
    totalCompleted: 0,
    totalOverdue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!departmentIds.length) return;

    const fetchMetrics = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          action: "metrics",
          departmentIds: departmentIds.join(","),
          projectIds: projectIds.join(","),
          timeRange,
        });

        const res = await fetch(`/api/reports?${params}`);
        if (!res.ok) throw new Error("Failed to fetch metrics");
        const json = await res.json();
        if (json?.metrics) setMetrics(json.metrics);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [departmentIds, projectIds, timeRange]);

  if (loading) return <div className="animate-pulse h-64 bg-muted rounded" />;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* Completion Rate */}
      <Card>
        <CardHeader>
          <CardTitle>Completion Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.completionRate}%</div>
          <Progress value={metrics.completionRate} className="mt-2" />
          <p className="text-xs text-muted-foreground mt-2">{metrics.totalCompleted} tasks completed</p>
        </CardContent>
      </Card>

      {/* Overdue Tasks */}
      <Card>
        <CardHeader>
          <CardTitle>Overdue Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{metrics.totalOverdue}</div>
          <p className="text-xs text-muted-foreground mt-2">Tasks past deadline</p>
        </CardContent>
      </Card>

      {/* Total Tasks */}
      <Card>
        <CardHeader>
          <CardTitle>Total Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.totalTasks}</div>
          <p className="text-xs text-muted-foreground mt-2">Tasks assigned</p>
        </CardContent>
      </Card>
    </div>
  );
}
