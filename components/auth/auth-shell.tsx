import type { ReactNode } from 'react';
import Link from 'next/link';
import { Layers3, CheckCheck, CalendarDays, ChartNoAxesCombined } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-sm font-semibold tracking-[0.12em]"
        >
          <span className="flex size-8 items-center justify-center rounded-lg border border-positive/20 bg-positive-soft text-positive">
            <Layers3 className="size-[18px]" />
          </span>
          NODAL
        </Link>
        <ThemeToggle />
      </header>
      <main className="mx-auto grid w-full max-w-5xl flex-1 items-center gap-16 px-6 py-10 md:grid-cols-2 md:px-10 md:py-16">
        <section className="hidden md:block">
          <p className="mb-6 text-xs font-medium uppercase tracking-[0.2em] text-positive">
            Make room for good work
          </p>
          <h1 className="max-w-md text-5xl font-semibold leading-[1.12] tracking-[-0.05em]">
            Clarity for every workday.
          </h1>
          <p className="mt-6 max-w-sm text-base leading-relaxed text-muted-foreground">
            Bring your team's tasks, timelines and progress into one focused workspace.
          </p>
          <div className="mt-10 space-y-5 border-t pt-7">
            {[
              [CheckCheck, 'Keep work moving'],
              [CalendarDays, 'See the plan ahead'],
              [ChartNoAxesCombined, 'Understand your progress'],
            ].map(([Icon, label]) => {
              const Glyph = Icon as typeof CheckCheck;
              return (
                <div key={label as string} className="flex items-center gap-3 text-sm">
                  <Glyph className="size-4 text-positive" />
                  <span>{label as string}</span>
                </div>
              );
            })}
          </div>
        </section>
        <div className="w-full max-w-md justify-self-center [&_[data-slot=card]]:border-border [&_[data-slot=card]]:shadow-sm [&_[data-slot=card-header]]:px-7 [&_[data-slot=card-content]]:px-7 [&_[data-slot=card-title]]:text-2xl [&_[data-slot=card-title]]:font-semibold [&_[data-slot=card-title]]:tracking-tight [&_input]:h-11 [&_button[type=submit]]:h-11">
          {children}
        </div>
      </main>
      <footer className="px-6 py-6 text-center text-xs text-muted-foreground">
        Work together. Move forward.
      </footer>
    </div>
  );
}
