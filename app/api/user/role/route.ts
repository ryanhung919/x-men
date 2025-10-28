import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user roles
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (rolesError) {
      console.error('Error fetching user roles:', rolesError);
      return NextResponse.json({ userId: user.id, roles: ['staff'] }); // Default to staff
    }

    const roles = userRoles && userRoles.length > 0 
      ? userRoles.map((r: any) => r.role) 
      : ['staff'];
    
    return NextResponse.json({ userId: user.id, roles });
  } catch (err) {
    console.error('Error in user role API:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const defaultView = body?.defaultView as string | undefined;
    if (defaultView !== 'tasks' && defaultView !== 'schedule') {
      return NextResponse.json({ error: 'Invalid defaultView' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('user_info')
      .update({ default_view: defaultView })
      .eq('id', user.id)
      .select('default_view')
      .maybeSingle();

    if (error) {
      console.error('Failed to update default_view:', error);
      return NextResponse.json({ error: 'Update failed' }, { status: 400 });
    }
    if (!data) {
      return NextResponse.json({ error: 'No row updated' }, { status: 404 });
    }

    return NextResponse.json({ default_view: data.default_view });
  } catch (err) {
    console.error('Error in user role PATCH API:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}