import { AuthShell } from '@/components/auth/auth-shell';
import { StatusSurface } from '@/components/auth/status-surface';
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  return (
    <AuthShell>
      <StatusSurface
        title="Let's get you back in"
        message="We couldn't complete that request. Try signing in again, or request a new password reset link."
        detail={params.error}
        href="/"
        action="Back to sign in"
      />
    </AuthShell>
  );
}
