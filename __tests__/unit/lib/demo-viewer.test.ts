import { describe, it, expect, vi } from 'vitest';
import { canViewReports, DEMO_VIEWER_ROLE } from '@/lib/demo-viewer';
import { rejectIfDemoViewer } from '@/lib/db/demo-viewer';

function clientReturning(result: { data: any; error: any }) {
  const chain: any = {};
  chain.from = vi.fn(() => chain);
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn()
    .mockReturnValueOnce(chain)
    .mockResolvedValueOnce(result);
  return chain;
}

describe('canViewReports', () => {
  it('allows admins and demo viewers only', () => {
    expect(canViewReports(['admin'])).toBe(true);
    expect(canViewReports(['staff', DEMO_VIEWER_ROLE])).toBe(true);
    expect(canViewReports(['staff'])).toBe(false);
    expect(canViewReports(['manager'])).toBe(false);
    expect(canViewReports([])).toBe(false);
  });
});

describe('rejectIfDemoViewer', () => {
  it('returns 403 for a demo viewer', async () => {
    const res = await rejectIfDemoViewer(clientReturning({ data: [{ role: 'demo_viewer' }], error: null }), 'u1');
    expect(res?.status).toBe(403);
  });

  it('returns null for everyone else', async () => {
    expect(await rejectIfDemoViewer(clientReturning({ data: [], error: null }), 'u1')).toBeNull();
  });

  it('fails closed when the role lookup errors', async () => {
    const res = await rejectIfDemoViewer(clientReturning({ data: null, error: { message: 'boom' } }), 'u1');
    expect(res?.status).toBe(500);
  });
});
