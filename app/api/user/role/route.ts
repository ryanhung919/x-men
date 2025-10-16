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
      return NextResponse.json({ roles: ['staff'] }); // Default to staff
    }

    const roles = userRoles?.map((r: any) => r.role) || ['staff'];
    
    return NextResponse.json({ roles });
  } catch (err) {
    console.error('Error in user role API:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}