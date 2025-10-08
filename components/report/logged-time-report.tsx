'use client';

import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { LoggedTimeReport as LoggedTimeReportType, } from '@/components/report/export-buttons';


interface LoggedTimeProps {
  departmentIds?: number[];
  projectIds?: number[];
  startDate?: string;
  endDate?: string;
  onDataLoaded?: (data: LoggedTimeReportType) => void; // NEW: callback to lift data

}

interface Metrics {
  totalCompleted: number;
  totalOverdue: number;
  totalLoggedHours: number;
  avgLoggedHours: number;
  wipHours: number;
  timeByTask: Record<string, number>;
  onTimeRate: number;
  totalLateness: number;
  overdueLoggedTime: number;
}

export function LoggedTimeReport({
  departmentIds = [],
  projectIds = [],
  startDate,
  endDate,
  onDataLoaded
}: LoggedTimeProps) {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(false);

  // Keep previous metrics to prevent flicker
  const prevMetricsRef = useRef<Metrics | null>(null);

  useEffect(() => {
    if (!departmentIds.length) {
    setMetrics(null);
    prevMetricsRef.current = null;
    return;
  }

    const fetchMetrics = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          action: 'time',
          departmentIds: departmentIds.join(','),
          projectIds: projectIds.join(','),
        });

        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);

        const res = await fetch(`/api/reports?${params}`);
        if (!res.ok) throw new Error('Failed to fetch logged time metrics');
        
        const json = await res.json();
        if (json) {
          const newMetrics: Metrics = {
            totalCompleted: json.completedCount,
            totalOverdue: json.overdueCount,
            totalLoggedHours: json.totalTime || 0,
            avgLoggedHours: json.avgTime || 0,
            wipHours: json.wipTime || 0,
            timeByTask: json.timeByTask || {},
            onTimeRate: json.onTimeRate ?? 0,
            totalLateness: json.totalLateness ?? 0,
            overdueLoggedTime: json.overdueLoggedTime ?? 0,
          };

          prevMetricsRef.current = newMetrics; // save for skeleton fallback
          setMetrics(newMetrics);

          if (onDataLoaded) {
            const exportData: LoggedTimeReportType = {
              kind: 'loggedTime',
              totalTime: newMetrics.totalLoggedHours,
              avgTime: newMetrics.avgLoggedHours,
              completedCount: newMetrics.totalCompleted,
              overdueCount: newMetrics.totalOverdue,
              onTimeRate: newMetrics.onTimeRate,
              totalLateness: newMetrics.totalLateness,
              wipTime: newMetrics.wipHours,
              overdueLoggedTime: newMetrics.overdueLoggedTime,
              timeByTask: new Map(
                Object.entries(newMetrics.timeByTask).map(([k, v]) => [Number(k), v])
              ),
            };
            onDataLoaded(exportData);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [departmentIds, projectIds, startDate, endDate]);

  // Use previous metrics as fallback while loading
  const displayMetrics = loading && prevMetricsRef.current ? prevMetricsRef.current : metrics;

  if (!displayMetrics)
    return <div className="animate-pulse h-64 bg-muted rounded-lg w-full" />;


  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {/* WIP Hours */}
      <Card>
        <CardHeader>
          <CardTitle>WIP Hours</CardTitle>
          <CardDescription>Tasks in progress</CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={(displayMetrics.wipHours / (displayMetrics.totalLoggedHours || 1)) * 100} />
          <div className="text-lg font-semibold mt-2">{displayMetrics.wipHours.toFixed(1)}h</div>
          {loading && <div className="absolute inset-0 animate-pulse bg-black/10 rounded-md" />}
        </CardContent>
      </Card>

      {/* Total & Avg Logged Hours */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Logged Hours</CardTitle>
          <CardDescription>Total & Average</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-between items-center">
          <div>
            <div className="text-3xl font-bold">{displayMetrics.totalLoggedHours.toFixed(1)}h</div>
            <p className="text-sm text-muted-foreground">Total</p>
          </div>
          <div>
            <div className="text-3xl font-bold">{displayMetrics.avgLoggedHours.toFixed(1)}h</div>
            <p className="text-sm text-muted-foreground">Average / task</p>
          </div>
        </CardContent>
      </Card>

      {/* On-Time Completion Rate */}
      <Card>
        <CardHeader>
          <CardTitle>On-Time Completion Rate</CardTitle>
          <CardDescription>Tasks done and updated before deadline</CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={displayMetrics.onTimeRate * 100} />
          <div className="text-lg font-semibold mt-2">{(displayMetrics.onTimeRate * 100).toFixed(1)}%</div>
        </CardContent>
      </Card>

      {/* Lateness */}
      <Card>
        <CardHeader>
          <CardTitle>Lateness</CardTitle>
          <CardDescription>Hours whereby tasks were completed past deadlines</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-lg font-semibold">{displayMetrics.totalLateness.toFixed(1)}h</div>
        </CardContent>
      </Card>

      {/* Overdue Logged Time */}
      <Card>
        <CardHeader>
          <CardTitle>Overdue Logged Time</CardTitle>
          <CardDescription>Hours spent on incomplete tasks that are past deadlines</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-lg font-semibold">{displayMetrics.overdueLoggedTime.toFixed(1)}h</div>
        </CardContent>
      </Card>

    </div>
  );
}
