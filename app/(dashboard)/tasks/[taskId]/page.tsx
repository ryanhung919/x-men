import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { getTaskInspection } from '@/lib/services/task-inspection';
import { TaskDetailContent } from '@/components/tasks/task-detail-content';
import { BackButton } from '@/components/ui/back-button';

export default async function TaskDetailsPage({ params }: { params: Promise<{ taskId: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/');
  const { taskId } = await params;
  if (!/^\d+$/.test(taskId) || !Number.isSafeInteger(Number(taskId)) || Number(taskId) < 1)
    notFound();
  const task = await getTaskInspection(Number(taskId));
  if (!task) notFound();
  return (
    <div className="mx-auto max-w-[1180px] space-y-5">
      <BackButton />
      <div className="overflow-hidden rounded-2xl border bg-card">
        <TaskDetailContent task={task} />
      </div>
    </div>
  );
}
