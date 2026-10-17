import { LoginForm } from '@/components/auth/login-form';

import { AuthShell } from '@/components/auth/auth-shell';

export default function Page() {
  return (
    <AuthShell>
      <LoginForm />
    </AuthShell>
  );
}
