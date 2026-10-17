import Link from 'next/link';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
export function StatusSurface({
  title,
  message,
  detail,
  href = '/tasks',
  action = 'Back to Tasks',
}: {
  title: string;
  message: string;
  detail?: string;
  href?: string;
  action?: string;
}) {
  return (
    <section className="mx-auto my-12 w-full max-w-lg rounded-2xl border bg-card p-7 sm:my-20 sm:p-10">
      <span className="mb-6 flex size-11 items-center justify-center rounded-xl border border-problem/20 bg-problem-soft text-problem">
        <ShieldAlert className="size-5" />
      </span>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{message}</p>
      {detail && (
        <p className="mt-5 break-words rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
          {detail}
        </p>
      )}
      <Button asChild className="mt-7">
        <Link href={href}>
          <ArrowLeft className="mr-2 size-4" />
          {action}
        </Link>
      </Button>
    </section>
  );
}
