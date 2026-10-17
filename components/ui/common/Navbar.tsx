'use client';

import { canViewReports } from '@/lib/demo-viewer';
import {
  LogOut,
  Menu,
  ChevronDown,
  Layers3,
  ListTodo,
  CalendarDays,
  ChartNoAxesCombined,
} from 'lucide-react';
import { NotificationPanel } from '@/components/notifications/notification-panel';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
} from '@/components/ui/sheet';

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [user, setUser] = useState<{ id: string; email: string | undefined } | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [accountError, setAccountError] = useState<string | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [defaultView, setDefaultView] = useState<'tasks' | 'schedule'>('tasks');
  const [savingDefaultView, setSavingDefaultView] = useState(false);

  useEffect(() => {
    async function fetchUser() {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();
        if (error) {
          console.error('Error fetching user:', error.message);
          setUser(null);
          setRoles([]);
        } else {
          setUser(user ? { id: user.id, email: user.email } : null);

          // Fetch user roles
          if (user) {
            const { data: roleRows, error: roleError } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', user.id);

            if (roleError) {
              console.error('Error fetching roles:', roleError.message);
              setRoles([]);
            } else {
              setRoles(roleRows.map((r) => r.role));
            }

            // Fetch default view preference
            try {
              const { data: uiRow, error: uiErr } = await supabase
                .from('user_info')
                .select('default_view, first_name, last_name')
                .eq('id', user.id)
                .maybeSingle();
              if (!uiErr && uiRow) {
                setDisplayName([uiRow.first_name, uiRow.last_name].filter(Boolean).join(' '));
              }
              if (!uiErr && uiRow?.default_view) {
                const dv = uiRow.default_view === 'calendar' ? 'schedule' : uiRow.default_view;
                if (dv === 'tasks' || dv === 'schedule') setDefaultView(dv);
              }
            } catch (e) {
              console.warn('Failed to fetch default view', e);
            }
          }
        }
      } catch (error) {
        console.error('Unexpected error:', error);
        setUser(null);
        setRoles([]);
      } finally {
        setIsLoading(false);
      }
    }
    fetchUser();
  }, [supabase]);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error.message);
      setAccountError('Could not sign out. Please try again.');
      return;
    }
    setMobileMenuOpen(false);
    router.push('/');
    router.refresh();
  };

  const isAdmin = roles.includes('admin');
  const showReports = canViewReports(roles);

  const handleDefaultViewChange = async (value: string) => {
    if (value !== 'tasks' && value !== 'schedule') return;
    setAccountError(null);
    const previous = defaultView;
    setDefaultView(value);
    try {
      setSavingDefaultView(true);
      const res = await fetch('/api/user/role', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultView: value }),
        credentials: 'same-origin',
      });
      if (!res.ok) {
        const msg = await res.json().catch(() => ({}));
        console.error('Failed to update default_view via API:', msg?.error || res.statusText);
        setDefaultView(previous);
        setAccountError('Could not save your default view. Please try again.');
      }
    } catch (e) {
      console.error('Failed to update default_view via API:', e);
      setDefaultView(previous);
      setAccountError('Could not save your default view. Please try again.');
    } finally {
      setSavingDefaultView(false);
    }
  };

  const isGuest = roles.includes('demo_viewer');
  const identity = displayName || user?.email?.split('@')[0] || 'Your account';
  const roleLabel = isGuest
    ? 'Read-only demo'
    : isAdmin
      ? 'Administrator'
      : roles.includes('manager')
        ? 'Manager'
        : 'Team member';
  const initials = identity
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
  const destinations = [
    { href: '/tasks', label: 'Tasks', icon: ListTodo },
    { href: '/schedule', label: 'Schedule', icon: CalendarDays },
    ...(showReports ? [{ href: '/report', label: 'Reports', icon: ChartNoAxesCombined }] : []),
  ];
  const current = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const navigation = (mobile = false) => (
    <nav
      aria-label={mobile ? 'Mobile navigation' : 'Main navigation'}
      className={mobile ? 'flex flex-col gap-1' : 'hidden h-full items-center gap-1 md:flex'}
    >
      {destinations.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={current(href) ? 'page' : undefined}
          onClick={() => setMobileMenuOpen(false)}
          className={`flex items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors duration-150 ${mobile ? 'py-3' : 'py-2'} ${current(href) ? 'bg-positive-soft text-positive' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
        >
          <Icon className="size-4" aria-hidden="true" />
          {label}
        </Link>
      ))}
    </nav>
  );

  return (
    <header className="sticky top-0 z-40 shrink-0 border-b bg-card/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-[1488px] items-center gap-7 px-4 sm:px-6 lg:px-8">
        <Link
          href={user ? `/${defaultView}` : '/'}
          aria-label="NODAL home"
          className="flex shrink-0 items-center gap-2.5 font-semibold tracking-[0.12em] text-sm"
        >
          <span className="flex size-8 items-center justify-center rounded-lg border border-positive/20 bg-positive-soft text-positive">
            <Layers3 className="size-[18px]" aria-hidden="true" />
          </span>
          NODAL
        </Link>
        {user && navigation()}
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {isLoading ? (
            <span
              className="h-8 w-28 animate-pulse rounded-lg bg-muted"
              aria-label="Loading account"
            />
          ) : user ? (
            <>
              <NotificationPanel />
              <ThemeToggle />
              <div className="mx-2 hidden h-6 w-px bg-border md:block" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="hidden h-10 max-w-56 items-center gap-2.5 px-2 md:flex"
                    aria-label="Account menu"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full border bg-muted text-xs font-semibold">
                      {initials}
                    </span>
                    <span className="min-w-0 text-left">
                      <span className="block truncate text-xs font-medium">{identity}</span>
                      <span className="block text-[11px] text-muted-foreground">{roleLabel}</span>
                    </span>
                    <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel className="space-y-1">
                    <span className="block truncate">{identity}</span>
                    <span className="block truncate text-xs font-normal text-muted-foreground">
                      {user.email}
                    </span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    Open by default
                  </DropdownMenuLabel>
                  <DropdownMenuRadioGroup
                    value={defaultView}
                    onValueChange={handleDefaultViewChange}
                  >
                    <DropdownMenuRadioItem value="tasks" disabled={savingDefaultView}>
                      Tasks
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="schedule" disabled={savingDefaultView}>
                      Schedule
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="text-destructive focus:text-destructive"
                  >
                    <LogOut className="mr-2 size-4" />
                    Sign out
                  </DropdownMenuItem>
                  {accountError && (
                    <p role="alert" className="px-2 py-1 text-xs text-destructive">
                      {accountError}
                    </p>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    aria-label="Open navigation"
                  >
                    <Menu className="size-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-[320px] max-w-full gap-0 p-0">
                  <SheetHeader className="border-b p-6">
                    <SheetTitle>NODAL</SheetTitle>
                    <SheetDescription>Your workspace, in focus.</SheetDescription>
                  </SheetHeader>
                  <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
                    <div className="flex items-center gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full border bg-muted text-sm font-semibold">
                        {initials}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{identity}</p>
                        <p className="text-xs text-muted-foreground">{roleLabel}</p>
                      </div>
                    </div>
                    {navigation(true)}
                    <div className="space-y-2 border-t pt-5">
                      <p className="text-xs font-medium text-muted-foreground">Open by default</p>
                      <div className="grid grid-cols-2 gap-2">
                        {(['tasks', 'schedule'] as const).map((view) => (
                          <Button
                            key={view}
                            size="sm"
                            variant={defaultView === view ? 'secondary' : 'outline'}
                            disabled={savingDefaultView}
                            aria-pressed={defaultView === view}
                            onClick={() => handleDefaultViewChange(view)}
                          >
                            {view === 'tasks' ? 'Tasks' : 'Schedule'}
                          </Button>
                        ))}
                      </div>
                    </div>
                    {accountError && (
                      <p role="alert" className="text-xs text-destructive">
                        {accountError}
                      </p>
                    )}
                    <Button
                      variant="ghost"
                      className="mt-auto justify-start text-destructive hover:text-destructive"
                      onClick={handleSignOut}
                    >
                      <LogOut className="mr-2 size-4" />
                      Sign out
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </>
          ) : (
            <>
              <ThemeToggle />
              <Button variant="outline" size="sm" asChild>
                <Link href="/">Sign in</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
