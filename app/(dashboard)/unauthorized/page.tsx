import { StatusSurface } from '@/components/auth/status-surface';
export default function Page() {
  return (
    <StatusSurface
      title="This view isn't available"
      message="Your account doesn't have permission to open this page. You can continue working in the areas available to your role."
    />
  );
}
