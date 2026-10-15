import { NextResponse } from 'next/server';
import { DEMO_VIEWER_ROLE } from '@/lib/demo-viewer';

/**
 * Returns a 403 response when the user is a demo viewer, otherwise null.
 * Fails closed: if the role lookup errors, the write is rejected.
 */
export async function rejectIfDemoViewer(
  supabase: any,
  userId: string
): Promise<NextResponse | null> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', DEMO_VIEWER_ROLE);

  if (error) {
    return NextResponse.json({ error: 'Failed to verify permissions' }, { status: 500 });
  }
  if (data && data.length > 0) {
    return NextResponse.json(
      { error: 'Forbidden: the demo account is read-only' },
      { status: 403 }
    );
  }
  return null;
}
