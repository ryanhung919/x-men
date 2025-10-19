import { describe, it, expect } from 'vitest';
import { authenticateAs, adminClient } from '@/__tests__/setup/integration.setup';

describe('Settings integration', () => {
  it('updates user_info default_view for a user', async () => {
    const { user } = await authenticateAs('joel');

    // Read current
    const { data: before, error: selErr } = await adminClient
      .from('user_info')
      .select('default_view')
      .eq('id', user.id)
      .maybeSingle();
    expect(selErr).toBeNull();
    expect(before).toBeTruthy();

    // Toggle settings
    const newView = before!.default_view === 'tasks' ? 'schedule' : 'tasks';

    const { error: upErr } = await adminClient
      .from('user_info')
      .update({ default_view: newView})
      .eq('id', user.id);
    expect(upErr).toBeNull();

    // Verify update
    const { data: after, error: selErr2 } = await adminClient
      .from('user_info')
      .select('default_view')
      .eq('id', user.id)
      .maybeSingle();
    expect(selErr2).toBeNull();
    expect(after).toBeTruthy();
    expect(after!.default_view).toBe(newView);
  });
});
    