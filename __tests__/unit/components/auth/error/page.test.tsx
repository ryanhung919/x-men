import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AuthErrorPage from '@/app/auth/error/page';

describe('Auth Error Page', () => {
  it('should render error page with default message when no error param', async () => {
    const searchParams = Promise.resolve({ error: '' });
    
    render(await AuthErrorPage({ searchParams }));
    
    expect(screen.getByText('Sorry, something went wrong.')).toBeInTheDocument();
    expect(screen.getByText('An unspecified error occurred.')).toBeInTheDocument();
  });

  it('should render error page with specific error message', async () => {
    const searchParams = Promise.resolve({ error: 'Invalid token' });
    
    render(await AuthErrorPage({ searchParams }));
    
    expect(screen.getByText('Sorry, something went wrong.')).toBeInTheDocument();
    expect(screen.getByText('Code error: Invalid token')).toBeInTheDocument();
  });

  it('should render error page with URL encoded error message', async () => {
    const searchParams = Promise.resolve({ error: 'Email%20not%20confirmed' });
    
    render(await AuthErrorPage({ searchParams }));
    
    expect(screen.getByText('Sorry, something went wrong.')).toBeInTheDocument();
    expect(screen.getByText('Code error: Email%20not%20confirmed')).toBeInTheDocument();
  });

  it('should render with proper card layout', async () => {
    const searchParams = Promise.resolve({ error: '' });
    
    const { container } = render(await AuthErrorPage({ searchParams }));
    
    // Check for proper layout classes
    expect(container.querySelector('.flex.min-h-svh')).toBeInTheDocument();
    expect(container.querySelector('.max-w-sm')).toBeInTheDocument();
  });

  it('should render with proper heading size', async () => {
    const searchParams = Promise.resolve({ error: '' });
    
    render(await AuthErrorPage({ searchParams }));
    
    const heading = screen.getByText('Sorry, something went wrong.');
    expect(heading).toBeInTheDocument();
    expect(heading.tagName).toBe('DIV');
  });
});
