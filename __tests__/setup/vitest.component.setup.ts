import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock jsPDF for component tests
vi.mock('jspdf', () => ({
  jsPDF: vi.fn().mockImplementation(() => ({
    internal: {
      pageSize: {
        getWidth: () => 595,
        getHeight: () => 842,
      },
    },
    setFont: vi.fn().mockReturnThis(),
    setFontSize: vi.fn().mockReturnThis(),
    text: vi.fn().mockReturnThis(),
    addPage: vi.fn().mockReturnThis(),
    save: vi.fn(),
    splitTextToSize: vi.fn((text: string) => [text]),
    rect: vi.fn().mockReturnThis(),
    triangle: vi.fn().mockReturnThis(),
    setFillColor: vi.fn().mockReturnThis(),
    setTextColor: vi.fn().mockReturnThis(),
  })),
}));

// Mock XLSX for component tests
vi.mock('xlsx', () => ({
  default: {
    utils: {
      book_new: vi.fn(() => ({ SheetNames: [], Sheets: {} })),
      json_to_sheet: vi.fn(() => ({})),
      book_append_sheet: vi.fn(),
    },
    writeFile: vi.fn(),
  },
  utils: {
    book_new: vi.fn(() => ({ SheetNames: [], Sheets: {} })),
    json_to_sheet: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}));

// Mock Next.js navigation for React components
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  useParams: vi.fn(() => ({})),
}));

// Mock date-fns to ensure consistent date formatting in happy-dom
vi.mock('date-fns', async (importOriginal) => {
  const actual = await importOriginal<typeof import('date-fns')>();
  return {
    ...actual,
    // Override format function to ensure consistent output in tests
    format: vi.fn((date: Date, formatStr: string) => {
      if (formatStr === 'MMMM d, yyyy') {
        return 'December 28, 2025';
      } else if (formatStr === 'MMMM yyyy') {
        return 'December 2025';
      }
      // Use original format for other formats
      return actual.format(date, formatStr);
    }),
  };
});

// Suppress console errors in tests
global.console = {
  ...console,
  error: vi.fn(),
  warn: vi.fn(),
};