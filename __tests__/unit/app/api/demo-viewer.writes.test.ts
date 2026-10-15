import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Real guard, fake client: the client reports the caller as a demo viewer.
const supabase: any = {
  auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'guest' } }, error: null })) },
  from: vi.fn(() => supabase),
  select: vi.fn(() => supabase),
  eq: vi.fn(),
};
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn(async () => supabase) }));
const { createTaskService } = vi.hoisted(() => ({ createTaskService: vi.fn() }));
vi.mock('@/lib/services/tasks', () => ({
  createTaskService, archiveTaskService: vi.fn(), updateTitle: vi.fn(),
  updateDescription: vi.fn(), updateStatus: vi.fn(), updatePriority: vi.fn(), updateDeadline: vi.fn(),
  updateNotes: vi.fn(), updateRecurrence: vi.fn(), addAssignee: vi.fn(), removeAssignee: vi.fn(),
  addTag: vi.fn(), removeTag: vi.fn(), addTaskAttachments: vi.fn(), removeTaskAttachment: vi.fn(),
  addComment: vi.fn(), updateComment: vi.fn(), deleteComment: vi.fn(), linkSubtaskToParent: vi.fn(),
}));
vi.mock('@/lib/db/tasks', () => ({ getAllUsers: vi.fn(), getAllProjects: vi.fn(), getScheduleTasks: vi.fn() }));

const resetEq = () => {
  supabase.eq.mockReset();
  supabase.eq.mockReturnValueOnce(supabase).mockResolvedValue({ data: [{ role: 'demo_viewer' }], error: null });
};

describe('demo viewer cannot use write endpoints', () => {
  beforeEach(resetEq);

  it('POST /api/tasks', async () => {
    const { POST } = await import('@/app/api/tasks/route');
    const fd = new FormData();
    fd.append('taskData', JSON.stringify({ project_id: 1, title: 't', priority_bucket: 5, assignee_ids: ['guest'] }));
    const res = await POST(new NextRequest('http://localhost/api/tasks', { method: 'POST', body: fd }));
    expect(res.status).toBe(403);
    expect(createTaskService).not.toHaveBeenCalled();
  });

  it('PATCH /api/tasks/[id]', async () => {
    const { PATCH } = await import('@/app/api/tasks/[id]/route');
    const res = await PATCH(
      new NextRequest('http://localhost/api/tasks/1', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'updateTitle', title: 'x' }),
      }),
      { params: Promise.resolve({ id: '1' }) }
    );
    expect(res.status).toBe(403);
  });

  it('PATCH /api/tasks/[id]/archive', async () => {
    const { PATCH } = await import('@/app/api/tasks/[id]/archive/route');
    const res = await PATCH(
      new NextRequest('http://localhost/api/tasks/1/archive', {
        method: 'PATCH',
        body: JSON.stringify({ is_archived: true }),
      }),
      { params: { id: '1' } }
    );
    expect(res.status).toBe(403);
  });

  it('PATCH /api/schedule', async () => {
    const { PATCH } = await import('@/app/api/schedule/route');
    const res = await PATCH(
      new NextRequest('http://localhost/api/schedule', {
        method: 'PATCH',
        body: JSON.stringify({ taskId: 1, deadline: '2030-01-01' }),
      })
    );
    expect(res.status).toBe(403);
  });

  it('PATCH /api/user/role', async () => {
    const { PATCH } = await import('@/app/api/user/role/route');
    const res = await PATCH(
      new NextRequest('http://localhost/api/user/role', {
        method: 'PATCH',
        body: JSON.stringify({ defaultView: 'tasks' }),
      })
    );
    expect(res.status).toBe(403);
  });
});
