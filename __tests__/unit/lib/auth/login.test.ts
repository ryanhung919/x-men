import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockSupabaseClient } from '@/__tests__/mocks/supabase.mock'

vi.mock('@/lib/db/roles', async () => {
  const actual = await vi.importActual<typeof import('@/lib/db/roles')>(
    '@/lib/db/roles'
  )
  return {
    ...actual,
    getRolesForUserClient: vi.fn(),
  }
})

const { loginWithPassword, determineRedirect } = await import('@/lib/auth')
const { getRolesForUserClient } = await import('@/lib/db/roles')

describe('lib/auth loginWithPassword', () => {
  let mockSupabase: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase = createMockSupabaseClient()
  })

  it('signs in successfully and returns roles + redirect for manager', async () => {
    mockSupabase.auth.signInWithPassword = vi
      .fn()
      .mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })

    vi.mocked(getRolesForUserClient).mockResolvedValue(['manager'])

    const result = await loginWithPassword(mockSupabase, 'manager@example.com', 'secret')
    expect(result).toEqual({
      success: true,
      userId: 'u1',
      roles: ['manager'],
      redirectPath: '/schedule',
    })
  })

  it('defaults to /report for non-manager (staff, admin)', async () => {
    mockSupabase.auth.signInWithPassword = vi
      .fn()
      .mockResolvedValue({ data: { user: { id: 'u2' } }, error: null })

    vi.mocked(getRolesForUserClient).mockResolvedValue(['staff'])

    const result = await loginWithPassword(mockSupabase, 'staff@example.com', 'secret')
    expect(result).toMatchObject({ success: true, redirectPath: '/report' })

    // Explicitly test helper
    expect(determineRedirect(['admin'])).toBe('/report')
    expect(determineRedirect(['manager'])).toBe('/schedule')
  })

  it('returns failure for unauthorized users', async () => {
    mockSupabase.auth.signInWithPassword = vi
      .fn()
      .mockResolvedValue({ data: { user: null }, error: new Error('Invalid credentials') })

    const result = await loginWithPassword(mockSupabase, 'bad@example.com', 'wrong')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.message).toBe('Invalid credentials')
    }
  })

  it('never exposes plaintext password in responses', async () => {
    mockSupabase.auth.signInWithPassword = vi
      .fn()
      .mockResolvedValue({ data: { user: { id: 'u3' } }, error: null })

    vi.mocked(getRolesForUserClient).mockResolvedValue(['staff'])

    const email = 'user@example.com'
    const pwd = 'super-secret'
    const result = await loginWithPassword(mockSupabase, email, pwd)

    expect(result).not.toHaveProperty('password')
    expect(JSON.stringify(result)).not.toContain(pwd)
  })
})
