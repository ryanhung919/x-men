// Development-only mock user service
// This provides admin privileges during development when BYPASS_AUTH=true

export const DEV_USER = {
  id: 'dev-admin-user-id',
  email: 'admin@dev.local',
  first_name: 'Admin',
  last_name: 'User',
  roles: ['admin', 'manager', 'staff'],
  departments: ['Finance Manager', 'Finance Executive', 'Engineering'],
  mode: 'light',
  default_view: 'tasks'
} as const;

// Mock auth functions for development
export const createDevAuthClient = () => ({
  auth: {
    getClaims: async () => ({
      data: {
        claims: {
          sub: DEV_USER.id,
          email: DEV_USER.email,
          role: 'authenticated',
          aud: 'authenticated'
        }
      },
      error: null
    }),
    signOut: async () => ({ error: null }),
    signInWithPassword: async () => ({
      data: { user: DEV_USER },
      error: null
    })
  }
});

export const getDevUser = () => DEV_USER;

export const hasDevRole = (role: string) => DEV_USER.roles.includes(role as any);

export const isDevMode = () => process.env.BYPASS_AUTH === 'true';