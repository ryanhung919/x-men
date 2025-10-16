import { getRolesForUserClient } from '@/lib/db/roles'

export type LoginSuccess = {
  success: true
  userId: string
  roles: string[]
  redirectPath: string
}

export type LoginFailure = {
  success: false
  message: string
}

export type LoginResult = LoginSuccess | LoginFailure

/**
 * Determine redirect path based on roles.
 * - Managers go to schedule
 * - Others (staff/admin) go to report
 */
export function determineRedirect(roles: string[]): string {
  if (roles.includes('manager')) return '/schedule'
  return '/report'
}

/**
 * Perform username/password login using a provided Supabase client and return
 * roles plus a recommended redirect path. Never returns or stores the password.
 *
 * Contract:
 * - Input: supabase client, email, password
 * - Output: success with userId, roles, redirectPath OR failure with message
 */
export async function loginWithPassword(
  supabase: any,
  email: string,
  password: string
): Promise<LoginResult> {
  // Sign in using Supabase auth. Supabase stores hashed passwords server-side.
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error || !data?.user?.id) {
    return { success: false, message: error?.message || 'Unauthorized' }
  }

  const userId = data.user.id as string

  // Fetch roles from user_roles table via existing helper
  let roles: string[] = []
  try {
    roles = await getRolesForUserClient(supabase, userId)
  } catch {
    // Default to staff if roles cannot be loaded
    roles = ['staff']
  }

  const redirectPath = determineRedirect(roles)

  // Never include plaintext password in returned structure
  return { success: true, userId, roles, redirectPath }
}
