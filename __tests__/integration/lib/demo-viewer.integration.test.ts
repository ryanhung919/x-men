import { describe, it, expect } from 'vitest';
import { authenticateAs, adminClient, testUsers } from '@/__tests__/setup/integration.setup';

// Runs against the LOCAL Supabase only (see .env). The guest holds staff + demo_viewer.
describe('demo viewer (public guest) is read-only in the database', () => {
  it('is seeded with the demo_viewer role', async () => {
    const { data } = await adminClient.from('user_roles').select('role').eq('user_id', testUsers.guest.id);
    expect((data ?? []).map((r) => r.role).sort()).toEqual(['demo_viewer', 'staff']);
  });

  it('can still read tasks and colleagues', async () => {
    const { client } = await authenticateAs('guest');
    const tasks = await client.from('tasks').select('id');
    const users = await client.from('user_info').select('id');
    expect(tasks.error).toBeNull();
    expect(tasks.data!.length).toBeGreaterThan(0);
    expect(users.data!.length).toBeGreaterThan(1);
  });

  it('cannot update or delete a task it is assigned to (while a normal assignee can)', async () => {
    const { data: ta } = await adminClient
      .from('task_assignments')
      .select('task_id')
      .eq('assignee_id', testUsers.guest.id)
      .limit(1);
    const taskId = ta![0].task_id;

    const { client: guest } = await authenticateAs('guest');
    const upd = await guest.from('tasks').update({ title: 'defaced' }).eq('id', taskId).select();
    expect(upd.data ?? []).toHaveLength(0); // filtered out by the restrictive policy
    const del = await guest.from('tasks').delete().eq('id', taskId).select();
    expect(del.data ?? []).toHaveLength(0);

    const { data: after } = await adminClient.from('tasks').select('title').eq('id', taskId).single();
    expect(after!.title).not.toBe('defaced');

    // control: the same restrictive policy does not affect a regular user (daniel is admin)
    const { client: daniel } = await authenticateAs('daniel');
    const { data: orig } = await adminClient.from('tasks').select('title').eq('id', taskId).single();
    const ok = await daniel.from('tasks').update({ title: orig!.title }).eq('id', taskId).select();
    expect(ok.data ?? []).toHaveLength(1);
  });

  it('cannot insert tasks, comments, notifications or roles', async () => {
    const { client, user } = await authenticateAs('guest');
    const { data: any1 } = await adminClient.from('tasks').select('id, project_id').limit(1).single();

    const task = await client
      .from('tasks')
      .insert({ title: 'x', project_id: any1!.project_id, creator_id: user.id, status: 'To Do' });
    expect(task.error).not.toBeNull();

    const comment = await client.from('task_comments').insert({ task_id: any1!.id, user_id: user.id, content: 'x' });
    expect(comment.error).not.toBeNull();

    const notif = await client
      .from('notifications')
      .insert({ user_id: testUsers.daniel.id, type: 'x', title: 'x', message: 'x' });
    expect(notif.error).not.toBeNull();

    const role = await client.from('user_roles').insert({ user_id: user.id, role: 'admin' });
    expect(role.error).not.toBeNull();
  });

  it('cannot call create_task_with_assignments directly', async () => {
    const { client, user } = await authenticateAs('guest');
    const { data: p } = await adminClient.from('projects').select('id').limit(1).single();
    const { error } = await client.rpc('create_task_with_assignments', {
      p_title: 'x', p_description: '', p_priority_bucket: 5, p_status: 'To Do', p_deadline: null,
      p_notes: null, p_project_id: p!.id, p_creator_id: user.id, p_recurrence_interval: null,
      p_recurrence_date: null, p_assignee_ids: [user.id],
    });
    expect(error?.message).toMatch(/read-only/);
  });
});
