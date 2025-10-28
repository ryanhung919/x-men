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

  it('should render with proper layout structure', () => {
    const { container } = render(<ForgotPasswordPage />);
    
    // Check for proper layout classes
    expect(container.querySelector('.flex.min-h-svh')).toBeInTheDocument();
    expect(container.querySelector('.w-full.max-w-sm')).toBeInTheDocument();
  });

  it('should center the form on the page', () => {
    const { container } = render(<ForgotPasswordPage />);
    
    const wrapper = container.querySelector('.flex.min-h-svh');
    expect(wrapper).toHaveClass('items-center', 'justify-center');
  });

  it('should have proper padding', () => {
    const { container } = render(<ForgotPasswordPage />);
    
    const wrapper = container.querySelector('.flex.min-h-svh');
    expect(wrapper).toHaveClass('p-6');
  });
});
