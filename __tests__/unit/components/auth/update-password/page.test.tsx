import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import UpdatePasswordPage from '@/app/auth/update-password/page';

// Mock the UpdatePasswordForm component
vi.mock('@/components/auth/update-password-form', () => ({
  UpdatePasswordForm: () => <div data-testid="update-password-form">Update Password Form</div>,
}));

describe('Update Password Page', () => {
  it('should render the update password form', () => {
    render(<UpdatePasswordPage />);

    expect(screen.getByTestId('update-password-form')).toBeInTheDocument();
  });

  it('should provide the shared auth landmark and sign-in link', () => {
    render(<UpdatePasswordPage />);
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'NODAL' })).toHaveAttribute('href', '/');
  });
});
