import type { ReactNode } from 'react';

export const REPORT_STATES = [
  { key: 'completed', label: 'Completed', color: 'var(--chart-1)' },
  { key: 'inProgress', label: 'In progress', color: 'var(--chart-2)' },
  { key: 'todo', label: 'To do', color: 'var(--muted-foreground)' },
  { key: 'blocked', label: 'Blocked', color: 'var(--chart-problem)' },
] as const;

export function StatusLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-muted-foreground">
      {REPORT_STATES.map(({ key, label, color }) => (
        <span key={key} className="flex items-center gap-1.5">
          <span className="size-2 rounded-sm" style={{ background: color }} />
          {label}
        </span>
      ))}
    </div>
  );
}

export function StatusComparison({
  counts,
  maximum,
}: {
  counts: Record<(typeof REPORT_STATES)[number]['key'], number>;
  maximum: number;
}) {
  return (
    <figure
      className="flex h-3 overflow-hidden rounded bg-muted"
      aria-label={REPORT_STATES.map(({ key, label }) => `${label}: ${counts[key]}`).join(', ')}
    >
      {REPORT_STATES.map(({ key, label, color }) => (
        <span
          key={key}
          title={`${label}: ${counts[key]}`}
          style={{ width: `${(counts[key] / Math.max(maximum, 1)) * 100}%`, background: color }}
        />
      ))}
    </figure>
  );
}

export function ReportMetrics({
  items,
}: {
  items: { label: string; value: ReactNode; note?: string; problem?: boolean }[];
}) {
  return (
    <dl className="grid grid-cols-2 gap-5 rounded-xl border bg-card p-5 lg:flex lg:justify-between sm:p-6">
      {items.map(({ label, value, note, problem }) => (
        <div key={label}>
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd
            className={`mt-2 text-3xl font-semibold tracking-tight tabular-nums ${problem ? 'text-problem' : ''}`}
          >
            {value}
          </dd>
          {note && <p className="mt-1 text-[11px] text-muted-foreground">{note}</p>}
        </div>
      ))}
    </dl>
  );
}

export function ReportError({ retry }: { retry: () => void }) {
  return (
    <div role="alert" className="rounded-xl border bg-card p-8 text-center">
      <h2 className="font-semibold">Report unavailable</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        We couldn’t load this scope. Please try again.
      </p>
      <button className="mt-4 rounded-lg border px-4 py-2 text-sm hover:bg-accent" onClick={retry}>
        Try again
      </button>
    </div>
  );
}
