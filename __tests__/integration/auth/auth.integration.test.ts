import { describe, it, expect } from 'vitest'
import { authenticateAs, testUsers, adminClient } from '@/__tests__/setup/integration.setup'
import { createClient as createAnonClient } from '@supabase/supabase-js'

describe('Auth Integration', () => {
  const appUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  it('allows valid user to login with password', async () => {
    const anon = createAnonClient(appUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data, error } = await anon.auth.signInWithPassword({
      email: testUsers.joel.email,
      password: testUsers.joel.password,
    })

    expect(error).toBeNull()
    expect(data?.user?.id).toBe(testUsers.joel.id)

    // Ensure session token present and password is not stored anywhere client-side
    expect(data?.session?.access_token).toBeTruthy()
    expect(JSON.stringify(data)).not.toContain(testUsers.joel.password)
  })

  it('denies access for invalid password', async () => {
    const anon = createAnonClient(appUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data, error } = await anon.auth.signInWithPassword({
      email: testUsers.mitch.email,
      password: 'wrong-password',
    })

    expect(data?.user).toBeFalsy()
    expect(error).toBeTruthy()
  })

  it('retrieves roles and enforces role-scoped visibility', async () => {
    // Pick a comment to attempt deletion
    const { data: anyComment } = await adminClient
      .from('task_comments')
      .select('id')
      .limit(1)
      .single()

    expect(anyComment?.id).toBeTruthy()

    // First, sign in as a staff-only personal account and try delete -> should fail
    const anon = createAnonClient(appUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const staffCreds = { email: 'joel.wang.03@gmail.com', password: 'password123' }
    const { data: staffAuth } = await anon.auth.signInWithPassword(staffCreds)
    expect(staffAuth.session).toBeTruthy()

    const staffClient = createAnonClient(appUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${staffAuth.session!.access_token}` } },
    })

    const { error: staffDeleteErr } = await staffClient
      .from('task_comments')
      .delete()
      .eq('id', anyComment!.id)

    // Deleting a row that is not visible per RLS typically returns no error and affects 0 rows
    expect(staffDeleteErr).toBeNull()

    // Verify comment still exists (using admin client bypassing RLS)
    const { count: countAfterStaff } = await adminClient
      .from('task_comments')
      .select('*', { count: 'exact', head: true })
      .eq('id', anyComment!.id)
    expect(countAfterStaff).toBe(1)

    // Now authenticate as Mitch (admin) and verify he can see his own roles including admin
    const { client, user } = await authenticateAs('mitch')
    const { data: roles, error } = await client
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
    expect(error).toBeNull()
    const roleList = (roles ?? []).map((r: any) => r.role)
    expect(roleList).toEqual(expect.arrayContaining(['staff', 'manager', 'admin']))
  })
})
