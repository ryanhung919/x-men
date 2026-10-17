import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ForgotPasswordPage from '@/app/auth/forgot-password/page';

// Mock the ForgotPasswordForm component
vi.mock('@/components/auth/forgot-password-form', () => ({
  ForgotPasswordForm: () => <div data-testid="forgot-password-form">Forgot Password Form</div>,
}));

describe('Forgot Password Page', () => {
  it('should render the forgot password form', () => {
    render(<ForgotPasswordPage />);

    expect(screen.getByTestId('forgot-password-form')).toBeInTheDocument();
  });

  it('should provide the shared auth landmark and sign-in link', () => {
    render(<ForgotPasswordPage />);
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'NODAL' })).toHaveAttribute('href', '/');
  });
});
