// 'use client' is intentionally omitted; this is a plain module usable in client code.
// Provides a minimal client-side helper to fetch roles for a specific user using an existing Supabase browser client.

export type UserRoleRow = { role: string };

export async function getRolesForUserClient(
  supabase: any,
  userId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);
  if (error) throw error;
  return ((data as UserRoleRow[] | null) ?? []).map((r: UserRoleRow) => r.role);
}
