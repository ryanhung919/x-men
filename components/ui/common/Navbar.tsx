'use client';

import { Bell, LogOut, User2, Settings } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function Navbar() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<{ email: string | undefined } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
        } else {
          setUser(user ? { email: user.email } : null);
        }
      } catch (error) {
        console.error('Unexpected error:', error);
        setUser(null);
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
    router.push('/auth/login');
  };

  if (isLoading) {
    return (
      <header className="flex h-16 shrink-0 items-center gap-4 border-b px-6 bg-background">
        <Link
          href="/dashboard"
          className="text-lg font-semibold transition-all duration-200 hover:text-primary hover:underline decoration-2 underline-offset-4"
        >
          TaskFlow
        </Link>
        <div className="flex-1" />
        <div>Loading...</div>
      </header>
    );
  }

  if (!user) {
    return (
      <header className="flex h-16 shrink-0 items-center gap-4 border-b px-6 bg-background">
        <Link
          href="/dashboard"
          className="text-lg font-semibold transition-all duration-200 hover:text-primary hover:underline decoration-2 underline-offset-4"
        >
          TaskFlow
        </Link>
        <div className="flex-1" />
        <Button
          variant="ghost"
          className="transition-all duration-200 hover:bg-accent hover:text-accent-foreground hover:scale-105"
          onClick={() => router.push('/auth/login')}
        >
          Sign In
        </Button>
      </header>
    );
  }

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b px-6 bg-background">
      <Link
        href="/dashboard"
        className="text-lg font-semibold transition-all duration-200 hover:text-primary hover:underline decoration-2 underline-offset-4"
      >
        TaskFlow
      </Link>
      <nav className="hidden md:flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="transition-all duration-200 hover:bg-accent hover:text-accent-foreground hover:scale-105"
        >
          <Link href="/dashboard">Dashboard</Link>
        </Button>
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
      </nav>
      <div className="flex-1" />
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          asChild
          className="transition-all duration-200 hover:bg-accent hover:text-accent-foreground hover:scale-110 hover:rotate-12"
        >
          <Link href="/notifications">
            <Bell className="h-5 w-5" />
          </Link>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 transition-all duration-200 hover:bg-accent hover:text-accent-foreground hover:scale-105 hover:ring-2 hover:ring-accent"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform duration-200 hover:scale-110">
                <User2 className="h-4 w-4" />
              </div>
              <div className="hidden md:flex flex-col items-start">
                <span className="text-sm font-medium">{user.email}</span>
                <span className="text-xs text-muted-foreground">User</span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-56 bg-background/95 backdrop-blur-sm border-2 border-border shadow-2xl z-50"
          >
            <DropdownMenuItem
              asChild
              className="cursor-pointer transition-all duration-150 hover:bg-accent hover:text-accent-foreground hover:scale-[1.02] hover:pl-3"
            >
              <Link href="/profile">
                <User2 className="mr-2 h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              asChild
              className="cursor-pointer transition-all duration-150 hover:bg-accent hover:text-accent-foreground hover:scale-[1.02] hover:pl-3"
            >
              <Link href="/settings">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleSignOut}
              className="cursor-pointer transition-all duration-150 hover:bg-destructive hover:text-destructive-foreground hover:scale-[1.02] hover:pl-3 focus:bg-destructive focus:text-destructive-foreground"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
