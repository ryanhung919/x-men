'use client';

import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Check, Loader2, LockKeyhole } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export function UpdatePasswordForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<'checking' | 'ready' | 'expired'>('checking');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let active = true;
    // getUser waits for the browser client to finish exchanging the recovery code.
    createClient()
      .auth.getUser()
      .then(({ data, error }) => {
        if (active) setSession(data.user && !error ? 'ready' : 'expired');
      })
      .catch(() => {
        if (active) setSession('expired');
      });
    return () => {
      active = false;
    };
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmation) {
      setError('Your passwords don’t match. Please try again.');
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await createClient().auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
    } catch (error: unknown) {
      setError(
        error instanceof Error ? error.message : 'Unable to save your password. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn('w-full', className)} {...props}>
      <Card className="gap-7 rounded-2xl py-8 sm:py-10">
        <CardHeader className="gap-3">
          <span className="mb-3 flex size-12 items-center justify-center rounded-2xl border border-positive/20 bg-positive-soft text-positive">
            {success ? (
              <Check className="size-5" aria-hidden="true" />
            ) : (
              <LockKeyhole className="size-5" aria-hidden="true" />
            )}
          </span>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-positive">
            Account recovery
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            {success
              ? 'You’re all set'
              : session === 'expired'
                ? 'Let’s try a fresh link'
                : 'Choose a new password'}
          </h1>
          <CardDescription className="leading-relaxed">
            {success
              ? 'Your password has been updated. You can get back to work.'
              : session === 'expired'
                ? 'This reset link has expired or is no longer valid. Request a new one to continue.'
                : 'Use at least 6 characters and make it something unique.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div role="status">
              <Button asChild className="w-full">
                <Link href="/tasks">Back to workspace</Link>
              </Button>
            </div>
          ) : session === 'expired' ? (
            <Button asChild className="w-full">
              <Link href="/auth/forgot-password">Request a new link</Link>
            </Button>
          ) : session === 'checking' ? (
            <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Checking your reset link…
            </p>
          ) : (
            <form onSubmit={handleUpdatePassword} className="space-y-5">
              <div className="grid gap-2.5">
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="grid gap-2.5">
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              {error && (
                <p
                  role="alert"
                  className="rounded-lg border border-problem/20 bg-problem-soft p-3 text-sm text-problem"
                >
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full gap-2" disabled={isLoading}>
                {isLoading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                {isLoading ? 'Saving password…' : 'Save new password'}
              </Button>
            </form>
          )}
          <div className="mt-7 border-t pt-6 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" aria-hidden="true" />
              Back to sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
