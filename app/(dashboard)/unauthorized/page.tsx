import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-6 p-8">
        <div className="flex justify-center">
          <ShieldAlert className="h-24 w-24 text-destructive" />
        </div>
        <h1 className="text-4xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground text-lg max-w-md mx-auto">
          You don't have permission to access this page. This area is restricted to administrators only.
        </p>
        <div className="flex gap-4 justify-center">
          <Button asChild variant="default">
            <Link href="/tasks">Go to Tasks</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Go to Login</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}