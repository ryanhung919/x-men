import '@testing-library/jest-dom/vitest';
import { vi, beforeAll } from 'vitest';
import { TextEncoder, TextDecoder } from 'util';

// Polyfill TextEncoder/TextDecoder for jsdom
global.TextEncoder = TextEncoder as any;
global.TextDecoder = TextDecoder as any;

// Polyfill global for webidl-conversions (required by whatwg-url/jsdom)
if (typeof global.global === 'undefined') {
  (global as any).global = global;
}

// Setup proper jsdom environment before any imports
beforeAll(() => {
  // Ensure window object exists
  if (typeof window !== 'undefined') {
    // Fix for jsdom URL parsing issues in CI
    Object.defineProperty(window, 'URL', {
      writable: true,
      configurable: true,
      value: class URL {
        href: string;
        origin: string;
        protocol: string;
        host: string;
        hostname: string;
        port: string;
        pathname: string;
        search: string;
        hash: string;

        constructor(url: string, base?: string) {
          const fullUrl = base ? `${base.replace(/\/$/, '')}/${url.replace(/^\//, '')}` : url;
          try {
            const parsed = new globalThis.URL(fullUrl);
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

        toString() {
          return this.href;
        }

        toJSON() {
          return this.href;
        }
      },
    });

    // Polyfill structuredClone for jsdom
    if (!global.structuredClone) {
      global.structuredClone = (obj: any) => JSON.parse(JSON.stringify(obj));
    }

    // Polyfill for Headers (required by fetch in jsdom)
    if (typeof window.Headers === 'undefined') {
      (window as any).Headers = class Headers {
        private headers: Map<string, string> = new Map();

        constructor(init?: HeadersInit) {
          if (init) {
            if (Array.isArray(init)) {
              init.forEach(([key, value]) => this.headers.set(key.toLowerCase(), value));
            } else if (init instanceof Headers) {
              (init as any).headers.forEach((value: string, key: string) => {
                this.headers.set(key, value);
              });
            } else {
              Object.entries(init).forEach(([key, value]) => {
                this.headers.set(key.toLowerCase(), value);
              });
            }
          }
        }

        append(name: string, value: string) {
          const existing = this.headers.get(name.toLowerCase());
          this.headers.set(name.toLowerCase(), existing ? `${existing}, ${value}` : value);
        }

        delete(name: string) {
          this.headers.delete(name.toLowerCase());
        }

        get(name: string) {
          return this.headers.get(name.toLowerCase()) ?? null;
        }

        has(name: string) {
          return this.headers.has(name.toLowerCase());
        }

        set(name: string, value: string) {
          this.headers.set(name.toLowerCase(), value);
        }

        forEach(callback: (value: string, key: string, parent: Headers) => void) {
          this.headers.forEach((value, key) => callback(value, key, this));
        }

        *entries() {
          yield* this.headers.entries();
        }

        *keys() {
          yield* this.headers.keys();
        }

        *values() {
          yield* this.headers.values();
        }

        [Symbol.iterator]() {
          return this.entries();
        }
      };
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
