import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';
import { UpdatePasswordForm } from '@/components/auth/update-password-form';

const auth = vi.hoisted(() => ({
  resetPasswordForEmail: vi.fn(),
  getUser: vi.fn(),
  updateUser: vi.fn(),
}));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ auth }) }));

beforeEach(() => {
  cleanup();
  vi.resetAllMocks();
  auth.getUser.mockResolvedValue({ data: { user: { id: 'recovering-user' } }, error: null });
  auth.resetPasswordForEmail.mockResolvedValue({ error: null });
  auth.updateUser.mockResolvedValue({ error: null });
});

describe('Password recovery', () => {
  it('sends the reset link back to the current site and offers a route back to sign-in', async () => {
    render(<ForgotPasswordForm />);
    fireEvent.change(screen.getByLabelText('Work email'), {
      target: { value: 'person@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }));
    await screen.findByRole('heading', { name: 'Check your inbox' });
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('person@example.com', {
      redirectTo: `${window.location.origin}/auth/update-password`,
    });
    expect(screen.getByRole('link', { name: 'Back to sign in' })).toHaveAttribute('href', '/');
    fireEvent.click(screen.getByRole('button', { name: 'Try another email' }));
    expect(screen.getByLabelText('Work email')).toBeInTheDocument();
  });

  it('shows delivery failures instead of a success message', async () => {
    auth.resetPasswordForEmail.mockResolvedValue({ error: new Error('Email rate limit exceeded') });
    render(<ForgotPasswordForm />);
    fireEvent.change(screen.getByLabelText('Work email'), {
      target: { value: 'person@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Email rate limit exceeded');
  });

  it('offers a fresh reset link when no recovery session exists', async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    render(<UpdatePasswordForm />);
    expect(await screen.findByRole('link', { name: 'Request a new link' })).toHaveAttribute(
      'href',
      '/auth/forgot-password'
    );
    expect(screen.queryByLabelText('New password')).not.toBeInTheDocument();
  });

  it('rejects mismatched passwords and then saves a matching password', async () => {
    render(<UpdatePasswordForm />);
    const password = await screen.findByLabelText('New password');
    fireEvent.change(password, { target: { value: 'new-test-password' } });
    fireEvent.change(screen.getByLabelText('Confirm new password'), {
      target: { value: 'different-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save new password' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Your passwords don’t match');
    expect(auth.updateUser).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Confirm new password'), {
      target: { value: 'new-test-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save new password' }));
    await waitFor(() =>
      expect(auth.updateUser).toHaveBeenCalledWith({ password: 'new-test-password' })
    );
    expect(await screen.findByRole('link', { name: 'Back to workspace' })).toHaveAttribute(
      'href',
      '/tasks'
    );
  });
});
