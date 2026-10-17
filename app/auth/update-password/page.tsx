import { UpdatePasswordForm } from '@/components/auth/update-password-form';

import { AuthShell } from '@/components/auth/auth-shell';

export default function Page() {
  return (
    <AuthShell focused>
      <UpdatePasswordForm />
    </AuthShell>
  );
}
