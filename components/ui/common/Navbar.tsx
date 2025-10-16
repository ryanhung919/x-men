'use client';

import { LogOut, User2, Settings, Menu, X } from 'lucide-react';
import { NotificationPanel } from '@/components/notifications/notification-panel';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

export function Navbar() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<{ email: string | undefined } | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
          setUser(user ? { email: user.email } : null);

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
      return;
    }
    setMobileMenuOpen(false);
    router.push('/auth/login');
  };

  const isAdmin = roles.includes('admin');

  if (isLoading) {
    return (
      <header className="flex h-16 shrink-0 items-center gap-4 border-b px-4 md:px-6 bg-background">
        <Link
          href="/tasks"
          className="text-lg font-semibold transition-all duration-200 hover:text-primary hover:underline decoration-2 underline-offset-4"
        >
          TaskFlow
        </Link>
        <div className="flex-1" />
        <div className="text-sm text-muted-foreground">Loading...</div>
      </header>
    );
  }

  if (!user) {
    return (
      <header className="flex h-16 shrink-0 items-center gap-4 border-b px-4 md:px-6 bg-background">
        <Link
          href="/"
          className="text-lg font-semibold transition-all duration-200 hover:text-primary hover:underline decoration-2 underline-offset-4"
        >
          TaskFlow
        </Link>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button
            variant="ghost"
            className="transition-all duration-200 hover:bg-accent hover:text-accent-foreground hover:scale-105"
            onClick={() => router.push('/auth/login')}
          >
            Sign In
          </Button>
        </div>
      </header>
    );
  }

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b px-4 md:px-6 bg-background">
      <Link
        href="/tasks"
        className="text-lg font-semibold transition-all duration-200 hover:text-primary hover:underline decoration-2 underline-offset-4"
      >
        TaskFlow
      </Link>

      {/* Desktop Navigation */}
      <nav className="hidden md:flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="transition-all duration-200 hover:bg-accent hover:text-accent-foreground hover:scale-105"
        >
          <Link href="/tasks">Tasks</Link>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="transition-all duration-200 hover:bg-accent hover:text-accent-foreground hover:scale-105"
        >
          <Link href="/schedule">Schedule</Link>
        </Button>
        {isAdmin && (
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="transition-all duration-200 hover:bg-accent hover:text-accent-foreground hover:scale-105"
          >
            <Link href="/report">Report</Link>
          </Button>
        )}
      </nav>

      <div className="flex-1" />

      {/* Desktop Actions */}
      <div className="hidden md:flex items-center gap-2">
        <NotificationPanel />
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 transition-all duration-200 hover:bg-accent hover:text-accent-foreground hover:scale-105"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform duration-200 hover:scale-110">
                <User2 className="h-4 w-4" />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium">{user.email}</span>
                <span className="text-xs text-muted-foreground">{isAdmin ? 'Admin' : 'User'}</span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-background border">
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href="/profile">
                <User2 className="mr-2 h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href="/settings">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleSignOut}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Mobile Actions */}
      <div className="flex md:hidden items-center gap-2">
        <NotificationPanel />
        <ThemeToggle />
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[280px] sm:w-[320px]">
            <SheetHeader>
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-4 mt-6">
              {/* User Info */}
              <div className="flex items-center gap-3 pb-4 border-b">
                <div className="flex ml-2 h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <User2 className="h-5 w-5" />
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-sm font-medium truncate">{user.email}</span>
                  <span className="text-xs text-muted-foreground">
                    {isAdmin ? 'Admin' : 'User'}
                  </span>
                </div>
              </div>

              {/* Navigation Links */}
              <nav className="flex flex-col gap-2">
                <Button
                  variant="ghost"
                  asChild
                  className="justify-start"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Link href="/tasks">Tasks</Link>
                </Button>
                <Button
                  variant="ghost"
                  asChild
                  className="justify-start"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Link href="/schedule">Schedule</Link>
                </Button>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    asChild
                    className="justify-start"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Link href="/report">Report</Link>
                  </Button>
                )}
              </nav>

              {/* Divider */}
              <div className="border-t my-2" />

              {/* Settings & Profile */}
              <div className="flex flex-col gap-2">
                <Button
                  variant="ghost"
                  asChild
                  className="justify-start"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Link href="/profile">
                    <User2 className="ml-2 mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  asChild
                  className="justify-start"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Link href="/settings">
                    <Settings className="ml-2 mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </Button>
              </div>

              {/* Divider */}
              <div className="border-t my-2" />

              {/* Sign Out */}
              <Button
                variant="ghost"
                onClick={handleSignOut}
                className="justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <LogOut className="ml-2 mr-2 h-4 w-4" />
                Sign out
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
