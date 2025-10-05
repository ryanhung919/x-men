import { vi, beforeEach, afterEach } from 'vitest';
import { expect } from 'vitest';

/**
 * Test utility functions for common testing patterns
 */

/**
 * Wait for a specified amount of time
 */
export const wait = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Create a deferred promise for testing async operations
 */
export function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: any) => void;
  
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  
  return { promise, resolve, reject };
}

/**
 * Mock console methods to avoid cluttering test output
 */
export function mockConsole() {
  const originalConsole = { ...console };
  
  beforeEach(() => {
    global.console = {
      ...console,
      log: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
    };
  });
  
  afterEach(() => {
    global.console = originalConsole;
  });
}

/**
 * Create a mock function that tracks calls
 */
export function createMockFn<T extends (...args: any[]) => any>() {
  return vi.fn<T>();
}

/**
 * Assert that a function throws with a specific message
 */
export async function expectToThrow(
  fn: () => Promise<any>,
  expectedError: string | RegExp
): Promise<void> {
  try {
    await fn();
    throw new Error('Expected function to throw but it did not');
  } catch (error) {
    if (error instanceof Error) {
      if (typeof expectedError === 'string') {
        expect(error.message).toBe(expectedError);
      } else {
        expect(error.message).toMatch(expectedError);
      }
    } else {
      throw new Error('Expected error to be an instance of Error');
    }
  }
}

/**
 * Generate a random UUID for testing
 */
export function generateTestUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Create a mock date for consistent testing
 */
export function createMockDate(dateString: string): Date {
  return new Date(dateString);
}

/**
 * Reset all mocks and timers
 */
export function resetAllMocks(): void {
  vi.clearAllMocks();
  vi.clearAllTimers();
  vi.restoreAllMocks();
}

/**
 * Create a mock Supabase response
 */
export function createSupabaseResponse<T>(
  data: T,
  error: Error | null = null
): { data: T | null; error: Error | null } {
  return {
    data: error ? null : data,
    error,
  };
}

/**
 * Create a mock error response
 */
export function createErrorResponse(message: string): Error {
  return new Error(message);
}

/**
 * Suppress console errors during test execution
 */
export function suppressConsoleError(
  callback: () => void | Promise<void>
): void | Promise<void> {
  const originalError = console.error;
  console.error = vi.fn();
  
  try {
    const result = callback();
    if (result instanceof Promise) {
      return result.finally(() => {
        console.error = originalError;
      });
    }
  } finally {
    if (!(callback() instanceof Promise)) {
      console.error = originalError;
    }
  }
}