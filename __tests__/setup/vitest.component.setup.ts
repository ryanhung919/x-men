import '@testing-library/jest-dom/vitest';
import { vi, beforeAll } from 'vitest';
import { TextEncoder, TextDecoder } from 'util';

// Polyfill TextEncoder/TextDecoder for jsdom
global.TextEncoder = TextEncoder as any;
global.TextDecoder = TextDecoder as any;

// Setup proper jsdom environment before any imports
beforeAll(() => {
  // Ensure window object exists
  if (typeof window !== 'undefined') {
    // Fix for jsdom URL parsing issues in CI
    Object.defineProperty(window, 'URL', {
      writable: true,
      value: class URL {
        constructor(url: string, base?: string) {
          const fullUrl = base ? new URL(url, base).href : url;
          try {
            const parsed = new URL(fullUrl);
            this.href = parsed.href;
            this.origin = parsed.origin;
            this.protocol = parsed.protocol;
            this.host = parsed.host;
            this.hostname = parsed.hostname;
            this.port = parsed.port;
            this.pathname = parsed.pathname;
            this.search = parsed.search;
            this.hash = parsed.hash;
          } catch {
            this.href = fullUrl;
            this.origin = '';
            this.protocol = '';
            this.host = '';
            this.hostname = '';
            this.port = '';
            this.pathname = '';
            this.search = '';
            this.hash = '';
          }
        }
        href = '';
        origin = '';
        protocol = '';
        host = '';
        hostname = '';
        port = '';
        pathname = '';
        search = '';
        hash = '';
      }
    });

    // Polyfill structuredClone for jsdom
    if (!global.structuredClone) {
      global.structuredClone = (obj: any) => JSON.parse(JSON.stringify(obj));
    }
  }
});

// Mock jsPDF for component tests
vi.mock('jspdf', () => ({
  jsPDF: vi.fn().mockImplementation(() => ({
    internal: {
      pageSize: {
        getWidth: () => 595, // A4 width in points
        getHeight: () => 842, // A4 height in points
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

// Suppress console errors in tests
global.console = {
  ...console,
  error: vi.fn(),
  warn: vi.fn(),
};