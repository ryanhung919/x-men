import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const css = readFileSync(join(process.cwd(), 'ui/globals.css'), 'utf8');

// `@theme inline` maps --color-popover straight to var(--popover), so the token must be a
// complete CSS colour. A bare HSL triplet ("0 0% 100%") is an invalid background-color and
// silently renders as transparent.
describe('popover theme tokens', () => {
  const blocks = {
    light: css.match(/:root\s*{[^}]*}/)?.[0] ?? '',
    dark: css.match(/\.dark\s*{[^}]*}/)?.[0] ?? '',
  };

  for (const [mode, block] of Object.entries(blocks)) {
    it(`defines --popover and --popover-foreground as full colours in ${mode} mode`, () => {
      for (const name of ['--popover', '--popover-foreground']) {
        const value = block.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1].trim();
        expect(value, `${name} missing in ${mode}`).toBeDefined();
        expect(value).toMatch(/^(oklch|hsl|rgb|lab|#)/);
        expect(value).not.toContain('/');
      }
    });
  }
});
