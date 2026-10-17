import { StatusSurface } from '@/components/auth/status-surface';
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  return (
    <StatusSurface
      title="Something didn't go to plan"
      message="We couldn't complete that request. Return to your workspace and try again."
      detail={params.error}
    />
  );
}
