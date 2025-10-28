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

  it('should render with proper layout structure', () => {
    const { container } = render(<UpdatePasswordPage />);
    
    // Check for proper layout classes
    expect(container.querySelector('.flex.min-h-svh')).toBeInTheDocument();
    expect(container.querySelector('.w-full.max-w-sm')).toBeInTheDocument();
  });

  it('should center the form on the page', () => {
    const { container } = render(<UpdatePasswordPage />);
    
    const wrapper = container.querySelector('.flex.min-h-svh');
    expect(wrapper).toHaveClass('items-center', 'justify-center');
  });

  it('should have proper padding', () => {
    const { container } = render(<UpdatePasswordPage />);
    
    const wrapper = container.querySelector('.flex.min-h-svh');
    expect(wrapper).toHaveClass('p-6');
  });
});
