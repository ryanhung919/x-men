'use client';

import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, ArrowRight, KeyRound, Loader2, MailCheck } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export function ForgotPasswordForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const { error } = await createClient().auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });
      if (error) throw error;
      setSuccess(true);
    } catch (error: unknown) {
      setError(
        error instanceof Error ? error.message : 'Unable to send the email. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const Icon = success ? MailCheck : KeyRound;
  return (
    <div className={cn('w-full', className)} {...props}>
      <Card className="gap-7 rounded-2xl py-8 sm:py-10">
        <CardHeader className="gap-3">
          <span className="mb-3 flex size-12 items-center justify-center rounded-2xl border border-positive/20 bg-positive-soft text-positive">
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-positive">
            Account recovery
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            {success ? 'Check your inbox' : 'Forgot your password?'}
          </h1>
          <CardDescription className="leading-relaxed">
            {success
              ? 'Your next step is in your email.'
              : 'It happens. Enter your work email and we’ll help you get back in.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div role="status" className="space-y-5">
              <p className="text-sm leading-relaxed text-muted-foreground">
                If an account exists for{' '}
                <span className="break-all font-medium text-foreground">{email.trim()}</span>,
                you’ll receive a link to choose a new password.
              </p>
              <p className="rounded-xl border bg-muted/40 p-4 text-xs leading-relaxed text-muted-foreground">
                Can’t find it? Check your spam folder. Only the most recent reset link will work.
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setSuccess(false);
                  setError(null);
                }}
              >
                Try another email
              </Button>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-5">
              <div className="grid gap-2.5">
                <Label htmlFor="email">Work email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                {isLoading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                {isLoading ? 'Sending reset link…' : 'Send reset link'}
                {!isLoading && <ArrowRight className="size-4" aria-hidden="true" />}
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
